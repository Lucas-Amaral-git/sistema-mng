const { pool } = require('../config/db');

async function obterDispositivo(req, res, next) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ mensagem: 'Não autenticado' });
    }

    const [dispositivos] = await pool.execute(
      'SELECT id, device_id, token, created_at FROM devices WHERE owner_user_id = ? AND active = 1 LIMIT 1',
      [userId]
    );

    if (dispositivos.length === 0) {
      return res.status(404).json({ mensagem: 'Nenhum dispositivo configurado' });
    }

    const dispositivo = dispositivos[0];

    res.json({
      device_id: dispositivo.device_id,
      token: dispositivo.token,
      created_at: dispositivo.created_at
    });
  } catch (erro) {
    next(erro);
  }
}

async function regenerarToken(req, res, next) {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ mensagem: 'Não autenticado' });
    }

    const crypto = require('crypto');
    const novoToken = crypto.randomBytes(32).toString('hex');

    const [resultado] = await pool.execute(
      'UPDATE devices SET token = ?, updated_at = NOW() WHERE owner_user_id = ? AND active = 1',
      [novoToken, userId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Nenhum dispositivo para regenerar token' });
    }

    res.json({
      mensagem: 'Token regenerado com sucesso',
      token: novoToken
    });
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  obterDispositivo,
  regenerarToken
};
