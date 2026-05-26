# Inicialização rápida

1. Configure o MySQL e o MQTT em `backend/.env`.

2. Instale as dependências na raiz do projeto:

```bash
npm install
```

3. Se o banco já existir, rode a migração e o seed para garantir as colunas novas e os dados de exemplo:

```bash
npm run migrate --workspace backend
npm run seed --workspace backend
```

4. Crie a tabela de dispositivos e gere os tokens iniciais:

```bash
npm run devices-migrate --workspace backend
```

5. Abra 3 terminais e suba os serviços:

```bash
npm run dev:backend
npm run dev:web
npm run dev:mobile
```

6. No celular, abra o Expo Go e escaneie o QR code. O app mobile já descobre o backend na rede local e abre direto na tela de login.

Observações rápidas:

- O dashboard web e o app mobile mostram apenas os dados do usuário autenticado.
- A tabela `pesos` guarda `user_id` e `action`, então os registros ficam separados por usuário.
- O front não tem mais o botão de enviar comando para o usuário final.
- Se aparecer `EADDRINUSE: address already in use 0.0.0.0:3001`, feche o terminal onde o backend já está rodando ou finalize o processo antigo antes de iniciar de novo.
- Cada usuário tem um `device_id` e `token` únicos, gerados automaticamente na migração de dispositivos.

## Segurança: Autenticação de Dispositivos

O sistema implementa segurança em duas camadas:

### 1. Autenticação no Broker MQTT

Cada cliente MQTT (backend e ESP32) se conecta com credenciais:

```
Backend:
	- username: backend_system (definido em MQTT_USERNAME)
	- senha: senha_backend (definido em MQTT_PASSWORD)

ESP32:
	- username: esp32_device
	- senha: senha_dispositivo
```

### 2. Validação de Mensagens no Backend

Cada mensagem MQTT publicada pelo ESP32 deve conter:

- **device_id**: identificador único do dispositivo
- **token**: chave secreta associada ao dispositivo
- **peso**: leitura do peso em kg
- **timestamp**: data/hora da leitura (opcional, usa atual se omitido)

#### Formato da Requisição MQTT

**Tópico**: `pet/<device_id>/peso`

**Payload** (JSON):
```json
{
	"device_id": "esp32_teste",
	"token": "TOKEN_SECRETO_AQUI",
	"peso": 325.4,
	"action": "reducao",
	"timestamp": "2026-05-11T12:00:00"
}
```

#### Fluxo de Validação

1. Backend assina todos os tópicos: `pet/+/peso`
2. Quando recebe uma mensagem, valida:
	 - Se `device_id` e `token` existem no banco e estão ativos
	 - Se `device_id` do payload corresponde ao tópico
3. Se válido, busca o `owner_user_id` do dispositivo
4. Salva o peso associado ao usuário correto
5. Se inválido, rejeita a mensagem (log de segurança)

## Endpoints de Dispositivo

### Obter Credenciais do Dispositivo

```bash
GET /dispositivo
Header: Authorization: Bearer <TOKEN_JWT>
```

Resposta:
```json
{
	"device_id": "esp32_teste",
	"token": "abc123xyz...",
	"created_at": "2026-05-11T10:00:00Z"
}
```

### Regenerar Token

```bash
POST /dispositivo/regenerar-token
Header: Authorization: Bearer <TOKEN_JWT>
```

Resposta:
```json
{
	"mensagem": "Token regenerado com sucesso",
	"token": "novo_token_aqui..."
}
```

## Configuração do ESP32

1. Faça login no web para obter suas credenciais:
	 ```
	 GET /dispositivo (com JWT no header)
	 ```

2. Configure o ESP32 com:
	 - MQTT Broker: `seu_broker_ip:porta`
	 - MQTT Username: `esp32_device`
	 - MQTT Password: `senha_dispositivo`
	 - Device ID: (obtido do endpoint acima)
	 - Token: (obtido do endpoint acima)

3. No código do ESP32, publique a cada leitura:
	 ```cpp
	 // Pseudocódigo
	 String payload = "{\"device_id\":\"" + DEVICE_ID + "\",\"token\":\"" + TOKEN + "\",\"peso\":" + weight + ",\"timestamp\":\"" + timestamp + "\"}";
	 client.publish("pet/" + DEVICE_ID + "/peso", payload);
	 ```

Credenciais de teste:

- usuário: `teste` | senha: `teste#123`
- usuário: `cliente` | senha: `cliente#123`

Dispositivos de teste (gerados automaticamente):

- device_id: `esp32_teste` (owner: teste)
- device_id: `esp32_cliente` (owner: cliente)
- tokens: disponíveis via `GET /dispositivo`

Se quiser abrir só no PC, use apenas:

```bash
npm run dev:web
```