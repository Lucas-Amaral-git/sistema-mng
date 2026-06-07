require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');

async function seedData(pool) {
  try {
    console.log('🌱 Iniciando seed de dados para ambos os usuários...\n');

    const usuariosDemo = [
      { username: 'teste', password: 'teste#123' },
      { username: 'cliente', password: 'cliente#123' }
    ];

    for (const usuario of usuariosDemo) {
      const [rows] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [usuario.username]);
      if (!rows.length) {
        const hash = await bcrypt.hash(usuario.password, 10);
        await pool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [usuario.username, hash]);
        console.log(`  ✓ Usuário criado: ${usuario.username}`);
      } else {
        console.log(`  ✓ Usuário já existe: ${usuario.username}`);
      }
    }

    const [[userTeste]] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['teste']);
    const [[userCliente]] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['cliente']);
    const testeId = userTeste?.id;
    const clienteId = userCliente?.id;

    if (!testeId || !clienteId) {
      throw new Error('Não foi possível recuperar IDs dos usuários');
    }

    const [count] = await pool.execute('SELECT COUNT(*) as cnt FROM pesos');
    if ((count[0]?.cnt || 0) > 0) {
      console.log('\n  ℹ Já existem registros de pesos. Seed de amostra foi pulado.');
      return;
    }

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

    console.log('\n  → Inserindo dados para usuário "teste"...');
    for (const exemplo of exemplosTeste) {
      const data = new Date(baseDate);
      data.setDate(baseDate.getDate() - exemplo.diasAtras);
      data.setHours(8, 30, 0, 0);
      await pool.execute(
        'INSERT INTO pesos (peso, timestamp, action, user_id) VALUES (?, ?, ?, ?)',
        [exemplo.peso, data, exemplo.action, testeId]
      );
    }
    console.log(`  ✓ ${exemplosTeste.length} registros inseridos para "teste"`);

    console.log('\n  → Inserindo dados para usuário "cliente"...');
    for (const exemplo of exemplosCliente) {
      const data = new Date(baseDate);
      data.setDate(baseDate.getDate() - exemplo.diasAtras);
      data.setHours(9, 15, 0, 0);
      await pool.execute(
        'INSERT INTO pesos (peso, timestamp, action, user_id) VALUES (?, ?, ?, ?)',
        [exemplo.peso, data, exemplo.action, clienteId]
      );
    }
    console.log(`  ✓ ${exemplosCliente.length} registros inseridos para "cliente"`);

    console.log('\n✅ Seed de dados concluído com sucesso!\n');
  } catch (error) {
    console.error('\n❌ Erro durante seed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  const { pool } = require('../config/db');
  seedData(pool).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = seedData;
