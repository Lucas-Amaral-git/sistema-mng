const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const bcrypt = require('bcryptjs');

async function initDatabase() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS pesos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      peso DECIMAL(10, 3) NOT NULL,
      timestamp DATETIME NOT NULL,
      action VARCHAR(20) DEFAULT 'estabilidade',
      user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pesos_user_timestamp (user_id, timestamp),
      CONSTRAINT fk_pesos_user FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const usuariosDemo = [
    { username: 'teste', password: 'teste#123' },
    { username: 'cliente', password: 'cliente#123' }
  ];

  for (const usuario of usuariosDemo) {
    const [rows] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [usuario.username]);

    if (!rows.length) {
      const hash = await bcrypt.hash(usuario.password, 10);
      await pool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [usuario.username, hash]);
      console.log(`Usuario demo criado: ${usuario.username}`);
    }
  }

  // recuperar ids dos usuarios para semear dados por usuario
  const [[userTeste]] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['teste']).catch(() => [[]]);
  const [[userCliente]] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['cliente']).catch(() => [[]]);
  const testeId = userTeste?.id || null;
  const clienteId = userCliente?.id || null;

  const [pesoRows] = await pool.execute('SELECT COUNT(*) AS total FROM pesos');

  if ((pesoRows[0]?.total || 0) === 0) {
    const baseDate = new Date();

    const exemplosTeste = [
      { peso: 5.00, diasAtras: 5, action: 'adicao' },
      { peso: 4.95, diasAtras: 4, action: 'reducao' },
      { peso: 4.95, diasAtras: 3, action: 'estabilidade' },
      { peso: 5.20, diasAtras: 2, action: 'adicao' },
      { peso: 5.10, diasAtras: 1, action: 'reducao' }
    ];

    const exemplosCliente = [
      { peso: 4.82, diasAtras: 5, action: 'estabilidade' },
      { peso: 4.78, diasAtras: 4, action: 'reducao' },
      { peso: 4.70, diasAtras: 3, action: 'reducao' },
      { peso: 4.75, diasAtras: 2, action: 'adicao' },
      { peso: 4.75, diasAtras: 1, action: 'estabilidade' }
    ];

    for (const exemplo of exemplosTeste) {
      const data = new Date(baseDate);
      data.setDate(baseDate.getDate() - exemplo.diasAtras);
      data.setHours(8, 30, 0, 0);
      await pool.execute('INSERT INTO pesos (peso, timestamp, action, user_id) VALUES (?, ?, ?, ?)', [exemplo.peso, data, exemplo.action, testeId]);
    }

    for (const exemplo of exemplosCliente) {
      const data = new Date(baseDate);
      data.setDate(baseDate.getDate() - exemplo.diasAtras);
      data.setHours(9, 15, 0, 0);
      await pool.execute('INSERT INTO pesos (peso, timestamp, action, user_id) VALUES (?, ?, ?, ?)', [exemplo.peso, data, exemplo.action, clienteId]);
    }

    console.log('Registros de exemplo inseridos na tabela pesos (por usuário, com action)');
  }
}

module.exports = {
  pool,
  initDatabase
};