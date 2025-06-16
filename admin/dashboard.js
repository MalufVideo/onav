// Dashboard JavaScript - Complete Admin Control System
// Initialize Supabase
const SUPABASE_URL = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaGp2cHN4a2ZqY3hpdHBuaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1ODk4NzksImV4cCI6MjA1NTE2NTg3OX0.kAcBsHJnlr56fJ6qvXSLOWRiLTnQR7ilXUi_2Qzj4RE';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global state
let currentPage = 'overview';
let notifications = [];
let currentUser = null;
let userProfile = null;
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
    
    // Get user profile
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.warn('User profile not found, checking if master admin');
            // Special handling for master admin
            if (user.email === 'nelson.maluf@onprojecoes.com.br') {
                userProfile = { role: 'admin', full_name: 'Nelson Maluf (Master Admin)' };
            } else {
                userProfile = { role: 'end_user', full_name: user.email };
            }
        } else {
            userProfile = profile;
            // Ensure master admin always has admin role
            if (user.email === 'nelson.maluf@onprojecoes.com.br') {
                userProfile.role = 'admin';
            }
        }
    } catch (error) {
        console.warn('Error fetching user profile:', error);
        userProfile = { role: 'end_user', full_name: user.email };
    }
    
    // Update UI based on role
    document.getElementById('userName').textContent = userProfile.full_name || user.email.split('@')[0];
    setupRoleBasedUI();
    
    // Update last login time for this user
    try {
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ 
                last_login_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        
        if (updateError) {
            console.warn('Could not update admin last login:', updateError);
        }
    } catch (updateError) {
        console.warn('Error updating admin last login:', updateError);
    }
    
    // Add admin functions for user management
    if (userProfile?.role === 'admin' && user.email === 'nelson.maluf@onprojecoes.com.br') {
        window.syncMissingProfiles = async () => {
            try {
                // Find users in auth.users that don't have profiles
                const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
                if (authError) throw authError;
                
                const { data: profiles, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('id');
                if (profileError) throw profileError;
                
                const profileIds = new Set(profiles.map(p => p.id));
                const missingUsers = authUsers.users.filter(u => !profileIds.has(u.id));
                
                for (const user of missingUsers) {
                    const { error } = await supabase
                        .from('user_profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: user.email.split('@')[0],
                            role: 'end_user'
                        });
                    
                    if (error) console.error('Error creating profile for', user.email, error);
                }
                
                showToast(`Synced ${missingUsers.length} missing user profiles!`, 'success');
                if (currentPage === 'users') loadPage('users'); // Refresh if on users page
            } catch (error) {
                console.error('Error syncing profiles:', error);
                showToast('Error syncing profiles: ' + error.message, 'error');
            }
        };
        
        console.log('Admin functions loaded. Run syncMissingProfiles() to sync any missing user profiles');
    }
}

// Setup UI based on user role
function setupRoleBasedUI() {
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    
    console.log('Setting up role-based UI for:', userProfile);
    console.log('Admin-only elements found:', adminOnlyElements.length);
    
    if (userProfile?.role === 'admin') {
        // Ensure admin elements are visible
        adminOnlyElements.forEach(element => {
            element.style.display = '';
        });
        console.log('Admin elements shown');
    } else {
        // Hide admin-only elements for non-admin users
        adminOnlyElements.forEach(element => {
            element.style.display = 'none';
        });
        console.log('Admin elements hidden');
    }
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
        'users': loadUsersPage,
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
                <thead><tr><th>ID</th><th>Projeto</th><th>Cliente</th><th>Comercial</th><th>Período</th><th>Valor Total</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody id="quotesTableBody">${generateQuotesTable(quotes)}</tbody>
            </table>
        </div>`;
    
    // Add event listeners for the action buttons
    document.getElementById('statusFilter').addEventListener('change', (e) => filterTableByStatus('quotesTableBody', e.target.value));
    
    // Add event listeners for quote action buttons
    const tableBody = document.getElementById('quotesTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            console.log('Table click detected:', e.target);
            const button = e.target.closest('button');
            if (!button) {
                console.log('No button found');
                return;
            }
            
            console.log('Button found:', button);
            const quoteId = button.getAttribute('data-quote-id');
            console.log('Quote ID:', quoteId);
            if (!quoteId) {
                console.log('No quote ID found');
                return;
            }
            
            if (button.classList.contains('view-quote-btn')) {
                console.log('Calling viewQuoteDetails with ID:', quoteId);
                viewQuoteDetails(quoteId);
            } else if (button.classList.contains('edit-quote-btn')) {
                editQuote(quoteId);
            } else if (button.classList.contains('approve-quote-btn')) {
                approveQuote(quoteId);
            } else if (button.classList.contains('reject-quote-btn')) {
                rejectQuote(quoteId);
            }
        });
    }
}

async function loadProductsPage() {
    pageTitle.textContent = 'Gerenciamento de Produtos';
    
    // Fetch products from Express API instead of Supabase directly
    let products = [];
    try {
        const response = await fetch('http://localhost:3000/api/products');
        if (response.ok) {
            products = await response.json();
        } else {
            console.error('Failed to fetch products from API');
            showToast('Erro ao carregar produtos', 'error');
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Erro ao carregar produtos', 'error');
    }
    
    pageContent.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3 class="table-title">Produtos e Preços</h3>
                <button class="btn btn-primary" id="addProductBtn"><i class="fas fa-plus"></i> Adicionar Produto</button>
            </div>
            <table>
                <thead><tr><th>Nome</th><th>Descrição</th><th>Categoria</th><th>Preço</th><th>Unidade</th><th>Ações</th></tr></thead>
                <tbody id="productsTableBody">${generateProductsTable(products)}</tbody>
            </table>
        </div>`;
    
    // Add event listener for the add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            openProductModal();
        });
    }
    
    // Add event listeners for the product action buttons
    const tableBody = document.getElementById('productsTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const productId = button.getAttribute('data-id');
            if (!productId) return;
            
            if (button.classList.contains('edit-btn') || button.innerHTML.includes('fa-edit')) {
                openProductModal(productId);
            } else if (button.classList.contains('delete-btn') || button.innerHTML.includes('fa-trash')) {
                deleteProduct(productId);
            }
        });
    }
}

async function loadUsersPage() {
    pageTitle.textContent = 'Gerenciamento de Usuários';
    
    // Fetch users from Supabase with auth data
    let users = [];
    try {
        // Get user profiles
        const { data: profiles, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (profileError) throw profileError;
        
        // Get auth users data for last sign-in info (admin only)
        let authUsers = [];
        if (userProfile?.role === 'admin') {
            try {
                const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
                if (!authError) {
                    authUsers = authData.users;
                }
            } catch (authError) {
                console.warn('Could not fetch auth data:', authError);
            }
        }
        
        // Merge profile and auth data
        users = profiles.map(profile => {
            const authUser = authUsers.find(au => au.id === profile.id);
            return {
                ...profile,
                last_sign_in_at: authUser?.last_sign_in_at,
                phone: authUser?.phone || profile.phone
            };
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        showToast('Erro ao carregar usuários', 'error');
    }
    
    pageContent.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3 class="table-title">Usuários do Sistema</h3>
                <button class="btn btn-primary" id="addUserBtn"><i class="fas fa-user-plus"></i> Adicionar Usuário</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Função</th>
                        <th>Status</th>
                        <th>Último Login</th>
                        <th>Data de Criação</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">${generateUsersTable(users)}</tbody>
            </table>
        </div>`;
    
    // Add event listener for the add user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            openUserModal();
        });
    }
    
    // Add event listeners for user action buttons
    const tableBody = document.getElementById('usersTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const userId = button.getAttribute('data-user-id');
            if (!userId) return;
            
            if (button.classList.contains('edit-user-btn')) {
                openUserModal(userId);
            } else if (button.classList.contains('toggle-user-btn')) {
                toggleUserStatus(userId);
            }
        });
    }
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

// Helper function to extract sales rep name from quote data
function getSalesRepName(quote) {
    // First try the direct field
    if (quote.sales_rep_name) return quote.sales_rep_name;
    
    // Then try to extract from discount_description JSON
    try {
        if (quote.discount_description) {
            const data = JSON.parse(quote.discount_description);
            if (data.sales_rep_name) return data.sales_rep_name;
        }
    } catch (e) {
        // Ignore JSON parse errors
        console.log('Error parsing sales rep data for quote:', quote.id, e);
    }
    
    // Debug: log the quote data to see what we have
    console.log('Sales rep debug for quote:', quote.id, {
        sales_rep_name: quote.sales_rep_name,
        discount_description: quote.discount_description,
        all_quote_data: quote
    });
    
    return '';
}

// Helper function to extract extended quote data from JSON
function getExtendedQuoteData(quote) {
    const defaultData = {
        principal_power_max: null,
        principal_power_avg: null,
        principal_weight: null,
        teto_power_max: null,
        teto_power_avg: null,
        teto_weight: null,
        led_principal_pixels_width: null,
        led_principal_pixels_height: null,
        led_principal_total_pixels: null,
        led_teto_pixels_width: null,
        led_teto_pixels_height: null,
        led_teto_total_pixels: null,
        led_teto_resolution: null
    };
    
    try {
        if (quote.discount_description) {
            const data = JSON.parse(quote.discount_description);
            return { ...defaultData, ...data };
        }
    } catch (e) {
        // Ignore JSON parse errors
    }
    
    return defaultData;
}

function generateQuotesTable(quotes) {
    if (!quotes || quotes.length === 0) return '<tr><td colspan="8" class="text-center">Nenhum orçamento</td></tr>';
    return quotes.map(quote => `
        <tr data-status="${quote.status}">
            <td>#${quote.id.substring(0, 8)}</td>
            <td>${quote.project_name || 'N/A'}</td>
            <td>${quote.client_name || 'N/A'}</td>
            <td>${getSalesRepName(quote)}</td>
            <td>${formatDateRange(quote.shooting_dates_start, quote.shooting_dates_end)}</td>
            <td>${quote.total_price || 'N/A'}</td>
            <td><span class="status-badge ${quote.status}">${getStatusLabel(quote.status)}</span></td>
            <td><div class="action-buttons">
                <button class="btn btn-sm btn-primary view-quote-btn" data-quote-id="${quote.id}" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-secondary edit-quote-btn" data-quote-id="${quote.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-success approve-quote-btn" data-quote-id="${quote.id}" title="Aprovar"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-danger reject-quote-btn" data-quote-id="${quote.id}" title="Rejeitar"><i class="fas fa-times"></i></button>
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
                <button class="btn btn-sm btn-secondary edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
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
    
    // Get quote history for this proposal using direct Supabase query
    let historyData = [];
    try {
        const { data: history, error } = await supabase
            .from('quote_history')
            .select('*')
            .eq('proposal_id', quoteId)
            .order('created_at', { ascending: false });
        
        if (!error && history) {
            historyData = history;
        }
    } catch (error) {
        console.error('Error loading quote history:', error);
    }
    
    const content = document.getElementById('quoteEditContent');
    const originalTotal = parseFloat((quote.original_total_price || quote.total_price)?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const currentTotal = parseFloat(quote.total_price?.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    
    // Calculate current discount values to pre-fill the form
    const currentDiscountPercentage = quote.discount_percentage || 0;
    const currentDiscountAmount = quote.discount_amount || 0;
    const currentDiscountReason = quote.discount_reason || '';
    
    // Determine discount type and value from current state
    let discountType = 'percentage';
    let discountValue = 0;
    
    if (currentDiscountPercentage > 0) {
        discountType = 'percentage';
        discountValue = currentDiscountPercentage;
    } else if (currentDiscountAmount > 0) {
        discountType = 'fixed';
        discountValue = currentDiscountAmount;
    }
    
    // Generate history timeline
    const historyTimeline = historyData.length > 0 ? historyData.map((entry, index) => {
        const isLatest = index === 0;
        const changeTypeLabel = {
            'quote_created': 'Orçamento Criado',
            'discount_applied': 'Desconto Aplicado',
            'status_changed': 'Status Alterado',
            'quote_updated': 'Orçamento Atualizado'
        };
        
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            try {
                const date = new Date(dateString);
                return date.toLocaleString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                return dateString;
            }
        };
        
        const formatCurrency = (value) => {
            if (typeof value === 'string' && value.trim().startsWith('R$')) {
                return value;
            }
            const numberValue = Number(value);
            if (isNaN(numberValue)) {
                return 'R$ 0,00';
            }
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(numberValue);
        };
        
        const discountInfo = entry.discount_type && entry.discount_value ? 
            `<strong>Desconto:</strong> ${entry.discount_type === 'percentage' ? entry.discount_value + '%' : formatCurrency(entry.discount_value)}<br>` : '';
        
        const reasonInfo = entry.discount_reason ? `<strong>Motivo:</strong> ${entry.discount_reason}<br>` : '';
        
        return `
            <div class="history-entry ${isLatest ? 'latest' : ''}" style="
                border-left: 4px solid ${isLatest ? '#28a745' : '#6c757d'}; 
                padding: 15px 20px; 
                margin-bottom: 15px; 
                background-color: ${isLatest ? '#f8fff8' : '#f8f9fa'};
                border-radius: 0 8px 8px 0;
                position: relative;
            ">
                <div class="history-icon" style="
                    position: absolute; 
                    left: -8px; 
                    top: 15px; 
                    width: 16px; 
                    height: 16px; 
                    background-color: ${isLatest ? '#28a745' : '#6c757d'}; 
                    border-radius: 50%;
                "></div>
                <div class="history-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #495057; font-size: 1.1rem;">
                        ${changeTypeLabel[entry.change_type] || entry.change_type}
                        ${isLatest ? '<span style="color: #28a745; font-size: 0.8rem; margin-left: 10px;">(Atual)</span>' : ''}
                    </h4>
                    <span style="color: #6c757d; font-size: 0.9rem;">${formatDate(entry.created_at)}</span>
                </div>
                <div class="history-details" style="color: #6c757d; font-size: 0.95rem; line-height: 1.4;">
                    ${entry.change_description ? `<p style="margin: 5px 0;"><strong>Descrição:</strong> ${entry.change_description}</p>` : ''}
                    ${entry.old_total_price && entry.new_total_price ? `
                        <p style="margin: 5px 0;">
                            <strong>Preço:</strong> 
                            <span style="text-decoration: line-through; color: #dc3545;">${entry.old_total_price}</span> 
                            → 
                            <span style="color: #28a745; font-weight: bold;">${entry.new_total_price}</span>
                        </p>
                    ` : ''}
                    ${discountInfo}
                    ${reasonInfo}
                    ${entry.changed_by ? `<p style="margin: 5px 0;"><strong>Alterado por:</strong> ${entry.changed_by}</p>` : ''}
                </div>
            </div>
        `;
    }).join('') : '<p style="text-align: center; color: #6c757d; padding: 40px;">Nenhum histórico disponível para este orçamento.</p>';
    
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
            <!-- Current Discount Info -->
            ${currentDiscountPercentage > 0 ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; margin-bottom: 10px; color: #856404;"><i class="fas fa-info-circle"></i> Desconto Atual</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; font-size: 0.9rem;">
                    <div>
                        <strong>Tipo:</strong> ${quote.days_count > 1 ? 'Progressivo por dias' : 'Manual'}
                    </div>
                    <div>
                        <strong>Desconto:</strong> ${currentDiscountPercentage.toFixed(1)}%
                    </div>
                    <div>
                        <strong>Valor:</strong> R$ ${((originalTotal * currentDiscountPercentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div>
                        <strong>Dias:</strong> ${quote.days_count || 1} dia(s)
                    </div>
                </div>
                ${currentDiscountReason ? `<p style="margin: 10px 0 0 0; font-size: 0.85rem; color: #856404;"><strong>Motivo:</strong> ${currentDiscountReason}</p>` : ''}
            </div>
            ` : ''}
            
            <h4>Ajustar Desconto Global</h4>
            <p style="color: #6c757d; font-size: 0.9rem; margin-bottom: 15px;">
                O desconto será aplicado sobre o preço original (R$ ${originalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). 
                Valores são globais, não cumulativos.
            </p>
            <div class="form-group">
                <label>Tipo de Desconto</label>
                <select id="discountType" class="form-control" onchange="calculateNewTotal(${originalTotal})">
                    <option value="percentage" ${discountType === 'percentage' ? 'selected' : ''}>Porcentagem (%)</option>
                    <option value="fixed" ${discountType === 'fixed' ? 'selected' : ''}>Valor Fixo (R$)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Valor do Desconto</label>
                <input type="number" id="discountValue" class="form-control" min="0" step="0.01" value="${discountValue}" oninput="calculateNewTotal(${originalTotal})">
                <small class="form-help">
                    <span id="discountAmountDisplay" style="color: #dc3545; font-weight: 500;">
                        ${discountType === 'percentage' && discountValue > 0 ? 
                            `R$ ${((originalTotal * discountValue) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                            ''}
                    </span>
                </small>
            </div>
            <div class="form-group">
                <label>Motivo do Desconto</label>
                <textarea id="discountReason" class="form-control" rows="2">${currentDiscountReason}</textarea>
            </div>
            <div class="quote-totals">
                <p>Total Original: <span id="originalTotal">R$ ${originalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                <p><strong>Novo Total: <span id="newTotal">R$ ${currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></strong></p>
            </div>
            
            <!-- History Section -->
            <div style="margin-top: 30px; border-top: 1px solid #dee2e6; padding-top: 20px;">
                <h4 style="margin-bottom: 20px; color: #343a40;">Histórico de Alterações</h4>
                <div class="history-timeline" style="max-height: 300px; overflow-y: auto;">
                    ${historyTimeline}
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('quoteEditModal')">Cancelar</button>
            </div>
        </form>`;
    
    // Calculate initial total display
    setTimeout(() => calculateNewTotal(originalTotal), 100);
    
    openModal('quoteEditModal');
}

async function saveQuoteChanges(event, quoteId, originalTotal) {
    event.preventDefault();
    const status = document.getElementById('quoteStatus').value;
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
    const discountReason = document.getElementById('discountReason').value;
    
    try {
        // Call the server API endpoint which handles both discount application and email sending
        const response = await fetch(`/api/proposals/${quoteId}/apply-discount`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                discountType: discountType,
                discountValue: discountValue,
                discountReason: discountReason,
                newStatus: status,
                changedBy: currentUser?.email || 'admin'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to apply discount');
        }

        // Show success message
        showToast('Orçamento atualizado com sucesso! E-mail de desconto enviado.', 'success');
        
        closeModal('quoteEditModal');
        loadPage(currentPage);

    } catch (error) {
        console.error('Error saving quote changes:', error);
        showToast(`Erro ao salvar: ${error.message}`, 'error');
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

// View Quote Details Modal
async function viewQuoteDetails(quoteId) {
    console.log('viewQuoteDetails called with ID:', quoteId);
    try {
        console.log('Fetching quote from database...');
        const { data: quote, error } = await supabase.from('proposals').select('*').eq('id', quoteId).single();
        if (error) {
            console.error('Database error:', error);
            throw error;
        }
        if (!quote) {
            console.log('No quote found for ID:', quoteId);
            showToast('Orçamento não encontrado', 'error');
            return;
        }
        
        console.log('Quote found:', quote);
        showQuoteDetailsModal(quote);
    } catch (error) {
        console.error('Error loading quote details:', error);
        showToast('Erro ao carregar detalhes do orçamento', 'error');
    }
}

// Make viewQuoteDetails available globally for debugging
window.viewQuoteDetails = viewQuoteDetails;

// Quote History Functions
async function viewQuoteHistory(quoteId) {
    console.log('viewQuoteHistory called with ID:', quoteId);
    try {
        // Fetch quote history from API
        const response = await fetch(`/api/quote-history/${quoteId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch quote history');
        }
        
        const historyData = await response.json();
        
        // Also fetch the current proposal data for context
        const { data: quote, error } = await supabase.from('proposals').select('*').eq('id', quoteId).single();
        if (error) throw error;
        
        showQuoteHistoryModal(quote, historyData);
    } catch (error) {
        console.error('Error loading quote history:', error);
        showToast('Erro ao carregar histórico do orçamento', 'error');
    }
}

function showQuoteHistoryModal(quote, historyData) {
    const modal = document.getElementById('quoteHistoryModal');
    const modalContent = document.getElementById('quoteHistoryContent');

    if (!modal || !modalContent) {
        console.error('Quote history modal not found');
        return;
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    const formatCurrency = (value) => {
        if (typeof value === 'string' && value.trim().startsWith('R$')) {
            return value;
        }
        const numberValue = Number(value);
        if (isNaN(numberValue)) {
            return 'R$ 0,00';
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(numberValue);
    };

    // Sort history by date (newest first)
    const sortedHistory = historyData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Generate history timeline
    const historyTimeline = sortedHistory.length > 0 ? sortedHistory.map((entry, index) => {
        const isLatest = index === 0;
        const changeTypeLabel = {
            'quote_created': 'Orçamento Criado',
            'discount_applied': 'Desconto Aplicado',
            'status_changed': 'Status Alterado',
            'quote_updated': 'Orçamento Atualizado'
        };

        const discountInfo = entry.discount_type && entry.discount_value ? 
            `<strong>Desconto:</strong> ${entry.discount_type === 'percentage' ? entry.discount_value + '%' : formatCurrency(entry.discount_value)}<br>` : '';
        
        const reasonInfo = entry.discount_reason ? `<strong>Motivo:</strong> ${entry.discount_reason}<br>` : '';

        return `
            <div class="history-entry ${isLatest ? 'latest' : ''}" style="
                border-left: 4px solid ${isLatest ? '#28a745' : '#6c757d'}; 
                padding: 15px 20px; 
                margin-bottom: 15px; 
                background-color: ${isLatest ? '#f8fff8' : '#f8f9fa'};
                border-radius: 0 8px 8px 0;
                position: relative;
            ">
                <div class="history-icon" style="
                    position: absolute; 
                    left: -8px; 
                    top: 15px; 
                    width: 16px; 
                    height: 16px; 
                    background-color: ${isLatest ? '#28a745' : '#6c757d'}; 
                    border-radius: 50%;
                "></div>
                <div class="history-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #495057; font-size: 1.1rem;">
                        ${changeTypeLabel[entry.change_type] || entry.change_type}
                        ${isLatest ? '<span style="color: #28a745; font-size: 0.8rem; margin-left: 10px;">(Atual)</span>' : ''}
                    </h4>
                    <span style="color: #6c757d; font-size: 0.9rem;">${formatDate(entry.created_at)}</span>
                </div>
                <div class="history-details" style="color: #6c757d; font-size: 0.95rem; line-height: 1.4;">
                    ${entry.change_description ? `<p style="margin: 5px 0;"><strong>Descrição:</strong> ${entry.change_description}</p>` : ''}
                    ${entry.old_total_price && entry.new_total_price ? `
                        <p style="margin: 5px 0;">
                            <strong>Preço:</strong> 
                            <span style="text-decoration: line-through; color: #dc3545;">${entry.old_total_price}</span> 
                            → 
                            <span style="color: #28a745; font-weight: bold;">${entry.new_total_price}</span>
                        </p>
                    ` : ''}
                    ${discountInfo}
                    ${reasonInfo}
                    ${entry.changed_by ? `<p style="margin: 5px 0;"><strong>Alterado por:</strong> ${entry.changed_by}</p>` : ''}
                </div>
            </div>
        `;
    }).join('') : '<p style="text-align: center; color: #6c757d; padding: 40px;">Nenhum histórico disponível para este orçamento.</p>';

    // Calculate current discount summary
    const originalPrice = quote.original_total_price || quote.total_price;
    const currentPrice = quote.total_price;
    const totalDiscountPercentage = quote.total_discount_percentage || 0;
    const totalDiscountAmount = quote.total_discount_amount || 0;

    modalContent.innerHTML = `
        <button class="modal-close-btn" onclick="closeQuoteHistoryModal()" aria-label="Fechar" style="
            position: absolute; 
            top: 15px; 
            right: 15px; 
            background: none; 
            border: none; 
            font-size: 1.8rem; 
            cursor: pointer; 
            color: #6c757d;
        ">&times;</button>

        <div class="modal-header" style="margin-bottom: 25px; border-bottom: 1px solid #dee2e6; padding-bottom: 15px;">
            <h2 style="margin: 0; color: #343a40;">Histórico do Orçamento</h2>
            <p style="margin: 5px 0 0 0; color: #6c757d;">
                <strong>Projeto:</strong> ${quote.project_name || 'N/A'} | 
                <strong>Cliente:</strong> ${quote.client_name || 'N/A'} |
                <strong>ID:</strong> #${quote.id.substring(0, 8)}
            </p>
        </div>

        <div class="discount-summary" style="
            background-color: #e7f3ff; 
            border: 1px solid #b3d7ff; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 25px;
        ">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #0056b3;">Resumo Atual</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <strong>Preço Original:</strong><br>
                    <span style="font-size: 1.1rem;">${formatCurrency(originalPrice)}</span>
                </div>
                <div>
                    <strong>Preço Atual:</strong><br>
                    <span style="font-size: 1.1rem; color: #28a745;">${formatCurrency(currentPrice)}</span>
                </div>
                <div>
                    <strong>Desconto Total:</strong><br>
                    <span style="font-size: 1.1rem; color: #dc3545;">
                        ${totalDiscountPercentage > 0 ? 
                            `${totalDiscountPercentage.toFixed(1)}% (${formatCurrency(totalDiscountAmount)})` : 
                            'Nenhum desconto aplicado'
                        }
                    </span>
                </div>
                <div>
                    <strong>Status:</strong><br>
                    <span class="status-badge ${quote.status}" style="font-size: 0.9rem;">${getStatusLabel(quote.status)}</span>
                </div>
            </div>
        </div>

        <div class="history-timeline">
            <h3 style="margin-bottom: 20px; color: #343a40;">Linha do Tempo</h3>
            ${historyTimeline}
        </div>

        <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <button class="btn btn-secondary" onclick="closeQuoteHistoryModal()">Fechar</button>
        </div>
    `;

    // Show the modal
    document.body.style.overflow = 'hidden';
    modal.style.display = 'flex';
}

function closeQuoteHistoryModal() {
    const modal = document.getElementById('quoteHistoryModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Setup database schema function
async function setupQuoteHistoryDatabase() {
    try {
        const response = await fetch('/api/setup-quote-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to setup database');
        }

        showToast('Database schema setup completed successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error setting up database:', error);
        showToast('Error setting up database: ' + error.message, 'error');
        return false;
    }
}

// Make functions available globally
window.viewQuoteHistory = viewQuoteHistory;
window.closeQuoteHistoryModal = closeQuoteHistoryModal;
window.setupQuoteHistoryDatabase = setupQuoteHistoryDatabase;

function showQuoteDetailsModal(quote) {
    console.log('showQuoteDetailsModal called with quote:', quote);
    const modal = document.getElementById('quoteDetailsModal');
    const modalContent = document.getElementById('quoteDetailsContent');

    console.log('Modal element:', modal);
    console.log('Modal content element:', modalContent);

    if (!modal || !modalContent) {
        console.error('Quote details modal not found - modal:', modal, 'content:', modalContent);
        return;
    }

    // Helper function for formatting dates
    const formatDateHelper = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    // Helper function for formatting currency
    const formatCurrencyHelper = (value) => {
        let numberValue;
        
        if (typeof value === 'string' && value.trim().startsWith('R$')) {
            const numStr = value.replace('R$', '').trim();
            numberValue = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
        } else {
            numberValue = Number(value);
        }
        
        if (isNaN(numberValue)) {
            return 'R$ 0,00';
        }
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(numberValue);
    };

    // Helper function for formatting numbers
    const formatNumberHelper = (value) => {
        const num = Number(value);
        if (isNaN(num)) {
            return '-';
        }
        return num.toLocaleString('pt-BR');
    };

    // Process selected_services for the table
    let serviceTableRowsHtml = '<tr><td colspan="4" style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">Nenhum serviço adicionado</td></tr>';
    let serviceItems = [];
    let dailySubtotalSum = 0;

    const processServicesForTable = (services) => {
        serviceItems = [];
        dailySubtotalSum = 0;
        if (Array.isArray(services)) {
            services.forEach(service => {
                const name = service.name || 'Serviço sem nome';
                const quantity = service.quantity || 0;
                const unit_price = service.unit_price || 0;
                const subtotal = quantity * unit_price;
                dailySubtotalSum += subtotal;
                
                serviceItems.push({
                    name: name,
                    quantity: quantity,
                    unit_price: unit_price,
                    subtotal: subtotal
                });
            });

            if (serviceItems.length > 0) {
                serviceTableRowsHtml = serviceItems.map(item => `
                  <tr>
                    <td data-label="Item" style="padding: 10px; border-bottom: 1px solid #dee2e6;">${item.name}</td>
                    <td data-label="Qtd" style="text-align: center; padding: 10px; border-bottom: 1px solid #dee2e6; width: 60px;">${item.quantity}</td>
                    <td data-label="Preço Unit. (Diária)" style="text-align: right; padding: 10px; border-bottom: 1px solid #dee2e6; width: 120px;">${formatCurrencyHelper(item.unit_price)}</td>
                    <td data-label="Subtotal (Diária)" style="text-align: right; padding: 10px; border-bottom: 1px solid #dee2e6; width: 120px;">${formatCurrencyHelper(item.subtotal)}</td>
                  </tr>
                `).join('');
            }
        }
    };

    // Safely parse and process services
    let servicesProcessed = false;
    
    // First try the direct field
    if (quote.selected_services) {
        if (typeof quote.selected_services === 'string') {
            try {
                const parsedServices = JSON.parse(quote.selected_services);
                processServicesForTable(parsedServices);
                servicesProcessed = true;
            } catch (e) {
                console.log('Error parsing selected_services:', e);
            }
        } else if (Array.isArray(quote.selected_services)) {
            processServicesForTable(quote.selected_services);
            servicesProcessed = true;
        }
    }
    
    // If not found, try to get services from discount_description JSON
    if (!servicesProcessed && quote.discount_description) {
        try {
            const extendedData = JSON.parse(quote.discount_description);
            if (extendedData.services && Array.isArray(extendedData.services)) {
                processServicesForTable(extendedData.services);
                servicesProcessed = true;
            }
        } catch (e) {
            console.log('Error parsing services from discount_description:', e);
        }
    }
    
    // If still no services found, show empty message
    if (!servicesProcessed) {
        serviceTableRowsHtml = '<tr><td colspan="4" style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">Nenhum serviço adicionado</td></tr>';
    }

    // Format other data safely
    const proposalId = quote.id || 'N/A';
    const projectName = quote.project_name || 'Projeto sem nome';
    const clientName = quote.client_name || 'N/A';
    const clientCompany = quote.client_company || 'N/A';
    const clientEmail = quote.client_email || 'N/A';
    const clientPhone = quote.client_phone || 'N/A';
    const createdDate = formatDateHelper(quote.created_at);
    const shootingStart = formatDateHelper(quote.shooting_dates_start);
    const shootingEnd = formatDateHelper(quote.shooting_dates_end);
    const daysCount = quote.days_count || 1;
    const totalPrice = quote.total_price || formatCurrencyHelper(dailySubtotalSum * daysCount);

    // Get extended data from JSON
    const extendedData = getExtendedQuoteData(quote);
    
    // Debug: log the quote data to see what we have
    console.log('Quote details debug:', {
        quote_id: quote.id,
        discount_description: quote.discount_description,
        extendedData: extendedData,
        selected_services: quote.selected_services,
        full_quote: quote
    });
    
    // LED Principal Data
    const ledPWidth = quote.led_principal_width || 'N/A';
    const ledPHeight = quote.led_principal_height || 'N/A';
    const ledPCurvature = quote.led_principal_curvature !== null ? quote.led_principal_curvature : 'N/A';
    const ledPModules = quote.led_principal_modules || 'N/A';
    const ledPResolution = quote.led_principal_resolution || 'N/A';
    const ledPPixelsW = quote.led_principal_pixels_width || extendedData.led_principal_pixels_width || 'N/A';
    const ledPPixelsH = quote.led_principal_pixels_height || extendedData.led_principal_pixels_height || 'N/A';
    const ledPTotalPixels = (quote.led_principal_total_pixels || extendedData.led_principal_total_pixels) ? Number(quote.led_principal_total_pixels || extendedData.led_principal_total_pixels).toLocaleString('pt-BR') : 'N/A';
    const ledPPowerMax = (quote.principal_power_max || extendedData.principal_power_max) ? `${formatNumberHelper(quote.principal_power_max || extendedData.principal_power_max)} W` : 'N/A';
    const ledPPowerAvg = (quote.principal_power_avg || extendedData.principal_power_avg) ? `${formatNumberHelper(quote.principal_power_avg || extendedData.principal_power_avg)} W` : 'N/A';
    const ledPWeight = (quote.principal_weight || extendedData.principal_weight) ? `${formatNumberHelper(quote.principal_weight || extendedData.principal_weight)} kg` : 'N/A';

    // LED Teto Data
    const hasTetoLed = !!quote.led_teto_width;
    const ledTWidth = quote.led_teto_width || 'N/A';
    const ledTHeight = quote.led_teto_height || 'N/A';
    const ledTModules = quote.led_teto_modules || 'N/A';
    const ledTResolution = quote.led_teto_resolution || extendedData.led_teto_resolution || 'N/A';
    const ledTPixelsW = quote.led_teto_pixels_width || extendedData.led_teto_pixels_width || 'N/A';
    const ledTPixelsH = quote.led_teto_pixels_height || extendedData.led_teto_pixels_height || 'N/A';
    const ledTTotalPixels = (quote.led_teto_total_pixels || extendedData.led_teto_total_pixels) ? Number(quote.led_teto_total_pixels || extendedData.led_teto_total_pixels).toLocaleString('pt-BR') : 'N/A';
    const ledTPowerMax = (quote.teto_power_max || extendedData.teto_power_max) ? `${formatNumberHelper(quote.teto_power_max || extendedData.teto_power_max)} W` : 'N/A';
    const ledTPowerAvg = (quote.teto_power_avg || extendedData.teto_power_avg) ? `${formatNumberHelper(quote.teto_power_avg || extendedData.teto_power_avg)} W` : 'N/A';
    const ledTWeight = (quote.teto_weight || extendedData.teto_weight) ? `${formatNumberHelper(quote.teto_weight || extendedData.teto_weight)} kg` : 'N/A';

    // Build Modal HTML
    modalContent.innerHTML = `
        <div id="quote-details-content-wrapper" style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; max-width: 900px; margin: 20px auto; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: relative;">
            <button id="quote-details-close-btn" class="modal-close-btn" aria-label="Fechar" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #6c757d;">&times;</button>

            <div class="modal-header-flex" style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px; border-bottom: 1px solid #dee2e6; padding-bottom: 15px;">
                <img src="../img/on+av_logo_v3.png" alt="ON+AV Logo" style="height: 40px; width: auto;">
                <h2 id="quote-details-project-name" style="margin: 0; font-size: 1.5rem; color: #343a40; margin-left: auto;">Detalhes: ${projectName}</h2>
            </div>

            <div class="section" style="margin-bottom: 25px;">
              <div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div class="card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                  <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #495057;">Informações do Cliente</h3>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Nome:</strong> <span id="quote-details-client-name">${clientName}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Empresa:</strong> <span id="quote-details-client-company">${clientCompany}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Email:</strong> <span id="quote-details-client-email">${clientEmail}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Telefone:</strong> <span id="quote-details-client-phone">${clientPhone}</span></p>
                </div>

                <div class="card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                  <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #495057;">Detalhes do Projeto</h3>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Data da Proposta:</strong> <span id="quote-details-created-date">${createdDate}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Período de Filmagem:</strong> <span id="quote-details-shooting-dates">${shootingStart} – ${shootingEnd}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Duração:</strong> <span id="quote-details-days-count">${daysCount}</span> dia(s)</p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Numero do orçamento:</strong> <span id="quote-details-proposal-id">${proposalId.substring(0, 8)}</span></p>
                </div>
              </div>
            </div>

            <div class="section" style="margin-bottom: 25px;">
              <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.3rem; color: #343a40;">Configuração do LED</h3>
              <div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div class="card" id="led-principal-card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                  <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 1.1rem; color: #495057;">LED Principal</h4>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Dimensões:</strong> <span id="led-principal-dimensions">${ledPWidth}</span>&nbsp;m × <span id="led-principal-height">${ledPHeight}</span>&nbsp;m</p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Curvatura:</strong> <span id="led-principal-curvature">${ledPCurvature}</span>°</p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Módulos:</strong> <span id="led-principal-modules">${formatNumberHelper(ledPModules)}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Pixels (L×A):</strong> <span id="led-principal-pixels-wh">${formatNumberHelper(ledPPixelsW)}</span> × <span id="led-principal-pixels-h">${formatNumberHelper(ledPPixelsH)}</span> (<span id="led-principal-total-pixels">${ledPTotalPixels}</span> total)</p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Potência Máx./Média:</strong> <span id="led-principal-power">${ledPPowerMax}</span> / <span id="led-principal-power-avg">${ledPPowerAvg}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Peso:</strong> <span id="led-principal-weight">${ledPWeight}</span></p>
                </div>

                ${hasTetoLed ? `
                <div class="card" id="led-teto-card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                  <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 1.1rem; color: #495057;">LED Teto</h4>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Dimensões:</strong> <span id="led-teto-dimensions">${ledTWidth}</span>&nbsp;m × <span id="led-teto-height">${ledTHeight}</span>&nbsp;m</p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Módulos:</strong> <span id="led-teto-modules">${formatNumberHelper(ledTModules)}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Pixels (L×A):</strong> <span id="led-teto-pixels-wh">${formatNumberHelper(ledTPixelsW)}</span> × <span id="led-teto-pixels-h">${formatNumberHelper(ledTPixelsH)}</span> (<span id="led-teto-total-pixels">${ledTTotalPixels}</span> total)</p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Potência Máx./Média:</strong> <span id="led-teto-power">${ledTPowerMax}</span> / <span id="led-teto-power-avg">${ledTPowerAvg}</span></p>
                  <p style="margin: 5px 0; font-size: 0.95rem; color: #6c757d;"><strong>Peso:</strong> <span id="led-teto-weight">${ledTWeight}</span></p>
                </div>
                ` : ''}
              </div>
            </div>

            <div class="section" style="margin-bottom: 25px;">
              <div class="card" style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); overflow-x: auto;">
                <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #495057;">Serviços Incluídos (Valores Diários)</h3>
                <table class="service-table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                   <thead style="background-color: #e9ecef;">
                      <tr>
                         <th style="text-align: left; padding: 10px; border-bottom: 2px solid #dee2e6;">Item</th>
                         <th style="text-align: center; padding: 10px; border-bottom: 2px solid #dee2e6; width: 60px;">Qtd</th>
                         <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; width: 120px;">Preço Unit. (Diária)</th>
                         <th style="text-align: right; padding: 10px; border-bottom: 2px solid #dee2e6; width: 120px;">Subtotal (Diária)</th>
                      </tr>
                   </thead>
                   <tbody id="quote-details-services-tbody" style="color: #6c757d;">
                      ${serviceTableRowsHtml}
                   </tbody>
                </table>
              </div>
            </div>

            <!-- DISCOUNT INFORMATION SECTION -->
            ${(quote.discount_percentage && quote.discount_percentage > 0) ? `
            <div class="section" style="margin-bottom: 25px;">
              <div class="card" style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #856404;"><i class="fas fa-tag"></i> Desconto Aplicado</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                  <div>
                    <strong>Preço Original:</strong><br>
                    <span style="font-size: 1.1rem; text-decoration: line-through; color: #6c757d;">${formatCurrencyHelper(quote.original_total_price || quote.total_price)}</span>
                  </div>
                  <div>
                    <strong>Desconto:</strong><br>
                    <span style="font-size: 1.1rem; color: #dc3545;">${quote.discount_percentage.toFixed(1)}% (${formatCurrencyHelper((parseFloat(quote.original_total_price) * quote.discount_percentage) / 100)})</span>
                  </div>
                  <div>
                    <strong>Preço Final:</strong><br>
                    <span style="font-size: 1.1rem; color: #28a745; font-weight: bold;">${totalPrice}</span>
                  </div>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ffeaa7;">
                  <strong>Motivo do Desconto:</strong><br>
                  <span style="color: #856404;">Desconto progressivo por ${daysCount} dias de locação</span>
                </div>
              </div>
            </div>
            ` : ''}

            <div class="section" style="margin-bottom: 25px;">
              <div class="total-line" style="display: flex; justify-content: flex-end; align-items: center; padding-top: 15px; border-top: 1px solid #dee2e6; font-size: 1.2rem; font-weight: bold; color: #343a40;">
                <span style="margin-right: 15px;">Total ${(quote.discount_percentage && quote.discount_percentage > 0) ? 'com Desconto' : 'Estimado'} (${daysCount} ${daysCount > 1 ? 'dias' : 'dia'}):</span>
                <span id="quote-details-total-price" style="color: ${(quote.discount_percentage && quote.discount_percentage > 0) ? '#28a745' : '#343a40'};">${totalPrice}</span>
              </div>
            </div>

            <!-- Link da Proposta Section -->
            <div class="section" style="margin-bottom: 25px;">
              <div class="card" style="background-color: #e7f3ff; border: 1px solid #b3d7ff; border-radius: 6px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; color: #0056b3;"><i class="fas fa-link"></i> Link da Proposta</h3>
                <p style="margin: 5px 0 10px 0; font-size: 0.9rem; color: #495057;">Compartilhe este link com o cliente para visualização e aprovação:</p>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                  <input type="text" id="quote-url-input" value="Gerando link..." readonly 
                         style="flex: 1; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; background-color: #f8f9fa; font-family: monospace; font-size: 0.85rem;">
                  <button id="copy-url-btn" onclick="copyQuoteUrl()" 
                          style="background-color: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                    <i class="fas fa-copy"></i> Copiar
                  </button>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                  <button onclick="openQuoteUrl()" 
                          style="background-color: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                    <i class="fas fa-external-link-alt"></i> Abrir Link
                  </button>
                  <button onclick="sendQuoteWhatsApp('${clientPhone}', '${quote.id}')" 
                          style="background-color: #25d366; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                  </button>
                </div>
              </div>
            </div>

        </div>
    `;

    // Show the modal
    document.body.style.overflow = 'hidden';
    modal.style.display = 'flex';

    // Add event listeners
    const closeButton = modalContent.querySelector('#quote-details-close-btn');
    if (closeButton) {
        const newCloseBtn = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseBtn, closeButton);

        newCloseBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }

    // Close modal if clicked on the overlay
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // Load the quote URL
    loadQuoteUrl(quote.id);
}

// Functions for quote URL handling
let currentQuoteUrl = '';

async function loadQuoteUrl(quoteId) {
    try {
        // First try to generate/get the slug
        const response = await fetch(`/api/proposals/${quoteId}/generate-slug`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const baseUrl = window.location.origin;
            currentQuoteUrl = `${baseUrl}/quote/${data.slug}`;
            
            const urlInput = document.getElementById('quote-url-input');
            if (urlInput) {
                urlInput.value = currentQuoteUrl;
            }
        } else {
            console.error('Failed to generate quote URL');
            const urlInput = document.getElementById('quote-url-input');
            if (urlInput) {
                urlInput.value = 'Erro ao gerar link';
            }
        }
    } catch (error) {
        console.error('Error loading quote URL:', error);
        const urlInput = document.getElementById('quote-url-input');
        if (urlInput) {
            urlInput.value = 'Erro ao gerar link';
        }
    }
}

async function copyQuoteUrl() {
    const urlInput = document.getElementById('quote-url-input');
    const copyBtn = document.getElementById('copy-url-btn');
    
    if (!urlInput || !urlInput.value || urlInput.value.includes('Erro') || urlInput.value.includes('Gerando')) {
        showToast('Link não disponível', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(urlInput.value);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        copyBtn.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.backgroundColor = '#28a745';
        }, 2000);
        
        showToast('Link copiado para a área de transferência!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        // Fallback for older browsers
        urlInput.select();
        document.execCommand('copy');
        showToast('Link copiado!', 'success');
    }
}

function openQuoteUrl() {
    if (!currentQuoteUrl || currentQuoteUrl.includes('Erro') || currentQuoteUrl.includes('Gerando')) {
        showToast('Link não disponível', 'error');
        return;
    }
    window.open(currentQuoteUrl, '_blank');
}

function sendQuoteWhatsApp(clientPhone, quoteId) {
    if (!currentQuoteUrl || currentQuoteUrl.includes('Erro') || currentQuoteUrl.includes('Gerando')) {
        showToast('Aguarde o carregamento do link', 'warning');
        return;
    }

    if (!clientPhone) {
        showToast('Telefone do cliente não disponível', 'error');
        return;
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = clientPhone.replace(/\D/g, '');
    
    // Create WhatsApp message
    const message = `Olá! Sua proposta da ON+AV está pronta para visualização e aprovação. Acesse o link abaixo:\n\n${currentQuoteUrl}\n\nQualquer dúvida, estamos à disposição!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// Product Management
async function openProductModal(productId = null) {
    let product = { name: '', description: '', category: '', price: 0, unit_type: 'per_day' };
    if (productId) {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            if (response.ok) {
                const products = await response.json();
                const foundProduct = products.find(p => p.id === productId);
                if (foundProduct) product = foundProduct;
            }
        } catch (error) {
            console.error('Error fetching product for edit:', error);
            showToast('Erro ao carregar dados do produto', 'error');
        }
    }
    
    // Update modal title
    const modalTitle = document.getElementById('productModalTitle');
    if (modalTitle) {
        modalTitle.textContent = productId ? 'Editar Produto' : 'Adicionar Produto';
    }
    
    // Fill form fields
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productDescriptionInput = document.getElementById('productDescription');
    const productCategoryInput = document.getElementById('productCategory');
    const productPriceInput = document.getElementById('productPrice');
    const productUnitTypeInput = document.getElementById('productUnitType');
    
    if (productIdInput) productIdInput.value = productId || '';
    if (productNameInput) productNameInput.value = product.name || '';
    if (productDescriptionInput) productDescriptionInput.value = product.description || '';
    if (productCategoryInput) productCategoryInput.value = product.category || '';
    if (productPriceInput) productPriceInput.value = product.price || 0;
    if (productUnitTypeInput) productUnitTypeInput.value = product.unit_type || 'per_day';
    
    // Set up form submission handler
    const productForm = document.getElementById('productForm');
    if (productForm) {
        // Remove any existing listeners to avoid duplicates
        const newForm = productForm.cloneNode(true);
        productForm.parentNode.replaceChild(newForm, productForm);
        
        newForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const currentProductId = document.getElementById('productId').value;
            saveProduct(event, currentProductId || null);
        });
    }
    
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

    console.log('saveProduct called with productId:', productId);
    console.log('productData:', productData);

    try {
        const url = productId ? `http://localhost:3000/api/products/${productId}` : 'http://localhost:3000/api/products';
        const method = productId ? 'PUT' : 'POST';
        
        console.log('Making request to:', url, 'with method:', method);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            showToast('Produto salvo com sucesso!', 'success');
            closeModal('productModal');
            loadPage('products');
        } else {
            const errorData = await response.json();
            showToast(`Erro: ${errorData.error || 'Falha ao salvar produto'}`, 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showToast(`Erro: ${error.message}`, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        const response = await fetch(`http://localhost:3000/api/products/${productId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            showToast('Produto excluído!', 'success');
            loadPage('products');
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Falha ao excluir produto' }));
            showToast(`Erro: ${errorData.error}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast(`Erro: ${error.message}`, 'error');
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
function createNewQuote() {
    // Create the client selection modal
    const modalHTML = `
        <div class="modal active" id="newQuoteModal">
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Novo Orçamento - Selecionar Cliente</h2>
                    <button class="modal-close" onclick="closeNewQuoteModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="clientSelectionForm">
                        <div class="form-group">
                            <label for="clientEmail">Email do Cliente:</label>
                            <input type="email" id="clientEmail" required placeholder="Digite o email do cliente...">
                            <small class="form-help">Digite o email para verificar se o cliente já existe</small>
                        </div>
                        <div class="form-group">
                            <label for="clientName">Nome:</label>
                            <input type="text" id="clientName" required>
                        </div>
                        <div class="form-group">
                            <label for="clientCompany">Empresa:</label>
                            <input type="text" id="clientCompany">
                        </div>
                        <div class="form-group">
                            <label for="clientPhone">Telefone:</label>
                            <input type="tel" id="clientPhone">
                        </div>
                        <div class="form-group">
                            <label for="clientPassword">Senha (para novo cliente):</label>
                            <input type="password" id="clientPassword" placeholder="Deixe em branco para clientes existentes">
                            <small class="form-help">Crie uma senha para que o cliente possa acessar o sistema</small>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Continuar para Calculadora</button>
                            <button type="button" class="btn btn-secondary" onclick="closeNewQuoteModal()">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
    
    // Remove existing modal if present
    const existingModal = document.getElementById('newQuoteModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize the modal functionality
    initializeNewQuoteModal();
}

function closeNewQuoteModal() {
    const modal = document.getElementById('newQuoteModal');
    if (modal) {
        modal.remove();
    }
}

function initializeNewQuoteModal() {
    const emailInput = document.getElementById('clientEmail');
    const clientForm = document.getElementById('clientSelectionForm');
    
    // Add email input listener for auto-population
    emailInput.addEventListener('blur', async () => {
        const email = emailInput.value.trim();
        if (email && email.includes('@')) {
            await checkExistingClient(email);
        }
    });
    
    // Handle form submission
    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleClientSelection();
    });
}

async function checkExistingClient(email) {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
            throw new Error('No valid session');
        }

        const response = await fetch('/api/check-user-by-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.session.access_token}`
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Server response:', error);
            throw new Error(error.error || 'Failed to check user');
        }

        const result = await response.json();
        
        if (result.exists && result.profile) {
            // User exists with complete profile - auto-populate the form
            document.getElementById('clientName').value = result.profile.full_name || '';
            document.getElementById('clientCompany').value = result.profile.company || '';
            document.getElementById('clientPhone').value = result.profile.phone || '';
            document.getElementById('clientPassword').value = '';
            document.getElementById('clientPassword').placeholder = 'Cliente já existe - senha não necessária';
            document.getElementById('clientPassword').disabled = true;
            document.getElementById('clientPassword').required = false;
            
            // Store the user ID for later use
            window.existingClientUserId = result.user_id;
            
            showToast('Cliente encontrado! Dados preenchidos automaticamente.', 'success');
        } else if (result.exists && !result.profile) {
            // User exists in auth but no profile - clear form and enable password
            clearClientForm();
            document.getElementById('clientPassword').disabled = false;
            document.getElementById('clientPassword').placeholder = 'Cliente existe mas sem perfil completo';
            document.getElementById('clientPassword').required = false;
            
            // Store the user ID for later use
            window.existingClientUserId = result.user_id;
            
            showToast('Email encontrado no sistema. Complete os dados do perfil.', 'info');
        } else {
            // User doesn't exist - clear form and enable password
            clearClientForm();
            document.getElementById('clientPassword').disabled = false;
            document.getElementById('clientPassword').placeholder = 'Novo cliente - criar senha';
            document.getElementById('clientPassword').required = true;
            
            // Clear any stored user ID
            window.existingClientUserId = null;
            
            showToast('Novo cliente. Preencha todos os dados e crie uma senha.', 'info');
        }
    } catch (error) {
        console.error('Error checking existing client:', error);
        // On error, treat as new client
        clearClientForm();
        document.getElementById('clientPassword').disabled = false;
        document.getElementById('clientPassword').required = true;
        window.existingClientUserId = null;
        showToast('Erro ao verificar cliente. Tratando como novo cliente.', 'warning');
    }
}

function clearClientForm() {
    document.getElementById('clientName').value = '';
    document.getElementById('clientCompany').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientPassword').value = '';
}

async function handleClientSelection() {
    const email = document.getElementById('clientEmail').value.trim();
    const name = document.getElementById('clientName').value.trim();
    const company = document.getElementById('clientCompany').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const password = document.getElementById('clientPassword').value.trim();
    
    if (!email || !name) {
        showToast('Email e nome são obrigatórios.', 'error');
        return;
    }
    
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
            throw new Error('No valid session');
        }

        let clientUserId = null;
        let isNewClient = false;
        
        if (window.existingClientUserId) {
            // User exists, update their profile
            clientUserId = window.existingClientUserId;
            
            const response = await fetch('/api/update-user-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session.access_token}`
                },
                body: JSON.stringify({
                    user_id: clientUserId,
                    email: email,
                    full_name: name,
                    company: company,
                    phone: phone
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update user profile');
            }
            
            isNewClient = false;
        } else {
            // Create new user
            if (!password) {
                showToast('Senha é obrigatória para novos clientes.', 'error');
                return;
            }
            
            const response = await fetch('/api/create-client-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session.access_token}`
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    full_name: name,
                    company: company,
                    phone: phone
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create client user');
            }
            
            const result = await response.json();
            clientUserId = result.user_id;
            isNewClient = true;
        }
        
        // Close the client modal and open the calculator
        closeNewQuoteModal();
        
        // Store client info for the calculator
        window.selectedClientForQuote = {
            userId: clientUserId,
            email: email,
            name: name,
            company: company,
            phone: phone,
            isNew: isNewClient
        };
        
        // Open the LED calculator modal
        openLedCalculatorModal();
        
        showToast(isNewClient ? 'Novo cliente criado com sucesso!' : 'Cliente selecionado!', 'success');
        
    } catch (error) {
        console.error('Error handling client selection:', error);
        showToast('Erro ao processar cliente: ' + error.message, 'error');
    }
}

function openLedCalculatorModal() {
    const modalHTML = `
        <div class="modal active" id="ledCalculatorModal" style="z-index: 1001;">
            <div class="modal-content" style="width: 95%; max-width: 1400px; height: 90vh; overflow: hidden;">
                <div class="modal-header">
                    <h2>Calculadora LED - ${window.selectedClientForQuote?.name} (${window.selectedClientForQuote?.company})</h2>
                    <button class="modal-close" onclick="closeLedCalculatorModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 0; height: calc(90vh - 60px); overflow: hidden;">
                    <iframe id="ledCalculatorFrame" 
                            src="/led/index.html?dashboard=true" 
                            style="width: 100%; height: 100%; border: none;"
                            frameborder="0">
                    </iframe>
                </div>
            </div>
        </div>`;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize communication with iframe
    initializeCalculatorCommunication();
}

function closeLedCalculatorModal() {
    const modal = document.getElementById('ledCalculatorModal');
    if (modal) {
        modal.remove();
    }
    // Clear selected client data
    window.selectedClientForQuote = null;
}

function initializeCalculatorCommunication() {
    // Listen for messages from the LED calculator iframe
    window.addEventListener('message', async (event) => {
        // Make sure the message is from our LED calculator
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'QUOTE_READY_FOR_SUBMISSION') {
            // The LED calculator is ready to submit the quote
            await handleQuoteSubmissionFromCalculator(event.data.quoteData);
        } else if (event.data.type === 'CALCULATOR_LOADED') {
            // Send client information to the calculator
            const iframe = document.getElementById('ledCalculatorFrame');
            if (iframe && window.selectedClientForQuote) {
                iframe.contentWindow.postMessage({
                    type: 'SET_CLIENT_INFO',
                    clientInfo: window.selectedClientForQuote
                }, window.location.origin);
            }
        }
    });
}

async function handleQuoteSubmissionFromCalculator(quoteData) {
    try {
        if (!window.selectedClientForQuote) {
            showToast('Informações do cliente não encontradas.', 'error');
            return;
        }
        
        // Debug log to see what IDs we have
        console.log('Quote submission debug:', {
            selectedClient: window.selectedClientForQuote,
            currentUser: currentUser,
            userProfile: userProfile
        });

        // Prepare the quote data with client and sales rep information
        const completeQuoteData = {
            ...quoteData,
            user_id: window.selectedClientForQuote.userId, // This should be the CLIENT's ID
            client_name: window.selectedClientForQuote.name,
            client_company: window.selectedClientForQuote.company,
            client_email: window.selectedClientForQuote.email,
            client_phone: window.selectedClientForQuote.phone,
            sales_rep_id: currentUser?.id, // This should be the SALES REP's ID
            sales_rep_name: userProfile?.full_name || currentUser?.email || 'Admin',
            created_by_dashboard: true,
            status: 'pending'
        };

        console.log('Complete quote data to submit:', completeQuoteData);
        
        // Save the quote using the existing quote service functionality
        const response = await fetch('/api/save-proposal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
            },
            body: JSON.stringify(completeQuoteData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast('Orçamento criado com sucesso!', 'success');
            
            // Close the calculator modal
            closeLedCalculatorModal();
            
            // Refresh the quotes page if we're on it
            if (currentPage === 'quotes') {
                await loadQuotesPage();
            }
            
            // Optionally show the created quote
            if (result.data?.id) {
                setTimeout(() => {
                    viewQuoteDetails(result.data.id);
                }, 1000);
            }
        } else {
            const error = await response.json();
            showToast('Erro ao criar orçamento: ' + (error.message || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        console.error('Error saving quote from calculator:', error);
        showToast('Erro ao salvar orçamento: ' + error.message, 'error');
    }
}
function sendWhatsApp(phone) { 
    if(phone) {
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    } else {
        showToast('Número de telefone não disponível.', 'error');
    }
}

// Users Page
async function loadUsersPage() {
    pageTitle.textContent = "Gerenciamento de Usuários";
    
    try {
        // Get user profiles
        const { data: users, error } = await supabase
            .from("user_profiles")
            .select("*")
            .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        // Get auth data for last sign-in information via server API
        let usersWithAuthData = users;
        try {
            const response = await fetch('/api/users/auth-data');
            if (response.ok) {
                const authData = await response.json();
                
                // Merge user profiles with auth data
                usersWithAuthData = users.map(user => {
                    const authUser = authData.find(auth => auth.id === user.id);
                    return {
                        ...user,
                        last_sign_in_at: authUser?.last_sign_in_at,
                        raw_user_meta_data: authUser?.raw_user_meta_data || authUser?.user_metadata
                    };
                });
            } else {
                console.warn('Could not fetch auth data from server');
            }
        } catch (authError) {
            console.warn('Error fetching auth data:', authError);
        }
        
        pageContent.innerHTML = `
            <div class="data-table">
                <div class="table-header">
                    <h3 class="table-title">Usuários do Sistema</h3>
                    <div class="table-actions">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar usuários..." id="searchUsers">
                        </div>
                        <button class="btn btn-secondary" id="syncPhoneBtn" style="margin-right: 10px;">
                            <i class="fas fa-sync"></i> Sincronizar Telefones
                        </button>
                        <button class="btn btn-primary" id="addUserBtn">
                            <i class="fas fa-plus"></i> Novo Usuário
                        </button>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>Função</th>
                            <th>Criado em</th>
                            <th>Último Login</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        ${generateUsersTable(usersWithAuthData)}
                    </tbody>
                </table>
            </div>`;
            
        // Add event listeners
        document.getElementById("searchUsers").addEventListener("input", (e) => 
            filterTable("usersTableBody", e.target.value));
        
        document.getElementById("addUserBtn").addEventListener("click", () => 
            openUserModal());
        
        document.getElementById("syncPhoneBtn").addEventListener("click", () => 
            syncPhoneNumbers());
        
        // Add event listeners for user action buttons
        const tableBody = document.getElementById("usersTableBody");
        if (tableBody) {
            tableBody.addEventListener("click", (e) => {
                const button = e.target.closest("button");
                if (!button) return;
                
                const userId = button.getAttribute("data-user-id");
                if (!userId) return;
                
                if (button.classList.contains("edit-user-btn")) {
                    openUserModal(userId);
                } else if (button.classList.contains("delete-user-btn")) {
                    deleteUser(userId);
                } else if (button.classList.contains("toggle-status-btn")) {
                    toggleUserStatus(userId);
                }
            });
        }
        
    } catch (error) {
        console.error("Error loading users:", error);
        showToast("Erro ao carregar usuários", "error");
        pageContent.innerHTML = "<div class=\"empty-state\"><p>Erro ao carregar usuários</p></div>";
    }
}

function generateUsersTable(users) {
    if (!users || users.length === 0) {
        return "<tr><td colspan=\"7\" class=\"text-center\">Nenhum usuário encontrado</td></tr>";
    }
    
    return users.map(user => {
        const roleLabel = getRoleLabel(user.role);
        
        // Format phone number - prioritize user_profiles.phone first
        let phoneNumber = user.phone || "N/A";
        
        // Format last login from user_profiles table
        const lastSignIn = user.last_login_at ? 
            new Date(user.last_login_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : "Nunca logou";
        
        return `
            <tr data-status="${user.is_active ? "active" : "inactive"}">
                <td>${user.full_name || user.raw_user_meta_data?.name || "N/A"}</td>
                <td>${user.email || "N/A"}</td>
                <td>${phoneNumber}</td>
                <td>${roleLabel}</td>
                <td>${formatDate(user.created_at)}</td>
                <td>${lastSignIn}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary edit-user-btn" 
                                data-user-id="${user.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm ${user.is_active ? "btn-warning" : "btn-success"} toggle-status-btn" 
                                data-user-id="${user.id}" 
                                title="${user.is_active ? "Desativar" : "Ativar"}">
                            <i class="fas ${user.is_active ? "fa-ban" : "fa-check"}"></i>
                        </button>
                        ${user.email !== "nelson.maluf@onprojecoes.com.br" ? `
                            <button class="btn btn-sm btn-danger delete-user-btn" 
                                    data-user-id="${user.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ""}
                    </div>
                </td>
            </tr>`;
    }).join("");
}

function getRoleLabel(role) {
    const roleLabels = {
        "admin": "Administrador",
        "sales_rep": "Vendedor",
        "end_user": "Cliente"
    };
    return roleLabels[role] || role;
}

async function openUserModal(userId = null) {
    let user = { 
        full_name: "", 
        email: "", 
        phone: "", 
        role: "end_user", 
        is_active: true 
    };
    
    if (userId) {
        try {
            const { data: userData, error } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", userId)
                .single();
            
            if (error) throw error;
            if (userData) user = userData;
        } catch (error) {
            console.error("Error fetching user for edit:", error);
            showToast("Erro ao carregar dados do usuário", "error");
            return;
        }
    }
    
    // Create modal content dynamically
    const modalHTML = `
        <div class="modal" id="userModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="userModalTitle">${userId ? "Editar Usuário" : "Novo Usuário"}</h2>
                    <button class="modal-close" data-modal="userModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="userForm">
                        <input type="hidden" id="userId" value="${userId || ""}">
                        <div class="form-group">
                            <label for="userFullName">Nome Completo:</label>
                            <input type="text" id="userFullName" required value="${user.full_name || ""}">
                        </div>
                        <div class="form-group">
                            <label for="userEmail">Email:</label>
                            <input type="email" id="userEmail" required value="${user.email || ""}" ${userId ? "readonly" : ""}>
                        </div>
                        <div class="form-group">
                            <label for="userPhone">Telefone:</label>
                            <input type="tel" id="userPhone" value="${user.phone || ""}">
                        </div>
                        ${!userId ? `
                        <div class="form-group" id="passwordGroup">
                            <label for="userPassword">Senha:</label>
                            <input type="password" id="userPassword" required>
                        </div>
                        ` : ""}
                        <div class="form-group">
                            <label for="userRole">Função:</label>
                            <select id="userRole" required>
                                <option value="end_user" ${user.role === "end_user" ? "selected" : ""}>Cliente</option>
                                <option value="sales_rep" ${user.role === "sales_rep" ? "selected" : ""}>Vendedor</option>
                                <option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrador</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="userActive" ${user.is_active ? "checked" : ""}>
                                <span>Usuário Ativo</span>
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Salvar</button>
                            <button type="button" class="btn btn-secondary" data-modal-close="userModal">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
    
    // Remove existing modal if present
    const existingModal = document.getElementById("userModal");
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    
    // Add event listeners
    const modal = document.getElementById("userModal");
    const userForm = document.getElementById("userForm");
    
    // Form submission
    userForm.addEventListener("submit", (e) => saveUser(e, userId));
    
    // Modal close buttons
    modal.querySelectorAll(".modal-close, [data-modal-close]").forEach(btn => {
        btn.addEventListener("click", () => closeUserModal());
    });
    
    // Close on backdrop click
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeUserModal();
    });
    
    // Show modal
    modal.classList.add("active");
}

function closeUserModal() {
    const modal = document.getElementById("userModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => modal.remove(), 300);
    }
}

async function saveUser(event, userId) {
    event.preventDefault();
    
    const userData = {
        full_name: document.getElementById("userFullName").value,
        email: document.getElementById("userEmail").value,
        phone: document.getElementById("userPhone").value,
        role: document.getElementById("userRole").value,
        is_active: document.getElementById("userActive").checked
    };
    
    if (!userId) {
        userData.password = document.getElementById("userPassword").value;
    }
    
    try {
        if (userId) {
            // Update existing user
            const { error } = await supabase
                .from("user_profiles")
                .update({
                    full_name: userData.full_name,
                    phone: userData.phone,
                    role: userData.role,
                    is_active: userData.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq("id", userId);
            
            if (error) throw error;
            showToast("Usuário atualizado com sucesso!", "success");
        } else {
            // Create new user via API
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Falha ao criar usuário");
            }
            
            showToast("Usuário criado com sucesso!", "success");
        }
        
        closeUserModal();
        loadPage("users");
        
    } catch (error) {
        console.error("Error saving user:", error);
        showToast(`Erro ao salvar usuário: ${error.message}`, "error");
    }
}

async function deleteUser(userId) {
    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from("user_profiles")
            .delete()
            .eq("id", userId);
        
        if (error) throw error;
        
        showToast("Usuário excluído com sucesso!", "success");
        loadPage("users");
        
    } catch (error) {
        console.error("Error deleting user:", error);
        showToast(`Erro ao excluir usuário: ${error.message}`, "error");
    }
}

async function toggleUserStatus(userId) {
    try {
        // Get current user status
        const { data: user, error: fetchError } = await supabase
            .from("user_profiles")
            .select("is_active")
            .eq("id", userId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Toggle status
        const newStatus = !user.is_active;
        const { error } = await supabase
            .from("user_profiles")
            .update({ 
                is_active: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", userId);
        
        if (error) throw error;
        
        showToast(`Usuário ${newStatus ? "ativado" : "desativado"} com sucesso!`, "success");
        loadPage("users");
        
    } catch (error) {
        console.error("Error toggling user status:", error);
        showToast(`Erro ao alterar status do usuário: ${error.message}`, "error");
    }
}

async function syncPhoneNumbers() {
    try {
        // Show loading state
        const syncBtn = document.getElementById("syncPhoneBtn");
        const originalText = syncBtn.innerHTML;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
        syncBtn.disabled = true;
        
        // Call the sync endpoint
        const response = await fetch('/api/users/sync-phone-numbers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to sync phone numbers');
        }
        
        // Show success message
        let message = result.message;
        if (result.errors && result.errors.length > 0) {
            message += ` (${result.errors.length} erros encontrados)`;
            console.warn('Sync errors:', result.errors);
        }
        
        showToast(message, "success");
        
        // Reload the users page to show updated data
        loadPage("users");
        
    } catch (error) {
        console.error("Error syncing phone numbers:", error);
        showToast(`Erro ao sincronizar telefones: ${error.message}`, "error");
    } finally {
        // Reset button state
        const syncBtn = document.getElementById("syncPhoneBtn");
        if (syncBtn) {
            syncBtn.innerHTML = '<i class="fas fa-sync"></i> Sincronizar Telefones';
            syncBtn.disabled = false;
        }
    }
}

// Global discount management functions for edit quote modal
function calculateNewTotal(originalTotal) {
    const discountType = document.getElementById('discountType')?.value;
    const discountValue = parseFloat(document.getElementById('discountValue')?.value) || 0;
    const newTotalElement = document.getElementById('newTotal');
    
    if (!newTotalElement) return;
    
    let newTotal = originalTotal;
    
    if (discountType === 'percentage') {
        // Global percentage discount
        const discountAmount = (originalTotal * discountValue) / 100;
        newTotal = originalTotal - discountAmount;
    } else if (discountType === 'fixed') {
        // Fixed amount discount
        newTotal = originalTotal - discountValue;
    }
    
    // Ensure total doesn't go below zero
    newTotal = Math.max(0, newTotal);
    
    // Update display
    newTotalElement.textContent = `R$ ${newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    // Update discount amount display if percentage
    if (discountType === 'percentage') {
        const discountAmountDisplay = document.getElementById('discountAmountDisplay');
        if (discountAmountDisplay) {
            const discountAmount = (originalTotal * discountValue) / 100;
            discountAmountDisplay.textContent = `R$ ${discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }
    }
}

async function saveQuoteChanges(event, quoteId, originalTotal) {
    event.preventDefault();
    
    try {
        const status = document.getElementById('quoteStatus')?.value;
        const discountType = document.getElementById('discountType')?.value;
        const discountValue = parseFloat(document.getElementById('discountValue')?.value) || 0;
        const discountReason = document.getElementById('discountReason')?.value || '';
        
        let newTotalPrice = originalTotal;
        let discountPercentage = 0;
        let discountAmount = 0;
        
        if (discountValue > 0) {
            if (discountType === 'percentage') {
                // Global percentage discount
                discountPercentage = discountValue;
                discountAmount = (originalTotal * discountValue) / 100;
                newTotalPrice = originalTotal - discountAmount;
            } else if (discountType === 'fixed') {
                // Fixed amount discount - convert to percentage for storage
                discountAmount = discountValue;
                discountPercentage = (discountValue / originalTotal) * 100;
                newTotalPrice = originalTotal - discountValue;
            }
        }
        
        // Ensure total doesn't go below zero
        newTotalPrice = Math.max(0, newTotalPrice);
        
        // Format the final price as currency string
        const formattedFinalPrice = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(newTotalPrice);
        
        // Update the proposal
        const updateData = {
            status: status,
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            total_price: formattedFinalPrice,
            discount_reason: discountReason || `Desconto ${discountType === 'percentage' ? 'percentual' : 'fixo'} aplicado manualmente`,
            last_modified_at: new Date().toISOString(),
            last_modified_by: currentUser?.email || 'admin'
        };
        
        const { error } = await supabase
            .from('proposals')
            .update(updateData)
            .eq('id', quoteId);
            
        if (error) throw error;
        
        // Create history entry
        const historyEntry = {
            proposal_id: quoteId,
            change_type: 'quote_updated',
            old_total_price: null, // We could track the previous value if needed
            new_total_price: formattedFinalPrice,
            new_status: status,
            new_discount_percentage: discountPercentage,
            new_discount_amount: discountAmount,
            discount_type: discountType,
            discount_value: discountValue,
            discount_reason: discountReason,
            changed_by: currentUser?.email || 'admin',
            change_description: `Orçamento atualizado: ${discountType === 'percentage' ? discountValue + '%' : 'R$ ' + discountValue} desconto aplicado`,
            created_at: new Date().toISOString()
        };
        
        const { error: historyError } = await supabase
            .from('quote_history')
            .insert([historyEntry]);
            
        if (historyError) {
            console.warn('Failed to create history entry:', historyError);
        }
        
        showToast('Orçamento atualizado com sucesso!', 'success');
        closeModal('quoteEditModal');
        
        // Reload the current page to show updated data
        loadPage(currentPage);
        
    } catch (error) {
        console.error('Error saving quote changes:', error);
        showToast('Erro ao salvar alterações: ' + error.message, 'error');
    }
}

