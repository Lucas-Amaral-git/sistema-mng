const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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

async function ensureBaseSchema() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS alimentacoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(255) NOT NULL,
      distance_cm DECIMAL(8,3) NULL,
      event VARCHAR(100) NULL,
      timestamp DATETIME NOT NULL,
      user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  for (const file of files) {
    const migrationPath = path.join(migrationsDir, file);
    console.log(`Executando migration ${file}...`);
    const migrationModule = require(migrationPath);

    // Suporta várias formas de migrations: export default function, função direta,
    // ou arquivos que chamam migrate() ao serem requeridos. Tentamos executar
    // a função exportada quando disponível, caso contrário assumimos que o
    // arquivo já executou sua lógica ao ser requerido.
    try {
      if (typeof migrationModule === 'function') {
        await migrationModule(pool);
      } else if (typeof migrationModule.default === 'function') {
        await migrationModule.default(pool);
      } else if (typeof migrationModule.migrate === 'function') {
        await migrationModule.migrate(pool);
      } else {
        // migration may have executed on require(); continue
      }
    } catch (e) {
      console.error(`Erro executando migration ${file}:`, e.message);
      throw e;
    }
  }
}

async function initDatabase() {
  await ensureBaseSchema();
  await runMigrations();

  const usuariosDemo = [
    { username: 'teste', password: 'teste#123' },
    { username: 'cliente', password: 'cliente#123' },
    { username: 'aula', password: 'aula#123' },
    { username: 'amendoim', password: 'amendoim#123' }
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

  // As seeds de alimentacoes são tratadas pelas migrations em src/migrations
}

module.exports = {
  pool,
  initDatabase
};