require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../config/db');

async function migrate() {
  try {
    console.log('🔄 Iniciando migração: criar tabela alimentacoes se não existir...');

    // Criar tabela se não existir
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS alimentacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        distance_cm DECIMAL(8,3) NULL,
        event VARCHAR(100) NULL,
        timestamp DATETIME NOT NULL,
        user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Adicionar índice simples
    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_alimentacoes_user_timestamp ON alimentacoes(user_id, timestamp)
    `).catch(() => {});

    // Adicionar foreign key se possível
    const [fks] = await pool.execute(`
      SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'alimentacoes' AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME = 'users'
    `).catch(() => [[]]);

    if (fks.length === 0) {
      try {
        await pool.execute(`
          ALTER TABLE alimentacoes 
          ADD CONSTRAINT fk_alimentacoes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        `);
      } catch (e) {
        // ignore
      }
    }

    // Seed de exemplo caso tabela vazia
    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM alimentacoes');
    const total = rows[0]?.total || 0;

    if (total === 0) {
      console.log('  → Inserindo registros de exemplo em alimentacoes...');

      // buscar um dispositivo e usuario existentes
      const [[device]] = await pool.execute('SELECT device_id, owner_user_id FROM devices LIMIT 1');
      const deviceId = device?.device_id || 'demo-device-1';
      const userId = device?.owner_user_id || null;

      const now = new Date();

      const exemplos = [
        { diasAtras: 2, hora: '08:00:00' },
        { diasAtras: 2, hora: '12:00:00' },
        { diasAtras: 1, hora: '08:15:00' },
        { diasAtras: 0, hora: '07:50:00' },
        { diasAtras: 0, hora: '18:30:00' }
      ];

      for (const ex of exemplos) {
        const d = new Date(now);
        d.setDate(now.getDate() - ex.diasAtras);
        const [hh, mm, ss] = ex.hora.split(':').map(Number);
        d.setHours(hh, mm, ss, 0);

        await pool.execute(
          'INSERT INTO alimentacoes (device_id, distance_cm, timestamp, event, user_id) VALUES (?, ?, ?, ?, ?)',
          [deviceId, 10 + Math.random() * 20, d, 'alimentou', userId]
        );
      }

      console.log('  ✓ Registros de exemplo inseridos em alimentacoes');
    } else {
      console.log('  ✓ Tabela alimentacoes já possui registros; seed ignorado.');
    }

    console.log('\n✅ Migração alimentacoes concluída com sucesso!\n');
  } catch (error) {
    console.error('\n❌ Erro durante a migração de alimentacoes:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
