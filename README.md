# 🚀 Pandora Pro - Sistema Multicanal Inteligente

**Sistema completo de CRM jurídico com IA avançada para escritórios de advocacia especializados em direito previdenciário.**

## ✨ Funcionalidades Implementadas

### 🤖 Sistema Multi-Provider de IA Avançado

- **3 Providers Suportados**: OpenAI, Google (Gemini), Anthropic (Claude)
- **6 Modelos de IA**: GPT-4.1-mini, GPT-4o-mini, GPT-4.5, Gemini 2.5 Pro, Claude 3.7, Claude 4
- **4 Agentes Especializados**:
  - 🔄 **Recepcionista IA** - Triagem inicial e direcionamento (padrão)
  - ⚖️ **Agente Previdenciário** - Aposentadorias, auxílios, pensões
  - 👥 **Agente BPC/LOAS** - Benefícios assistenciais para idosos e deficientes
  - 💼 **Agente Trabalhista** - Direitos trabalhistas e demissões

### 🎯 Recursos Principais

- **Autenticação Hierárquica**: Super Admin, Admin, Usuário
- **Dashboard Interativo**: Métricas em tempo real e chat de teste
- **Configuração Flexível**: Interface admin para gerenciar providers e agentes
- **Transferência Inteligente**: IA identifica especialidade e sugere transferência
- **Sugestão de Tags**: Sistema automático de categorização
- **Sistema de Auditoria**: Logs completos de todas as interações

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Banco**: PostgreSQL
- **IA**: LangChain, OpenAI, Google AI, Anthropic
- **Autenticação**: NextAuth.js
- **UI**: Componentes modernos e responsivos

## 📋 Credenciais de Teste

```bash
# Super Administrador
Email: admin@pandorapro.com
Senha: admin123

# Administrador do Escritório
Email: admin@exemploadvocacia.com  
Senha: admin123

# Usuário/Advogado
Email: advogado@exemploadvocacia.com
Senha: admin123
```

## 🚀 Como Executar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Banco de Dados
```bash
# Executar migrações
npx prisma migrate dev

# Popular com dados de exemplo
npx prisma db seed
```

### 3. Iniciar o Sistema
```bash
npm run dev
```

**Acesse**: http://localhost:3000

## 🧪 Como Testar o Sistema de IA

### 1. **Configure os Providers** (Admin)
1. Faça login como admin (`admin@exemploadvocacia.com`)
2. Clique em "Config IA" no dashboard
3. Adicione sua API Key da OpenAI, Google ou Anthropic
4. Configure os agentes especializados

### 2. **Teste as Conversas** (Dashboard)
1. No dashboard principal, use o "Teste de Agentes IA"
2. Selecione um agente (Recepcionista vem por padrão)
3. Digite mensagens como cliente
4. Observe as respostas inteligentes e sugestões de transferência

### 3. **Exemplos de Mensagens para Testar**

```text
# Para Recepcionista (triagem)
"Oi, preciso de ajuda com minha aposentadoria"
"Tenho 67 anos e quero o BPC"
"Fui demitido injustamente, o que fazer?"

# Para Agente Previdenciário
"Quando posso me aposentar? Tenho 35 anos de contribuição"
"Meu auxílio-doença foi negado, posso recorrer?"

# Para Agente BPC/LOAS  
"Sou deficiente e não tenho renda, posso pedir BPC?"
"Minha mãe tem 67 anos e renda baixa"

# Para Agente Trabalhista
"Não recebi minhas verbas rescisórias"
"Meu chefe não paga horas extras"
```

## 🎯 Funcionalidades em Teste

### ✅ **Funcionando Completamente**
- Sistema de autenticação e autorização
- Configuração de providers e agentes IA
- Chat inteligente com múltiplos agentes
- Transferência automática entre especialistas
- Sugestão de tags automática
- Dashboard com métricas
- Sistema de auditoria

### ⏳ **Próximas Implementações**
- Integração WhatsApp com Evolution API
- CRM completo para gestão de clientes
- Sistema de documentos com MinIO
- Relatórios e analytics avançados
- Webhooks para integrações externas

## 🔧 Configuração Avançada

### Variáveis de Ambiente Necessárias

```env
# Banco de Dados
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="seu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"

# APIs de IA (opcional - configure via interface)
OPENAI_API_KEY="sk-proj-..."
GOOGLE_API_KEY="AIza..."
ANTHROPIC_API_KEY="sk-ant-..."

# Futuras integrações
EVOLUTION_API_URL="http://..."
EVOLUTION_API_KEY="..."
MINIO_ENDPOINT="..."
MINIO_ACCESS_KEY="..."
MINIO_SECRET_KEY="..."
```

## 🏗️ Arquitetura do Sistema

```
pandoraprov4/
├── src/
│   ├── app/
│   │   ├── api/              # APIs REST
│   │   ├── admin/            # Interface administrativa
│   │   ├── dashboard/        # Dashboard principal
│   │   └── login/            # Autenticação
│   ├── components/ui/        # Componentes UI
│   ├── lib/
│   │   ├── ai/              # Sistema multi-provider IA
│   │   ├── auth.ts          # Configuração NextAuth
│   │   └── prisma.ts        # Cliente Prisma
│   └── types/               # Tipos TypeScript
├── prisma/
│   ├── schema.prisma        # Schema do banco
│   ├── migrations/          # Migrações
│   └── seed.ts             # Dados iniciais
└── FUNCIONALIDADES.md       # Checklist do projeto
```

## 🎉 Status do Projeto

**🟢 Fase 1 (Concluída)**: Sistema de IA Multi-Provider  
**🟡 Fase 2 (Em desenvolvimento)**: Integração WhatsApp  
**🔴 Fase 3 (Planejada)**: CRM Completo e Analytics  

---

## 📞 Suporte

Este é um sistema em desenvolvimento ativo. Para dúvidas sobre implementação ou contribuições, consulte o arquivo `FUNCIONALIDADES.md` para ver o status detalhado de cada feature.

**🚀 O Pandora Pro representa o futuro da automação jurídica com IA avançada!**
