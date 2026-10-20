// Painel do salão Lukas Muny — consome a API do próprio servidor.
// JavaScript puro, sem framework, para rodar leve no celular do balcão.

const estado = {
  token: localStorage.getItem('token'),
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  produtos: [],
  carrinho: [], // { produto, quantidade }
  aba: 'vender',
};

const $ = (sel) => document.querySelector(sel);
const conteudo = $('#conteudo');
const ehDono = () => estado.usuario && estado.usuario.perfil === 'PROPRIETARIO';
const reais = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- comunicação com a API ----------
async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const resp = await fetch(caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(estado.token ? { Authorization: `Bearer ${estado.token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  const dados = await resp.json().catch(() => ({}));

  if (resp.status === 401 && estado.token) {
    sair();
    throw new Error('Sua sessão expirou. Entre de novo.');
  }
  if (!resp.ok) {
    const detalhe = dados.detalhes && dados.detalhes[0] ? ` (${dados.detalhes[0].mensagem})` : '';
    throw new Error((dados.erro || 'Não foi possível concluir.') + detalhe);
  }
  return dados;
}

let timerAviso;
function avisar(texto, ruim = false) {
  const el = $('#aviso');
  el.textContent = texto;
  el.classList.toggle('ruim', ruim);
  el.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => (el.hidden = true), 3500);
}

// ---------- login ----------
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  $('#login-erro').textContent = '';
  try {
    const { token, usuario } = await api('/auth/login', {
      metodo: 'POST',
      corpo: { email: form.get('email'), senha: form.get('senha') },
    });
    estado.token = token;
    estado.usuario = usuario;
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    iniciar();
  } catch (err) {
    $('#login-erro').textContent = err.message;
  }
});

function sair() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  estado.token = null;
  estado.usuario = null;
  estado.carrinho = [];
  $('#app').hidden = true;
  $('#tela-login').hidden = false;
}
$('#btn-sair').addEventListener('click', sair);

// ---------- navegação ----------
document.querySelectorAll('.aba').forEach((botao) =>
  botao.addEventListener('click', () => trocarAba(botao.dataset.aba))
);

function trocarAba(aba) {
  estado.aba = aba;
  document.querySelectorAll('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  const telas = { vender: telaVender, estoque: telaEstoque, uso: telaUso, repor: telaRepor, relatorios: telaRelatorios };
  telas[aba]().catch((err) => avisar(err.message, true));
}

async function carregarProdutos() {
  estado.produtos = await api('/produtos');
  return estado.produtos;
}

async function atualizarBadge() {
  if (!ehDono()) return;
  try {
    const lista = await api('/relatorios/reposicao');
    const badge = $('#badge-repor');
    badge.textContent = lista.length;
    badge.hidden = lista.length === 0;
  } catch (_) { /* sem badge, sem problema */ }
}

function filtrar(produtos, termo) {
  const t = termo.trim().toLowerCase();
  if (!t) return produtos;
  return produtos.filter((p) =>
    [p.nome, p.marca, p.categoria, p.codigoBarras].some((v) => v && v.toLowerCase().includes(t))
  );
}

function barraNivel(p) {
  const ref = Math.max(p.estoqueMinimo * 2, 1);
  const pct = Math.min(100, Math.round((p.estoqueAtual / ref) * 100));
  return `<div class="nivel" aria-hidden="true"><span style="width:${pct}%"></span></div>`;
}

// ---------- VENDER ----------
async function telaVender() {
  conteudo.onclick = null;
  conteudo.innerHTML = `
    <h2>Registrar venda</h2>
    <p class="dica">Busque o produto, adicione e escolha a forma de pagamento.</p>
    <input class="busca" id="busca-venda" type="search" placeholder="Nome, marca ou código de barras" />
    <ul class="lista" id="lista-venda"><li class="vazio">Carregando produtos…</li></ul>
    <section class="carrinho" id="carrinho"></section>`;

  const produtos = (await carregarProdutos()).filter((p) => Number(p.precoVenda) > 0);
  const listar = () => {
    const achados = filtrar(produtos, $('#busca-venda').value).slice(0, 30);
    $('#lista-venda').innerHTML = achados.length
      ? achados.map((p) => `
        <li class="item">
          <span class="item-nome">${esc(p.nome)}</span>
          <span class="item-info">${reais(p.precoVenda)} · ${p.estoqueAtual} em estoque</span>
          <span class="item-acoes">
            <button class="btn btn-pequeno" data-add="${p.id}" ${p.estoqueAtual < 1 ? 'disabled' : ''}>Adicionar</button>
          </span>
        </li>`).join('')
      : '<li class="vazio">Nenhum produto encontrado.</li>';
  };

  $('#busca-venda').addEventListener('input', listar);
  $('#lista-venda').addEventListener('click', (e) => {
    const id = Number(e.target.dataset.add);
    if (!id) return;
    const produto = produtos.find((p) => p.id === id);
    const item = estado.carrinho.find((i) => i.produto.id === id);
    if (item) {
      if (item.quantidade < produto.estoqueAtual) item.quantidade += 1;
    } else {
      estado.carrinho.push({ produto, quantidade: 1 });
    }
    desenharCarrinho();
  });

  listar();
  desenharCarrinho();
}

function desenharCarrinho() {
  const box = $('#carrinho');
  if (!box) return;
  if (!estado.carrinho.length) {
    box.innerHTML = '<h3>Venda atual</h3><p class="dica" style="margin:0">Nenhum item adicionado.</p>';
    return;
  }
  const total = estado.carrinho.reduce((s, i) => s + Number(i.produto.precoVenda) * i.quantidade, 0);
  box.innerHTML = `
    <h3>Venda atual</h3>
    ${estado.carrinho.map((i, idx) => `
      <div class="linha-carrinho">
        <span>${esc(i.produto.nome)}</span>
        <span class="qtd">
          <button data-menos="${idx}" aria-label="Diminuir">−</button>
          <strong>${i.quantidade}</strong>
          <button data-mais="${idx}" aria-label="Aumentar">+</button>
        </span>
      </div>`).join('')}
    <div class="total"><span>Total</span><span>${reais(total)}</span></div>
    <div class="fechar-venda">
      <label>Forma de pagamento
        <select id="pagamento">
          <option value="pix">Pix</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
      </label>
      <button class="btn btn-principal" id="btn-finalizar">Registrar venda</button>
    </div>`;

  box.onclick = async (e) => {
    const { menos, mais } = e.target.dataset;
    if (menos !== undefined) {
      const item = estado.carrinho[menos];
      item.quantidade -= 1;
      if (item.quantidade < 1) estado.carrinho.splice(menos, 1);
      desenharCarrinho();
    }
    if (mais !== undefined) {
      const item = estado.carrinho[mais];
      if (item.quantidade < item.produto.estoqueAtual) item.quantidade += 1;
      desenharCarrinho();
    }
    if (e.target.id === 'btn-finalizar') {
      e.target.disabled = true;
      try {
        const venda = await api('/vendas', {
          metodo: 'POST',
          corpo: {
            formaPagamento: $('#pagamento').value,
            itens: estado.carrinho.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
          },
        });
        estado.carrinho = [];
        avisar(`Venda #${venda.id} registrada: ${reais(venda.valorTotal)}`);
        atualizarBadge();
        telaVender();
      } catch (err) {
        avisar(err.message, true);
        e.target.disabled = false;
      }
    }
  };
}

// ---------- ESTOQUE ----------
async function telaEstoque() {
  conteudo.onclick = null;
  conteudo.innerHTML = `
    <h2>Estoque</h2>
    <p class="dica">Os itens destacados estão no mínimo ou abaixo dele.</p>
    ${ehDono() ? '<button class="btn" id="btn-novo" style="margin-bottom:14px">Cadastrar produto</button><div id="form-novo"></div>' : ''}
    <input class="busca" id="busca-estoque" type="search" placeholder="Buscar produto" />
    <ul class="lista" id="lista-estoque"><li class="vazio">Carregando…</li></ul>`;

  const produtos = await carregarProdutos();
  const listar = () => {
    const achados = filtrar(produtos, $('#busca-estoque').value);
    $('#lista-estoque').innerHTML = achados.length
      ? achados.map((p) => `
        <li class="item ${p.estoqueAtual <= p.estoqueMinimo ? 'baixo' : ''}">
          <span class="item-nome">${esc(p.nome)}</span>
          <span class="item-info">${p.estoqueAtual} un. · mínimo ${p.estoqueMinimo}${p.categoria ? ' · ' + esc(p.categoria) : ''}</span>
          ${barraNivel(p)}
          ${ehDono() ? `<span class="item-acoes"><button class="btn btn-pequeno" data-entrada="${p.id}">Entrada</button></span>` : ''}
        </li>`).join('')
      : '<li class="vazio">Nenhum produto cadastrado ainda.</li>';
  };

  $('#busca-estoque').addEventListener('input', listar);
  $('#lista-estoque').addEventListener('click', async (e) => {
    const id = Number(e.target.dataset.entrada);
    if (!id) return;
    const produto = produtos.find((p) => p.id === id);
    const qtd = Number(prompt(`Quantas unidades de "${produto.nome}" chegaram?`, '1'));
    if (!qtd || qtd < 1) return;
    try {
      const mov = await api('/movimentacoes/entrada', { metodo: 'POST', corpo: { produtoId: id, quantidade: qtd } });
      produto.estoqueAtual = mov.saldoApos;
      avisar(`Entrada registrada. Saldo: ${mov.saldoApos}`);
      listar();
      atualizarBadge();
    } catch (err) {
      avisar(err.message, true);
    }
  });

  if (ehDono()) $('#btn-novo').addEventListener('click', formNovoProduto);
  listar();
}

function formNovoProduto() {
  const box = $('#form-novo');
  if (box.innerHTML) { box.innerHTML = ''; return; }
  box.innerHTML = `
    <form class="cartao" id="novo-produto">
      <label>Nome<input name="nome" required /></label>
      <div class="grade-2">
        <label>Marca<input name="marca" /></label>
        <label>Categoria
          <select name="categoria"><option>Revenda</option><option>Uso no salão</option></select>
        </label>
      </div>
      <div class="grade-2">
        <label>Preço de custo<input name="precoCusto" type="number" step="0.01" min="0" /></label>
        <label>Preço de venda<input name="precoVenda" type="number" step="0.01" min="0" value="0" required /></label>
      </div>
      <div class="grade-2">
        <label>Quantidade atual<input name="estoqueInicial" type="number" min="0" value="0" /></label>
        <label>Estoque mínimo<input name="estoqueMinimo" type="number" min="0" value="2" /></label>
      </div>
      <div class="grade-2">
        <label>Código de barras<input name="codigoBarras" inputmode="numeric" /></label>
        <label>Validade<input name="validade" type="date" /></label>
      </div>
      <button class="btn btn-principal">Salvar produto</button>
    </form>`;

  $('#novo-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target));
    Object.keys(dados).forEach((k) => dados[k] === '' && delete dados[k]);
    try {
      await api('/produtos', { metodo: 'POST', corpo: dados });
      avisar('Produto cadastrado.');
      telaEstoque();
      atualizarBadge();
    } catch (err) {
      avisar(err.message, true);
    }
  });
}

// ---------- USO NO SALÃO ----------
async function telaUso() {
  conteudo.innerHTML = `
    <h2>Uso no atendimento</h2>
    <p class="dica">Toque no produto que foi usado na cliente para dar baixa de 1 unidade.</p>
    <div class="atalhos" id="atalhos"><p class="vazio">Carregando…</p></div>
    <p class="dica" style="margin-top:22px">Não achou? Busque abaixo.</p>
    <input class="busca" id="busca-uso" type="search" placeholder="Buscar produto" />
    <ul class="lista" id="lista-uso"></ul>`;

  const produtos = await carregarProdutos();
  const doSalao = produtos.filter((p) => (p.categoria || '').toLowerCase().includes('uso'));

  const atalho = (p) => `
    <button class="atalho" data-usar="${p.id}">
      <strong>${esc(p.nome)}</strong>
      <span>${p.estoqueAtual} em estoque</span>
    </button>`;

  $('#atalhos').innerHTML = doSalao.length
    ? doSalao.map(atalho).join('')
    : '<p class="vazio">Cadastre produtos com a categoria "Uso no salão" para aparecerem aqui.</p>';

  $('#busca-uso').addEventListener('input', (e) => {
    const termo = e.target.value;
    $('#lista-uso').innerHTML = termo
      ? filtrar(produtos, termo).slice(0, 15).map((p) => `
          <li class="item"><span class="item-nome">${esc(p.nome)}</span>
          <span class="item-info">${p.estoqueAtual} em estoque</span>
          <span class="item-acoes"><button class="btn btn-pequeno" data-usar="${p.id}">Dar baixa</button></span></li>`).join('')
      : '';
  });

  conteudo.onclick = async (e) => {
    const alvo = e.target.closest('[data-usar]');
    if (!alvo) return;
    const id = Number(alvo.dataset.usar);
    const produto = produtos.find((p) => p.id === id);
    try {
      const mov = await api('/movimentacoes/uso-interno', { metodo: 'POST', corpo: { produtoId: id, quantidade: 1 } });
      produto.estoqueAtual = mov.saldoApos;
      avisar(`Baixa de 1 ${produto.nome}. Restam ${mov.saldoApos}.`);
      alvo.querySelectorAll('span').forEach((s) => (s.textContent = `${mov.saldoApos} em estoque`));
      atualizarBadge();
    } catch (err) {
      avisar(err.message, true);
    }
  };
}

// ---------- REPOR ----------
async function telaRepor() {
  conteudo.onclick = null;
  conteudo.innerHTML = `
    <h2>Lista de reposição</h2>
    <p class="dica">Produtos no estoque mínimo ou abaixo. A sugestão repõe até o dobro do mínimo.</p>
    <ul class="lista" id="lista-repor"><li class="vazio">Carregando…</li></ul>
    <button class="btn" id="btn-copiar" style="margin-top:16px">Copiar lista para o WhatsApp</button>`;

  const lista = await api('/relatorios/reposicao');
  $('#lista-repor').innerHTML = lista.length
    ? lista.map((p) => `
      <li class="item baixo">
        <span class="item-nome">${esc(p.nome)}</span>
        <span class="item-info">Tem ${p.estoqueAtual} · mínimo ${p.estoqueMinimo}</span>
        <span class="item-acoes"><strong>Comprar ${p.sugestaoCompra}</strong></span>
      </li>`).join('')
    : '<li class="vazio">Tudo certo: nenhum produto abaixo do mínimo.</li>';

  $('#btn-copiar').hidden = !lista.length;
  $('#btn-copiar').addEventListener('click', async () => {
    const texto = 'Pedido Lukas Muny:\n' + lista.map((p) => `- ${p.sugestaoCompra}x ${p.nome}`).join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Lista copiada. É só colar na conversa com o fornecedor.');
    } catch (_) {
      avisar('Não consegui copiar automaticamente neste navegador.', true);
    }
  });
}

// ---------- RELATÓRIOS ----------
async function telaRelatorios() {
  conteudo.onclick = null;
  conteudo.innerHTML = `
    <h2>Relatórios</h2>
    <section class="secao-rel" id="rel-vendas"><h3>Vendas do mês</h3><p class="vazio">Carregando…</p></section>
    <section class="secao-rel" id="rel-parados"><h3>Parados há mais de 60 dias</h3></section>
    <section class="secao-rel" id="rel-validade"><h3>Vencendo em até 30 dias</h3></section>`;

  const [mais, parados, validade] = await Promise.all([
    api('/relatorios/mais-vendidos'),
    api('/relatorios/parados?dias=60'),
    api('/relatorios/validade?dias=30'),
  ]);

  $('#rel-vendas').innerHTML = `
    <h3>Vendas do mês</h3>
    <div class="numeros">
      <div><strong>${reais(mais.faturamentoTotal)}</strong><span>faturado em revenda</span></div>
      <div><strong>${mais.totalVendas}</strong><span>vendas</span></div>
    </div>
    <ul class="lista">${mais.produtos.slice(0, 10).map((p) => `
      <li class="item"><span class="item-nome">${esc(p.nome)}</span>
      <span class="item-info">${p.quantidade} vendidos · ${reais(p.faturamento)}</span></li>`).join('')
      || '<li class="vazio">Nenhuma venda registrada este mês.</li>'}</ul>`;

  const totalParado = parados.reduce((s, p) => s + p.valorParado, 0);
  $('#rel-parados').innerHTML = `
    <h3>Parados há mais de 60 dias</h3>
    ${parados.length ? `<p class="dica">${reais(totalParado)} parados na prateleira. Bons candidatos para kit ou promoção.</p>` : ''}
    <ul class="lista">${parados.map((p) => `
      <li class="item"><span class="item-nome">${esc(p.nome)}</span>
      <span class="item-info">${p.estoqueAtual} un. · última saída: ${data(p.ultimaSaida)}</span>
      <span class="item-acoes">${reais(p.valorParado)}</span></li>`).join('')
      || '<li class="vazio">Nenhum produto parado.</li>'}</ul>`;

  $('#rel-validade').innerHTML = `
    <h3>Vencendo em até 30 dias</h3>
    <ul class="lista">${validade.map((p) => `
      <li class="item"><span class="item-nome">${esc(p.nome)}</span>
      <span class="item-info">${p.estoqueAtual} un. · ${p.vencido ? '<span class="tag-vencido">vencido em</span>' : 'vence em'} ${data(p.validade)}</span></li>`).join('')
      || '<li class="vazio">Nenhum produto perto do vencimento.</li>'}</ul>`;
}

// ---------- início ----------
function iniciar() {
  $('#tela-login').hidden = true;
  $('#app').hidden = false;
  $('#nome-usuario').textContent = estado.usuario.nome.split(' ')[0];
  document.querySelectorAll('.so-dono').forEach((el) => (el.hidden = !ehDono()));
  trocarAba('vender');
  atualizarBadge();
}

if (estado.token && estado.usuario) iniciar();
else $('#tela-login').hidden = false;
