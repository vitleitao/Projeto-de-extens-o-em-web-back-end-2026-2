const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }

  // P2002 = violação de campo único (ex.: código de barras repetido)
  if (err.code === 'P2002') {
    const campo = err.meta && err.meta.target ? [].concat(err.meta.target).join(', ') : 'campo';
    return res.status(409).json({ erro: `Já existe um registro com este ${campo}.` });
  }

  // P2025 = registro não encontrado em update/delete
  if (err.code === 'P2025') {
    return res.status(404).json({ erro: 'Registro não encontrado.' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' });
};
