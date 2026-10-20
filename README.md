# Estoque e Vendas — Salão Lukas Muny

API REST com painel web para controlar o estoque, as vendas de produtos e a reposição de um pequeno salão de beleza.

Projeto desenvolvido na disciplina **Projeto de Extensão em Web Back-End (2026/2)** do Centro Universitário UniCarioca, em parceria com o salão **Lukas Muny**, em Benfica, Rio de Janeiro.

| | |
| --- | --- |
| Aluna | Vitória de Lima Leitão |
| Matrícula | 2022200570 |
| Turma | SM262424 |
| Professor mentor | Prof. Marcos Ferreira |

## Por que este projeto existe

Antes do sistema, o controle do salão era feito em um caderno no balcão. Faltava coloração no dia em que a cliente já estava na cadeira, enquanto outros produtos ficavam meses parados na prateleira, alguns perto de vencer. Ninguém sabia dizer com segurança quanto havia de cada item nem o que mais vendia.

A ideia foi criar algo simples, gratuito e que funcionasse no celular, para o Lukas e a equipe registrarem vendas e uso de produtos no dia a dia e saberem o que precisa ser comprado.

## O que o sistema faz

- Cadastro de produtos com preço de custo, preço de venda, estoque mínimo, código de barras e validade.
- Registro de vendas com vários itens, com baixa automática do estoque.
- Baixa de produtos usados nos atendimentos (coloração, oxidante, máscara etc.).
- Entrada de mercadoria e ajuste de saldo depois de contar a prateleira.
- Lista de reposição com sugestão de compra, que pode ser copiada para o WhatsApp do fornecedor.
- Relatórios de mais vendidos no mês, produtos parados e produtos perto do vencimento.
- Dois perfis de acesso: **proprietário** (acesso total) e **profissional** (vende e dá baixa, mas não vê custo nem relatórios).

O saldo de um produto nunca é editado direto. Toda mudança gera uma movimentação, então dá pra saber quem mexeu no estoque e quando.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Servidor | Node.js 20 + Express |
| Banco de dados | PostgreSQL + Prisma ORM |
| Autenticação | JWT + bcrypt |
| Validação | Zod |
| Documentação | Swagger (OpenAPI 3) |
| Testes | Jest + Supertest |
| Painel | HTML, CSS e JavaScript puro |
| Hospedagem | Render (API) + Neon (PostgreSQL), planos gratuitos |

## Estrutura de pastas

```
├── prisma/
│   ├── schema.prisma        # modelo de dados
│   ├── migrations/          # migrações do banco
│   └── seed.js              # usuário inicial e produtos de exemplo
├── public/                  # painel web (abre em http://localhost:3000)
├── src/
│   ├── controllers/         # recebem a requisição e devolvem a resposta
│   ├── services/            # regras de negócio (estoque, vendas, relatórios)
│   ├── middlewares/         # autenticação, validação e tratamento de erros
│   ├── schemas/             # validações com Zod
│   ├── routes/              # definição das rotas
│   ├── docs/                # documentação Swagger
│   ├── app.js
│   └── server.js
├── tests/                   # testes automatizados
└── docs/                    # guia rápido de uso e prints
```

A requisição passa por autenticação e validação antes de chegar ao controller. O controller chama o service, que é a única camada que conversa com o banco.

## Como rodar localmente

Pré-requisitos: Node.js 20 ou superior e um banco PostgreSQL (local ou um banco gratuito no [Neon](https://neon.tech)).

```bash
# 1. Instalar as dependências
npm install

# 2. Criar o arquivo .env a partir do exemplo e preencher a DATABASE_URL e o JWT_SECRET
cp .env.example .env

# 3. Criar as tabelas no banco
npx prisma migrate deploy

# 4. Criar o usuário do proprietário e alguns produtos de exemplo
npm run seed

# 5. Subir a API
npm run dev
```

Depois é só abrir:

- Painel: http://localhost:3000
- Documentação da API: http://localhost:3000/docs

O login inicial é o definido no `.env` (`SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA`). Troque a senha padrão antes de usar no salão.

## Principais rotas

| Método | Rota | O que faz | Acesso |
| --- | --- | --- | --- |
| POST | `/auth/login` | Autentica e devolve o token | Todos |
| GET | `/produtos` | Lista produtos (filtro por nome, marca, código) | Todos |
| POST | `/produtos` | Cadastra produto | Proprietário |
| PUT | `/produtos/:id` | Atualiza dados e estoque mínimo | Proprietário |
| PATCH | `/produtos/:id/desativar` | Desativa sem apagar o histórico | Proprietário |
| POST | `/movimentacoes/entrada` | Chegada de mercadoria | Proprietário |
| POST | `/movimentacoes/uso-interno` | Baixa de produto usado no atendimento | Todos |
| POST | `/movimentacoes/ajuste` | Corrige o saldo depois da contagem | Proprietário |
| GET | `/movimentacoes` | Histórico de movimentações | Proprietário |
| POST | `/vendas` | Registra venda e baixa o estoque | Todos |
| GET | `/vendas` | Lista vendas por período | Proprietário |
| GET | `/relatorios/reposicao` | Produtos no mínimo ou abaixo | Proprietário |
| GET | `/relatorios/parados?dias=60` | Produtos sem saída no período | Proprietário |
| GET | `/relatorios/validade?dias=30` | Produtos perto do vencimento | Proprietário |
| GET | `/relatorios/mais-vendidos` | Ranking por quantidade e faturamento | Proprietário |
| POST | `/usuarios` | Cadastra uma profissional | Proprietário |

Exemplo de venda:

```http
POST /vendas
Authorization: Bearer <token>
Content-Type: application/json

{
  "formaPagamento": "pix",
  "itens": [
    { "produtoId": 1, "quantidade": 2 },
    { "produtoId": 6, "quantidade": 1 }
  ]
}
```

Se algum item não tiver saldo suficiente, a venda inteira é recusada e nada é gravado.

## Testes

```bash
npm test
```

Os testes usam um mock do Prisma, então rodam sem precisar de banco. Eles cobrem login, permissões por perfil, cadastro de produto, venda com e sem saldo, baixa por uso interno e os relatórios de reposição, parados e mais vendidos.

## Publicação (Render + Neon)

1. Criar um banco gratuito no Neon e copiar a string de conexão.
2. No Render, criar um **Web Service** apontando para este repositório.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Em *Environment*, cadastrar `DATABASE_URL`, `JWT_SECRET` e `JWT_EXPIRES_IN`.
6. Depois do primeiro deploy, rodar `npm run seed` uma vez pelo *Shell* do Render.

No plano gratuito o serviço "hiberna" quando fica sem uso, então a primeira requisição do dia pode demorar alguns segundos.

## Painel

| Vender | Estoque | Reposição | Relatórios |
| --- | --- | --- | --- |
| ![Tela de venda](docs/img/painel-vender.png) | ![Tela de estoque](docs/img/painel-estoque.png) | ![Lista de reposição](docs/img/painel-repor.png) | ![Relatórios](docs/img/painel-relatorios.png) |

O passo a passo para a equipe está no [guia rápido de uso](docs/guia-rapido.md).

## Próximos passos

- Leitura de código de barras pela câmera do celular.
- Controle de comissão por profissional.
- Envio automático da lista de reposição por WhatsApp.

## Licença

MIT. O código está aberto para que outros pequenos negócios possam usar e adaptar.
