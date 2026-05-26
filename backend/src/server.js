require('dotenv').config();

const app = require('./app');
const { initDatabase } = require('./config/db');
const { iniciarMqtt } = require('./services/mqttService');

const porta = process.env.PORT || 3001;

async function iniciarServidor() {
  await initDatabase();
  iniciarMqtt();

  app.listen(porta, '0.0.0.0', () => {
    console.log(`Backend rodando em http://0.0.0.0:${porta}`);
  });
}

iniciarServidor().catch((erro) => {
  console.error('Falha ao iniciar o servidor:', erro);
  process.exit(1);
});