const { pool } = require('../config/db');
const { calcularMetricasAlimentacao } = require('../utils/metricas');

function normalizarTimestamp(timestamp) {
  const data = timestamp ? new Date(timestamp) : new Date();

  if (Number.isNaN(data.getTime())) {
    return new Date();
  }

  return data;
}

async function salvarAlimentacao({ device_id, distance_cm, timestamp, userId = null, event = null }) {
  const data = normalizarTimestamp(timestamp);

  await pool.execute(
    'INSERT INTO alimentacoes (device_id, distance_cm, timestamp, event, user_id) VALUES (?, ?, ?, ?, ?)',
    [device_id, distance_cm, data, event, userId]
  );
}

async function listarAlimentacoes(userId = null) {
  let query = 'SELECT id, device_id, distance_cm, timestamp, event, user_id FROM alimentacoes';
  let params = [];

  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY timestamp ASC, id ASC';

  const [registros] = await pool.execute(query, params);

  return calcularMetricasAlimentacao(registros);
}

async function obterUltimaAlimentacao(userId = null) {
  const registros = await listarAlimentacoes(userId);

  if (!registros.length) {
    return null;
  }

  return registros[registros.length - 1];
}

module.exports = {
  salvarAlimentacao,
  listarAlimentacoes,
  obterUltimaAlimentacao
};
