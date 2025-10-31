// Caminho: backend/prisma/seed.ts
import {
  PrismaClient,
  PapelUsuario,
  StatusUsuario,
  TipoUnidade,
  CampoVerificacao,
  OperadorCondicao,
  NivelVendedor, // Certifique-se que NivelVendedor está importado
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- Configurações do Seed ---
const SENHA_PADRAO = 'Senha@123'; // Senha forte para todos os usuários de teste
const NUM_VENDEDORES = 16;
// --------------------------

async function main() {
  console.log(`🌱 Iniciando o processo de seeding...`);
  console.log(`🔑 Senha padrão para usuários criados: ${SENHA_PADRAO}`);

  // --- Limpeza Opcional ---
  console.log('🧹 Limpando dados antigos (se existirem)...');
  // Ordem reversa para evitar erros de constraint FK
  await prisma.cartelaConcluida.deleteMany({});
  await prisma.notificacao.deleteMany({});
  await prisma.relatorioFinanceiro.deleteMany({});
  await prisma.resgatePremio.deleteMany({});
  await prisma.premio.deleteMany({});
  await prisma.envioVenda.deleteMany({});
  await prisma.condicaoRequisito.deleteMany({});
  await prisma.requisitoCartela.deleteMany({});
  await prisma.regraCartela.deleteMany({});
  // REMOVIDA A LINHA PROBLEMÁTICA: await prisma.campanha.updateMany({ data: { oticasAlvo: { set: [] } } });
  await prisma.campanha.deleteMany({});
  await prisma.usuario.deleteMany({}); // Delete usuários antes de Óticas
  await prisma.optica.deleteMany({}); // Delete Óticas
  await prisma.configuracaoGlobal.deleteMany({});
  console.log('🗑️ Dados antigos limpos.');

  // --- Criação dos Dados ---

  // 1. Senha Padrão (Hash)
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  console.log(`🔒 Senha padrão hasheada.`);

  // 2. Óticas (Matriz e Filiais)
  console.log('🏢 Criando Óticas (Matriz e Filiais)...');
  const opticaMatriz = await prisma.optica.create({
    data: {
      cnpj: '11111111000111',
      nome: 'Ótica Matriz Principal',
      ehMatriz: true,
      ativa: true,
    },
  });
  const opticaFilialA = await prisma.optica.create({
    data: {
      cnpj: '22222222000122',
      nome: 'Ótica Filial Alfa',
      ativa: true,
      matrizId: opticaMatriz.id,
    },
  });
  const opticaFilialB = await prisma.optica.create({
    data: {
      cnpj: '33333333000133',
      nome: 'Ótica Filial Beta',
      ativa: true,
      matrizId: opticaMatriz.id,
    },
  });
  const opticaIsolada = await prisma.optica.create({
    data: {
      cnpj: '44444444000144',
      nome: 'Ótica Independente Delta',
      ativa: true,
    },
  });
  console.log(
    `✨ Óticas criadas: Matriz(${opticaMatriz.id}), FilialA(${opticaFilialA.id}), FilialB(${opticaFilialB.id}), Isolada(${opticaIsolada.id})`,
  );

  // 3. Usuários (1 Admin, 3 Gerentes, 16 Vendedores)
  console.log(`👤 Criando ${1 + 3 + NUM_VENDEDORES} Usuários...`);
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Admin Supremo EPS',
      email: 'admin@eps.com.br',
      senhaHash: senhaHash,
      papel: PapelUsuario.ADMIN,
      status: StatusUsuario.ATIVO,
    },
  });

  const gerenteMatriz = await prisma.usuario.create({
    data: {
      nome: 'Gerente Matriz',
      email: 'gerente.matriz@eps.com.br',
      senhaHash: senhaHash,
      papel: PapelUsuario.GERENTE,
      status: StatusUsuario.ATIVO,
      opticaId: opticaMatriz.id,
    },
  });

  const gerenteFilialA = await prisma.usuario.create({
    data: {
      nome: 'Gerente Filial Alfa',
      email: 'gerente.alfa@eps.com.br',
      senhaHash: senhaHash,
      papel: PapelUsuario.GERENTE,
      status: StatusUsuario.ATIVO,
      opticaId: opticaFilialA.id,
    },
  });

  const gerenteFilialB = await prisma.usuario.create({
    data: {
      nome: 'Gerente Filial Beta',
      email: 'gerente.beta@eps.com.br',
      senhaHash: senhaHash,
      papel: PapelUsuario.GERENTE,
      status: StatusUsuario.ATIVO,
      opticaId: opticaFilialB.id,
    },
  });

  // Criar Vendedores distribuídos
  const vendedores = [];
  const gerentes = [gerenteMatriz, gerenteFilialA, gerenteFilialB];
  const oticas = [opticaMatriz, opticaFilialA, opticaFilialB, opticaIsolada];

  for (let i = 1; i <= NUM_VENDEDORES; i++) {
    const gerenteIndex = i % gerentes.length;
    const oticaIndex = i % oticas.length;
    const nome = `Vendedor ${String(i).padStart(2, '0')}`;
    const email = `vendedor${String(i).padStart(2, '0')}@eps.com.br`;

    const rankingMoedinhas = Math.floor(Math.random() * 5000) + 500;
    // CORREÇÃO: Declarar tipo explicitamente
    let nivel: NivelVendedor = NivelVendedor.BRONZE;
    if (rankingMoedinhas >= 10000) nivel = NivelVendedor.DIAMANTE;
    else if (rankingMoedinhas >= 5000) nivel = NivelVendedor.OURO;
    else if (rankingMoedinhas >= 1000) nivel = NivelVendedor.PRATA;

    const vendedor = await prisma.usuario.create({
      data: {
        nome: nome,
        email: email,
        senhaHash: senhaHash,
        papel: PapelUsuario.VENDEDOR,
        status: StatusUsuario.ATIVO,
        opticaId: oticas[oticaIndex].id,
        gerenteId: gerentes[gerenteIndex].id,
        saldoMoedinhas: Math.floor(Math.random() * 1000),
        rankingMoedinhas: rankingMoedinhas,
        nivel: nivel, // Atribuição correta
      },
    });
    vendedores.push(vendedor);
  }
  console.log(`✨ Usuários criados: 1 Admin, 3 Gerentes, ${NUM_VENDEDORES} Vendedores.`);

  // 4. Campanhas de Teste
  console.log('🎯 Criando Campanhas de Teste...');

  // CORREÇÃO: Definir hoje e fimDoAno DENTRO da função main
  const hoje = new Date();
  const fimDoAno = new Date(hoje.getFullYear(), 11, 31); // 31 de Dezembro


  // Campanha 1: Específica para Matriz e Filial A
  const campanhaTarget = await prisma.campanha.create({
    data: {
      titulo: 'Campanha Foco Matriz+Alfa (Seed)',
      descricao: 'Campanha direcionada apenas para a Matriz e Filial Alfa.',
      dataInicio: hoje, // Usa a variável definida aqui
      dataFim: fimDoAno, // Usa a variável definida aqui
      pontosReaisPorCartela: 75.0,
      moedinhasPorCartela: 150,
      percentualGerente: 0.05,
      status: 'ATIVA',
      paraTodasOticas: false,
      oticasAlvo: {
        connect: [{ id: opticaMatriz.id }, { id: opticaFilialA.id }],
      },
      cartelas: {
        create: [
          {
            numeroCartela: 1,
            descricao: 'Meta Principal',
            requisitos: {
              create: [
                {
                  descricao: 'Vender Kit Premium (Seed)',
                  quantidade: 3,
                  tipoUnidade: TipoUnidade.UNIDADE,
                  ordem: 1,
                  condicoes: {
                    create: [
                      { campo: CampoVerificacao.NOME_PRODUTO, operador: OperadorCondicao.CONTEM, valor: 'Kit Premium' },
                      { campo: CampoVerificacao.VALOR_VENDA, operador: OperadorCondicao.MAIOR_QUE, valor: '200' },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✨ Campanha Direcionada criada: ${campanhaTarget.titulo}`);

  // Campanha 2: Para Todas as Óticas (Spillover)
  const campanhaGlobal = await prisma.campanha.create({
    data: {
      titulo: 'Campanha Global Spillover (Seed)',
      descricao: 'Campanha para todas as óticas, com 2 cartelas para testar spillover.',
      dataInicio: hoje, // Usa a variável definida aqui
      dataFim: fimDoAno, // Usa a variável definida aqui
      pontosReaisPorCartela: 30.0,
      moedinhasPorCartela: 60,
      percentualGerente: 0.10,
      status: 'ATIVA',
      paraTodasOticas: true,
      cartelas: {
        create: [
          // Cartela 1
          {
            numeroCartela: 1,
            requisitos: {
              create: [
                {
                  descricao: 'Lente Simples (Seed)',
                  quantidade: 2,
                  tipoUnidade: TipoUnidade.UNIDADE,
                  ordem: 1,
                  condicoes: { create: [{ campo: CampoVerificacao.NOME_PRODUTO, operador: OperadorCondicao.CONTEM, valor: 'Lente Simples' }] },
                },
              ],
            },
          },
          // Cartela 2
          {
            numeroCartela: 2,
            requisitos: {
              create: [
                {
                  descricao: 'Lente Simples (Seed)',
                  quantidade: 2,
                  tipoUnidade: TipoUnidade.UNIDADE,
                  ordem: 1,
                  condicoes: { create: [{ campo: CampoVerificacao.NOME_PRODUTO, operador: OperadorCondicao.CONTEM, valor: 'Lente Simples' }] },
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✨ Campanha Global criada: ${campanhaGlobal.titulo}`);

  // 5. Prêmios
  console.log('🎁 Criando Prêmios de Teste...');
  await prisma.premio.createMany({
    data: [
      {
        nome: 'Caneca Exclusiva EPS (Seed)',
        descricao: 'Caneca para teste de resgate.',
        custoMoedinhas: 100,
        estoque: 20,
        ativo: true,
      },
      {
        nome: 'Fone Bluetooth (Seed)',
        descricao: 'Fone de ouvido sem fio.',
        custoMoedinhas: 1000,
        estoque: 5,
        ativo: true,
      },
      {
        nome: 'Prêmio Sem Estoque (Seed)',
        descricao: 'Para testar validação de estoque.',
        custoMoedinhas: 50,
        estoque: 0,
        ativo: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✨ Prêmios criados.');

  // 6. Configurações Globais
  console.log('⚙️ Criando Configurações Globais de Teste...');
  await prisma.configuracaoGlobal.createMany({
    data: [
      { chave: 'PONTOS_NIVEL_PRATA', valor: '1000', descricao: 'Moedinhas para atingir Prata (Seed)' },
      { chave: 'PONTOS_NIVEL_OURO', valor: '5000', descricao: 'Moedinhas para atingir Ouro (Seed)' },
      { chave: 'PONTOS_NIVEL_DIAMANTE', valor: '10000', descricao: 'Moedinhas para atingir Diamante (Seed)' },
      { chave: 'PERCENTUAL_MAX_GERENTE', valor: '0.15', descricao: 'Comissão máxima do gerente (15%) (Seed)' },
    ],
    skipDuplicates: true,
  });
  console.log('✨ Configurações criadas.');

  console.log(`\n✅ Seeding concluído com sucesso!`);

} // Fim da função main

main()
  .catch((e) => {
    console.error('❌ Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexão com o banco de dados fechada.');
  });