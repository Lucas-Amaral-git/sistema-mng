const { publicarComando } = require('../services/mqttService');
const { pool } = require('../config/db');

async function resolverDeviceId(req, deviceIdInformado) {
  if (deviceIdInformado) {
    return deviceIdInformado;
  }

  const userId = req.user?.sub;
  if (!userId) {
    return null;
  }

  const [dispositivos] = await pool.execute(
    'SELECT device_id FROM devices WHERE owner_user_id = ? AND active = 1 LIMIT 1',
    [userId]
  );

  if (!dispositivos.length) {
    return null;
  }

  return dispositivos[0].device_id;
}

async function enviar(req, res, next) {
  try {
    const { comando, dados, device_id: deviceIdInformado } = req.body;

    if (!comando) {
      res.status(400).json({ mensagem: 'O campo comando e obrigatorio' });
      return;
    }

    const deviceId = await resolverDeviceId(req, deviceIdInformado);
    if (!deviceId) {
      res.status(400).json({ mensagem: 'Nenhum device_id informado e nenhum dispositivo ativo encontrado para o usuario' });
      return;
    }

    const payload = {
      comando,
      dados: dados || {},
      timestamp: new Date().toISOString()
    };

    await publicarComando(payload, deviceId);

    res.json({ mensagem: 'Comando enviado com sucesso', device_id: deviceId, payload });
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  enviar
};