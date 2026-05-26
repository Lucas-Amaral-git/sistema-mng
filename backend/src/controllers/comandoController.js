const { publicarComando } = require('../services/mqttService');

async function enviar(req, res, next) {
  try {
    const { comando, dados } = req.body;

    if (!comando) {
      res.status(400).json({ mensagem: 'O campo comando e obrigatorio' });
      return;
    }

    const payload = {
      comando,
      dados: dados || {},
      timestamp: new Date().toISOString()
    };

    await publicarComando(payload);

    res.json({ mensagem: 'Comando enviado com sucesso', payload });
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  enviar
};