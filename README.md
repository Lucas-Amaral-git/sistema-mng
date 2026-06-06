# Sistema de monitoramento alimentar para animais

Projeto com ESP32, broker MQTT, backend em Node.js, banco MySQL, frontend React para web e app Expo para celular.

## O que ele faz

- Conecta em um broker MQTT.
- Assina tópicos de peso no padrão `pet/+/peso`.
- Valida `device_id` e `token` de cada ESP32 cadastrado.
- Salva os dados no MySQL.
- Expõe uma API REST com:
  - `POST /auth/login`
  - `GET /pesos`
  - `GET /pesos/ultimo`
  - `GET /dispositivo`
  - `POST /dispositivo/regenerar-token`
  - `POST /comandos`
- Calcula variação de peso e consumo estimado de forma simples.
- Publica comandos via MQTT para o dispositivo ativo do usuário.
- Mostra primeiro a visualização dos dados, antes de telas administrativas.
- Se não houver registros, cria dados de exemplo para demonstração.

## Sugestão de stack

Para esse caso, Node.js é a melhor opção aqui porque a integração com MQTT fica direta, o backend é simples e o mesmo projeto conversa bem com React no front.

## Estrutura

- `backend/` - API, MQTT e MySQL.
- `frontend/` - dashboard React para navegador.
- `mobile/` - app Expo Go para celular.
- `ARQUITETURA_END_TO_END.md` - mapa consolidado do fluxo entre os dois projetos.

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

Comportamento de `device_id`:

- Se `device_id` for enviado no corpo, o backend usa esse dispositivo.
- Se `device_id` nao for enviado, o backend usa o dispositivo ativo do usuario autenticado.
- Se nao houver dispositivo ativo e `device_id` nao for informado, retorna erro `400`.

Exemplo:

```json
{
  "device_id": "esp32_pote_01",
  "comando": "calibrar_sensor",
  "dados": {
    "offset": 0
  }
}
```

Exemplo sem `device_id` (usa dispositivo ativo do usuario):

```json
{
  "comando": "calibrar_sensor",
  "dados": {
    "offset": 0
  }
}
```

Resposta de sucesso (exemplo):

```json
{
  "mensagem": "Comando enviado com sucesso",
  "device_id": "esp32_pote_01",
  "payload": {
    "comando": "calibrar_sensor",
    "dados": {
      "offset": 0
    },
    "timestamp": "2026-05-27T15:00:00.000Z"
  }
}
```

## Tópicos MQTT

- Entrada de peso: `pet/<device_id>/peso`
- Saída de comando: `pet/<device_id>/comando`

O backend assina `pet/+/peso` para aceitar múltiplos dispositivos, mas sempre valida o `device_id` no tópico e no payload.

## Observação importante

Se o celular não conseguir acessar a API, libere a porta `3001` no firewall do computador e confira se a URL informada no app mobile está usando o IP correto da máquina, não `localhost`.

## Arquitetura final

Se quiser entender o fluxo completo entre ESP32, MQTT, backend, web e mobile, leia [ARQUITETURA_END_TO_END.md](ARQUITETURA_END_TO_END.md).

## Ideias para expandir depois

- Gráficos com Recharts ou Chart.js
- Filtros por período
- Alertas de consumo fora do padrão
- Autenticação simples para proteger os endpoints
- Dashboard em tempo real com WebSocket ou Socket.IO