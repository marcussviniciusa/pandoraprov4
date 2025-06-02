# 🔧 Sistema Tools/Webhooks - Guia de Configuração

## 📋 Visão Geral

O sistema Tools/Webhooks permite que os agentes de IA do Pandora Pro executem **ações reais** através de automações n8n. Quando um cliente solicita algo como "consulte meu CPF", a IA automaticamente detecta isso e executa a automação correspondente.

## 🏗️ Arquitetura

```
Cliente → Pandora Pro IA → Tool Parser → Webhook n8n → API Externa → Callback → Resposta ao Cliente
```

## ⚙️ Configuração Passo a Passo

### 1. 📡 Configurar n8n

#### Instalar n8n
```bash
npm install -g n8n
# ou
npx n8n
```

#### Importar Workflow de Exemplo
1. Copie o conteúdo de `docs/exemplo-workflow-n8n-cpf.json`
2. No n8n, vá em **Workflows** → **Import from file**
3. Cole o JSON e salve

#### Configurar Webhook URL
1. No workflow importado, clique no nó "📥 Webhook Pandora"
2. Copie a **Production URL** (ex: `https://sua-instancia.n8n.cloud/webhook/consulta-cpf`)

### 2. 🛠️ Configurar Tool no Pandora Pro

#### Acesso Admin
1. Faça login como **Admin** ou **Super Admin**
2. Vá em **Menu** → **Tools & Automações** (será criado em breve)

#### Criar Nova Tool
```json
{
  "name": "Consulta CPF",
  "description": "Consulta dados de CPF em base externa. Use quando o cliente solicitar verificação de CPF, consulta de documento ou dados pessoais de CPF específico.",
  "webhookUrl": "https://sua-instancia.n8n.cloud/webhook/consulta-cpf"
}
```

**Dicas para a Descrição:**
- Seja específico sobre quando usar
- Inclua palavras-chave que a IA deve detectar
- Mencione contextos de uso (juridico, previdenciário, etc.)

### 3. 🤖 Como a IA Detecta Tools

O sistema detecta automaticamente quando usar tools baseado em:

#### Patterns de Ação (Português)
- "executar", "fazer", "realizar", "consultar", "buscar"
- "preciso que você", "você pode", "pode"
- "solicito", "peço", "gostaria"
- "me ajude a", "como faço para"

#### Palavras-chave Específicas
- **CPF**: "cpf", "documento", "consulta cpf", "validar cpf"
- **CNPJ**: "cnpj", "empresa", "consulta cnpj"
- **Documentos**: "documento", "gerar", "criar", "pdf"
- **Cálculos**: "calcular", "valor", "benefício", "aposentadoria"

#### Exemplos de Mensagens que Ativam Tools
```
✅ "Preciso consultar o CPF 12345678901"
✅ "Pode verificar esse documento para mim?"
✅ "Gostaria de fazer uma consulta de CPF"
✅ "Me ajude a validar esse CPF: 123.456.789-01"
✅ "Como posso consultar dados deste CPF?"
```

## 🔄 Fluxo de Execução

### 1. **Detecção** (IA)
```javascript
// Cliente digita: "Consulte o CPF 12345678901"
// Tool Parser detecta: ação "consulte" + palavra-chave "CPF"
// Seleciona tool: "Consulta CPF"
```

### 2. **Execução** (Webhook)
```json
// Enviado para n8n:
{
  "description": "Consulte o CPF 12345678901",
  "requestId": "req_1703123456_abc123",
  "timestamp": "2023-12-21T10:30:00Z",
  "metadata": {
    "toolName": "Consulta CPF",
    "executionId": "exec_xyz789",
    "officeId": "office_123"
  }
}
```

### 3. **Processamento** (n8n)
- Extrai CPF da mensagem
- Consulta API externa
- Formata resposta

### 4. **Callback** (Resultado)
```json
// n8n envia de volta:
{
  "requestId": "req_1703123456_abc123",
  "success": true,
  "result": {
    "mensagem": "📋 CPF 12345678901\n✅ Situação: REGULAR\n👤 Nome: João Silva",
    "dados": { /* dados completos */ }
  }
}
```

### 5. **Resposta** (Cliente)
```
IA: Consultei o CPF para você!

⚡ Consulta CPF: Processando sua solicitação... Aguarde o resultado.

📋 CPF 12345678901
✅ Situação: REGULAR  
👤 Nome: João Silva
📅 Nascimento: 01/01/1990
📍 Cidade: São Paulo/SP

🕐 Consulta realizada em 21/12/2023 10:30:25
```

## 🛡️ Segurança e Boas Práticas

### Headers de Segurança
```json
{
  "X-Pandora-Request-ID": "req_123",
  "X-Pandora-Tool-ID": "tool_456",
  "User-Agent": "PandoraPro/1.0"
}
```

### Validação no n8n
```javascript
// Sempre validar requestId e origem
if (!$json.requestId || !$json.metadata?.officeId) {
  return { error: 'Request inválido' };
}
```

### Timeout e Retry
- **Timeout padrão**: 30 segundos
- **Retry automático**: 3 tentativas
- **Status tracking**: PENDING → SUCCESS/ERROR/TIMEOUT

## 📊 Monitoramento

### Logs do Sistema
```bash
# Ver logs das execuções
tail -f logs/tools.log

# Exemplos de logs:
🔧 Executando tool "Consulta CPF" - RequestID: req_123
✅ Tool executada com sucesso - Status: 200
❌ Erro ao executar tool "Consulta CPF": Timeout
```

### Dashboard (Em Desenvolvimento)
- Execuções por tool (últimos 30 dias)
- Taxa de sucesso/erro
- Tempo médio de execução
- Tools mais utilizadas

## 🚀 Exemplos de Tools Avançadas

### 1. Geração de Documentos
```json
{
  "name": "Gerar Procuração",
  "description": "Gera documento de procuração automaticamente. Use quando cliente solicitar criação de procuração, documento legal ou representação jurídica.",
  "webhookUrl": "https://n8n.cloud/webhook/gerar-procuracao"
}
```

### 2. Cálculo Previdenciário
```json
{
  "name": "Calcular Aposentadoria",
  "description": "Calcula tempo para aposentadoria e valores. Use para cálculos previdenciários, tempo de contribuição, simulações de aposentadoria.",
  "webhookUrl": "https://n8n.cloud/webhook/calculo-previdenciario"
}
```

### 3. Consulta Processual
```json
{
  "name": "Consultar Processo",
  "description": "Consulta andamento de processos judiciais. Use quando cliente perguntar sobre processo, andamento judicial ou consulta processual.",
  "webhookUrl": "https://n8n.cloud/webhook/consulta-processo"
}
```

## 🐛 Solução de Problemas

### Tool Não Executa
1. **Verificar descrição** - Deve conter palavras-chave relevantes
2. **Testar webhook** - Fazer POST manual para a URL
3. **Verificar logs** - Buscar erros no console

### Timeout Frequente
1. **Otimizar workflow n8n** - Reduzir chamadas API
2. **Aumentar timeout** - Configurar no WebhookExecutor
3. **Implementar retry** - Usar lógica de retry no n8n

### Callback Não Recebido
1. **Verificar URL callback** - Deve ser acessível publicamente
2. **Testar conectividade** - n8n deve conseguir acessar Pandora
3. **Verificar logs n8n** - Buscar erros de rede

## 📈 Próximos Passos

### Fase 1 ✅ Concluída
- [x] Backend APIs
- [x] Tool Parser
- [x] Webhook Executor  
- [x] Callback API
- [x] Integração com IA

### Fase 2 🔄 Em Desenvolvimento
- [ ] Interface Admin (CRUD Tools)
- [ ] Dashboard de monitoramento
- [ ] Notificações real-time
- [ ] Sistema de templates

### Fase 3 🔮 Planejado
- [ ] Tools marketplace
- [ ] Workflows pré-configurados
- [ ] IA para criar tools automaticamente
- [ ] Integração com mais plataformas

---

**🚀 O sistema Tools/Webhooks está transformando o Pandora Pro de chatbot em plataforma de automação jurídica inteligente!** 