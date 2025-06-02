# 📋 API WhatsApp - Referência Completa

Esta documentação cobre todas as APIs REST implementadas para a integração WhatsApp com Evolution API.

## 🔐 Autenticação

Todas as APIs requerem autenticação via NextAuth. O usuário deve ter:
- **Sessão ativa** válida
- **Escritório associado** (officeId)
- **Permissões adequadas** (ADMIN/SUPER_ADMIN para instâncias)

## 📱 Gerenciamento de Instâncias

### **GET** `/api/whatsapp/instances`
Lista todas as instâncias WhatsApp do escritório.

**Query Parameters:**
- `page` - Página (padrão: 1)
- `limit` - Itens por página (padrão: 10)
- `search` - Busca por nome ou telefone
- `status` - Filtrar por status (CONNECTING, CONNECTED, DISCONNECTED, ERROR)

**Response:**
```json
{
  "instances": [
    {
      "id": "string",
      "name": "string",
      "phoneNumber": "string",
      "status": "CONNECTED",
      "qrCode": "string",
      "isActive": true,
      "office": { "id": "string", "name": "string" },
      "createdBy": { "id": "string", "name": "string" },
      "_count": { "conversations": 5, "messages": 120 }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
}
```

### **POST** `/api/whatsapp/instances`
Cria nova instância WhatsApp.

**Body:**
```json
{
  "name": "Instância Principal"
}
```

**Response:**
```json
{
  "instance": { /* dados da instância */ },
  "message": "Instância criada com sucesso"
}
```

### **GET** `/api/whatsapp/instances/{id}`
Obtém instância específica.

### **PUT** `/api/whatsapp/instances/{id}`
Atualiza instância.

**Body:**
```json
{
  "name": "Novo Nome",
  "isActive": true
}
```

### **DELETE** `/api/whatsapp/instances/{id}`
Deleta instância (remove da Evolution API também).

## 🔗 QR Code e Status

### **GET** `/api/whatsapp/instances/{id}/qr`
Obtém QR Code para conexão.

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "status": "CONNECTING",
  "instanceName": "string",
  "phoneNumber": null
}
```

### **POST** `/api/whatsapp/instances/{id}/qr`
Força regeneração do QR Code.

### **GET** `/api/whatsapp/instances/{id}/status`
Obtém status atual da instância.

**Response:**
```json
{
  "instanceId": "string",
  "instanceName": "string",
  "status": "CONNECTED",
  "phoneNumber": "5511999999999",
  "isActive": true,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### **POST** `/api/whatsapp/instances/{id}/status`
Executa ações na instância.

**Body:**
```json
{
  "action": "restart" // restart, logout, connect
}
```

## 💬 Envio de Mensagens

### **POST** `/api/whatsapp/instances/{id}/send-message`
Envia mensagem via WhatsApp.

**Body - Texto:**
```json
{
  "phone": "5511999999999",
  "message": "Olá! Como posso ajudar?",
  "messageType": "TEXT"
}
```

**Body - Mídia:**
```json
{
  "phone": "5511999999999",
  "message": "Veja este documento",
  "messageType": "DOCUMENT",
  "mediaUrl": "https://example.com/file.pdf",
  "fileName": "documento.pdf",
  "caption": "Contrato anexo"
}
```

**Response:**
```json
{
  "message": "Mensagem enviada com sucesso",
  "messageId": "string",
  "whatsappMessageId": "string",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 💬 Conversas

### **GET** `/api/whatsapp/conversations`
Lista conversas do escritório.

**Query Parameters:**
- `page`, `limit` - Paginação
- `search` - Busca por nome/telefone
- `status` - Status da conversa (OPEN, CLOSED, PENDING, ARCHIVED)
- `instanceId` - Filtrar por instância
- `assignedUserId` - Filtrar por responsável
- `unreadOnly` - Apenas não lidas (true/false)

**Response:**
```json
{
  "conversations": [
    {
      "id": "string",
      "title": "João Silva",
      "isGroup": false,
      "status": "OPEN",
      "unreadCount": 3,
      "isArchived": false,
      "isPinned": false,
      "aiEnabled": true,
      "lastMessageAt": "2024-01-01T00:00:00.000Z",
      "contact": { /* dados do contato */ },
      "instance": { /* dados da instância */ },
      "assignedUser": { /* usuário responsável */ },
      "currentAgent": { /* agente IA atual */ },
      "lastMessage": { /* última mensagem */ }
    }
  ],
  "pagination": { /* paginação */ },
  "stats": {
    "total": 10,
    "unread": 3,
    "assigned": 7,
    "withAI": 8
  }
}
```

### **GET** `/api/whatsapp/conversations/{id}`
Obtém conversa específica.

### **PUT** `/api/whatsapp/conversations/{id}`
Atualiza conversa.

**Body:**
```json
{
  "status": "CLOSED",
  "assignedUserId": "user-id",
  "currentAgentId": "agent-id",
  "aiEnabled": false,
  "isArchived": true,
  "isPinned": false,
  "title": "Novo título"
}
```

### **GET** `/api/whatsapp/conversations/{id}/messages`
Lista mensagens da conversa.

**Query Parameters:**
- `page`, `limit` - Paginação
- `before`, `after` - Filtro por timestamp
- `messageType` - Tipo de mensagem
- `fromMe` - Mensagens enviadas por nós (true/false)

**Response:**
```json
{
  "messages": [
    {
      "id": "string",
      "messageId": "whatsapp-id",
      "fromMe": false,
      "messageType": "TEXT",
      "content": "Olá!",
      "mediaUrl": null,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "status": "READ",
      "contact": { /* dados do contato */ },
      "toolExecution": { /* se foi tool */ }
    }
  ],
  "pagination": { /* paginação */ },
  "conversation": {
    "id": "string",
    "unreadCount": 0,
    "lastMessageAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### **POST** `/api/whatsapp/conversations/{id}/mark-read`
Marca mensagens como lidas.

**Body:**
```json
{
  "messageId": "opcional-id-específico"
}
```

## 👥 Contatos

### **GET** `/api/whatsapp/contacts`
Lista contatos WhatsApp.

**Query Parameters:**
- `page`, `limit` - Paginação
- `search` - Busca por nome/telefone
- `instanceId` - Filtrar por instância
- `isGroup` - Filtrar grupos (true/false)
- `isBlocked` - Filtrar bloqueados (true/false)
- `hasClient` - Com cliente associado (true/false)

**Response:**
```json
{
  "contacts": [
    {
      "id": "string",
      "name": "João Silva",
      "pushName": "João",
      "phoneNumber": "5511999999999",
      "profilePicUrl": "https://...",
      "isGroup": false,
      "isBlocked": false,
      "tags": ["cliente", "vip"],
      "notes": "Cliente desde 2020",
      "instance": { /* dados da instância */ },
      "client": { /* cliente associado */ },
      "_count": { "conversations": 1, "messages": 45 }
    }
  ],
  "pagination": { /* paginação */ },
  "stats": {
    "total": 50,
    "groups": 5,
    "blocked": 2,
    "withClient": 30
  }
}
```

### **GET** `/api/whatsapp/contacts/{id}`
Obtém contato específico.

### **PUT** `/api/whatsapp/contacts/{id}`
Atualiza contato.

**Body:**
```json
{
  "name": "João Silva Santos",
  "notes": "Cliente VIP desde 2020",
  "tags": ["cliente", "vip", "previdenciario"],
  "isBlocked": false,
  "clientId": "client-id-opcional"
}
```

## 🔄 Webhooks

### **POST** `/api/webhooks/whatsapp/{instanceId}`
Endpoint para receber webhooks da Evolution API.

**Eventos Processados:**
- `QRCODE_UPDATED` - QR Code atualizado
- `CONNECTION_UPDATE` - Status de conexão alterado
- `MESSAGES_UPSERT` - Nova mensagem recebida
- `MESSAGES_UPDATE` - Status de mensagem atualizado

> **Nota:** Este endpoint é chamado automaticamente pela Evolution API. Não deve ser usado manualmente.

## 🚨 Códigos de Erro

### Status HTTP
- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `401` - Não autorizado
- `403` - Permissão insuficiente
- `404` - Recurso não encontrado
- `409` - Conflito (ex: nome duplicado)
- `500` - Erro interno do servidor

### Estrutura de Erro
```json
{
  "error": "Mensagem de erro",
  "details": "Detalhes adicionais (opcional)"
}
```

## 📝 Notas Importantes

1. **Permissões**: Apenas ADMIN e SUPER_ADMIN podem gerenciar instâncias
2. **Rate Limiting**: APIs possuem limite de requisições por minuto
3. **Isolamento**: Dados são isolados por escritório (multi-tenancy)
4. **Webhook Security**: Webhooks devem vir da Evolution API configurada
5. **Media Upload**: URLs de mídia devem ser acessíveis publicamente
6. **Phone Format**: Números devem incluir código do país (ex: 5511999999999)

## 🔮 Próximas Funcionalidades

- [ ] APIs de importação de histórico
- [ ] Webhooks para notificações em tempo real
- [ ] APIs de configuração de agentes IA
- [ ] Sistema de broadcast de mensagens
- [ ] Analytics e relatórios detalhados 