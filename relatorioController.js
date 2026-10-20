const relatorioService = require('../services/relatorioService');

exports.reposicao = async (req, res) => {
  res.json(await relatorioService.reposicao());
};

exports.parados = async (req, res) => {
  res.json(await relatorioService.parados(req.query.dias || 60));
};

exports.validade = async (req, res) => {
  res.json(await relatorioService.validade(req.query.dias || 30));
};

exports.maisVendidos = async (req, res) => {
  res.json(await relatorioService.maisVendidos(req.query));
};
