import { useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  return Number(value).toFixed(3).replace('.', ',');
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatElapsedTime(previousTimestamp, currentTimestamp) {
  if (!currentTimestamp) {
    return '-';
  }

  const current = new Date(currentTimestamp);
  if (Number.isNaN(current.getTime())) {
    return '-';
  }

  if (!previousTimestamp) {
    return 'Primeira refeição';
  }

  const previous = new Date(previousTimestamp);
  if (Number.isNaN(previous.getTime())) {
    return '-';
  }

  const diffMs = current.getTime() - previous.getTime();
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

function resolveBackendUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.linkingUri || '';

  if (!hostUri) {
    return '';
  }

  const host = hostUri.replace(/^https?:\/\//, '').split(':')[0];
  return host ? `http://${host}:3001` : '';
}

export default function App() {
  const [alimentacoes, setAlimentacoes] = useState([]);
  const [ultimaAlimentacao, setUltimaAlimentacao] = useState(null);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [authPronto, setAuthPronto] = useState(false);

  const baseUrl = useMemo(() => resolveBackendUrl(), []);
  const autenticado = Boolean(token);

  async function carregarDados(url = baseUrl, authToken = token) {
    if (!url || !authToken) {
      return;
    }

    try {
      setCarregando(true);
      setStatus('Atualizando dados...');

      const headers = { Authorization: `Bearer ${authToken}` };

      const [listaResposta, ultimoResposta] = await Promise.all([
        fetch(`${url}/alimentacoes`, { headers }),
        fetch(`${url}/alimentacoes/ultima`, { headers })
      ]);

      const lista = await listaResposta.json();
      setAlimentacoes(Array.isArray(lista) ? lista : []);

      if (ultimoResposta.ok) {
        setUltimaAlimentacao(await ultimoResposta.json());
      } else {
        setUltimaAlimentacao(null);
      }

      setStatus('Dados atualizados.');
    } catch (erro) {
      setStatus('Falha ao acessar o backend.');
    } finally {
      setCarregando(false);
    }
  }

  async function loadToken() {
    try {
      const salvedToken = await AsyncStorage.getItem('token');
      if (salvedToken) {
        setToken(salvedToken);
      }
    } catch (e) {
      // ignore
    } finally {
      setAuthPronto(true);
    }
  }

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (autenticado) {
      carregarDados(baseUrl, token);
    } else {
      setAlimentacoes([]);
      setUltimaAlimentacao(null);
    }
  }, [autenticado, baseUrl, token]);

  async function doLogin() {
    if (!baseUrl) {
      Alert.alert('Backend indisponível', 'Inicie o backend e abra o app pelo Expo Go.');
      return;
    }

    if (!username || !password) {
      Alert.alert('Login', 'Informe usuário e senha.');
      return;
    }

    try {
      setStatus('Entrando...');
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.mensagem || 'Falha no login');
      }

      await AsyncStorage.setItem('token', body.token);
      setToken(body.token);
      setStatus('Autenticado');
      carregarDados(baseUrl, body.token);
    } catch (err) {
      setStatus('Falha ao autenticar');
      Alert.alert('Login falhou', err.message || String(err));
    }
  }

  async function doLogout() {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setStatus('Desconectado');
    setUsername('');
    setPassword('');
  }

  if (!authPronto) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#1e6f5c" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!autenticado) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Text style={styles.badge}>Monitoramento alimentar</Text>
              <Text style={styles.title}>Acesse o sistema</Text>
              <Text style={styles.subtitle}>
                Entre com seu usuário para ver os dados do alimento do bichinho.
              </Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.label}>Usuário</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                placeholder="Seu usuário"
                placeholderTextColor="#7b8794"
              />

              <Text style={[styles.label, { marginTop: 8 }]}>Senha</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                placeholder="Sua senha"
                placeholderTextColor="#7b8794"
              />

              <View style={styles.buttonRow}>
                <Pressable style={styles.primaryButton} onPress={doLogin}>
                  <Text style={styles.primaryButtonText}>Entrar</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Status</Text>
              <Text style={styles.cardValueSmall}>{status || 'Pronto para login'}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.badge}>Monitoramento alimentar</Text>
            <Text style={styles.title}>Dashboard do bichinho</Text>
            <Text style={styles.subtitle}>
              Você está autenticado e pode acompanhar quando o comedouro foi ativado.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.buttonRow}>
              <Pressable style={styles.secondaryButton} onPress={() => carregarDados()}>
                <Text style={styles.secondaryButtonText}>Atualizar</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={doLogout}>
                <Text style={styles.primaryButtonText}>Sair</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.cardsRow}>
            <View style={[styles.card, styles.cardAccent]}>
              <Text style={styles.cardLabel}>Última alimentação</Text>
              <Text style={styles.cardValue}>{formatDate(ultimaAlimentacao?.timestamp)}</Text>
              <Text style={styles.cardHint}>{ultimaAlimentacao?.event || 'Sem evento'}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Refeições hoje</Text>
              <Text style={styles.cardValue}>{ultimaAlimentacao?.vezes_no_dia ?? '-'}</Text>
              <Text style={styles.cardHint}>Total de eventos no dia</Text>
            </View>
          </View>

          <View style={styles.cardsRow}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Desde a última</Text>
              <Text style={styles.cardValueSmall}>
                {formatElapsedTime(
                  alimentacoes.length > 1 ? alimentacoes[alimentacoes.length - 2]?.timestamp : null,
                  ultimaAlimentacao?.timestamp
                )}
              </Text>
              <Text style={styles.cardHint}>Tempo entre refeições</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Status</Text>
              <Text style={styles.cardValueSmall}>{carregando ? 'Carregando...' : 'Pronto'}</Text>
              <Text style={styles.cardHint}>{status || 'Aguardando ação'}</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Registros</Text>
              <Text style={styles.listCount}>{alimentacoes.length} itens</Text>
            </View>

            {carregando ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#1e6f5c" />
              </View>
            ) : (
              <FlatList
                data={alimentacoes}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Nenhum registro recebido ainda.</Text>
                }
                renderItem={({ item, index }) => {
                  const tempoSemComer = formatElapsedTime(
                    index > 0 ? alimentacoes[index - 1]?.timestamp : null,
                    item.timestamp
                  );

                  return (
                    <View style={styles.listItem}>
                      <View>
                        <Text style={styles.listDate}>{formatDate(item.timestamp)}</Text>
                        <Text style={styles.listMeta}>{tempoSemComer}</Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f7f9'
  },
  container: {
    padding: 16,
    gap: 16
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: '#5e6f82',
    fontWeight: '600'
  },
  hero: {
    paddingVertical: 8,
    gap: 8
  },
  badge: {
    color: '#1e6f5c',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#17324d'
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5e6f82'
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#17324d',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#425466'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7e0ea',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f9fbfd',
    color: '#17324d'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1e6f5c',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e8f2ee',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#1e6f5c',
    fontWeight: '700'
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6
  },
  cardAccent: {
    backgroundColor: '#e8f4f1'
  },
  cardLabel: {
    color: '#5e6f82',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  cardValue: {
    color: '#17324d',
    fontSize: 24,
    fontWeight: '800'
  },
  cardValueSmall: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800'
  },
  cardHint: {
    color: '#5e6f82',
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17324d',
    marginBottom: 4
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listCount: {
    color: '#5e6f82',
    fontSize: 12,
    fontWeight: '700'
  },
  loadingBox: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: '#5e6f82',
    textAlign: 'center',
    paddingVertical: 16
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7'
  },
  listDate: {
    color: '#17324d',
    fontWeight: '700'
  },
  listPeso: {
    color: '#1e6f5c',
    fontWeight: '800'
  },
  listMeta: {
    color: '#5e6f82',
    fontSize: 12,
    marginTop: 2
  },
  listRight: {
    alignItems: 'flex-end'
  }
});
