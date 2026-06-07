const mqtt = require('mqtt');

const { salvarAlimentacao } = require('./alimentacaoService');
const { pool } = require('../config/db');

let client = null;

function obterTopicoAlimentacao() {
  return process.env.MQTT_TOPIC_ALIMENTACAO || 'pet/+/alimentacao';
}

function obterTemplateTopicoComando() {
  return process.env.MQTT_TOPIC_COMANDO || 'pet/{device_id}/comando';
}

function construirTopicoComando(deviceId) {
  const template = obterTemplateTopicoComando();

  if (template.includes('{device_id}')) {
    return template.replace('{device_id}', deviceId);
  }

  if (template.includes('<device_id>')) {
    return template.replace('<device_id>', deviceId);
  }

  // Se vier wildcard ou topico fixo legado, forca formato concreto por dispositivo.
  if (template.includes('+') || template.includes('#') || !template.includes('/')) {
    return `pet/${deviceId}/comando`;
  }

  return template;
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
    client.subscribe(obterTopicoAlimentacao(), (erro) => {
      if (erro) {
        console.error('Erro ao assinar o topico de alimentacao:', erro.message);
      } else {
        console.log('Inscrito em:', obterTopicoAlimentacao());
      }
    });
  });

  client.on('message', async (topico, payload) => {
    // Verificar se é um tópico de alimentacao (pet/*/alimentacao)
    const regexAlim = /^pet\/([^\/]+)\/alimentacao$/;
    const match = topico.match(regexAlim);

    if (!match) {
      return;
    }

    try {
      const mensagem = JSON.parse(payload.toString());

      // Validar campos obrigatórios
      if (!mensagem.device_id || !mensagem.token || mensagem.distance_cm === undefined || mensagem.distance_cm === null) {
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

      // Salvar evento de alimentacao com o user_id validado
      await salvarAlimentacao({
        device_id: mensagem.device_id,
        distance_cm: mensagem.distance_cm,
        timestamp: mensagem.timestamp,
        event: mensagem.event || null,
        userId: userId
      });

      console.log(`✓ Alimentacao salva (device_id=${mensagem.device_id}, user_id=${userId}):`, {
        distance_cm: mensagem.distance_cm,
        event: mensagem.event || null,
        timestamp: mensagem.timestamp
      });
    } catch (erro) {
      console.error(`❌ Erro ao processar mensagem do tópico ${topico}:`, erro.message);
    }
  });

  client.on('error', (erro) => {
    console.error('Erro no MQTT:', erro);
  });

  return client;
}

function publicarComando(comando, deviceId) {
  return new Promise((resolve, reject) => {
    if (!client) {
      reject(new Error('Cliente MQTT nao iniciado'));
      return;
    }

    if (!deviceId) {
      reject(new Error('device_id e obrigatorio para publicar comando'));
      return;
    }

    const topicoComando = construirTopicoComando(deviceId);
    if (topicoComando.includes('+') || topicoComando.includes('#')) {
      reject(new Error('Topico de comando deve ser concreto, sem wildcard'));
      return;
    }

    client.publish(topicoComando, JSON.stringify(comando), (erro) => {
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
  validarDispositivo,
  construirTopicoComando
};
