// document = a página inteira; getElementById = “encontre pelo id”
const tabela = document.getElementById('tabela-alunos');
const tabelaCursos = document.getElementById('tabela-cursos');
const msg = document.getElementById('msg');
const modal = document.getElementById('modal');
const modalTitulo = document.getElementById('modal-titulo');
const form = document.getElementById('form-aluno');
const inputNome = document.getElementById('nome');
const inputRa = document.getElementById('ra');
const selectCurso = document.getElementById('curso');
const filtroCurso = document.getElementById('filtro-curso');
const formCurso = document.getElementById('form-curso');
const inputNovoCurso = document.getElementById('novo-curso');
const alunosStatus = document.getElementById('alunos-status');
const sentinelaAlunos = document.getElementById('sentinela-alunos');

// variáveis de estado: memórias do que estamos fazendo agora
let modo = 'criar';       // 'criar' ou 'editar'
let raEditando = '';     // RA do aluno aberto no modal de edição

// memória da lista que cresce ao rolar
const ALUNOS_POR_PAGINA = 5;   // toda busca pede 5
let alunosInicio = 0;          // quantos já estão desenhados
let alunosTotal = 0;           // quantos existem no filtro
let alunosTemMais = false;     // ainda falta gente?
let alunosCarregando = false;  // já tem um pedido no ar?
let alunosErro = false;        // a última busca falhou?
let alunosPedido = 0;          // qual busca vale agora?

function mostrarMsg(texto, tipo = '') {
  msg.hidden = false;              // tira o hidden → aparece na tela
  msg.textContent = texto;         // coloca o texto (seguro contra HTML)
  msg.className = 'msg' + (tipo ? ` ${tipo}` : '');
}

// ===================== CURSOS (lado 1) =====================

async function listarCursos() {
  const resposta = await fetch('/cursos');   // GET /cursos
  const cursos = await resposta.json();
  // cursos = [ { id: 1, nome: 'ADS', total_alunos: 2 }, ... ]

  if (!resposta.ok) {
    mostrarMsg(cursos.erro || 'Erro ao listar cursos', 'erro');
    return;
  }

  montarTabelaCursos(cursos);   // desenha a tabela de cursos
  preencherSelects(cursos);     // atualiza os dois <select>
}

function montarTabelaCursos(cursos) {
  if (!cursos.length) {
    tabelaCursos.innerHTML =
      '<tr><td colspan="3" class="vazio">Nenhum curso cadastrado ainda.</td></tr>';
    return;
  }

  tabelaCursos.innerHTML = '';                 // apaga as linhas antigas

  for (const curso of cursos) {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = curso.nome;

    const tdTotal = document.createElement('td');
    tdTotal.textContent = curso.total_alunos;   // o "N" de cada curso

    const btnVer = document.createElement('button');
    btnVer.textContent = 'Ver alunos';
    btnVer.className = 'btn btn-secundario btn-pequeno';
    btnVer.onclick = () => {
      filtroCurso.value = curso.id;   // escolhe o curso no filtro
      listarAlunos();                 // e lista só os alunos dele
    };

    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'Excluir';
    btnExcluir.className = 'btn btn-perigo btn-pequeno';
    btnExcluir.onclick = () => excluirCurso(curso.id, curso.nome);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'acoes';
    tdAcoes.appendChild(btnVer);
    tdAcoes.appendChild(document.createTextNode(' '));
    tdAcoes.appendChild(btnExcluir);

    tr.appendChild(tdNome);
    tr.appendChild(tdTotal);
    tr.appendChild(tdAcoes);
    tabelaCursos.appendChild(tr);
  }
}

function preencherSelects(cursos) {
  // guarda o que estava escolhido antes de redesenhar
  const filtroAtual = filtroCurso.value;
  const cursoAtual = selectCurso.value;

  // recomeça cada select só com a primeira opção
  filtroCurso.innerHTML = '<option value="">Todos os cursos</option>';
  selectCurso.innerHTML = '<option value="">Selecione um curso</option>';

  for (const curso of cursos) {
    // new Option(texto que aparece, valor enviado)
    filtroCurso.appendChild(new Option(curso.nome, curso.id));
    selectCurso.appendChild(new Option(curso.nome, curso.id));
  }

  // devolve a escolha anterior
  filtroCurso.value = filtroAtual;
  selectCurso.value = cursoAtual;

  // se o curso escolhido foi excluído, volta para a primeira opção
  if (filtroCurso.selectedIndex === -1) filtroCurso.value = '';
  if (selectCurso.selectedIndex === -1) selectCurso.value = '';
}

async function adicionarCurso(evento) {
  evento.preventDefault();                 // form-curso não recarrega a página

  const nome = inputNovoCurso.value.trim();

  const resposta = await fetch('/cursos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),      // { "nome": "ADS" }
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMsg(dados.erro || 'Erro ao cadastrar curso', 'erro');
    return;
  }

  inputNovoCurso.value = '';             // limpa o campo
  mostrarMsg(`Curso "${dados.nome}" cadastrado!`, 'ok');
  listarCursos();                        // o curso novo aparece na tabela e nos selects
}

async function excluirCurso(id, nome) {
  if (!confirm(`Excluir o curso "${nome}"?`)) return;

  const resposta = await fetch('/cursos/' + id, { method: 'DELETE' });
  const dados = await resposta.json();

  if (!resposta.ok) {
    // curso com alunos → a API respondeu 409 com a mensagem pronta
    mostrarMsg(dados.erro || 'Erro ao excluir curso', 'erro');
    return;
  }

  mostrarMsg('Curso excluído.', 'ok');
  atualizarTudo();
}

// ===================== ALUNOS (lado N) =====================

function abrirModalCriar() {
  // só a opção "Selecione um curso" → ainda não há cursos
  if (selectCurso.options.length <= 1) {
    mostrarMsg('Cadastre um curso antes de incluir alunos.', 'erro');
    return;
  }

  modo = 'criar';
  raEditando = '';
  modalTitulo.textContent = 'Novo aluno';
  form.reset();                         // limpa todos os campos do form
  selectCurso.value = filtroCurso.value; // já sugere o curso do filtro
  inputRa.disabled = false;             // RA pode ser digitado
  modal.hidden = false;                 // mostra o modal
  inputNome.focus();                    // cursor no campo Nome
}

function abrirModalEditar(aluno) {
  modo = 'editar';
  raEditando = aluno.ra;               // guardamos o RA para o PUT
  modalTitulo.textContent = 'Editar aluno';
  inputNome.value = aluno.nome || '';
  inputRa.value = aluno.ra || '';
  selectCurso.value = aluno.curso_id;   // seleciona o curso atual pelo id
  inputRa.disabled = true;             // RA bloqueado (não muda a chave)
  modal.hidden = false;
  inputNome.focus();
}

function fecharModal() {
  modal.hidden = true;
  form.reset();
  inputRa.disabled = false;              // libera RA para o próximo cadastro
}

// monta um <tr> com nome, RA, curso, Editar e Excluir, e devolve a linha
// (ela ainda não está na página: quem chama é que cola na tabela)
function linhaAluno(aluno) {
  const tr = document.createElement('tr');

  const tdNome = document.createElement('td');
  tdNome.textContent = aluno.nome;

  const tdRa = document.createElement('td');
  tdRa.textContent = aluno.ra;

  const tdCurso = document.createElement('td');
  tdCurso.textContent = aluno.curso ? aluno.curso.nome : '—';
  // aluno.curso = { id, nome } que veio da tabela cursos

  const btnEditar = document.createElement('button');
  btnEditar.textContent = 'Editar';
  btnEditar.className = 'btn btn-secundario btn-pequeno';
  btnEditar.onclick = () => abrirModalEditar(aluno);

  const btnExcluir = document.createElement('button');
  btnExcluir.textContent = 'Excluir';
  btnExcluir.className = 'btn btn-perigo btn-pequeno';
  btnExcluir.onclick = () => excluirAluno(aluno.ra, aluno.nome);

  const tdAcoes = document.createElement('td');
  tdAcoes.className = 'acoes';
  tdAcoes.appendChild(btnEditar);
  tdAcoes.appendChild(document.createTextNode(' '));
  tdAcoes.appendChild(btnExcluir);

  tr.appendChild(tdNome);              // encaixa as células na linha...
  tr.appendChild(tdRa);
  tr.appendChild(tdCurso);
  tr.appendChild(tdAcoes);
  return tr;
}

// a frase embaixo da tabela: conta em que ponto a lista parou
function atualizarStatus() {
  if (alunosErro) {
    alunosStatus.textContent =
      'A lista não carregou. Use Atualizar lista para tentar de novo.';
  } else if (alunosCarregando && alunosInicio === 0) {
    alunosStatus.textContent = 'Carregando...';
  } else if (!alunosTotal) {
    alunosStatus.textContent = 'Nenhum aluno para mostrar.';
  } else if (alunosCarregando) {
    alunosStatus.textContent =
      `Mostrando ${alunosInicio} de ${alunosTotal}. Carregando mais...`;
  } else if (alunosTemMais) {
    alunosStatus.textContent =
      `Mostrando ${alunosInicio} de ${alunosTotal}. Role a tela para carregar mais.`;
  } else {
    alunosStatus.textContent =
      `Mostrando ${alunosInicio} de ${alunosTotal}. Fim da lista.`;
  }
}

// acrescentar = false → recomeça do zero; true → cola as próximas 5 embaixo
async function listarAlunos(acrescentar = false) {
  if (acrescentar && (alunosCarregando || !alunosTemMais)) return;
  const pedido = acrescentar ? alunosPedido : ++alunosPedido;
  const inicio = acrescentar ? alunosInicio : 0;

  alunosCarregando = true;
  alunosErro = false;

  if (!acrescentar) {
    alunosInicio = 0;
    alunosTotal = 0;
    alunosTemMais = false;
    tabela.innerHTML =
      '<tr><td colspan="4" class="vazio">Carregando...</td></tr>';
  }
  atualizarStatus();

  try {
    const cursoId = filtroCurso.value;
    const base = cursoId ? `/cursos/${cursoId}/alunos` : '/alunos';
    const resposta = await fetch(`${base}?inicio=${inicio}&limite=${ALUNOS_POR_PAGINA}`);
    const dados = await resposta.json();
    if (pedido !== alunosPedido) return;

    if (!resposta.ok) {
      mostrarMsg(dados.erro || 'Erro ao listar alunos', 'erro');
      alunosErro = true;
      alunosTemMais = false;
      if (!acrescentar) {
        tabela.innerHTML =
          '<tr><td colspan="4" class="vazio">Não foi possível carregar a lista</td></tr>';
      }
      return;
    }

    const alunos = dados.alunos || [];
    alunosTotal = dados.total || 0;

    if (!acrescentar) tabela.innerHTML = '';

    if (!alunosTotal) {
      tabela.innerHTML =
        '<tr><td colspan="4" class="vazio">Nenhum aluno encontrado</td></tr>';
      alunosTemMais = false;
      return;
    }

    for (const aluno of alunos) {
      tabela.appendChild(linhaAluno(aluno));
    }
    alunosInicio = inicio + alunos.length;
    alunosTemMais = alunos.length > 0 && alunosInicio < alunosTotal;
  } catch (e) {
    if (pedido !== alunosPedido) return;
    mostrarMsg('Erro ao listar alunos', 'erro');
    alunosErro = true;
    alunosTemMais = false;
    if (!acrescentar) {
      tabela.innerHTML =
        '<tr><td colspan="4" class="vazio">Não foi possível carregar a lista</td></tr>';
    }
  } finally {
    // só a busca que vale agora desliga o "carregando"
    if (pedido === alunosPedido) {
      alunosCarregando = false;
      atualizarStatus();
      pedirMaisSeVisivel();   // se o marcador ainda está à vista, pede a próxima leva
    }
  }
}

// como a tela sabe que você chegou embaixo
function pedirMaisSeVisivel() {
  if (!alunosTemMais || alunosCarregando) return;
  const topo = sentinelaAlunos.getBoundingClientRect().top;
  if (topo <= window.innerHeight + 160) listarAlunos(true);
}
window.addEventListener('scroll', pedirMaisSeVisivel);
window.addEventListener('resize', pedirMaisSeVisivel);

async function salvarAluno(evento) {
  evento.preventDefault();   // evento = objeto do submit; cancela o reload

  const nome = inputNome.value.trim();
  const ra = inputRa.value.trim();
  const curso_id = Number(selectCurso.value);    // "1" (texto) → 1 (número)

  if (modo === 'criar') {
    const resposta = await fetch('/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, ra, curso_id }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMsg(dados.erro || 'Erro ao cadastrar', 'erro');
      return;
    }
    mostrarMsg('Aluno cadastrado com sucesso!', 'ok');
  }
  else {
    const resposta = await fetch('/alunos/' + encodeURIComponent(raEditando), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, curso_id }),   // trocar de curso = novo curso_id
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMsg(dados.erro || 'Erro ao atualizar', 'erro');
      return;
    }
    if (!dados.length) {
      mostrarMsg('RA não encontrado', 'erro');
      return;
    }
    mostrarMsg('Aluno atualizado com sucesso!', 'ok');
  }

  fecharModal();
  atualizarTudo();   // a contagem de alunos por curso também muda
}

async function excluirAluno(ra, nome) {
  if (!confirm(`Excluir o aluno "${nome}" (RA ${ra})?`)) return;

  const resposta = await fetch('/alunos/' + encodeURIComponent(ra), {
    method: 'DELETE',
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    mostrarMsg(dados.erro || 'Erro ao excluir', 'erro');
    return;
  }
  mostrarMsg('Aluno excluído.', 'ok');
  atualizarTudo();
}

async function atualizarTudo() {
  await listarCursos();    // 1º os cursos: preenche o filtro e o select
  await listarAlunos();    // 2º os alunos: já usa o filtro preenchido
}

document.getElementById('btn-novo').addEventListener('click', abrirModalCriar);
document.getElementById('btn-atualizar').addEventListener('click', atualizarTudo);
document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
document.getElementById('modal-fundo').addEventListener('click', fecharModal);
form.addEventListener('submit', salvarAluno);
formCurso.addEventListener('submit', adicionarCurso);
filtroCurso.addEventListener('change', () => listarAlunos(false));
window.addEventListener('scroll', pedirMaisSeVisivel);   // pede a próxima página

atualizarTudo();     // roda 1 vez ao abrir a página