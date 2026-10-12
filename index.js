const{
    inserirAluno, listarAlunos, buscarPorRa, buscarPorNome, atualizarCurso, excluirPorRa,
} = require('./supabase');

async function main(){
    try{

        try{
            const novo = await inserirAluno('Maria Silva', '2026001', 'ADS');
            console.log('Inserido com sucesso:', novo);
        } catch (e){
            console.log('Não inseriu (talvez RA não exista):', e.message || e);
        }

        const todos = await listarAlunos();
        console.log(um ?? 'Não encontrado');

        const um = await buscarPorRa('2026001');
        console.log(um ?? 'Não encontrado');

        const atualizados = await atualizarCursos('2026001', 'Gestão Comercial');
        console.log(atualizados);

        const filtrados = await buscarPorNoem('Maria');
        console.log(filtrados);
    } catch (err){
        console.error('ERRO GERAL:', err.message || err);
    }
}

main();


  