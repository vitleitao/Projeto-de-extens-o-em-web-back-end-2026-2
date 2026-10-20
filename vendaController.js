const vendaService = require('../services/vendaService');

exports.registrar = async (req, res) => {
  const venda = await vendaService.registrarVenda(req.body, req.usuario.id);
  res.status(201).json(venda);
};

exports.listar = async (req, res) => {
  res.json(await vendaService.listarVendas(req.query));
};
