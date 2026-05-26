const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function findUserByUsername(username) {
  const [rows] = await pool.execute('SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

async function createUser({ username, password }) {
  const hash = await bcrypt.hash(password, 10);
  await pool.execute('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, NOW())', [username, hash]);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  findUserByUsername,
  createUser,
  verifyPassword
};