// Supabase Configuration
const SUPABASE_URL = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaGp2cHN4a2ZqY3hpdHBuaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1ODk4NzksImV4cCI6MjA1NTE2NTg3OX0.kAcBsHJnlr56fJ6qvXSLOWRiLTnQR7ilXUi_2Qzj4RE';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authorized users
const AUTHORIZED_USERS = [
    'carlos.murta@onprojecoes.com.br',
    'nelsonhdvideo@gmail.com'
];

const MASTER_ADMIN = 'nelsonhdvideo@gmail.com';

// Current user state
let currentUser = null;
let currentUserIP = null;
let currentUserLocation = null;

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Get user IP address and location
async function getUserIPInfo() {
    try {
        // Get IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        currentUserIP = ipData.ip;

        // Get location info from IP
        const locationResponse = await fetch(`https://ipapi.co/${currentUserIP}/json/`);
        const locationData = await locationResponse.json();

        currentUserLocation = `${locationData.city || 'Unknown'}, ${locationData.region || ''}, ${locationData.country_name || 'Unknown'}`;

        return { ip: currentUserIP, location: currentUserLocation };
    } catch (error) {
        console.error('Error getting IP info:', error);
        currentUserIP = 'Unknown';
        currentUserLocation = 'Unknown';
        return { ip: 'Unknown', location: 'Unknown' };
    }
}

// Check if user is authorized
function isAuthorizedUser(email) {
    return AUTHORIZED_USERS.includes(email);
}

// Check if user is master admin
function isMasterAdmin(email) {
    return email === MASTER_ADMIN;
}

// Update UI based on authentication state
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const userRole = document.getElementById('user-role');
    const actionButtons = document.getElementById('action-buttons');
    const unauthorizedMessage = document.getElementById('unauthorized-message');

    if (currentUser && isAuthorizedUser(currentUser.email)) {
        // User is authenticated and authorized
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userEmail.textContent = currentUser.email;
        userRole.textContent = isMasterAdmin(currentUser.email) ? 'Master Admin' : 'Editor';
        actionButtons.classList.remove('hidden');
        unauthorizedMessage.classList.add('hidden');

        // Enable editing
        enableEditing();
    } else if (currentUser) {
        // User is authenticated but not authorized
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userEmail.textContent = currentUser.email;
        userRole.textContent = 'Sem permissão';
        actionButtons.classList.add('hidden');
        unauthorizedMessage.classList.remove('hidden');

        // Disable editing
        disableEditing();
    } else {
        // User is not authenticated
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        actionButtons.classList.add('hidden');
        unauthorizedMessage.classList.add('hidden');

        // Disable editing
        disableEditing();
    }
}

// Enable editing for authorized users
function enableEditing() {
    // Price inputs
    document.querySelectorAll('.price-input').forEach(input => {
        input.disabled = false;
        input.classList.remove('opacity-50', 'cursor-not-allowed');
    });

    // Product name editing
    document.querySelectorAll('.product-name').forEach(span => {
        span.style.pointerEvents = 'auto';
        span.classList.remove('opacity-50');
    });
}

// Disable editing for unauthorized users
function disableEditing() {
    // Price inputs
    document.querySelectorAll('.price-input').forEach(input => {
        input.disabled = true;
        input.classList.add('opacity-50', 'cursor-not-allowed');
    });

    // Product name editing
    document.querySelectorAll('.product-name').forEach(span => {
        span.style.pointerEvents = 'none';
        span.classList.add('opacity-50');
    });
}

// Brazilian currency parser
function parseBrazilianCurrency(value) {
    // Remove R$, spaces, dots (thousands separator)
    // Replace comma with dot (decimal separator)
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

// Brazilian currency formatter
function formatBrazilianCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card bg-gray-800 rounded p-2 hover:bg-gray-750 transition-colors';
    card.dataset.productId = product.id;

    // Format price
    const formattedPrice = formatBrazilianCurrency(product.daily_rental_price || 0);

    card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
            <span class="product-name text-sm truncate flex-shrink cursor-pointer hover:text-blue-400" title="Duplo clique para editar: ${product.product_name}">${product.product_name}</span>
            <div class="flex items-center gap-1 flex-shrink-0">
                <button class="audit-btn text-gray-500 hover:text-blue-400 text-xs" title="Ver histórico de edições" data-product-id="${product.id}">
                    📋
                </button>
                <span class="text-gray-400 text-xs">R$</span>
                <input
                    type="text"
                    class="price-input bg-gray-700 border border-gray-600 rounded px-2 py-1 w-20 text-right text-xs focus:outline-none focus:border-blue-500"
                    placeholder="0,00"
                    value="${formattedPrice}"
                    data-product-id="${product.id}"
                >
                <span class="save-indicator w-4 h-4 flex items-center justify-center">
                    <!-- Status icon will appear here -->
                </span>
            </div>
        </div>
    `;

    // Add price input event listener
    const priceInput = card.querySelector('.price-input');
    priceInput.addEventListener('input', (e) => {
        handlePriceChange(product.id, e.target.value);
    });

    // Format input on blur
    priceInput.addEventListener('blur', (e) => {
        const numericValue = parseBrazilianCurrency(e.target.value);
        e.target.value = formatBrazilianCurrency(numericValue);
    });

    // Add double-click event listener for product name editing
    const productNameSpan = card.querySelector('.product-name');
    productNameSpan.addEventListener('dblclick', (e) => {
        handleProductNameEdit(product.id, e.target, product.product_name);
    });

    // Add audit history button event listener
    const auditBtn = card.querySelector('.audit-btn');
    auditBtn.addEventListener('click', () => {
        showAuditHistory(product.id, product.product_name);
    });

    return card;
}

// Auto-save handler with debounce
const handlePriceChange = debounce(async (productId, priceValue) => {
    // Check if user is authorized
    if (!currentUser || !isAuthorizedUser(currentUser.email)) {
        alert('Você não tem permissão para editar preços. Faça login com uma conta autorizada.');
        return;
    }

    const card = document.querySelector(`[data-product-id="${productId}"]`).closest('.product-card');
    const indicator = card.querySelector('.save-indicator');

    // Show saving spinner
    indicator.innerHTML = `
        <svg class="animate-spin h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    // Parse Brazilian Real format to number
    const numericPrice = parseBrazilianCurrency(priceValue);

    try {
        // Get old value first for audit log
        const { data: oldData } = await supabaseClient
            .from('preco_atacado_produtos_on')
            .select('daily_rental_price, product_name')
            .eq('id', productId)
            .single();

        // Update the price with audit info
        const { error } = await supabaseClient
            .from('preco_atacado_produtos_on')
            .update({
                daily_rental_price: numericPrice,
                updated_by_email: currentUser.email,
                updated_by_ip: currentUserIP,
                updated_by_location: currentUserLocation
            })
            .eq('id', productId);

        if (error) throw error;

        // Log to audit table
        await supabaseClient
            .from('preco_atacado_audit_log')
            .insert({
                product_id: productId,
                product_name: oldData.product_name,
                field_changed: 'daily_rental_price',
                old_value: oldData.daily_rental_price?.toString() || '0',
                new_value: numericPrice.toString(),
                changed_by_email: currentUser.email,
                changed_by_ip: currentUserIP,
                changed_by_location: currentUserLocation
            });

        // Show success checkmark
        indicator.innerHTML = '<span class="text-green-500 text-xs">✓</span>';

        // Hide checkmark after 2 seconds
        setTimeout(() => {
            indicator.innerHTML = '';
        }, 2000);
    } catch (error) {
        console.error('Save error:', error);
        indicator.innerHTML = '<span class="text-red-500 text-xs">!</span>';

        // Keep error indicator visible longer
        setTimeout(() => {
            indicator.innerHTML = '';
        }, 4000);
    }
}, 500);

// Handle product name editing
function handleProductNameEdit(productId, spanElement, currentName) {
    // Check if user is authorized
    if (!currentUser || !isAuthorizedUser(currentUser.email)) {
        alert('Você não tem permissão para editar nomes. Faça login com uma conta autorizada.');
        return;
    }

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm w-full focus:outline-none';

    // Replace span with input
    const parent = spanElement.parentElement;
    parent.replaceChild(input, spanElement);
    input.focus();
    input.select();

    // Save function
    const saveName = async () => {
        const newName = input.value.trim();

        if (!newName || newName === currentName) {
            // Restore original span if no change
            parent.replaceChild(spanElement, input);
            return;
        }

        try {
            // Update the product name with audit info
            const { error } = await supabaseClient
                .from('preco_atacado_produtos_on')
                .update({
                    product_name: newName,
                    updated_by_email: currentUser.email,
                    updated_by_ip: currentUserIP,
                    updated_by_location: currentUserLocation
                })
                .eq('id', productId);

            if (error) throw error;

            // Log to audit table
            await supabaseClient
                .from('preco_atacado_audit_log')
                .insert({
                    product_id: productId,
                    product_name: currentName,
                    field_changed: 'product_name',
                    old_value: currentName,
                    new_value: newName,
                    changed_by_email: currentUser.email,
                    changed_by_ip: currentUserIP,
                    changed_by_location: currentUserLocation
                });

            // Update span with new name
            spanElement.textContent = newName;
            spanElement.title = 'Duplo clique para editar: ' + newName;
            parent.replaceChild(spanElement, input);
        } catch (error) {
            console.error('Error updating product name:', error);
            alert('Erro ao atualizar nome: ' + error.message);
            parent.replaceChild(spanElement, input);
        }
    };

    // Save on blur
    input.addEventListener('blur', saveName);

    // Save on Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveName();
        } else if (e.key === 'Escape') {
            parent.replaceChild(spanElement, input);
        }
    });
}

// Render products by category
function renderProducts(products) {
    const productsContainer = document.getElementById('products-container');

    // Clear existing content
    productsContainer.innerHTML = '';

    // Group products by category
    const categoryMap = {};
    products.forEach(product => {
        if (!categoryMap[product.category]) {
            categoryMap[product.category] = [];
        }
        categoryMap[product.category].push(product);
    });

    // Create sections for each category
    Object.keys(categoryMap).sort().forEach(categoryName => {
        const section = document.createElement('section');
        section.className = 'flex flex-col';
        section.id = `${categoryName.toLowerCase().replace(/\s+/g, '-')}-section`;

        const header = document.createElement('h2');
        header.className = 'text-lg font-semibold mb-3 border-b border-gray-700 pb-2 sticky top-0 bg-gray-900 z-10';
        header.textContent = categoryName;

        const productsDiv = document.createElement('div');
        productsDiv.className = 'flex flex-col gap-1.5';
        productsDiv.id = `${categoryName.toLowerCase().replace(/\s+/g, '-')}-products`;

        // Add products to this category
        categoryMap[categoryName].forEach(product => {
            productsDiv.appendChild(createProductCard(product));
        });

        section.appendChild(header);
        section.appendChild(productsDiv);
        productsContainer.appendChild(section);
    });

    // Update auth UI to enable/disable editing
    updateAuthUI();
}

// Load products from database
async function loadProducts() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const productsContainer = document.getElementById('products-container');

    try {
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        productsContainer.classList.add('hidden');

        const { data, error } = await supabaseClient
            .from('preco_atacado_produtos_on')
            .select('*')
            .order('category', { ascending: true })
            .order('product_name', { ascending: true });

        if (error) throw error;

        renderProducts(data);

        loadingIndicator.classList.add('hidden');
        productsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading products:', error);
        loadingIndicator.classList.add('hidden');
        errorMessage.classList.remove('hidden');
        document.getElementById('error-text').textContent = error.message;
    }
}

// Show add product modal
function showAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    const form = document.getElementById('add-product-form');
    const errorDiv = document.getElementById('add-product-error');

    form.reset();
    errorDiv.classList.add('hidden');
    modal.classList.remove('hidden');
}

// Hide add product modal
function hideAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    modal.classList.add('hidden');
}

// Add new product
async function addNewProduct(productName, category, price = 0) {
    const errorDiv = document.getElementById('add-product-error');

    try {
        const { data, error } = await supabaseClient
            .from('preco_atacado_produtos_on')
            .insert([{
                product_name: productName,
                category: category,
                daily_rental_price: price
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error('Produto já existe!');
            }
            throw error;
        }

        // Reload products to show the new one
        await loadProducts();
        hideAddProductModal();

        return data;
    } catch (error) {
        console.error('Error adding product:', error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        throw error;
    }
}

// Get all unique categories
async function getAllCategories() {
    try {
        const { data, error } = await supabaseClient
            .from('preco_atacado_produtos_on')
            .select('category');

        if (error) throw error;

        // Get unique categories
        const categories = [...new Set(data.map(item => item.category))].sort();
        return categories;
    } catch (error) {
        console.error('Error getting categories:', error);
        return ['LED', 'Processamento', 'Projetores']; // Fallback
    }
}

// Update category dropdown
async function updateCategoryDropdown() {
    const categories = await getAllCategories();
    const categorySelect = document.getElementById('product-category');

    // Clear existing options except the first one
    categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';

    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    // Add "Other" option to allow custom category
    const otherOption = document.createElement('option');
    otherOption.value = '__other__';
    otherOption.textContent = '+ Nova Categoria...';
    categorySelect.appendChild(otherOption);
}

// Show add category modal
function showAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    const form = document.getElementById('add-category-form');
    const errorDiv = document.getElementById('add-category-error');

    form.reset();
    errorDiv.classList.add('hidden');
    modal.classList.remove('hidden');
}

// Hide add category modal
function hideAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    modal.classList.add('hidden');
}

// Show audit history for a product
async function showAuditHistory(productId, productName) {
    const modal = document.getElementById('audit-modal');
    const productNameEl = document.getElementById('audit-product-name');
    const loadingEl = document.getElementById('audit-loading');
    const contentEl = document.getElementById('audit-content');
    const listEl = document.getElementById('audit-list');
    const emptyEl = document.getElementById('audit-empty');

    // Show modal and loading state
    modal.classList.remove('hidden');
    productNameEl.textContent = `Produto: ${productName}`;
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');

    try {
        // Fetch audit logs for this product
        const { data, error } = await supabaseClient
            .from('preco_atacado_audit_log')
            .select('*')
            .eq('product_id', productId)
            .order('changed_at', { ascending: false });

        if (error) throw error;

        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');

        if (data.length === 0) {
            emptyEl.classList.remove('hidden');
            listEl.innerHTML = '';
        } else {
            emptyEl.classList.add('hidden');
            listEl.innerHTML = '';

            data.forEach(log => {
                const logItem = document.createElement('div');
                logItem.className = 'bg-gray-700 rounded p-3 border-l-4 border-blue-500';

                const date = new Date(log.changed_at).toLocaleString('pt-BR');
                const fieldName = log.field_changed === 'daily_rental_price' ? 'Preço' : 'Nome';

                logItem.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <span class="font-medium text-blue-400">${fieldName} alterado</span>
                        <span class="text-xs text-gray-400">${date}</span>
                    </div>
                    <div class="text-sm space-y-1">
                        <p><span class="text-gray-400">De:</span> <span class="text-red-300">${log.old_value}</span></p>
                        <p><span class="text-gray-400">Para:</span> <span class="text-green-300">${log.new_value}</span></p>
                        <p class="mt-2 text-xs">
                            <span class="text-gray-400">Por:</span> <span class="text-blue-300">${log.changed_by_email}</span>
                        </p>
                        <p class="text-xs">
                            <span class="text-gray-400">IP:</span> ${log.changed_by_ip || 'N/A'}
                            ${log.changed_by_location ? `<span class="text-gray-400 ml-2">Local:</span> ${log.changed_by_location}` : ''}
                        </p>
                    </div>
                `;

                listEl.appendChild(logItem);
            });
        }
    } catch (error) {
        console.error('Error loading audit history:', error);
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
        listEl.innerHTML = `<p class="text-red-400 text-center py-8">Erro ao carregar histórico: ${error.message}</p>`;
    }
}

function hideAuditModal() {
    const modal = document.getElementById('audit-modal');
    modal.classList.add('hidden');
}

// Add new category
async function addNewCategory(categoryName) {
    const errorDiv = document.getElementById('add-category-error');

    try {
        // Check if category already exists
        const categories = await getAllCategories();
        if (categories.includes(categoryName)) {
            throw new Error('Categoria já existe!');
        }

        // Add category to the dropdown
        const categorySelect = document.getElementById('product-category');

        // Remove the "other" option temporarily
        const otherOption = categorySelect.querySelector('option[value="__other__"]');
        if (otherOption) {
            otherOption.remove();
        }

        // Add the new category
        const newOption = document.createElement('option');
        newOption.value = categoryName;
        newOption.textContent = categoryName;
        categorySelect.appendChild(newOption);

        // Add back the "other" option
        const newOtherOption = document.createElement('option');
        newOtherOption.value = '__other__';
        newOtherOption.textContent = '+ Nova Categoria...';
        categorySelect.appendChild(newOtherOption);

        // Select the new category
        categorySelect.value = categoryName;

        hideAddCategoryModal();

        // Show the add product modal
        showAddProductModal();
    } catch (error) {
        console.error('Error adding category:', error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        throw error;
    }
}

// Authentication functions
async function handleLogin(email, password) {
    const loginError = document.getElementById('login-error');
    loginError.classList.add('hidden');

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        currentUser = data.user;

        // Get IP info
        await getUserIPInfo();

        hideLoginModal();
        updateAuthUI();

        // Reload products to apply permissions
        await loadProducts();
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = error.message;
        loginError.classList.remove('hidden');
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentUserIP = null;
        currentUserLocation = null;
        updateAuthUI();

        // Reload products to apply permissions
        await loadProducts();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Erro ao fazer logout: ' + error.message);
    }
}

function showLoginModal() {
    const modal = document.getElementById('login-modal');
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');

    form.reset();
    errorDiv.classList.add('hidden');
    modal.classList.remove('hidden');
}

function hideLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.add('hidden');
}

async function checkAuthState() {
    // Check for existing session
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        currentUser = session.user;
        await getUserIPInfo();
        updateAuthUI();
    } else {
        currentUser = null;
        updateAuthUI();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth state first
    await checkAuthState();

    // Get IP info (even for anonymous users for display purposes)
    if (!currentUserIP) {
        await getUserIPInfo();
    }

    // Load products on page load
    loadProducts();

    // Update category dropdown
    updateCategoryDropdown();

    // Login button
    document.getElementById('login-btn').addEventListener('click', showLoginModal);

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Cancel login button
    document.getElementById('cancel-login-btn').addEventListener('click', hideLoginModal);

    // Login form submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        await handleLogin(email, password);
    });

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            await getUserIPInfo();
            updateAuthUI();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentUserIP = null;
            currentUserLocation = null;
            updateAuthUI();
        }
    });

    // Add product button
    document.getElementById('add-product-btn').addEventListener('click', showAddProductModal);

    // Cancel button
    document.getElementById('cancel-add-btn').addEventListener('click', hideAddProductModal);

    // Handle category select change
    document.getElementById('product-category').addEventListener('change', (e) => {
        if (e.target.value === '__other__') {
            hideAddProductModal();
            showAddCategoryModal();
        }
    });

    // Close modal on backdrop click
    document.getElementById('add-product-modal').addEventListener('click', (e) => {
        if (e.target.id === 'add-product-modal') {
            hideAddProductModal();
        }
    });

    // Add product form submission
    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const productName = document.getElementById('product-name').value.trim();
        const category = document.getElementById('product-category').value;
        const priceValue = document.getElementById('product-price').value.trim();
        const price = priceValue ? parseBrazilianCurrency(priceValue) : 0;

        if (!productName || !category) {
            return;
        }

        try {
            await addNewProduct(productName, category, price);
        } catch (error) {
            // Error is already handled in addNewProduct
        }
    });

    // Add category button
    document.getElementById('add-category-btn').addEventListener('click', showAddCategoryModal);

    // Cancel category button
    document.getElementById('cancel-category-btn').addEventListener('click', hideAddCategoryModal);

    // Audit modal close button
    document.getElementById('close-audit-btn').addEventListener('click', hideAuditModal);

    // Close audit modal on backdrop click
    document.getElementById('audit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'audit-modal') {
            hideAuditModal();
        }
    });

    // Close category modal on backdrop click
    document.getElementById('add-category-modal').addEventListener('click', (e) => {
        if (e.target.id === 'add-category-modal') {
            hideAddCategoryModal();
        }
    });

    // Add category form submission
    document.getElementById('add-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const categoryName = document.getElementById('category-name').value.trim();

        if (!categoryName) {
            return;
        }

        try {
            await addNewCategory(categoryName);
        } catch (error) {
            // Error is already handled in addNewCategory
        }
    });

    // Close modals with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAddProductModal();
            hideAddCategoryModal();
            hideLoginModal();
            hideAuditModal();
        }
    });
});
