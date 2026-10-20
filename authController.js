const authService = require('../services/authService');

exports.login = async (req, res) => {
  const resultado = await authService.login(req.body.email, req.body.senha);
  res.json(resultado);
};

exports.me = (req, res) => {
  res.json(req.usuario);
};

exports.criarUsuario = async (req, res) => {
  const usuario = await authService.criarUsuario(req.body);
  res.status(201).json(usuario);
};

exports.listarUsuarios = async (req, res) => {
  res.json(await authService.listarUsuarios());
};
