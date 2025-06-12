// Dashboard JavaScript - Complete Admin Control System
// Initialize Supabase
const SUPABASE_URL = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaGp2cHN4a2ZqY3hpdHBuaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1ODk4NzksImV4cCI6MjA1NTE2NTg3OX0.kAcBsHJnlr56fJ6qvXSLOWRiLTnQR7ilXUi_2Qzj4RE';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global state
let currentPage = 'overview';
let notifications = [];
let currentUser = null;
let currentCalendarDate = new Date();

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const pageTitle = document.getElementById('pageTitle');
const pageContent = document.getElementById('pageContent');
const notificationBtn = document.getElementById('notificationBtn');
const notificationPanel = document.getElementById('notificationPanel');
const notificationCount = document.getElementById('notificationCount');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');
const toast = document.getElementById('toast');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    initializeEventListeners();
    loadPage('overview');
    startRealtimeSubscriptions();
    checkForNewLeads();
});

// Authentication
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/led/login.html';
        return;
    }
    currentUser = user;
    document.getElementById('userName').textContent = user.email.split('@')[0];
}

// Event Listeners
function initializeEventListeners() {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            loadPage(page);
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    notificationBtn.addEventListener('click', () => {
        notificationPanel.classList.toggle('active');
        loadNotifications();
    });

    document.getElementById('closeNotificationPanel').addEventListener('click', () => {
        notificationPanel.classList.remove('active');
    });

    refreshBtn.addEventListener('click', () => {
        loadPage(currentPage);
        showToast('Dados atualizados', 'success');
    });

    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/led/login.html';
    });

    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modalClose || e.target.closest('.modal').id;
            closeModal(modalId);
        });
    });
    
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        const crmType = settingsModal.querySelector('#crmType');
        if (crmType) {
            crmType.addEventListener('change', (e) => {
                const apiKeyGroup = settingsModal.querySelector('#crmApiKeyGroup');
                if(apiKeyGroup) apiKeyGroup.style.display = e.target.value ? 'block' : 'none';
            });
        }
    }
}

// Page Loading
async function loadPage(page) {
    currentPage = page;
    pageContent.innerHTML = '<div class="loading-spinner"></div>';
    const pageLoaders = {
        'overview': loadOverviewPage,
        'leads': loadLeadsPage,
        'quotes': loadQuotesPage,
        'products': loadProductsPage,
        'calendar': loadCalendarPage,
        'analytics': loadAnalyticsPage,
        'settings': loadSettingsPage,
    };
    if (pageLoaders[page]) {
        await pageLoaders[page]();
    }
}

// Page Implementations
async function loadOverviewPage() {
    pageTitle.textContent = 'Visão Geral';
    const stats = await fetchDashboardStats();
    pageContent.innerHTML = `
        <div class="stats-grid">
            ${createStatCard('Novos Leads', stats.newLeads, '12% este mês', 'positive', 'fa-users')}
            ${createStatCard('Orçamentos Pendentes', stats.pendingQuotes, '5% esta semana', 'negative', 'fa-clock')}
            ${createStatCard('Taxa de Conversão', `${stats.conversionRate}%`, '3% este mês', 'positive', 'fa-chart-line')}
            ${createStatCard('Receita Mensal', `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`, '18% este mês', 'positive', 'fa-dollar-sign')}
        </div>
        <div class="charts-grid">
            <div class="chart-card"><h3>Orçamentos por Status</h3><canvas id="quotesChart"></canvas></div>
            <div class="chart-card"><h3>Leads por Origem</h3><canvas id="leadsChart"></canvas></div>
        </div>
        <div class="data-table" style="margin-top: 30px;">
            <div class="table-header"><h3 class="table-title">Atividades Recentes</h3></div>
            <table>
                <thead><tr><th>Tipo</th><th>Descrição</th><th>Cliente</th><th>Data</th><th>Status</th></tr></thead>
                <tbody id="recentActivities">${await generateRecentActivities()}</tbody>
            </table>
        </div>`;
    setTimeout(initializeOverviewCharts, 100);
}

async function loadLeadsPage() {
    pageTitle.textContent = 'Gerenciamento de Leads';
    const { data: leads } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
    pageContent.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3 class="table-title">Leads e Orçamentos</h3>
                <div class="table-actions">
                    <div class="search-box"><i class="fas fa-search"></i><input type="text" placeholder="Buscar leads..." id="searchLeads"></div>
                    <button class="btn btn-primary" onclick="exportLeads()"><i class="fas fa-download"></i> Exportar</button>
                </div>
            </div>
            <table>
                <thead><tr><th>Cliente</th><th>Empresa</th><th>Projeto</th><th>Data</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody id="leadsTableBody">${generateLeadsTable(leads)}</tbody>
            </table>
        </div>`;
    document.getElementById('searchLeads').addEventListener('input', (e) => filterTable('leadsTableBody', e.target.value));
}

async function loadQuotesPage() {
    pageTitle.textContent = 'Gerenciamento de Orçamentos';
    const { data: quotes } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
    pageContent.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3 class="table-title">Orçamentos</h3>
                <div class="table-actions">
                    <select id="statusFilter" class="form-control"><option value="">Todos</option><option value="pending">Pendente</option><option value="approved">Aprovado</option><option value="rejected">Rejeitado</option></select>
                    <button class="btn btn-primary" onclick="createNewQuote()"><i class="fas fa-plus"></i> Novo Orçamento</button>
                </div>
            </div>
            <table>
                <thead><tr><th>ID</th><th>Projeto</th><th>Cliente</th><th>Período</th><th>Valor Total</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody id="quotesTableBody">${generateQuotesTable(quotes)}</tbody>
            </table>
        </div>`;
    document.getElementById('statusFilter').addEventListener('change', (e) => filterTableByStatus('quotesTableBody', e.target.value));
}

async function loadProductsPage() {
    pageTitle.textContent = 'Gerenciamento de Produtos';
    const { data: products } = await supabase.from('products').select('*').order('category', { ascending: true });
    pageContent.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3 class="table-title">Produtos e Preços</h3>
                <button class="btn btn-primary" onclick="openProductModal()"><i class="fas fa-plus"></i> Adicionar Produto</button>
            </div>
            <table>
                <thead><tr><th>Nome</th><th>Descrição</th><th>Categoria</th><th>Preço</th><th>Unidade</th><th>Ações</th></tr></thead>
                <tbody id="productsTableBody">${generateProductsTable(products)}</tbody>
            </table>
        </div>`;
}

async function loadCalendarPage() {
    pageTitle.textContent = 'Calendário de Eventos';
    const { data: events } = await supabase.from('proposals').select('*').not('shooting_dates_start', 'is', null);
    pageContent.innerHTML = `
        <div class="calendar-container">
            <div class="calendar-header">
                <button class="btn btn-secondary" onclick="previousMonth()"><i class="fas fa-chevron-left"></i></button>
                <h3 id="currentMonth"></h3>
                <button class="btn btn-secondary" onclick="nextMonth()"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="calendar-grid" id="calendarGrid"></div>
        </div>
        <div class="data-table" style="margin-top: 30px;">
            <div class="table-header"><h3 class="table-title">Próximos Eventos</h3></div>
            <table>
                <thead><tr><th>Projeto</th><th>Cliente</th><th>Início</th><th>Fim</th><th>Status</th></tr></thead>
                <tbody id="upcomingEvents">${generateUpcomingEvents(events)}</tbody>
            </table>
        </div>`;
    generateCalendar(events);
}

async function loadAnalyticsPage() {
    pageTitle.textContent = 'Analytics e Relatórios';
    pageContent.innerHTML = `
        <div class="stats-grid">
            ${createStatCard('Taxa de Aprovação', '68%', '5% este mês', 'positive', 'fa-percentage')}
            ${createStatCard('Tempo Médio de Resposta', '2.5h', '30min mais rápido', 'positive', 'fa-clock')}
            ${createStatCard('Ticket Médio', 'R$ 45.8K', 'R$ 5K maior', 'positive', 'fa-receipt')}
            ${createStatCard('Clientes Ativos', '127', '15 novos', 'positive', 'fa-building')}
        </div>
        <div class="charts-grid">
            <div class="chart-card"><h3>Receita Mensal</h3><canvas id="revenueChart"></canvas></div>
            <div class="chart-card"><h3>Produtos Mais Solicitados</h3><canvas id="productsChart"></canvas></div>
        </div>
        <div class="chart-card" style="margin-top: 20px;"><h3>Performance por Vendedor</h3><canvas id="performanceChart"></canvas></div>`;
    setTimeout(initializeAnalyticsCharts, 100);
}

async function loadSettingsPage() {
    pageTitle.textContent = 'Configurações';
    pageContent.innerHTML = `
        <div class="settings-container">
            <button class="btn btn-primary" onclick="openModal('settingsModal')"><i class="fas fa-cog"></i> Configurar Integrações</button>
        </div>`;
}

// Data Fetching & Generation
async function fetchDashboardStats() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const { data: leads } = await supabase.from('proposals').select('id').gte('created_at', firstDayOfMonth);
    const { data: pending } = await supabase.from('proposals').select('id').eq('status', 'pending');
    const { data: total } = await supabase.from('proposals').select('id');
    const { data: approved } = await supabase.from('proposals').select('id').eq('status', 'approved');
    const { data: revenueData } = await supabase.from('proposals').select('total_price').eq('status', 'approved').gte('created_at', firstDayOfMonth);
    const revenue = revenueData?.reduce((sum, q) => sum + (parseFloat(q.total_price?.replace(/[^\d,]/g, '').replace(',', '.')) || 0), 0) || 0;
    return {
        newLeads: leads?.length || 0,
        pendingQuotes: pending?.length || 0,
        conversionRate: total?.length > 0 ? Math.round((approved?.length / total?.length) * 100) : 0,
        monthlyRevenue: revenue
    };
}

function generateLeadsTable(leads) {
    if (!leads || leads.length === 0) return '<tr><td colspan="7" class="text-center">Nenhum lead encontrado</td></tr>';
    return leads.map(lead => `
        <tr data-status="${lead.status || 'new'}">
            <td>${lead.client_name || 'N/A'}</td><td>${lead.client_company || 'N/A'}</td><td>${lead.project_name || 'N/A'}</td>
            <td>${formatDate(lead.created_at)}</td><td>${lead.total_price || 'N/A'}</td>
            <td><span class="status-badge ${lead.status || 'new'}">${getStatusLabel(lead.status || 'new')}</span></td>
            <td><div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="viewLeadDetails('${lead.id}')"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-secondary" onclick="editQuote('${lead.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-success" onclick="sendWhatsApp('${lead.client_phone}')"><i class="fab fa-whatsapp"></i></button>
            </div></td>
        </tr>`).join('');
}

function generateQuotesTable(quotes) {
    if (!quotes || quotes.length === 0) return '<tr><td colspan="7" class="text-center">Nenhum orçamento</td></tr>';
    return quotes.map(quote => `
        <tr data-status="${quote.status}">
            <td>#${quote.id.substring(0, 8)}</td><td>${quote.project_name || 'N/A'}</td><td>${quote.client_name || 'N/A'}</td>
            <td>${formatDateRange(quote.shooting_dates_start, quote.shooting_dates_end)}</td><td>${quote.total_price || 'N/A'}</td>
            <td><span class="status-badge ${quote.status}">${getStatusLabel(quote.status)}</span></td>
            <td><div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="viewQuoteDetails('${quote.id}')"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-secondary" onclick="editQuote('${quote.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-success" onclick="approveQuote('${quote.id}')"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-danger" onclick="rejectQuote('${quote.id}')"><i class="fas fa-times"></i></button>
            </div></td>
        </tr>`).join('');
}

function generateProductsTable(products) {
    if (!products || products.length === 0) return '<tr><td colspan="6" class="text-center">Nenhum produto</td></tr>';
    return products.map(p => `
        <tr>
            <td>${p.name}</td><td>${p.description || 'N/A'}</td><td>${p.category || 'N/A'}</td>
            <td>R$ ${p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td>${getUnitTypeLabel(p.unit_type)}</td>
            <td><div class="action-buttons">
                <button class="btn btn-sm btn-secondary" onclick="openProductModal('${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
            </div></td>
        </tr>`).join('');
}

async function generateRecentActivities() {
    const { data } = await supabase.from('proposals').select('*').order('created_at', { ascending: false }).limit(5);
    if (!data || data.length === 0) return '<tr><td colspan="5" class="text-center">Nenhuma atividade recente</td></tr>';
    return data.map(act => `
        <tr>
            <td><i class="fas fa-file-invoice"></i> Orçamento</td><td>${act.project_name || 'N/A'}</td>
            <td>${act.client_name || 'N/A'}</td><td>${formatDate(act.created_at)}</td>
            <td><span class="status-badge ${act.status}">${getStatusLabel(act.status)}</span></td>
        </tr>`).join('');
}

// Quote/Lead Actions
async function viewLeadDetails(leadId) {
    const { data: lead } = await supabase.from('proposals').select('*').eq('id', leadId).single();
    if (!lead) return;
    const content = document.getElementById('leadDetailsContent');
    content.innerHTML = `
        <h3>Detalhes do Lead</h3>
        <p><strong>Cliente:</strong> ${lead.client_name}</p>
        <p><strong>Empresa:</strong> ${lead.client_company}</p>
        <p><strong>Email:</strong> ${lead.client_email}</p>
        <p><strong>Telefone:</strong> ${lead.client_phone}</p>
        <p><strong>Projeto:</strong> ${lead.project_name}</p>
        <p><strong>Data:</strong> ${formatDate(lead.created_at)}</p>
        <p><strong>Status:</strong> <span class="status-badge ${lead.status}">${getStatusLabel(lead.status)}</span></p>
        <hr>
        <h4>Orçamento Inicial</h4>
        <p><strong>Valor:</strong> ${lead.total_price}</p>
        <p><strong>Detalhes:</strong> ${lead.led_principal_width}x${lead.led_principal_height}m (Principal), ${lead.led_teto_width}x${lead.led_teto_height}m (Teto)</p>`;
    openModal('leadDetailsModal');
}

async function editQuote(quoteId) {
    const { data: quote } = await supabase.from('proposals').select('*').eq('id', quoteId).single();
    if (!quote) return;
    const content = document.getElementById('quoteEditContent');
    const originalTotal = parseFloat(quote.total_price?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    content.innerHTML = `
        <form id="editQuoteForm" onsubmit="saveQuoteChanges(event, '${quoteId}', ${originalTotal})">
            <h3>Editar Orçamento #${quote.id.substring(0, 8)}</h3>
            <div class="form-group">
                <label>Status</label>
                <select id="quoteStatus" class="form-control">
                    <option value="pending" ${quote.status === 'pending' ? 'selected' : ''}>Pendente</option>
                    <option value="approved" ${quote.status === 'approved' ? 'selected' : ''}>Aprovado</option>
                    <option value="rejected" ${quote.status === 'rejected' ? 'selected' : ''}>Rejeitado</option>
                </select>
            </div>
            <h4>Aplicar Desconto</h4>
            <div class="form-group">
                <label>Tipo de Desconto</label>
                <select id="discountType" class="form-control" onchange="calculateNewTotal(${originalTotal})"><option value="percentage">Porcentagem (%)</option><option value="fixed">Valor Fixo (R$)</option></select>
            </div>
            <div class="form-group">
                <label>Valor do Desconto</label>
                <input type="number" id="discountValue" class="form-control" min="0" step="0.01" oninput="calculateNewTotal(${originalTotal})">
            </div>
            <div class="form-group">
                <label>Motivo do Desconto</label>
                <textarea id="discountReason" class="form-control" rows="2"></textarea>
            </div>
            <div class="quote-totals">
                <p>Total Original: <span id="originalTotal">R$ ${originalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                <p><strong>Novo Total: <span id="newTotal">R$ ${originalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></strong></p>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('quoteEditModal')">Cancelar</button>
            </div>
        </form>`;
    openModal('quoteEditModal');
}

async function saveQuoteChanges(event, quoteId, originalTotal) {
    event.preventDefault();
    const status = document.getElementById('quoteStatus').value;
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    const discountReason = document.getElementById('discountReason').value;
    
    let newTotal = originalTotal;
    if (discountValue > 0) {
        if (discountType === 'percentage') {
            newTotal = originalTotal * (1 - discountValue / 100);
        } else {
            newTotal = originalTotal - discountValue;
        }
    }

    const { error } = await supabase.from('proposals').update({ 
        status: status,
        total_price: `R$ ${newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        // Ideally, you'd save discount info to a separate table or JSONB column
    }).eq('id', quoteId);

    if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
    } else {
        showToast('Orçamento atualizado com sucesso!', 'success');
        closeModal('quoteEditModal');
        loadPage(currentPage);
    }
}

function calculateNewTotal(originalTotal) {
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    let newTotal = originalTotal;
    if (discountValue > 0) {
        if (discountType === 'percentage') {
            newTotal = originalTotal * (1 - discountValue / 100);
        } else {
            newTotal = originalTotal - discountValue;
        }
    }
    document.getElementById('newTotal').textContent = `R$ ${newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

async function approveQuote(quoteId) {
    const { error } = await supabase.from('proposals').update({ status: 'approved' }).eq('id', quoteId);
    if (error) showToast('Erro ao aprovar orçamento', 'error');
    else {
        showToast('Orçamento aprovado!', 'success');
        loadPage(currentPage);
    }
}

async function rejectQuote(quoteId) {
    const { error } = await supabase.from('proposals').update({ status: 'rejected' }).eq('id', quoteId);
    if (error) showToast('Erro ao rejeitar orçamento', 'error');
    else {
        showToast('Orçamento rejeitado.', 'info');
        loadPage(currentPage);
    }
}

// Product Management
async function openProductModal(productId = null) {
    const content = document.getElementById('productModalContent');
    let product = { name: '', description: '', category: '', price: 0, unit_type: 'daily' };
    if (productId) {
        const { data } = await supabase.from('products').select('*').eq('id', productId).single();
        if (data) product = data;
    }
    
    content.innerHTML = `
        <form id="productForm" onsubmit="saveProduct(event, '${productId || ''}')">
            <h3>${productId ? 'Editar' : 'Adicionar'} Produto</h3>
            <div class="form-group"><label>Nome</label><input type="text" id="productName" value="${product.name}" required></div>
            <div class="form-group"><label>Descrição</label><textarea id="productDescription">${product.description || ''}</textarea></div>
            <div class="form-group"><label>Categoria</label><input type="text" id="productCategory" value="${product.category || ''}"></div>
            <div class="form-group"><label>Preço (R$)</label><input type="number" id="productPrice" value="${product.price}" step="0.01" required></div>
            <div class="form-group"><label>Unidade</label><select id="productUnitType">
                <option value="daily" ${product.unit_type === 'daily' ? 'selected' : ''}>Diária</option>
                <option value="item" ${product.unit_type === 'item' ? 'selected' : ''}>Por Item</option>
                <option value="m2" ${product.unit_type === 'm2' ? 'selected' : ''}>Por m²</option>
            </select></div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Salvar</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('productModal')">Cancelar</button>
            </div>
        </form>`;
    openModal('productModal');
}

async function saveProduct(event, productId) {
    event.preventDefault();
    const productData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        unit_type: document.getElementById('productUnitType').value,
    };

    const query = productId 
        ? supabase.from('products').update(productData).eq('id', productId)
        : supabase.from('products').insert([productData]);

    const { error } = await query;
    if (error) {
        showToast(`Erro: ${error.message}`, 'error');
    } else {
        showToast('Produto salvo com sucesso!', 'success');
        closeModal('productModal');
        loadProductsPage();
    }
}

async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) showToast(`Erro: ${error.message}`, 'error');
    else {
        showToast('Produto excluído!', 'success');
        loadProductsPage();
    }
}

// Calendar
function generateCalendar(events = []) {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();
    
    document.getElementById('currentMonth').textContent = `${currentCalendarDate.toLocaleString('pt-BR', { month: 'long' })} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.classList.add('calendar-day', 'header');
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    for (let i = 0; i < firstDay; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');
        dayCell.textContent = day;
        
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('today');
        }
        
        const cellDate = new Date(year, month, day);
        events.forEach(event => {
            const startDate = new Date(event.shooting_dates_start);
            const endDate = new Date(event.shooting_dates_end);
            if (cellDate >= startDate && cellDate <= endDate) {
                const eventChip = document.createElement('div');
                eventChip.classList.add('event-chip');
                eventChip.textContent = event.project_name.substring(0, 10) + '...';
                dayCell.appendChild(eventChip);
            }
        });
        
        calendarGrid.appendChild(dayCell);
    }
}

function previousMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    loadCalendarPage();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    loadCalendarPage();
}

function generateUpcomingEvents(events) {
    if (!events || events.length === 0) return '<tr><td colspan="5" class="text-center">Nenhum evento próximo</td></tr>';
    const upcoming = events
        .filter(e => new Date(e.shooting_dates_start) >= new Date())
        .sort((a, b) => new Date(a.shooting_dates_start) - new Date(b.shooting_dates_start));
    
    return upcoming.map(e => `
        <tr>
            <td>${e.project_name}</td><td>${e.client_name}</td>
            <td>${formatDate(e.shooting_dates_start)}</td><td>${formatDate(e.shooting_dates_end)}</td>
            <td><span class="status-badge ${e.status}">${getStatusLabel(e.status)}</span></td>
        </tr>`).join('');
}

// Charts
function initializeOverviewCharts() {
    const quotesCtx = document.getElementById('quotesChart')?.getContext('2d');
    const leadsCtx = document.getElementById('leadsChart')?.getContext('2d');
    if (quotesCtx) new Chart(quotesCtx, { type: 'doughnut', data: { labels: ['Pendente', 'Aprovado', 'Rejeitado'], datasets: [{ data: [12, 19, 3], backgroundColor: ['#ffc107', '#28a745', '#dc3545'] }] } });
    if (leadsCtx) new Chart(leadsCtx, { type: 'pie', data: { labels: ['Site', 'Indicação', 'Anúncio'], datasets: [{ data: [55, 30, 15], backgroundColor: ['#007bff', '#17a2b8', '#6f42c1'] }] } });
}

function initializeAnalyticsCharts() {
    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    const productsCtx = document.getElementById('productsChart')?.getContext('2d');
    const perfCtx = document.getElementById('performanceChart')?.getContext('2d');
    if (revenueCtx) new Chart(revenueCtx, { type: 'line', data: { labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'], datasets: [{ label: 'Receita', data: [12000, 19000, 15000, 22000, 18000, 25000], borderColor: '#007bff', fill: false }] } });
    if (productsCtx) new Chart(productsCtx, { type: 'bar', data: { labels: ['LED P3', 'Projetor 20K', 'Switcher'], datasets: [{ label: 'Solicitações', data: [65, 59, 80], backgroundColor: ['#28a745', '#ffc107', '#17a2b8'] }] } });
    if (perfCtx) new Chart(perfCtx, { type: 'radar', data: { labels: ['Vendas', 'Prospecção', 'Follow-up', 'Fechamento', 'Pós-venda'], datasets: [{ label: 'Vendedor A', data: [8, 7, 9, 8, 6], backgroundColor: 'rgba(0, 123, 255, 0.2)', borderColor: '#007bff' }, { label: 'Vendedor B', data: [6, 8, 7, 9, 8], backgroundColor: 'rgba(255, 193, 7, 0.2)', borderColor: '#ffc107' }] } });
}

// Notifications & Realtime
function loadNotifications() {
    const list = document.getElementById('notificationList');
    if (notifications.length === 0) {
        list.innerHTML = '<li class="notification-item">Nenhuma notificação</li>';
        return;
    }
    list.innerHTML = notifications.map(n => `
        <li class="notification-item">
            <div class="notification-icon ${n.type}"><i class="fas ${n.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i></div>
            <div class="notification-content">
                <p>${n.message}</p>
                <span class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</span>
            </div>
        </li>`).join('');
}

function startRealtimeSubscriptions() {
    supabase.channel('public:proposals')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proposals' }, payload => {
            showToast(`Novo lead recebido: ${payload.new.client_name}`, 'info');
            addNotification({ type: 'info', message: `Novo lead de ${payload.new.client_name}` });
            if (currentPage === 'leads' || currentPage === 'overview') loadPage(currentPage);
        })
        .subscribe();
}

function addNotification(notification) {
    notification.timestamp = new Date();
    notifications.unshift(notification);
    if (notifications.length > 20) notifications.pop();
    notificationCount.textContent = notifications.length;
    notificationCount.style.display = 'block';
}

function checkForNewLeads() {
    // This is a placeholder for a more robust check, maybe on first load
    console.log("Verificando novos leads...");
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

// Modals
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// Utils
function createStatCard(title, value, change, changeType, icon) {
    return `
        <div class="stat-card">
            <div class="stat-card-header"><span class="stat-card-title">${title}</span><i class="fas ${icon} stat-card-icon"></i></div>
            <div class="stat-card-value">${value}</div>
            <div class="stat-card-change ${changeType}"><i class="fas fa-arrow-${changeType === 'positive' ? 'up' : 'down'}"></i><span>${change}</span></div>
        </div>`;
}

function filterTable(tableBodyId, searchTerm) {
    const tableBody = document.getElementById(tableBodyId);
    const rows = tableBody.getElementsByTagName('tr');
    const term = searchTerm.toLowerCase();
    for (let row of rows) {
        row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    }
}

function filterTableByStatus(tableBodyId, status) {
    const tableBody = document.getElementById(tableBodyId);
    const rows = tableBody.getElementsByTagName('tr');
    for (let row of rows) {
        if (status === '' || row.dataset.status === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateRange(start, end) {
    if (!start || !end) return 'N/A';
    return `${formatDate(start)} - ${formatDate(end)}`;
}

function getStatusLabel(status) {
    const labels = { 'pending': 'Pendente', 'approved': 'Aprovado', 'rejected': 'Rejeitado', 'new': 'Novo' };
    return labels[status] || status;
}

function getUnitTypeLabel(unit) {
    const labels = { 'daily': 'Diária', 'item': 'Item', 'm2': 'm²' };
    return labels[unit] || unit;
}

function generateServicesTable(services) {
    if (!services || typeof services !== 'object') return '<tr><td colspan="4">Nenhum serviço</td></tr>';
    return Object.entries(services).map(([key, value]) => `
        <tr>
            <td>${value.name}</td><td>${value.quantity}</td>
            <td>R$ ${value.price.toLocaleString('pt-BR')}</td>
            <td>R$ ${(value.quantity * value.price).toLocaleString('pt-BR')}</td>
        </tr>`).join('');
}

// Dummy functions for buttons
function exportLeads() { showToast('Função de exportação em desenvolvimento.', 'info'); }
function createNewQuote() { showToast('Função para criar novo orçamento em desenvolvimento.', 'info'); }
function sendWhatsApp(phone) { 
    if(phone) {
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    } else {
        showToast('Número de telefone não disponível.', 'error');
    }
}