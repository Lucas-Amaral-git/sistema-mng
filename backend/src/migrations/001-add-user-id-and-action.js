require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('🔄 Iniciando migração: adicionar user_id e action à tabela pesos...');

    // Verificar se as colunas já existem
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pesos' AND TABLE_SCHEMA = DATABASE()
    `);

    const columnNames = columns.map(col => col.COLUMN_NAME);
    const hasUserIdColumn = columnNames.includes('user_id');
    const hasActionColumn = columnNames.includes('action');

    // Adicionar coluna user_id se não existir
    if (!hasUserIdColumn) {
      console.log('  → Adicionando coluna user_id...');
      await pool.execute(`
        ALTER TABLE pesos ADD COLUMN user_id INT NULL
      `);
      console.log('  ✓ Coluna user_id adicionada');
    } else {
      console.log('  ✓ Coluna user_id já existe');
    }

    // Adicionar coluna action se não existir
    if (!hasActionColumn) {
      console.log('  → Adicionando coluna action...');
      await pool.execute(`
        ALTER TABLE pesos ADD COLUMN action VARCHAR(20) DEFAULT 'estabilidade'
      `);
      console.log('  ✓ Coluna action adicionada');
    } else {
      console.log('  ✓ Coluna action já existe');
    }

    // Adicionar índice se não existir
    const [indexes] = await pool.execute(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_NAME = 'pesos' AND TABLE_SCHEMA = DATABASE() AND INDEX_NAME = 'idx_pesos_user_timestamp'
    `);

    if (indexes.length === 0) {
      console.log('  → Adicionando índice idx_pesos_user_timestamp...');
      await pool.execute(`
        CREATE INDEX idx_pesos_user_timestamp ON pesos(user_id, timestamp)
      `);
      console.log('  ✓ Índice adicionado');
    } else {
      console.log('  ✓ Índice já existe');
    }

    // Adicionar foreign key se não existir
    const [fks] = await pool.execute(`
      SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'pesos' AND COLUMN_NAME = 'user_id' AND REFERENCED_TABLE_NAME = 'users'
    `).catch(() => [[]]);

    if (fks.length === 0 && hasUserIdColumn) {
      console.log('  → Adicionando constraint de chave estrangeira...');
      try {
        await pool.execute(`
          ALTER TABLE pesos 
          ADD CONSTRAINT fk_pesos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('  ✓ Constraint adicionada');
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('already exists')) {
          console.log('  ✓ Constraint já existe');
        } else {
          console.log('  ⚠ Constraint já existe ou não pode ser adicionada:', e.message);
        }
      }
    } else if (fks.length > 0) {
      console.log('  ✓ Constraint já existe');
    }

    // Verificar se há dados e fazer seed
    const [pesoRows] = await pool.execute('SELECT COUNT(*) AS total FROM pesos');
    const totalPesos = pesoRows[0]?.total || 0;

    if (totalPesos === 0) {
      console.log('  → Nenhum registro encontrado. Fazendo seed de dados...');

      // Garantir que os usuários existem
      const usuariosDemo = [
        { username: 'teste', password: 'teste#123' },
        { username: 'cliente', password: 'cliente#123' }
      ];

      for (const usuario of usuariosDemo) {
        const [rows] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [usuario.username]);
        if (!rows.length) {
          const hash = await bcrypt.hash(usuario.password, 10);
          await pool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [usuario.username, hash]);
          console.log(`    ✓ Usuário criado: ${usuario.username}`);
        }
      }

      // Recuperar IDs dos usuários
      const [[userTeste]] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['teste']);
      const [[userCliente]] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['cliente']);
      const testeId = userTeste?.id;
      const clienteId = userCliente?.id;

      const baseDate = new Date();

      // Dados de exemplo para usuário 'teste'
      const exemplosTeste = [
        { peso: 5.00, diasAtras: 5, action: 'adicao' },
        { peso: 4.95, diasAtras: 4, action: 'reducao' },
        { peso: 4.95, diasAtras: 3, action: 'estabilidade' },
        { peso: 5.20, diasAtras: 2, action: 'adicao' },
        { peso: 5.10, diasAtras: 1, action: 'reducao' }
      ];

      // Dados de exemplo para usuário 'cliente'
      const exemplosCliente = [
        { peso: 4.82, diasAtras: 5, action: 'estabilidade' },
        { peso: 4.78, diasAtras: 4, action: 'reducao' },
        { peso: 4.70, diasAtras: 3, action: 'reducao' },
        { peso: 4.75, diasAtras: 2, action: 'adicao' },
        { peso: 4.75, diasAtras: 1, action: 'estabilidade' }
      ];

      // Inserir dados para usuário 'teste'
      for (const exemplo of exemplosTeste) {
        const data = new Date(baseDate);
        data.setDate(baseDate.getDate() - exemplo.diasAtras);
        data.setHours(8, 30, 0, 0);
        await pool.execute(
          'INSERT INTO pesos (peso, timestamp, action, user_id) VALUES (?, ?, ?, ?)',
          [exemplo.peso, data, exemplo.action, testeId]
        );
      }
      console.log(`    ✓ ${exemplosTeste.length} registros inseridos para usuário 'teste'`);

      // Inserir dados para usuário 'cliente'
      for (const exemplo of exemplosCliente) {
        const data = new Date(baseDate);
        data.setDate(baseDate.getDate() - exemplo.diasAtras);
        data.setHours(9, 15, 0, 0);
        await pool.execute(
          'INSERT INTO pesos (peso, timestamp, action, user_id) VALUES (?, ?, ?, ?)',
          [exemplo.peso, data, exemplo.action, clienteId]
        );
      }
      console.log(`    ✓ ${exemplosCliente.length} registros inseridos para usuário 'cliente'`);
    } else {
      console.log(`  ℹ Tabela já possui ${totalPesos} registros. Seed não foi executado.`);
    }

    console.log('\n✅ Migração concluída com sucesso!\n');
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
