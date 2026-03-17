// ===== Supabase Client =====
const SUPABASE_URL = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaGp2cHN4a2ZqY3hpdHBuaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1ODk4NzksImV4cCI6MjA1NTE2NTg3OX0.kAcBsHJnlr56fJ6qvXSLOWRiLTnQR7ilXUi_2Qzj4RE';
let supabase;

// ===== Authorized Users =====
const AUTHORIZED_EMAILS = [
  'hugowschramm@gmail.com',
  'hugowschramm@hotmail.com',
  'onav@onav.com.br',
  'hugowschramm@outlook.com',
  'bernardo@onav.com.br',
  'projetos@onav.com.br',
  'financeiro@onav.com.br',
  'carlos.murta@onprojecoes.com.br',
  'nelsonhdvideo@gmail.com',
  'hugo@onprojecoes.com.br'
];

// ===== Tax Rate =====
const TAX_RATE = 0.166;

// ===== Default Product Mapping: sell product → cost product =====
const DEFAULT_PRODUCT_MAPPING = {
  'LED Module':              '2.6mm indoor Absen NT',
  'MX-40 Pro Processor':     'MX-40',
  'Disguise VX4n (Base)':    'disguise VX4',
  'Disguise VX4n (Backup)':  'disguise VX4',
  'Disguise RXII Unit':      'disguise RXII',
  'Stype Tracking':          'Stype RedSpy',
  'Estúdio':                 'Estúdio',
};

// ===== Global Data Cache =====
let allCostProducts = [];
let allSellProducts = [];
let costLookupObj = {};

// ===== DOM Elements =====
const DOM = {};

// ===== Currency Formatting =====
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
}

function profitClass(value) {
  if (value > 0) return 'profit-positive';
  if (value < 0) return 'profit-negative';
  return 'profit-zero';
}

// ===== Auth Handling =====
function isAuthorized(email) {
  return AUTHORIZED_EMAILS.includes(email?.toLowerCase());
}

function showLoginModal() {
  DOM.loginModal.classList.remove('hidden');
  DOM.loginError.classList.add('hidden');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-email').focus();
}

function hideLoginModal() {
  DOM.loginModal.classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!isAuthorized(data.user.email)) {
      await supabase.auth.signOut();
      DOM.loginError.textContent = 'Usuário não autorizado.';
      DOM.loginError.classList.remove('hidden');
      return;
    }
    hideLoginModal();
    updateAuthUI(data.user);
    loadProfitData();
  } catch (err) {
    DOM.loginError.textContent = err.message || 'Erro ao fazer login.';
    DOM.loginError.classList.remove('hidden');
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
  updateAuthUI(null);
  DOM.calculatorContent.classList.add('hidden');
  DOM.unauthorizedMessage.classList.remove('hidden');
}

function updateAuthUI(user) {
  if (user && isAuthorized(user.email)) {
    DOM.loginBtn.classList.add('hidden');
    DOM.userInfo.classList.remove('hidden');
    DOM.userEmail.textContent = user.email;
    DOM.userRole.textContent = 'Admin';
    DOM.unauthorizedMessage.classList.add('hidden');
  } else {
    DOM.loginBtn.classList.remove('hidden');
    DOM.userInfo.classList.add('hidden');
    if (!user) {
      DOM.unauthorizedMessage.classList.remove('hidden');
    }
  }
}

// ===== Data Loading =====
async function loadProfitData() {
  DOM.loadingIndicator.classList.remove('hidden');
  DOM.errorMessage.classList.add('hidden');
  DOM.calculatorContent.classList.add('hidden');

  try {
    // Fetch both tables in parallel
    const [sellResult, costResult] = await Promise.all([
      supabase.from('products').select('name, price, category').order('category').order('name'),
      supabase.from('preco_atacado_produtos_on').select('product_name, daily_rental_price, category').order('category').order('product_name')
    ]);

    if (sellResult.error) throw sellResult.error;
    if (costResult.error) throw costResult.error;

    allSellProducts = sellResult.data;
    allCostProducts = costResult.data;

    // Build cost lookup
    costLookupObj = {};
    allCostProducts.forEach(p => {
      costLookupObj[p.product_name] = parseFloat(p.daily_rental_price) || 0;
    });

    renderDefaultProducts();

    DOM.loadingIndicator.classList.add('hidden');
    DOM.calculatorContent.classList.remove('hidden');

  } catch (err) {
    console.error('Error loading profit data:', err);
    DOM.loadingIndicator.classList.add('hidden');
    DOM.errorText.textContent = err.message || 'Erro desconhecido.';
    DOM.errorMessage.classList.remove('hidden');
  }
}

// ===== Logic & Rendering =====
function renderDefaultProducts() {
    const rows = [];
    allSellProducts.forEach(sellProduct => {
      let sellPrice = parseFloat(sellProduct.price) || 0;
      let displayName = sellProduct.name;

      // Special handling for LED Module:
      // Selling price is per 50x50cm (0.25 sqm) -> mult by 4 to get 1 sqm
      // Cost price is already per 1 sqm.
      if (sellProduct.name === 'LED Module') {
        sellPrice = sellPrice * 4;
        displayName = 'LED Module (m²)';
      }

      // Find cost product name via mapping
      const costProductName = DEFAULT_PRODUCT_MAPPING[sellProduct.name];
      let costPrice = 0;
      let costSource = '';

      if (costProductName && costLookupObj.hasOwnProperty(costProductName)) {
        costPrice = costLookupObj[costProductName];
        costSource = costProductName;
      }

      const taxes = sellPrice * TAX_RATE;
      const profit = sellPrice - costPrice - taxes;
      const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;

      rows.push({
        name: displayName,
        category: sellProduct.category,
        sellPrice,
        costPrice,
        costSource,
        taxes,
        profit,
        margin,
        hasCostMapping: !!costProductName
      });
    });

    renderTable(rows);
    renderSummary(rows);
}

function parseWhatsAppText(text) {
  const lines = text.split('\n');
  const items = [];
  
  lines.forEach(line => {
    if (!line.includes('R$') || line.toLowerCase().includes('investimento total')) return;
    
    let parts = line.split(':');
    let name = parts[0].trim();
    let rest = parts.length > 1 ? parts.slice(1).join(':') : name;
    
    if (parts.length === 1) {
       name = line.split('R$')[0].trim();
       rest = line;
    }

    let quantity = 1;
    const qtyMatch = rest.match(/(\d+)\s*=/);
    if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);
    if (line.toLowerCase().includes('+backup')) quantity += 1;

    const match = rest.match(/R\$\s*([\d\.,]+)/);
    if (match) {
      const valueStr = match[1].replace(/\./g, '').replace(',', '.');
      const sellPrice = parseFloat(valueStr);
      items.push({ originalName: name, quantity, sellPrice });
    }
  });
  return items;
}

function handleWhatsAppParse() {
   const text = DOM.whatsappInput.value;
   if (!text.trim()) {
      renderDefaultProducts();
      return;
   }
   
   const parsedItems = parseWhatsAppText(text);
   const rows = [];
   
   parsedItems.forEach(item => {
      let costPrice = 0;
      let costSource = '';
      let hasCostMapping = false;
      
      let mappedName = '';
      const originalLower = item.originalName.toLowerCase();
      if (originalLower.includes('painel de led')) mappedName = '2.6mm indoor Absen NT';
      else if (originalLower.includes('processadora')) mappedName = 'MX-40';
      else if (originalLower.includes('disguise vx')) mappedName = 'disguise VX4';
      else if (originalLower.includes('disguise rx')) mappedName = 'disguise RXII';
      else if (originalLower.includes('camera tracking')) mappedName = 'Stype RedSpy';
      else if (originalLower.includes('estúdio')) mappedName = 'Estúdio';
      
      if (mappedName && costLookupObj.hasOwnProperty(mappedName)) {
         const unitCost = costLookupObj[mappedName];
         if (mappedName === '2.6mm indoor Absen NT') {
             const stdSellProduct = allSellProducts.find(p => p.name === 'LED Module');
             const stdSellPricePerM2 = stdSellProduct ? (parseFloat(stdSellProduct.price) || 0) * 4 : 4000;
             const estimatedM2 = item.sellPrice / (stdSellPricePerM2 || 4000);
             costPrice = unitCost * estimatedM2;
             costSource = `2.6mm indoor Absen NT (est. ${estimatedM2.toFixed(1)}m²)`;
             hasCostMapping = true;
         } else {
             costPrice = unitCost * item.quantity;
             costSource = mappedName + (item.quantity > 1 ? ` (x${item.quantity})` : '');
             hasCostMapping = true;
         }
      }
      
      const taxes = item.sellPrice * TAX_RATE;
      const profit = item.sellPrice - costPrice - taxes;
      const margin = item.sellPrice > 0 ? (profit / item.sellPrice) * 100 : 0;
      const category = (originalLower.includes('equipe') || originalLower.includes('frete')) ? 'Serviços Orçamento VP' : 'Equipamentos Orçamento VP';

      rows.push({
        name: item.originalName + (item.quantity > 1 ? ` (x${item.quantity})` : ''),
        category: category,
        sellPrice: item.sellPrice,
        costPrice,
        costSource,
        taxes,
        profit,
        margin,
        hasCostMapping
      });
   });
   
   renderTable(rows);
   renderSummary(rows);
}

function clearWhatsAppParse() {
   DOM.whatsappInput.value = '';
   renderDefaultProducts();
}

// ===== Rendering =====
function renderTable(rows) {
  const tbody = DOM.profitTableBody;
  tbody.innerHTML = '';

  let currentCategory = '';

  rows.forEach((row, i) => {
    // Category separator
    if (row.category !== currentCategory) {
      currentCategory = row.category;
      const catRow = document.createElement('tr');
      catRow.className = 'bg-gray-800/80';
      catRow.innerHTML = `<td colspan="6" class="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-700">${currentCategory}</td>`;
      tbody.appendChild(catRow);
    }

    const tr = document.createElement('tr');
    tr.className = 'table-row border-b border-gray-800 transition-colors';
    tr.style.animationDelay = `${i * 30}ms`;

    const costTooltip = row.costSource ? `title="Custo ref: ${row.costSource}"` : 'title="Sem referência de custo"';
    const costLabel = row.hasCostMapping
      ? formatBRL(row.costPrice)
      : `<span class="text-gray-500 text-xs">—</span>`;

    tr.innerHTML = `
      <td class="px-4 py-3 font-medium">
        ${row.name}
        ${!row.hasCostMapping ? '<span class="text-gray-600 text-xs ml-1">(sem custo)</span>' : ''}
      </td>
      <td class="text-right px-4 py-3">${formatBRL(row.sellPrice)}</td>
      <td class="text-right px-4 py-3 text-orange-300" ${costTooltip}>${costLabel}</td>
      <td class="text-right px-4 py-3 text-yellow-400">${formatBRL(row.taxes)}</td>
      <td class="text-right px-4 py-3 font-semibold ${profitClass(row.profit)}">${formatBRL(row.profit)}</td>
      <td class="text-right px-4 py-3 font-semibold ${profitClass(row.margin)}">
        ${row.margin.toFixed(1)}%
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function renderSummary(rows) {
  const totals = rows.reduce((acc, row) => {
    acc.revenue += row.sellPrice;
    acc.cost += row.costPrice;
    acc.taxes += row.taxes;
    acc.profit += row.profit;
    return acc;
  }, { revenue: 0, cost: 0, taxes: 0, profit: 0 });

  const totalMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  // Summary cards
  DOM.totalRevenue.textContent = formatBRL(totals.revenue);
  DOM.totalCost.textContent = formatBRL(totals.cost);
  DOM.totalTaxes.textContent = formatBRL(totals.taxes);
  DOM.totalProfit.textContent = formatBRL(totals.profit);
  DOM.totalProfit.className = `text-2xl font-bold ${profitClass(totals.profit)}`;
  DOM.totalProfitPct.textContent = `Margem: ${totalMargin.toFixed(1)}%`;

  // Footer totals
  DOM.footerRevenue.textContent = formatBRL(totals.revenue);
  DOM.footerCost.textContent = formatBRL(totals.cost);
  DOM.footerTaxes.textContent = formatBRL(totals.taxes);
  DOM.footerProfit.textContent = formatBRL(totals.profit);
  DOM.footerProfit.className = `text-right px-4 py-3 font-bold ${profitClass(totals.profit)}`;
  DOM.footerMargin.textContent = `${totalMargin.toFixed(1)}%`;
  DOM.footerMargin.className = `text-right px-4 py-3 font-bold ${profitClass(totalMargin)}`;
}

// ===== Event Listeners =====
function setupEventListeners() {
  DOM.loginBtn.addEventListener('click', showLoginModal);
  DOM.cancelLoginBtn.addEventListener('click', hideLoginModal);
  DOM.loginForm.addEventListener('submit', handleLogin);
  DOM.logoutBtn.addEventListener('click', handleLogout);
  if (DOM.parseWhatsAppBtn) DOM.parseWhatsAppBtn.addEventListener('click', handleWhatsAppParse);
  if (DOM.clearWhatsAppBtn) DOM.clearWhatsAppBtn.addEventListener('click', clearWhatsAppParse);

  // Close modal on background click
  DOM.loginModal.addEventListener('click', (e) => {
    if (e.target === DOM.loginModal) hideLoginModal();
  });
}

// ===== Init =====
async function init() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Session check error:', error.message);
    }
    if (session?.user && isAuthorized(session.user.email)) {
      updateAuthUI(session.user);
      loadProfitData();
    } else {
      DOM.loadingIndicator.classList.add('hidden');
      updateAuthUI(null);
    }
  } catch (err) {
    console.error('Init error:', err);
    DOM.loadingIndicator.classList.add('hidden');
    DOM.loginBtn.classList.remove('hidden');
    DOM.unauthorizedMessage.classList.remove('hidden');
  }
}

// Ensure DOM and external scripts are fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM mapping
  Object.assign(DOM, {
    loginBtn: document.getElementById('login-btn'),
    userInfo: document.getElementById('user-info'),
    userEmail: document.getElementById('user-email'),
    userRole: document.getElementById('user-role'),
    logoutBtn: document.getElementById('logout-btn'),
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    cancelLoginBtn: document.getElementById('cancel-login-btn'),
    unauthorizedMessage: document.getElementById('unauthorized-message'),
    loadingIndicator: document.getElementById('loading-indicator'),
    errorMessage: document.getElementById('error-message'),
    whatsappInput: document.getElementById('whatsapp-input'),
    parseWhatsAppBtn: document.getElementById('parse-whatsapp-btn'),
    clearWhatsAppBtn: document.getElementById('clear-whatsapp-btn'),
    errorText: document.getElementById('error-text'),
    calculatorContent: document.getElementById('calculator-content'),
    profitTableBody: document.getElementById('profit-table-body'),
    totalRevenue: document.getElementById('total-revenue'),
    totalCost: document.getElementById('total-cost'),
    totalTaxes: document.getElementById('total-taxes'),
    totalProfit: document.getElementById('total-profit'),
    totalProfitPct: document.getElementById('total-profit-pct'),
    footerRevenue: document.getElementById('footer-revenue'),
    footerCost: document.getElementById('footer-cost'),
    footerTaxes: document.getElementById('footer-taxes'),
    footerProfit: document.getElementById('footer-profit'),
    footerMargin: document.getElementById('footer-margin'),
  });

  // Check if Supabase loaded properly
  let checks = 0;
  function waitForSupabase() {
    if (window.supabase) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setupEventListeners();
      init();
    } else if (checks < 50) { // Wait up to 5 seconds (50 * 100ms)
      checks++;
      setTimeout(waitForSupabase, 100);
    } else {
      console.error('Supabase failed to load within 5 seconds.');
      DOM.loadingIndicator.classList.add('hidden');
      DOM.errorText.textContent = 'Erro ao carregar banco de dados (Supabase não disponível). Tente recarregar a página.';
      DOM.errorMessage.classList.remove('hidden');
    }
  }

  waitForSupabase();
});
