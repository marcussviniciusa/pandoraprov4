# 🔧 Configuração do Pandora Pro

## Pré-requisitos

- Node.js 18+
- PostgreSQL 15+
- npm ou yarn

## Configuração Inicial

### 1. Clone e Instale
```bash
git clone <seu-repositorio>
cd pandoraprov4
npm install
```

### 2. Configure o Banco de Dados
```bash
# Inicie o PostgreSQL
sudo systemctl start postgresql

# Crie o banco de dados
createdb pandora_pro
```

### 3. Configure as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e configure:

```env
# Database
DATABASE_URL="postgresql://postgres:sua_senha@localhost:5432/pandora_pro"

# NextAuth
NEXTAUTH_SECRET="sua_chave_secreta_muito_segura_aqui"
NEXTAUTH_URL="http://localhost:3000"

# AI - OpenAI (OBRIGATÓRIO para IA)
OPENAI_API_KEY="sk-proj-..."

# WhatsApp Evolution API (opcional)
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua_chave_evolution_aqui"

# MinIO Storage (opcional)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="pandora-documents"
```

### 4. Configure o Banco
```bash
# Gerar o cliente Prisma
npx prisma generate

# Executar migrações
npx prisma migrate deploy

# Popular com dados iniciais
npx prisma db seed
```

### 5. Inicie o Desenvolvimento
```bash
npm run dev
```

## 🔑 Contas de Teste

Após executar o seed, as seguintes contas estarão disponíveis:

### Super Admin
- **Email**: admin@pandorapro.com
- **Senha**: admin123
- **Acesso**: Gestão global do sistema

### Admin Escritório
- **Email**: admin@exemploadvocacia.com
- **Senha**: admin123
- **Acesso**: Gestão do escritório

### Usuário Padrão
- **Email**: advogado@exemploadvocacia.com
- **Senha**: user123
- **Acesso**: Uso do sistema

## 🤖 Configuração da IA

### 1. OpenAI API Key
1. Acesse [OpenAI Platform](https://platform.openai.com/)
2. Crie uma conta e obtenha sua API Key
3. Configure no `.env`:
   ```env
   OPENAI_API_KEY="sk-proj-sua_chave_aqui"
   ```

### 2. Teste os Agentes
1. Faça login com conta de Admin ou Usuário
2. Acesse: `http://localhost:3000/test-ai`
3. Teste conversas com os agentes:
   - **Ana - Recepcionista**: Atendimento inicial
   - **Dr. Carlos - Previdenciário**: Aposentadorias, auxílios
   - **Dra. Maria - BPC/LOAS**: Benefícios assistenciais
   - **Dr. Pedro - Trabalhista**: Direitos trabalhistas

### 3. Exemplos de Teste

**Para Previdenciário**:
> "Quero me aposentar, tenho 62 anos e 35 anos de contribuição"

**Para BPC/LOAS**:
> "Sou deficiente e tenho baixa renda, posso receber algum benefício?"

**Para Trabalhista**:
> "Fui demitido sem justa causa, tenho direito a que?"

## 🔧 Funcionalidades Disponíveis

### ✅ Implementado
- [x] Sistema de autenticação completo
- [x] Hierarquia de usuários (Super Admin, Admin, User)
- [x] Agentes de IA com LangChain
- [x] Interface de teste para IA
- [x] Banco de dados estruturado
- [x] Sistema de tags inteligentes
- [x] Transferência automática entre agentes

### ⏳ Em Desenvolvimento
- [ ] Integração WhatsApp (Evolution API)
- [ ] CRM Jurídico completo
- [ ] Sistema de documentos (MinIO)
- [ ] Relatórios e Analytics
- [ ] Webhooks e automações

## 🚀 Próximos Passos

1. **Configurar OpenAI**: Para usar os agentes de IA
2. **Testar Agentes**: Na página `/test-ai`
3. **Configurar WhatsApp**: Para integração multicanal
4. **Personalizar Prompts**: Ajustar respostas dos agentes

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no terminal
2. Consulte a documentação no `/FUNCIONALIDADES.md`
3. Teste com dados do seed primeiro

---

**Status**: Sistema base funcionando com IA ✅
**Próxima**: Integração WhatsApp 📱 