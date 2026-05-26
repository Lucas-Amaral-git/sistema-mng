import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function formatarData(valor) {
  if (!valor) {
    return '-';
  }

  return new Date(valor).toLocaleString('pt-BR');
}

function formatarNumero(valor) {
  if (valor === null || valor === undefined) {
    return '-';
  }

  return Number(valor).toFixed(3).replace('.', ',');
}

export default function App() {
  const [pesos, setPesos] = useState([]);
  const [ultimoPeso, setUltimoPeso] = useState(null);
  const [useGrams, setUseGrams] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('useGrams');
      if (stored !== null) setUseGrams(stored === '1');
    } catch (e) {
      // ignore
    }
  }, []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [status, setStatus] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [authPronto, setAuthPronto] = useState(false);

  const autenticado = Boolean(token);

  async function carregarDados(authToken = token) {
    if (!authToken) {
      return;
    }

    try {
      setCarregando(true);
      setStatus('Atualizando dados...');

      const headers = { Authorization: `Bearer ${authToken}` };
      const [listaResposta, ultimoResposta] = await Promise.all([
        fetch(`${API_URL}/pesos`, { headers }),
        fetch(`${API_URL}/pesos/ultimo`, { headers })
      ]);

      let lista = await listaResposta.json();

      // fallback cliente: se backend não filtrou por usuário, filtre no frontend usando o token
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const userId = payload?.sub;

        if (Array.isArray(lista) && lista.length > 0 && lista.some((r) => r.user_id !== undefined)) {
          lista = lista.filter((r) => String(r.user_id) === String(userId));
        }
      } catch (e) {
        // ignore parsing errors
      }

      // recalcula métricas localmente para o subconjunto (mesma lógica do backend)
      function numeroSeguro(val) {
        return Number(Number(val).toFixed(3));
      }

      function calcularMetricasLocal(regs) {
        let anterior = null;
        return regs.map((registro) => {
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

      const processed = Array.isArray(lista) ? calcularMetricasLocal(lista) : [];
      setPesos(processed);

      if (ultimoResposta.ok) {
        const ultimoBody = await ultimoResposta.json();
        // se ultimo não pertencer ao usuário (backend não filtrou), derive do array
        const belongsToUser = (() => {
          try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            return String(ultimoBody.user_id) === String(payload?.sub);
          } catch (e) {
            return true;
          }
        })();

        if (belongsToUser) {
          setUltimoPeso(ultimoBody);
        } else {
          setUltimoPeso(processed.length ? processed[processed.length - 1] : null);
        }
      } else {
        setUltimoPeso(null);
      }

      setStatus('Dados atualizados.');
    } catch (erro) {
      setStatus('Erro ao carregar dados do backend');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    setAuthPronto(true);
  }, []);

  useEffect(() => {
    if (autenticado) {
      carregarDados(token);
    } else {
      setPesos([]);
      setUltimoPeso(null);
    }
  }, [autenticado, token]);

  async function doLogin(evento) {
    evento.preventDefault();

    if (!username || !password) {
      setStatus('Informe usuário e senha.');
      return;
    }

    try {
      setStatus('Entrando...');
      const resposta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const body = await resposta.json();

      if (!resposta.ok) {
        throw new Error(body.mensagem || 'Falha no login');
      }

      localStorage.setItem('token', body.token);
      setToken(body.token);
      setStatus('Autenticado');
      carregarDados(body.token);
    } catch (erro) {
      setStatus(erro.message || 'Erro ao autenticar');
    }
  }

  function doLogout() {
    localStorage.removeItem('token');
    setToken('');
    setUsername('');
    setPassword('');
    setStatus('Desconectado');
  }

  if (!authPronto) {
    return <div className="page">Carregando...</div>;
  }

  if (!autenticado) {
    return (
      <div className="page">
        <header className="hero">
          <div>
            <p className="eyebrow">Monitoramento alimentar</p>
            <h1>Acesse o sistema</h1>
            <p className="subtitle">
              Entre com seu usuário para ver os dados do alimento do bichinho.
            </p>
          </div>
        </header>

        <section className="panel auth-panel">
          <form className="form" onSubmit={doLogin}>
            <label>
              Usuário
              <input
                value={username}
                onChange={(evento) => setUsername(evento.target.value)}
                placeholder="Seu usuário"
                autoComplete="username"
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
              />
            </label>

            <button className="primary-button" type="submit">
              Entrar
            </button>
          </form>

          <p className="status">{status || 'Pronto para login.'}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <header className="hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">Monitoramento alimentar</p>
          <h1>Dashboard do bichinho</h1>
          <p className="subtitle">
            Dados em tempo simples para acompanhar peso, variação e consumo estimado.
          </p>
        </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="ghost-button"
              onClick={() => {
                const nv = !useGrams;
                setUseGrams(nv);
                try {
                  localStorage.setItem('useGrams', nv ? '1' : '0');
                } catch (e) {}
              }}
              aria-pressed={useGrams}
              title="Alternar unidade (kg / g)"
            >
              {useGrams ? 'g' : 'kg'}
            </button>
            <button className="ghost-button" onClick={() => carregarDados(token)}>
              Atualizar dados
            </button>
            {autenticado && (
              <button className="ghost-button" onClick={doLogout}>
                Sair
              </button>
            )}
          </div>
      </header>

      <section className="cards">
        <article className="card highlight">
          <span>Ultimo peso</span>
          <strong>
            {ultimoPeso ? (useGrams ? `${Math.round(ultimoPeso.peso * 1000)} g` : `${formatarNumero(ultimoPeso.peso)} kg`) : '-'}
          </strong>
          <small>{formatarData(ultimoPeso?.timestamp)}</small>
        </article>
        <article className="card">
          <span>Variacao</span>
          <strong>
            {ultimoPeso && ultimoPeso.variacao_peso != null ? (useGrams ? `${Math.round(ultimoPeso.variacao_peso * 1000)} g` : `${formatarNumero(ultimoPeso.variacao_peso)} kg`) : 'Início'}
          </strong>
          <small>Comparado ao registro anterior</small>
        </article>
        <article className="card">
          <span>Consumo estimado</span>
          <strong>
            {ultimoPeso && ultimoPeso.consumo_estimado != null ? (useGrams ? `${Math.round(ultimoPeso.consumo_estimado * 1000)} g` : `${formatarNumero(ultimoPeso.consumo_estimado)} kg`) : 'Início'}
          </strong>
          <small>Estimativa simples por reducao de peso</small>
        </article>
      </section>

      <section className="content-grid" style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
        <div className="panel">
          <div className="panel-header">
            <h2>Registros</h2>
            <span>{carregando ? 'Carregando...' : `${pesos.length} itens`}</span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peso</th>
                  <th>Variacao</th>
                  <th>Consumo</th>
                </tr>
              </thead>
              <tbody>
                {pesos.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      Nenhum registro encontrado ainda.
                    </td>
                  </tr>
                  ) : (
                  [...pesos].slice().reverse().map((item) => {
                    const color = item.action === 'adicao' ? '#0f9d58' : item.action === 'reducao' ? '#d93025' : 'inherit';
                    return (
                        <tr key={item.id}>
                          <td>{formatarData(item.timestamp)}</td>
                          <td>{useGrams ? `${Math.round(item.peso * 1000)} g` : `${formatarNumero(item.peso)} kg`}</td>
                          <td>
                            {item.variacao_peso == null ? (
                              <span style={{ fontStyle: 'italic', opacity: 0.9 }}>Início</span>
                            ) : (
                              useGrams ? `${Math.round(item.variacao_peso * 1000)} g` : `${formatarNumero(item.variacao_peso)} kg`
                            )}
                          </td>
                          <td style={{ color }}>
                            {item.consumo_estimado == null ? (
                              <span style={{ fontStyle: 'italic', opacity: 0.9 }}>Início</span>
                            ) : (
                              useGrams ? `${Math.round(item.consumo_estimado * 1000)} g` : `${formatarNumero(item.consumo_estimado)} kg`
                            )}
                            {item.action ? (
                              <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
                                ({item.action})
                              </span>
                            ) : null}
                          </td>
                        </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* painel 'Conta' removido conforme solicitado */}
      </section>
    </div>
  );
}
