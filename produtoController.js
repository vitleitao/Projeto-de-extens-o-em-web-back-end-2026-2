const produtoService = require('../services/produtoService');

exports.listar = async (req, res) => {
  res.json(await produtoService.listar(req.query, req.usuario.perfil));
};

exports.buscar = async (req, res) => {
  res.json(await produtoService.buscarPorId(req.params.id, req.usuario.perfil));
};

exports.criar = async (req, res) => {
  const produto = await produtoService.criar(req.body, req.usuario.id);
  res.status(201).json(produto);
};

exports.atualizar = async (req, res) => {
  res.json(await produtoService.atualizar(req.params.id, req.body));
};

exports.desativar = async (req, res) => {
  res.json(await produtoService.desativar(req.params.id));
};
