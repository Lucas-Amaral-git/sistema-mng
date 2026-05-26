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

module.exports = {
  calcularMetricas,
  numeroSeguro
};