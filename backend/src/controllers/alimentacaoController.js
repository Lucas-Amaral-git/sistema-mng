const { listarAlimentacoes, obterUltimaAlimentacao } = require('../services/alimentacaoService');

async function listar(req, res, next) {
  try {
    const userId = req.user?.sub || null;
    const registros = await listarAlimentacoes(userId);
    res.json(registros);
  } catch (erro) {
    next(erro);
  }
}

async function ultima(req, res, next) {
  try {
    const userId = req.user?.sub || null;
    const registro = await obterUltimaAlimentacao(userId);

    if (!registro) {
      res.status(404).json({ mensagem: 'Nenhum evento de alimentacao registrado ainda' });
      return;
    }

    res.json(registro);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listar,
  ultima
};
