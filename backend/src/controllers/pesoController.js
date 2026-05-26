const { listarPesos, obterUltimoPeso } = require('../services/pesoService');

async function listar(req, res, next) {
  try {
    const userId = req.user?.sub || null;
    const pesos = await listarPesos(userId);
    res.json(pesos);
  } catch (erro) {
    next(erro);
  }
}

async function ultimo(req, res, next) {
  try {
    const userId = req.user?.sub || null;
    const peso = await obterUltimoPeso(userId);

    if (!peso) {
      res.status(404).json({ mensagem: 'Nenhum peso registrado ainda' });
      return;
    }

    res.json(peso);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listar,
  ultimo
};