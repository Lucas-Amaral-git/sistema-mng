const mqtt = require('mqtt');

const { salvarPeso } = require('./pesoService');
const { pool } = require('../config/db');

let client = null;

function obterTopicoPeso() {
  return process.env.MQTT_TOPIC_PESO || 'pet/+/peso';
}

function obterTopicoComando() {
  return process.env.MQTT_TOPIC_COMANDO || 'pet/+/comando';
}

/**
 * Valida se um dispositivo existe e está autorizado
 * @param {string} deviceId - ID do dispositivo
 * @param {string} token - Token do dispositivo
 * @returns {Promise<number|null>} user_id se validado, null caso contrário
 */
async function validarDispositivo(deviceId, token) {
  try {
    const [dispositivos] = await pool.execute(
      'SELECT owner_user_id FROM devices WHERE device_id = ? AND token = ? AND active = 1 LIMIT 1',
      [deviceId, token]
    );

    if (dispositivos.length === 0) {
      return null;
    }

    return dispositivos[0].owner_user_id;
  } catch (erro) {
    console.error('Erro ao validar dispositivo:', erro.message);
    return null;
  }
}

function iniciarMqtt() {
  if (client) {
    return client;
  }

  client = mqtt.connect(process.env.MQTT_URL, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000
  });

  client.on('connect', () => {
    console.log('Conectado ao broker MQTT');
    client.subscribe(obterTopicoPeso(), (erro) => {
      if (erro) {
        console.error('Erro ao assinar o topico de peso:', erro.message);
      } else {
        console.log('Inscrito em:', obterTopicoPeso());
      }
    });
  });

  client.on('message', async (topico, payload) => {
    // Verificar se é um tópico de peso (pet/*/peso)
    const regexPeso = /^pet\/([^\/]+)\/peso$/;
    const match = topico.match(regexPeso);

    if (!match) {
      return;
    }

    try {
      const mensagem = JSON.parse(payload.toString());

      // Validar campos obrigatórios
      if (!mensagem.device_id || !mensagem.token || mensagem.peso === undefined || mensagem.peso === null) {
        console.warn(`⚠️  Mensagem inválida no tópico ${topico}:`, mensagem);
        return;
      }

      // Validar se o device_id do payload corresponde ao do tópico
      if (mensagem.device_id !== match[1]) {
        console.warn(`⚠️  Inconsistência: device_id do tópico (${match[1]}) diferente do payload (${mensagem.device_id})`);
        return;
      }

      // Validar dispositivo contra o banco
      const userId = await validarDispositivo(mensagem.device_id, mensagem.token);

      if (userId === null) {
        console.warn(`❌ Dispositivo não autorizado: device_id=${mensagem.device_id}`);
        return;
      }

      // Salvar o peso com o user_id validado
      await salvarPeso({
        peso: mensagem.peso,
        timestamp: mensagem.timestamp,
        userId: userId,
        action: mensagem.action || 'estabilidade'
      });

      console.log(`✓ Peso salvo (device_id=${mensagem.device_id}, user_id=${userId}):`, {
        peso: mensagem.peso,
        action: mensagem.action || 'estabilidade',
        timestamp: mensagem.timestamp
      });
    } catch (erro) {
      console.error(`❌ Erro ao processar mensagem do tópico ${topico}:`, erro.message);
    }
  });

  client.on('error', (erro) => {
    console.error('Erro no MQTT:', erro.message);
  });

  return client;
}

function publicarComando(comando) {
  return new Promise((resolve, reject) => {
    if (!client) {
      reject(new Error('Cliente MQTT nao iniciado'));
      return;
    }

    client.publish(obterTopicoComando(), JSON.stringify(comando), (erro) => {
      if (erro) {
        reject(erro);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  iniciarMqtt,
  publicarComando,
  validarDispositivo
};
