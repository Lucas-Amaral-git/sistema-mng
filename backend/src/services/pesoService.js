const { pool } = require('../config/db');
const { calcularMetricas, numeroSeguro } = require('../utils/metricas');

function normalizarTimestamp(timestamp) {
  const data = timestamp ? new Date(timestamp) : new Date();

  if (Number.isNaN(data.getTime())) {
    return new Date();
  }

  return data;
}

async function salvarPeso({ peso, timestamp, userId = null, action = 'estabilidade' }) {
  const valor = numeroSeguro(peso);
  const data = normalizarTimestamp(timestamp);

  await pool.execute(
    'INSERT INTO pesos (peso, timestamp, user_id, action) VALUES (?, ?, ?, ?)',
    [valor, data, userId, action]
  );
}

async function listarPesos(userId = null) {
  let query = 'SELECT id, peso, timestamp, action, user_id FROM pesos';
  let params = [];

  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY timestamp ASC, id ASC';

  const [registros] = await pool.execute(query, params);

  return calcularMetricas(registros);
}

async function obterUltimoPeso(userId = null) {
  let query = 'SELECT id, peso, timestamp, action, user_id FROM pesos';
  let params = [];

  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY timestamp DESC, id DESC LIMIT 1';

  const [registros] = await pool.execute(query, params);

  if (!registros.length) {
    return null;
  }

  const ultimo = registros[0];
  
  let anteriorQuery = 'SELECT peso, timestamp FROM pesos WHERE timestamp < ?';
  let anteriorParams = [ultimo.timestamp];

  if (userId) {
    anteriorQuery += ' AND user_id = ?';
    anteriorParams.push(userId);
  }

  anteriorQuery += ' ORDER BY timestamp DESC, id DESC LIMIT 1';

  const [anterior] = await pool.execute(anteriorQuery, anteriorParams);

  const pesoAnterior = anterior[0] || null;

  return {
    ...ultimo,
    peso: numeroSeguro(ultimo.peso),
    variacao_peso: pesoAnterior ? numeroSeguro(ultimo.peso - pesoAnterior.peso) : null,
    consumo_estimado: pesoAnterior ? numeroSeguro(Math.max(0, pesoAnterior.peso - ultimo.peso)) : null
  };
}

module.exports = {
  salvarPeso,
  listarPesos,
  obterUltimoPeso
};