import { PrismaClient } from '@/generated/prisma'
import bcrypt from 'bcryptjs'
import { UserRole, AgentType, AIProvider, AIModel } from '@/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@pandorapro.com' },
    update: {},
    create: {
      email: 'admin@pandorapro.com',
      password: hashedPassword,
      name: 'Super Administrador',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  })

  console.log('✅ Super Admin criado:', superAdmin.email)

  // Criar escritório de exemplo
  const exampleOffice = await prisma.office.create({
    data: {
      name: 'Exemplo Advocacia Ltda',
      email: 'contato@exemploadvocacia.com',
      phone: '(11) 9999-9999',
      address: 'Rua Exemplo, 123 - São Paulo, SP',
      cnpj: '12.345.678/0001-90',
      isActive: true,
    },
  })

  console.log('✅ Escritório criado:', exampleOffice.name)

  // Criar um administrador para o escritório
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@exemploadvocacia.com' },
    update: {},
    create: {
      email: 'admin@exemploadvocacia.com',
      password: hashedPassword,
      name: 'Administrador Escritório',
      role: UserRole.ADMIN,
      officeId: exampleOffice.id,
      isActive: true,
    },
  })

  console.log('✅ Admin do escritório criado:', adminUser.email)

  // Criar um usuário comum
  const user = await prisma.user.upsert({
    where: { email: 'advogado@exemploadvocacia.com' },
    update: {},
    create: {
      email: 'advogado@exemploadvocacia.com',
      password: hashedPassword,
      name: 'Advogado Exemplo',
      role: UserRole.USER,
      officeId: exampleOffice.id,
      isActive: true,
    },
  })

  console.log('✅ Usuário comum criado:', user.email)

  // Criar apenas o agente Recepcionista como padrão
  await prisma.aiAgent.create({
    data: {
      name: 'Recepcionista Virtual',
      type: AgentType.RECEPTIONIST,
      prompt: `Você é uma recepcionista virtual especializada em escritório de advocacia previdenciária. 
        Sua função é recepcionar clientes, fazer triagem inicial dos casos e direcionar para o agente especialista apropriado.
        Seja sempre cordial, empática e profissional. Colete informações básicas: nome, telefone, tipo de problema jurídico.
        Se não conseguir identificar a especialidade, faça perguntas direcionadas para classificar corretamente.
        
        IMPORTANTE: Se não houver agentes especialistas disponíveis para a área identificada, informe que um atendente humano especializado entrará em contato em breve.`,
      temperature: 0.7,
      maxTokens: 1000,
      model: 'OPENAI-GPT_4O_MINI',
      provider: AIProvider.OPENAI,
      aiModel: AIModel.GPT_4O_MINI,
      officeId: exampleOffice.id,
    },
  })

  console.log('✅ Agente Recepcionista criado (agentes especialistas devem ser criados pelo admin)')

  // Sistema de tags para organização
  const tags = [
    { name: 'Urgente', color: '#EF4444', description: 'Casos que precisam de atenção imediata' },
    { name: 'BPC/LOAS Idoso', color: '#3B82F6', description: 'Benefício para idosos 65+' },
    { name: 'BPC/LOAS Deficiente', color: '#8B5CF6', description: 'Benefício para pessoas com deficiência' },
    { name: 'Aposentadoria', color: '#10B981', description: 'Questões sobre aposentadorias' },
    { name: 'Auxílio-Doença', color: '#F59E0B', description: 'Afastamento por problemas de saúde' },
    { name: 'Pensão por Morte', color: '#6B7280', description: 'Benefício para dependentes' },
    { name: 'Trabalhista', color: '#EF4444', description: 'Direitos trabalhistas' },
    { name: 'Documentação Pendente', color: '#F97316', description: 'Aguardando documentos do cliente' },
    { name: 'Primeira Consulta', color: '#06B6D4', description: 'Primeiro contato do cliente' },
    { name: 'Acompanhamento', color: '#84CC16', description: 'Follow-up de casos em andamento' }
  ]

  // Criar tags
  for (const tagData of tags) {
    await prisma.tag.upsert({
      where: {
        name_officeId: {
          name: tagData.name,
          officeId: exampleOffice.id
        }
      },
      update: {},
      create: {
        ...tagData,
        officeId: exampleOffice.id,
      },
    })
  }

  console.log('✅ Tags criadas')

  // Status personalizados para workflow
  const customStatuses = [
    { name: 'Novo Lead', color: '#3B82F6', description: 'Cliente potencial recém-chegado', order: 1 },
    { name: 'Em Triagem', color: '#F59E0B', description: 'Avaliando tipo de caso', order: 2 },
    { name: 'Documentos Pendentes', color: '#EF4444', description: 'Aguardando documentação', order: 3 },
    { name: 'Em Análise', color: '#8B5CF6', description: 'Caso sendo analisado pela equipe jurídica', order: 4 },
    { name: 'Protocolo Enviado', color: '#10B981', description: 'Processo protocolado no órgão competente', order: 5 },
    { name: 'Aguardando Resposta', color: '#6B7280', description: 'Aguardando retorno do órgão', order: 6 },
    { name: 'Concluído', color: '#059669', description: 'Caso finalizado com sucesso', order: 7 }
  ]

  // Criar status personalizados
  for (const statusData of customStatuses) {
    await prisma.customStatus.upsert({
      where: {
        name_officeId: {
          name: statusData.name,
          officeId: exampleOffice.id
        }
      },
      update: {},
      create: {
        ...statusData,
        officeId: exampleOffice.id,
      },
    })
  }

  console.log('✅ Status personalizados criados')
  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 