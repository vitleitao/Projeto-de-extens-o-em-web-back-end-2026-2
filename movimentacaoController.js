const movimentacaoService = require('../services/movimentacaoService');

exports.entrada = async (req, res) => {
  res.status(201).json(await movimentacaoService.entrada(req.body, req.usuario.id));
};

exports.usoInterno = async (req, res) => {
  res.status(201).json(await movimentacaoService.usoInterno(req.body, req.usuario.id));
};

exports.ajuste = async (req, res) => {
  res.status(201).json(await movimentacaoService.ajuste(req.body, req.usuario.id));
};

exports.historico = async (req, res) => {
  res.json(await movimentacaoService.historico(req.query));
};
