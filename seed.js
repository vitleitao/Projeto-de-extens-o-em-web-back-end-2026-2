// Cria o usuário do proprietário e alguns produtos de exemplo.
// Rode com: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const produtos = [
  { nome: 'Shampoo hidratante 300ml', categoria: 'Revenda', precoCusto: 18.9, precoVenda: 34.9, estoque: 8, minimo: 4 },
  { nome: 'Condicionador hidratante 300ml', categoria: 'Revenda', precoCusto: 19.9, precoVenda: 36.9, estoque: 6, minimo: 4 },
  { nome: 'Máscara de reconstrução 500g', categoria: 'Revenda', precoCusto: 32.5, precoVenda: 59.9, estoque: 3, minimo: 3 },
  { nome: 'Finalizador leave-in 200ml', categoria: 'Revenda', precoCusto: 15, precoVenda: 29.9, estoque: 10, minimo: 3 },
  { nome: 'Óleo reparador de pontas 60ml', categoria: 'Revenda', precoCusto: 22, precoVenda: 42, estoque: 2, minimo: 2 },
  { nome: 'Coloração 7.0 louro médio', categoria: 'Uso no salão', precoCusto: 14.5, precoVenda: 0, estoque: 5, minimo: 4 },
  { nome: 'Coloração 6.0 louro escuro', categoria: 'Uso no salão', precoCusto: 14.5, precoVenda: 0, estoque: 2, minimo: 4 },
  { nome: 'Oxidante 20 volumes 900ml', categoria: 'Uso no salão', precoCusto: 17, precoVenda: 0, estoque: 3, minimo: 2 },
  { nome: 'Pó descolorante 300g', categoria: 'Uso no salão', precoCusto: 38, precoVenda: 0, estoque: 1, minimo: 2 },
  { nome: 'Esmalte cremoso vermelho', categoria: 'Revenda', precoCusto: 3.2, precoVenda: 8.5, estoque: 12, minimo: 5 },
];

async function main() {
  const senhaHash = await bcrypt.hash(process.env.SEED_ADMIN_SENHA || 'trocar123', 10);
  const email = (process.env.SEED_ADMIN_EMAIL || 'lukas@lukasmuny.com.br').toLowerCase();

  const dono = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: process.env.SEED_ADMIN_NOME || 'Lukas Muny',
      email,
      senhaHash,
      perfil: 'PROPRIETARIO',
    },
  });

  const jaTemProdutos = await prisma.produto.count();
  if (jaTemProdutos > 0) {
    console.log('Produtos já cadastrados, pulando os exemplos.');
    return;
  }

  for (const p of produtos) {
    const produto = await prisma.produto.create({
      data: {
        nome: p.nome,
        categoria: p.categoria,
        precoCusto: p.precoCusto,
        precoVenda: p.precoVenda,
        estoqueAtual: p.estoque,
        estoqueMinimo: p.minimo,
      },
    });
    await prisma.movimentacao.create({
      data: {
        produtoId: produto.id,
        tipo: 'ENTRADA',
        quantidade: p.estoque,
        saldoApos: p.estoque,
        motivo: 'Estoque inicial (seed)',
        usuarioId: dono.id,
      },
    });
  }

  console.log(`Seed concluído: usuário ${email} e ${produtos.length} produtos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
