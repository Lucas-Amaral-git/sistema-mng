function numeroSeguro(valor) {
  return Number(Number(valor).toFixed(3));
}

function calcularMetricas(registros) {
  let anterior = null;

  return registros.map((registro) => {
    const variacao = anterior ? numeroSeguro(registro.peso - anterior.peso) : null;
    const consumoEstimado = anterior ? numeroSeguro(Math.max(0, anterior.peso - registro.peso)) : null;

    anterior = registro;

    return {
      ...registro,
      peso: numeroSeguro(registro.peso),
      variacao_peso: variacao,
      consumo_estimado: consumoEstimado
    };
  });
}

/**
 * Para eventos de alimentacao, calculamos quantas vezes comeu por dia
 * Retornamos os registros com um campo adicional `vezes_no_dia` indicando
 * quantos eventos ocorreram naquela data para o mesmo usuario/device.
 */
function getLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDurationBetween(from, to) {
  const diffMs = to.getTime() - from.getTime();
  if (diffMs < 0) {
    return null;
  }

  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    return `${days} dia${days > 1 ? 's' : ''} sem comer`;
  }

  if (hours < 1) {
    return 'menos de 1 hora sem comer';
  }

  return `${hours} hora${hours > 1 ? 's' : ''} sem comer`;
}

function calcularMetricasAlimentacao(registros) {
  // Mapear por chave data+user/device para contar ocorrências em horário local
  const counts = {};

  registros.forEach((r) => {
    const d = new Date(r.timestamp);
    const dia = getLocalDateKey(d);
    const key = `${r.user_id || r.device_id}::${dia}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const lastTimestampByKey = {};

  return registros.map((r) => {
    const d = new Date(r.timestamp);
    const dia = getLocalDateKey(d);
    const key = `${r.user_id || r.device_id}::${dia}`;
    const previousTimestamp = lastTimestampByKey[key] || null;
    const tempo_sem_comer = previousTimestamp ? formatDurationBetween(previousTimestamp, d) : null;

    lastTimestampByKey[key] = d;

    return {
      ...r,
      vezes_no_dia: counts[key],
      tempo_sem_comer
    };
  });
}

module.exports = {
  calcularMetricas,
  calcularMetricasAlimentacao,
  numeroSeguro
};