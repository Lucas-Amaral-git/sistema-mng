# Sistema de monitoramento alimentar para animais

Projeto simples com backend em Node.js, banco MySQL, frontend React para web e app Expo para celular.

## O que ele faz

- Conecta em um broker MQTT
- Assina o tópico `pet/alimentacao/peso`
- Recebe mensagens JSON com `peso` e `timestamp`
- Salva os dados no MySQL
- Expõe uma API REST com:
  - `GET /pesos`
  - `GET /pesos/ultimo`
  - `POST /comandos`
- Calcula variação de peso e consumo estimado de forma simples
- Mantém a publicação de comandos via MQTT para integrações internas
- O dashboard abre com login e senha; a visualização de dados vem antes de qualquer tela administrativa
- Se não houver registros, o sistema cria dados de exemplo para demonstração

## Sugestão de stack

Para esse caso, Node.js é a melhor opção aqui porque a integração com MQTT fica direta, o backend é simples e o mesmo projeto conversa bem com React no front.

## Estrutura

- `backend/` - API, MQTT e MySQL
- `frontend/` - dashboard React para navegador
- `mobile/` - app Expo Go para celular

## Requisitos

- Node.js 18 ou superior
- MySQL 8 ou compatível
- Broker MQTT acessível pela rede

Este projeto pode ser executado localmente sem Docker; abaixo há passos simples para subir os serviços necessários manualmente.

## Rodando localmente (sem Docker)

1. Instale o MySQL no seu computador (ou use um servidor MySQL acessível).

2. Crie o banco de dados:

```sql
CREATE DATABASE pet_alimentacao;
```

3. Instale um broker MQTT local (recomendado: Mosquitto) ou use um broker público. Para Mosquitto no Windows, siga a documentação oficial para instalação.

4. Configure o backend: copie `backend/.env.example` para `backend/.env` e ajuste os valores (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MQTT_URL`). Exemplo mínimo se MySQL e Mosquitto estiverem na mesma máquina:

```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=sua_senha
MYSQL_DATABASE=pet_alimentacao

MQTT_URL=mqtt://127.0.0.1:1883
```

5. Instale dependências:

```bash
npm install
```

6. Abra 3 terminais:

```bash
npm run dev:backend
npm run dev:web
npm run dev:mobile
```

7. No celular (mesma rede Wi‑Fi), abra o Expo Go e escaneie o QR code mostrado pelo Expo.

8. No app mobile, faça login e use os dados/recalibração.

Se preferir não instalar Mosquitto localmente, você pode usar um broker público para testes (por exemplo `test.mosquitto.org:1883`), mas não é recomendado para produção.

## Credenciais de teste

- usuário: `teste`
- senha: `teste#123`

Use essas credenciais no endpoint `POST /auth/login` para obter um token JWT. Inclua-o no cabeçalho `Authorization: Bearer <token>` nas chamadas às APIs protegidas (`/pesos`, `/pesos/ultimo`, `/comandos`).

## Configuração do backend

Crie um banco no MySQL, por exemplo:

```sql
CREATE DATABASE pet_alimentacao;
```

Depois copie `backend/.env.example` para `backend/.env` e ajuste os valores.

## Configuração do frontend web

O frontend já usa `http://localhost:3001` como base padrão. Se quiser trocar, ajuste `frontend/src/App.jsx`.

## Configuração do app mobile

O app do celular fica em `mobile/` e usa Expo Go.

Na tela inicial, informe o endereço do backend na rede local, por exemplo:

```text
http://192.168.0.10:3001
```

O telefone e o computador precisam estar na mesma rede Wi-Fi.

## Como rodar

Use 3 terminais: backend, web e mobile.

## Inicialização rápida

Veja o passo a passo curto em [INICIALIZACAO.md](INICIALIZACAO.md).

## Endpoints

### `GET /pesos`

Retorna a lista de registros com métricas simples por item.

### `GET /pesos/ultimo`

Retorna o último peso registrado e a comparação com o registro anterior.

### `POST /comandos`

Envia comando ao ESP32 via MQTT.

Exemplo:

```json
{
  "comando": "calibrar_sensor",
  "dados": {
    "offset": 0
  }
}
```

## Tópicos MQTT

- Entrada de peso: `pet/alimentacao/peso`
- Saída de comando: `pet/alimentacao/comando`

## Observação importante

Se o celular não conseguir acessar a API, libere a porta `3001` no firewall do computador e confira se a URL informada no app mobile está usando o IP correto da máquina, não `localhost`.

## Ideias para expandir depois

- Gráficos com Recharts ou Chart.js
- Filtros por período
- Alertas de consumo fora do padrão
- Autenticação simples para proteger os endpoints
- Dashboard em tempo real com WebSocket ou Socket.IO