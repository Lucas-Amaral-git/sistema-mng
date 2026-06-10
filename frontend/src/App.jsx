import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function formatarData(valor) {
  if (!valor) {
    return '-';
  }

  return new Date(valor).toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarNumero(valor) {
  if (valor === null || valor === undefined) {
    return '-';
  }

  return Number(valor).toFixed(2).replace('.', ',');
}

function calcularTempoApos(anteriorTimestamp, timestamp) {
  if (!timestamp) {
    return '-';
  }

  if (!anteriorTimestamp) {
    return 'Primeira refeição';
  }

  const atual = new Date(timestamp);
  const anterior = new Date(anteriorTimestamp);
  const diffMs = atual.getTime() - anterior.getTime();
  const horas = Math.floor(diffMs / 3600000);
  const dias = Math.floor(horas / 24);

  if (dias >= 1) {
    return `${dias} dia${dias > 1 ? 's' : ''} sem comer`;
  }

  if (horas >= 1) {
    return `${horas} hora${horas > 1 ? 's' : ''} sem comer`;
  }

  return 'menos de 1 hora sem comer';
}

export default function App() {
  const [alimentacoes, setAlimentacoes] = useState([]);
  const [ultimaAlimentacao, setUltimaAlimentacao] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [status, setStatus] = useState('');
  const [device, setDevice] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('');
  const [regenerandoToken, setRegenerandoToken] = useState(false);
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
        fetch(`${API_URL}/alimentacoes`, { headers }),
        fetch(`${API_URL}/alimentacoes/ultima`, { headers })
      ]);

      let lista = await listaResposta.json();

      // fallback cliente: se backend não filtrar por usuário
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const userId = payload?.sub;

        if (Array.isArray(lista) && lista.length > 0 && lista.some((r) => r.user_id !== undefined)) {
          lista = lista.filter((r) => String(r.user_id) === String(userId));
        }
      } catch (e) {
        // ignore
      }

      setAlimentacoes(Array.isArray(lista) ? lista : []);

      if (ultimoResposta.ok) {
        const ultimoBody = await ultimoResposta.json();
        setUltimaAlimentacao(ultimoBody);
      } else {
        setUltimaAlimentacao(null);
      }

      setStatus('Dados atualizados.');
    } catch (erro) {
      setStatus('Erro ao carregar dados do backend');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDispositivo(authToken = token) {
    if (!authToken) {
      return;
    }

    try {
      setDeviceStatus('Carregando dispositivo...');
      const resposta = await fetch(`${API_URL}/dispositivo`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!resposta.ok) {
        if (resposta.status === 404) {
          setDevice(null);
          setDeviceStatus('Nenhum dispositivo configurado para este usuário.');
          return;
        }
        throw new Error('Falha ao carregar dispositivo');
      }

      const body = await resposta.json();
      setDevice(body);
      setDeviceStatus('Dispositivo carregado.');
    } catch (erro) {
      console.error('Erro ao carregar dispositivo:', erro);
      setDevice(null);
      setDeviceStatus(erro.message || 'Erro ao carregar dispositivo');
    }
  }

  async function copiarParaClipboard(valor, nome) {
    if (!valor) {
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(valor);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = valor;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (!successful) {
          throw new Error('Falha ao copiar via fallback');
        }
      }

      setDeviceStatus(`${nome} copiado.`);
    } catch (error) {
      console.error('Erro ao copiar para a área de transferência:', error);
      setDeviceStatus('Erro ao copiar para a área de transferência. Use HTTPS ou navegue em localhost.');
    }
  }

  async function handleRegenerarToken(evento) {
    evento.preventDefault();
    if (!token) {
      return;
    }

    try {
      setRegenerandoToken(true);
      setDeviceStatus('Regenerando token...');

      const resposta = await fetch(`${API_URL}/dispositivo/regenerar-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const body = await resposta.json();

      if (!resposta.ok) {
        throw new Error(body.mensagem || 'Falha ao regenerar token');
      }

      setDevice((prev) => (prev ? { ...prev, token: body.token } : prev));
      setDeviceStatus('Token regenerado com sucesso.');
    } catch (erro) {
      setDeviceStatus(erro.message || 'Erro ao regenerar token');
    } finally {
      setRegenerandoToken(false);
    }
  }

  useEffect(() => {
    setAuthPronto(true);
  }, []);

  useEffect(() => {
    if (autenticado) {
      carregarDados(token);
      carregarDispositivo(token);
    } else {
      setAlimentacoes([]);
      setUltimaAlimentacao(null);
      setDevice(null);
      setDeviceStatus('');
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
    setDevice(null);
    setDeviceStatus('');
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
              Entre com seu usuário para ver os eventos de alimentação.
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
      <header className="hero">
        <div>
          <p className="eyebrow">Monitoramento alimentar</p>
          <h1>Dashboard do bichinho</h1>
          <p className="subtitle">
            Acompanhe quando o animal se alimentou e quantas vezes comeu no dia.
          </p>
        </div>
        <div className="hero-actions">
          {autenticado && (
            <button className="ghost-button" onClick={doLogout}>
              Sair
            </button>
          )}
        </div>
      </header>

      <section className="cards">
        <article className="card highlight">
          <span>Última alimentação</span>
          <strong>{ultimaAlimentacao ? formatarData(ultimaAlimentacao.timestamp) : '-'}</strong>
          <small>{ultimaAlimentacao?.event || 'Sem evento registrado'}</small>
        </article>
        <article className="card">
          <span>Refeições hoje</span>
          <strong>{ultimaAlimentacao ? `${ultimaAlimentacao.vezes_no_dia || 0}` : '-'}</strong>
          <small>Contagem por dia</small>
        </article>
        <article className="card">
          <span>Último intervalo</span>
          <strong>{ultimaAlimentacao?.tempo_sem_comer || '-'}</strong>
          <small>Tempo desde a última refeição</small>
        </article>
      </section>

      <section className="content-grid" style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div className="panel" style={{ flex: '1 1 620px' }}>
          <div className="panel-header">
            <h2>Registros</h2>
            <span>{carregando ? 'Carregando...' : `${alimentacoes.length} itens`}</span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Após</th>
                </tr>
              </thead>
              <tbody>
                {alimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="empty-state">
                      Nenhum registro encontrado ainda.
                    </td>
                  </tr>
                ) : (
                  [...alimentacoes].slice().reverse().map((item, index, all) => {
                    const previousItem = index < all.length - 1 ? all[index + 1] : null;
                    const afterText = calcularTempoApos(previousItem?.timestamp, item.timestamp);

                    return (
                      <tr key={item.id}>
                        <td>{formatarData(item.timestamp)}</td>
                        <td>{afterText}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ flex: '1 1 320px' }}>
          <div className="panel-header">
            <h2>Dispositivo ESP</h2>
            <span>{deviceStatus || 'Use o token no firmware do ESP8266'}</span>
          </div>

          {device ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <strong>device_id</strong>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                  <code style={{ padding: '8px 10px', borderRadius: 12, background: '#f4f7f9', width: '100%', overflowX: 'auto' }}>
                    {device.device_id}
                  </code>
                  <button className="ghost-button" onClick={() => copiarParaClipboard(device.device_id, 'device_id')}>
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <strong>token</strong>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                  <code style={{ padding: '8px 10px', borderRadius: 12, background: '#f4f7f9', width: '100%', overflowX: 'auto' }}>
                    {device.token}
                  </code>
                  <button className="ghost-button" onClick={() => copiarParaClipboard(device.token, 'Token')}>
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <strong>Cadastrado em</strong>
                <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{formatarData(device.created_at)}</p>
              </div>

              <button className="primary-button" type="button" onClick={handleRegenerarToken} disabled={regenerandoToken}>
                {regenerandoToken ? 'Regenerando...' : 'Regenerar token'}
              </button>

              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
                Use este token no firmware do ESP8266 ao enviar mensagens MQTT para autenticação.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Nenhum dispositivo cadastrado. Entre em contato com o administrador ou crie o registro no backend.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
