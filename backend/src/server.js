require('dotenv').config();

const app = require('./app');
const { initDatabase } = require('./config/db');
const { iniciarMqtt } = require('./services/mqttService');

const porta = process.env.PORT || 3001;

function validarAmbiente() {
  const obrigatorias = [
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_DATABASE',
    'MQTT_URL',
    'JWT_SECRET'
  ];

  const faltantes = obrigatorias.filter((nome) => !process.env[nome] || String(process.env[nome]).trim() === '');

  if (faltantes.length) {
    throw new Error(`Variaveis de ambiente obrigatorias ausentes: ${faltantes.join(', ')}`);
  }
}

async function iniciarServidor() {
  validarAmbiente();
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