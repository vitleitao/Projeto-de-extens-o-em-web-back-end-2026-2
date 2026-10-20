// Valida body/query/params com um schema do Zod antes de chegar no controller
module.exports = (schema, origem = 'body') => (req, res, next) => {
  const resultado = schema.safeParse(req[origem]);

  if (!resultado.success) {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: resultado.error.issues.map((i) => ({
        campo: i.path.join('.'),
        mensagem: i.message,
      })),
    });
  }

  req[origem] = resultado.data;
  return next();
};
