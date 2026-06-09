require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const crypto = require('crypto');

async function migrate(pool) {
  try {
    console.log('🔄 Iniciando migração: criar tabela devices...');

    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devices'`
    );

    if (tables.length === 0) {
      console.log('  → Criando tabela devices...');
      await pool.execute(`
        CREATE TABLE devices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(100) NOT NULL UNIQUE,
          token VARCHAR(255) NOT NULL UNIQUE,
          owner_user_id INT NOT NULL,
          active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_devices_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_devices_token (token),
          INDEX idx_devices_device_id (device_id),
          INDEX idx_devices_owner (owner_user_id)
        )
      `);
      console.log('  ✓ Tabela devices criada');
    } else {
      console.log('  ✓ Tabela devices já existe');
    }

    const [users] = await pool.execute('SELECT id, username FROM users WHERE username IN (?, ?, ?, ?)', ['teste', 'cliente', 'aula', 'amendoim']);

    for (const user of users) {
      const [existentes] = await pool.execute(
        'SELECT id FROM devices WHERE owner_user_id = ?',
        [user.id]
      );

      if (existentes.length === 0) {
        console.log(`  → Criando dispositivo padrão para "${user.username}"...`);
        const deviceId = `esp_${user.username}`;
        const token = crypto.randomBytes(32).toString('hex');

        await pool.execute(
          'INSERT INTO devices (device_id, token, owner_user_id, active) VALUES (?, ?, ?, 1)',
          [deviceId, token, user.id]
        );

        console.log(`  ✓ Dispositivo criado: ${deviceId}`);
        console.log(`    Token: ${token}`);
      } else {
        console.log(`  ✓ Dispositivo já existe para "${user.username}"`);
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
  } catch (erro) {
    console.error('\n❌ Erro durante a migração:', erro.message);
    throw erro;
  }
}

if (require.main === module) {
  const { pool } = require('../config/db');
  migrate(pool).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = migrate;
