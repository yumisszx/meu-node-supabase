require('dotenv').config();

const express = require('express');

const {inserirAluno, listarAlunos, buscarPorRa, atualizarCurso, excluirPorRa}= require('./supabase');

const path = require('path');

const cors = require('cors');

const app= express();

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/alunos', async (req, res) =>{
    try{
        const dados = await listarAlunos();
        res.json(dados);
    } catch (e){
        res.status(500).json({erro: e.message});
    }
});

app.get('/alunos/:ra', async (req, res) =>{
    try{
        const aluno = await buscarPorRa(req.params.ra);

        if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado'});
        res.json(aluno);
    } catch (e){
        res.status(500).json({erro: e.message});
    }
});

app.post('/alunos', async (req, res) => {
    try {
        const {nome, ra, curso} = req.body;

        if (!nome || !ra){
            return res.status(400).json({
                erro: 'Campos obrigatórios: nome e ra',
            });
        }

        const aluno = await inserirAluno(nome, ra, curso);

        res.status(201).json(aluno);
    }catch (e){
        res.statusCode(400).json({erro: e.message});
    }
});

app.put('/alunos/:ra', async (req, res) => {
    try{
        const data = await atualizarCurso(req.params.ra, req.body.curso);
        res.json(data);
    }catch (e){
        res.status(400).json({erro: e.message});
    }
});

app.delete('/alunos/:ra', async (req, res) => {
  try {
    const data = await excluirPorRa(req.params.ra);
    res.json(data);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('API rodando em http://localhost:${PORT}');
});