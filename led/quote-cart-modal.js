// led/quote-cart-modal.js

// Helper function for Brazilian currency formatting
function formatCurrency(value) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    // Use 'pt-BR' locale for correct decimal/thousands separators
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to parse Brazilian currency string back to number
function parseCurrency(value) {
    if (typeof value !== 'string') return 0;
    // Remove 'R$', whitespace, thousands separator (.), replace comma with dot for decimal
    const cleanedValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? 0 : number;
}

// Helper function to safely get text content from an element by ID
function getTextContentById(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.textContent?.trim() : null;
}

// Import formatCurrency if not already available globally
// import { formatCurrency } from './utils.js';

// --- Helper Functions ---
function getValueOrTextById(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID '${id}' not found.`);
        return ''; // Return empty string if element not found
    }
    // Prefer input/textarea value, fallback to textContent
    const value = (element.value !== undefined ? element.value : element.textContent) || '';
    return value.trim();
}

function getNumberById(id) {
    const value = getValueOrTextById(id);
    // Improved cleaning: handle potential currency symbols, thousands separators (.), and use comma as decimal
    const cleanedValue = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedValue);
    if (isNaN(number)) {
        console.warn(`Could not parse number from element '${id}', value: '${value}'`);
        return 0;
    }
    return number;
}

function getIntegerById(id) {
     const value = getValueOrTextById(id);
     const integer = parseInt(value.replace(/\D/g, ''), 10); // Remove all non-digits
     if (isNaN(integer)) {
        console.warn(`Could not parse integer from element '${id}', value: '${value}'`);
        return 0;
     }
     return integer;
}

// Placeholder for Supabase client initialization if needed directly,
// otherwise rely on quote-service.js or similar
// import { supabase } from './supabaseClient'; // Example import

class QuoteCartModal {
    constructor() {
        console.log('[QuoteCartModal] Constructor started.'); // Log constructor start
        this.modalElement = document.getElementById('quote-cart-modal');
        this.cartItemsContainer = document.getElementById('cart-items-container');
        this.totalPriceElement = document.getElementById('cart-total-price');
        this.closeButton = document.getElementById('quote-cart-close-btn');
        this.submitButton = document.getElementById('quote-cart-submit-btn');
        // Date Inputs within the modal
        this.startDateInput = document.getElementById('cart-shooting-dates-start');
        this.endDateInput = document.getElementById('cart-shooting-dates-end');

        // New: Properties to store selected dates
        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.productPrices = {}; // Initialize product prices store
        this.currentUserEmail = null; // Initialize user email property

        if (!this.modalElement) {
            console.error('[QuoteCartModal] Constructor: Modal element #quote-cart-modal not found!'); // Log if modal element missing
        } else {
            console.log('[QuoteCartModal] Constructor: Modal element found:', this.modalElement); // Log if modal element found
        }

        this.cartItems = []; // Array to hold selected items { id, name, quantity, price, details... }

        this.bindEvents();
        this.initFlatpickr(); // Initialize date pickers
        this.fetchProductPrices(); // Fetch prices on initialization

        console.log("[QuoteCartModal] Constructor finished, events bound."); // Log constructor end

        // Remove event listeners for main page date pickers if they don't affect the modal directly
        // var startDateInput = document.getElementById('shooting-dates-start');
        // var endDateInput = document.getElementById('shooting-dates-end');
        // if (startDateInput) {
        //     startDateInput.addEventListener('change', () => this.updateCart());
        //     startDateInput.addEventListener('input', () => this.updateCart());
        // }
        // if (endDateInput) {
        //     endDateInput.addEventListener('change', () => this.updateCart());
        //     endDateInput.addEventListener('input', () => this.updateCart());
        // }

        // *** Add event listener for pod updates ***
        document.addEventListener('podPricesUpdated', (event) => {
            console.log('[QuoteCartModal] Received podPricesUpdated event. Triggering cart update.');
            // The event detail could potentially be used directly, but calling
            // updateCart() ensures the standard flow (getSelectedItems, fetchDetails, render) is used.
            this.updateCart();
        });
    }

    // New: Setter for selected dates (keep in case needed elsewhere)
    setSelectedDates(start, end) {
        this.selectedStartDate = start;
        this.selectedEndDate = end;
    }

    bindEvents() {
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.hide());
        }
        // Add event listener for submit/finalize button if needed
        if (this.submitButton) {
            this.submitButton.addEventListener('click', () => this.submitQuote());
        }

        // Listen for custom events when items are added/updated/removed from the main page
        document.addEventListener('cartUpdated', (event) => {
            console.log("Cart update event received:", event.detail);
            this.updateCart(event.detail.items); // Assuming event detail contains the full list of items
        });
    }

    async updateCart() {
        console.log('[updateCart] Starting update...');
        // Always fetch product prices before updating the cart
        await this.fetchProductPrices();
        // Get items from the single pod
        this.cartItems = await this.getSelectedItemsFromPods();
        console.log('[updateCart] Items retrieved:', this.cartItems);
    
        // Fetch details if necessary (or skip if not needed)
        await this.fetchItemDetailsAndPrices();
        console.log('[updateCart] Fetching complete (or skipped). Cart items after fetch:', this.cartItems);
    
        // Now render the cart with the potentially updated items
        this.renderCart();
        console.log('[updateCart] Cart rendering triggered.');
    }

    async getSelectedItemsFromPods() {
        console.log("[getSelectedItemsFromPods] Starting - Single Pod Logic");
        const items = [];
        const pricingPod = document.getElementById('sidebar-pricing'); // Corrected ID to match the actual pricing pod

        if (pricingPod) {
            console.log("[getSelectedItemsFromPods] Found pricing pod #sidebar-pricing");
            try {
                const podItemsData = pricingPod.dataset.items;
                if (podItemsData) {
                    const parsedItems = JSON.parse(podItemsData);
                    console.log("[getSelectedItemsFromPods] Parsed items from data-items:", parsedItems);

                    // Add parsed items directly (they should already have id, name, quantity, price)
                    parsedItems.forEach(item => {
                        if (item && typeof item.price === 'number' && item.price >= 0 && typeof item.quantity === 'number' && item.quantity >= 0) {
                            // Push valid items (price >= 0, quantity >= 0)
                            // The cart logic might handle quantity 0 items, but let's ensure price/quantity are numbers
                            items.push({
                                id: item.id || `item_${Date.now()}_${Math.random().toString(16).slice(2)}`, // Use provided ID or generate fallback
                                name: item.name || 'Unnamed Item',
                                quantity: item.quantity,
                                price: item.price // This is unit price for RXII, total for others as set by pricing-pods.js
                            });
                        } else {
                            console.warn("[getSelectedItemsFromPods] Skipping invalid item:", item);
                        }
                    });
                } else {
                    console.log("[getSelectedItemsFromPods] data-items attribute is empty or missing on #sidebar-pricing.");
                }
            } catch (e) {
                console.error("[getSelectedItemsFromPods] Error parsing data-items from #sidebar-pricing:", e);
                console.error("[getSelectedItemsFromPods] Raw data-items:", pricingPod.dataset.items);
            }
        } else {
            console.log("[getSelectedItemsFromPods] Pricing pod #sidebar-pricing not found.");
        }

        // --- Add LED Configuration Info (Keep this part) ---
        const ledWidth = document.getElementById('width')?.value;
        const ledHeight = document.getElementById('height')?.value;
        const ledCurve = document.getElementById('curvature')?.value;
        if (ledWidth && ledHeight) {
            items.push({
                id: 'led_config_principal', // Unique ID for non-priced info
                name: `Config: LED Principal ${ledWidth}x${ledHeight}m, Curva ${ledCurve}°`,
                quantity: 0, // Indicate it's not a priced item for calculation
                price: 0
            });
        }
        const roofWidth = document.getElementById('roof-width')?.value;
        const roofHeight = document.getElementById('roof-height')?.value;
        if (roofWidth && roofHeight && roofWidth > 0 && roofHeight > 0) {
            items.push({
                id: 'led_config_teto', // Unique ID
                name: `Config: LED Teto ${roofWidth}x${roofHeight}m`,
                quantity: 0,
                price: 0
            });
        }

        console.log("[getSelectedItemsFromPods] Final items prepared for cart rendering:", items);

        // Note: Estúdio is already added by pricing-pods.js in the data-items attribute
        // No need to add it here again to avoid duplication

        // This function now returns the items directly.
        // The updateCart function will call this and then fetch details/render.
        return items;
    }

    async fetchItemDetailsAndPrices() {
        console.log('[fetchItemDetailsAndPrices] Starting. Current cart items:', this.cartItems);
        // If items already have prices (from data-items), we might not need to fetch again unless
        // we need more details like images or descriptions not stored in data-items.
        // For now, assume the price from data-items is sufficient.
        // If fetching IS required, ensure it handles items passed from data-items correctly.

        const itemsToFetchDetailsFor = this.cartItems.filter(item => !item.detailsFetched); // Example filter

        if (itemsToFetchDetailsFor.length === 0) {
            console.log('[fetchItemDetailsAndPrices] No new item details needed.');
            // Removed direct call to renderCart() here; updateCart should call it after fetching.
            return; // Indicate fetching is done (or wasn't needed)
        }

        console.log('[fetchItemDetailsAndPrices] Items needing details:', itemsToFetchDetailsFor);

        // Placeholder for actual fetch logic if needed in the future
        // try {
        //    const response = await fetch('/api/item-details', {
        //        method: 'POST',
        //        headers: { 'Content-Type': 'application/json' },
        //        body: JSON.stringify({ itemIds: itemsToFetchDetailsFor.map(item => item.id) })
        //    });
        //    const details = await response.json();
        //    this.cartItems = this.cartItems.map(item => {
        //        const detail = details.find(d => d.id === item.id);
        //        return detail ? { ...item, ...detail, detailsFetched: true } : item;
        //    });
        //    console.log('[fetchItemDetailsAndPrices] Item details fetched and merged.');
        // } catch (error) {
        //     console.error('[fetchItemDetailsAndPrices] Error fetching item details:', error);
        // }

        // Mark as fetched to avoid refetching (even if fetch failed or wasn't needed)
        this.cartItems = this.cartItems.map(item => ({ ...item, detailsFetched: true }));

        // Removed direct call to renderCart() here; updateCart should call it after fetching.
        console.log('[fetchItemDetailsAndPrices] Fetching process complete (or skipped).');
    }

    async fetchProductPrices() {
        console.log('[QuoteCartModal] Fetching product prices...');
        const pricesResult = await window.quoteService.getProductPrices();
        if (pricesResult.success) {
            this.productPrices = pricesResult.data;
            console.log('[QuoteCartModal] Product prices fetched successfully:', this.productPrices);
        } else {
            console.error('[QuoteCartModal] Failed to fetch product prices:', pricesResult.error);
            this.productPrices = {}; // Ensure it's an empty object on failure
        }
        // Optionally trigger a re-render if prices are fetched after initial load
        // this.renderCart();
    }

    renderCart() {
        console.log('[renderCart] Starting render. Full cartItems array:', JSON.stringify(this.cartItems, null, 2));
        console.log('[renderCart] Product prices available:', JSON.stringify(this.productPrices, null, 2));

        if (!this.cartItemsContainer || !this.totalPriceElement) {
            console.error("[renderCart] Cart items container or total price element not found!");
            return;
        }
        this.cartItemsContainer.innerHTML = ''; // Clear previous items
        let dailyTotalPrice = 0;
        let studioDailyTotal = 0;
        let numberOfDays = 1; // Default

        // --- Date Range Calculation ---
        // Use selectedStartDate and selectedEndDate if set
        let debugStart = '', debugEnd = '';
        let startDate = null, endDate = null;

        if (this.selectedStartDate && this.selectedEndDate) {
            debugStart = this.selectedStartDate; // Use instance properties
            debugEnd = this.selectedEndDate; // Use instance properties
            // Parse as DD/MM/YYYY
            const parseDate = (str) => {
                if (!str) return null;
                const parts = str.split('/');
                if (parts.length !== 3) return null;
                const [day, month, year] = parts.map(Number);
                // Validate parts
                if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
                return new Date(year, month - 1, day);
            };
            startDate = parseDate(this.selectedStartDate);
            endDate = parseDate(this.selectedEndDate);

            if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate >= startDate) {
                const utcStart = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const utcEnd = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                const timeDiff = utcEnd - utcStart;
                numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
            } else {
                console.warn("[renderCart] Invalid date range found. Defaulting to 1 day.", { start: this.selectedStartDate, end: this.selectedEndDate, parsedStart: startDate, parsedEnd: endDate });
                numberOfDays = 1;
            }
        } else {
            debugStart = this.selectedStartDate || '(not set)';
            debugEnd = this.selectedEndDate || '(not set)';
            numberOfDays = 1; // Default if dates aren't fully selected
        }
        console.log(`[renderCart] Date Range: Start=${debugStart}, End=${debugEnd}, Calculated Days=${numberOfDays}`);
        console.log(`[renderCart] DiscountCalculator available:`, !!window.DiscountCalculator);
        console.log(`[renderCart] Daily total before discount:`, dailyTotalPrice);

        // --- Render Items ---
        const expected3DItems = [
            'Módulos LED',
            'Processadores MX-40 Pro',
            'Disguise VX4n',
            'Disguise RXII',
            'Stype Tracking'
        ];

        const headerElement = document.createElement('div');
        headerElement.classList.add('cart-item', 'cart-header');
        headerElement.innerHTML = `
            <span class="cart-item-name">Item</span>
            <span class="cart-item-qty">Qtd</span>
            <span class="cart-item-price">Preço Unit. (Diária)</span>
            <span class="cart-item-subtotal">Subtotal (Diária)</span>
        `;
        this.cartItemsContainer.appendChild(headerElement);

        // Render informational items first
        this.cartItems.filter(item => item.id === 'led_config_principal' || item.id === 'led_config_teto').forEach(item => {
            const infoElement = document.createElement('div');
            infoElement.classList.add('cart-item', 'cart-info-item');
            infoElement.innerHTML = `
                <span class="cart-item-name">${item.name || 'Configuração'}</span>
                <span class="cart-item-details" style="grid-column: span 3;">${item.details || ''}</span>
            `;
            this.cartItemsContainer.appendChild(infoElement);
        });

        // Detect current mode from the pricing pod or mode selector
        const activeButton = document.querySelector('#card-disguise-selector .selector-btn.active');
        const currentMode = activeButton?.dataset.mode || '3d';
        console.log(`[renderCart] Detected mode: ${currentMode}`);

        // Filter items based on mode - only show RXII and Tracking in 3D mode
        const itemsToRender = this.cartItems.filter(item => {
            // Always show LED modules, processors, VX4n, studio, and team
            if (item.id === 'led_modules' || item.id === 'processors' ||
                item.id === 'disguise_vx4n' || item.id === 'estudio' ||
                item.id === 'equipe_tecnica') {
                return true;
            }
            // Only show RXII and tracking in 3D mode
            if ((item.id === 'disguise_rxii' || item.id === 'stype_tracking') && currentMode === '3d') {
                return true;
            }
            // Filter out RXII and tracking in 2D mode
            if ((item.id === 'disguise_rxii' || item.id === 'stype_tracking') && currentMode === '2d') {
                return false;
            }
            // Include other items
            return true;
        });

        console.log(`[renderCart] Items to render (${itemsToRender.length}):`, itemsToRender.map(i => i.name));

        // Render items from cartItems array
        itemsToRender.forEach(item => {
            const quantity = item.quantity || 0;
            const unitPrice = item.price || 0;
            const itemSubtotal = quantity * unitPrice;

            // Skip items with 0 quantity
            if (quantity === 0) {
                console.log(`[renderCart] Skipping item with 0 quantity: ${item.name}`);
                return;
            }

            // Add to daily total
            dailyTotalPrice += itemSubtotal;

            console.log(`[renderCart Debug] Item: ${item.name} | Unit Price: ${formatCurrency(unitPrice)} | Qty: ${quantity} | Subtotal: ${formatCurrency(itemSubtotal)}`);

            // Render the item row
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = `
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-qty">${quantity}</span>
                <span class="cart-item-price">${formatCurrency(unitPrice)}</span>
                <span class="cart-item-subtotal">${formatCurrency(itemSubtotal)}</span>
            `;
            this.cartItemsContainer.appendChild(itemElement);
        });

        console.log(`[renderCart Debug] Equipment Daily Total: ${formatCurrency(dailyTotalPrice)}`);

        // Calculate combined daily total (all items already in dailyTotalPrice)
        const combinedDailyTotal = dailyTotalPrice;
        const originalTotalPrice = combinedDailyTotal * numberOfDays;

        console.log(`[renderCart Debug] Combined Daily Total: ${formatCurrency(combinedDailyTotal)}`);
        console.log(`[renderCart Debug] Number of Days: ${numberOfDays}`);
        console.log(`[renderCart Debug] Original Total Price (before discount): ${formatCurrency(originalTotalPrice)}`);

        // Apply progressive discount to the combined total
        let finalTotalPrice = originalTotalPrice;
        let discountInfo = null;

        if (window.DiscountCalculator && numberOfDays > 0 && combinedDailyTotal > 0) {
            discountInfo = window.DiscountCalculator.applyDayBasedDiscount(combinedDailyTotal, numberOfDays);
            finalTotalPrice = discountInfo.finalPrice;
            console.log('[renderCart] Progressive discount applied:', discountInfo);
            console.log(`[renderCart Debug] Discount Percentage: ${discountInfo.discountPercentage}%`);
            console.log(`[renderCart Debug] Final Price After Discount: ${formatCurrency(finalTotalPrice)}`);
        } else {
            console.warn('[renderCart] Discount calculator not available or no items, using original pricing');
        }

        // Display the total with or without discount
        if (discountInfo && discountInfo.hasDiscount) {
            this.totalPriceElement.innerHTML = `
                <div>
                    <span style="text-decoration: line-through; color: #999; font-size: 0.9em;">
                        ${formatCurrency(originalTotalPrice)}
                    </span>
                    <br>
                    <span style="color: #e74c3c; font-weight: bold;">
                        ${formatCurrency(finalTotalPrice)}
                    </span>
                    <span style="color: #27ae60; font-size: 0.9em; display: block;">
                        ${discountInfo.discountPercentage}% desconto progressivo - ${numberOfDays} dia${numberOfDays > 1 ? 's' : ''}
                    </span>
                </div>
            `;
        } else {
            this.totalPriceElement.textContent = `${formatCurrency(finalTotalPrice)} (${numberOfDays} dia${numberOfDays > 1 ? 's' : ''})`;
        }

        console.log(`[renderCart] Render complete. Original: ${formatCurrency(originalTotalPrice)}, Final: ${formatCurrency(finalTotalPrice)}`);
    }

    show() {
        console.log('[QuoteCartModal] show() method called.'); // Log show() start
        if (this.modalElement) {
            console.log('[QuoteCartModal] Modal element exists. Updating cart and showing modal...'); // Log element check success
            // Fetch current selections when showing the modal
            // This depends on how selections are managed (e.g., global state, calling a function)
            // Example: const currentSelections = getSelectedItemsFromPods();
            this.modalElement.style.display = 'block'; // Or add a 'visible' class
            console.log('[QuoteCartModal] Set modal display to block.'); // Log display change
            this.updateCart(); // Update cart content after showing modal
        } else {
            console.error("[QuoteCartModal] show(): Modal element not found!"); // Log element check failure
        }
    }

    hide() {
        if (this.modalElement) {
            this.modalElement.style.display = 'none'; // Or remove 'visible' class
            console.log("QuoteCartModal hidden");
        }
    }

    async submitQuote() {
        console.log('[QuoteCartModal] Starting submitQuote...');
        
        // Prevent multiple simultaneous submissions
        if (this.isSubmitting) {
            console.log('[QuoteCartModal] Already submitting, ignoring duplicate call');
            return;
        }
        this.isSubmitting = true;
        
        if (!this.cartItems || this.cartItems.length === 0) {
            console.warn('[QuoteCartModal] submitQuote: Cart is empty.');
            alert('Seu carrinho está vazio. Adicione itens antes de requisitar uma proposta.');
            this.isSubmitting = false;
            return;
        }

        // Disable submit button to prevent multiple submissions
        if (this.submitButton) {
            this.submitButton.disabled = true;
            this.submitButton.textContent = 'Enviando...'; // Provide feedback
        }
        
        // Generate unique submission token
        const submissionToken = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('[QuoteCartModal] Submission token:', submissionToken);

        try {
            // --- Get User Info (Handle Guest or Authenticated Users) ---
            let userId = null;
            let userEmail = '';
            let clientName = '';
            let clientCompany = '';
            let clientPhone = '';
            let isGuestUser = false;
            let guestUserCreated = false;

            if (!supabase || !supabase.auth || typeof supabase.auth.getSession !== 'function') {
                console.error('[submitQuote] Supabase auth not available');
                alert('Erro: Sistema de autenticação não disponível.');
                if (this.submitButton) {
                    this.submitButton.disabled = false;
                    this.submitButton.textContent = 'Requisitar Proposta';
                }
                return;
            }

            // Check if user is authenticated
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (session && session.user) {
                // Authenticated user - use existing session
                const user = session.user;
                userId = user.id;
                userEmail = user.email || '';
                clientName = user.user_metadata?.full_name;
                if (!clientName || clientName === 'Nome não disponível') {
                    const emailName = userEmail.split('@')[0] || '';
                    clientName = emailName
                        .replace(/[._]/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                }
                clientCompany = user.user_metadata?.company || '';
                clientPhone = user.user_metadata?.phone || '';
                console.log('[submitQuote] Using authenticated user:', userEmail);
            } else {
                // Guest user - collect email/phone info
                isGuestUser = true;
                console.log('[submitQuote] Guest user detected - collecting contact info');

                // Prompt for email and phone
                const guestEmail = prompt('Para receber sua proposta, por favor insira seu email:');
                if (!guestEmail || !guestEmail.includes('@')) {
                    alert('Email válido é necessário para receber a proposta.');
                    if (this.submitButton) {
                        this.submitButton.disabled = false;
                        this.submitButton.textContent = 'Requisitar Proposta';
                    }
                    this.isSubmitting = false;
                    return;
                }

                const guestPhone = prompt('Por favor insira seu telefone (com DDD):');
                if (!guestPhone || guestPhone.length < 10) {
                    alert('Telefone válido é necessário para contato.');
                    if (this.submitButton) {
                        this.submitButton.disabled = false;
                        this.submitButton.textContent = 'Requisitar Proposta';
                    }
                    this.isSubmitting = false;
                    return;
                }

                const guestName = prompt('Por favor insira seu nome:');
                if (!guestName || guestName.trim().length < 2) {
                    alert('Nome é necessário.');
                    if (this.submitButton) {
                        this.submitButton.disabled = false;
                        this.submitButton.textContent = 'Requisitar Proposta';
                    }
                    this.isSubmitting = false;
                    return;
                }

                userEmail = guestEmail.trim().toLowerCase();
                clientPhone = guestPhone.trim();
                clientName = guestName.trim();

                // Check if user already exists
                try {
                    const checkResponse = await fetch('/api/check-user-by-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail })
                    });

                    const checkResult = await checkResponse.json();

                    if (checkResult.exists) {
                        // User exists - use their ID
                        userId = checkResult.userId;
                        console.log('[submitQuote] Found existing user:', userId);
                    } else {
                        // Create new guest user account using public endpoint
                        console.log('[submitQuote] Creating new guest user account...');
                        const createResponse = await fetch('/api/register-guest', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: userEmail,
                                phone: clientPhone,
                                full_name: clientName,
                                sendEmail: true // Send login link
                            })
                        });

                        const createResult = await createResponse.json();

                        if (createResult.success) {
                            userId = createResult.userId;
                            guestUserCreated = true;
                            console.log('[submitQuote] Guest user created successfully:', userId);
                        } else {
                            throw new Error(createResult.error || 'Erro ao criar conta de usuário');
                        }
                    }
                } catch (error) {
                    console.error('[submitQuote] Error handling guest user:', error);
                    alert('Erro ao processar seu cadastro. Por favor, tente novamente.');
                    if (this.submitButton) {
                        this.submitButton.disabled = false;
                        this.submitButton.textContent = 'Requisitar Proposta';
                    }
                    this.isSubmitting = false;
                    return;
                }
            }

            if (!userId) {
                throw new Error('Não foi possível identificar ou criar usuário.');
            }

            // Store email for later use in confirmation modal
            this.currentUserEmail = userEmail;

            // --- Get Project Name ---
            const projectName = getValueOrTextById('cart-project-name');
            if (!projectName) {
                alert('Por favor, insira um nome para o projeto.');
                if (this.submitButton) {
                    this.submitButton.disabled = false;
                    this.submitButton.textContent = 'Requisitar Proposta';
                }
                return;
            }

            // --- Date Handling ---
            function parseDate(str) {
                if (!str || typeof str !== 'string' || !str.includes('/')) return null;
                const parts = str.split('/');
                if (parts.length !== 3) return null;
                // Format as YYYY-MM-DD for Supabase 'date' type
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            
            const shootingStartDate = parseDate(this.selectedStartDate);
            const shootingEndDate = parseDate(this.selectedEndDate);

            if (!shootingStartDate || !shootingEndDate) {
                alert('Por favor, selecione as datas de início e fim da locação.');
                if (this.submitButton) {
                    this.submitButton.disabled = false;
                    this.submitButton.textContent = 'Requisitar Proposta';
                }
                return;
            }

            const startDate = new Date(shootingStartDate);
            const endDate = new Date(shootingEndDate);
            const timeDiff = endDate.getTime() - startDate.getTime();
            const daysCount = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1); // +1 to include both start and end day

            // --- Get LED Configuration (Principal) ---
            const ledPrincipalWidth = getValueOrTextById('width-value'); // Raw value '20'
            const ledPrincipalHeight = getValueOrTextById('height-value'); // Raw value '5'
            const ledPrincipalCurvature = getNumberById('curvature-value'); // Raw number 5
            const ledPrincipalModules = getIntegerById('module-count'); // Raw number 400
            const ledPrincipalResolution = getValueOrTextById('resolution-value'); // Text '2.6mm'
            
            // Calculate pixel values
            const widthValue = getNumberById('width-value');
            const heightValue = getNumberById('height-value');
            // Each 50cm tile has 192 pixels, so multiply by 2*192 for meters
            const ledPrincipalPixelsWidth = Math.round(widthValue * 2 * 192); // width * 2 * 192 (2 tiles per meter)
            const ledPrincipalPixelsHeight = Math.round(heightValue * 2 * 192); // height * 2 * 192 (2 tiles per meter)
            const ledPrincipalTotalPixels = ledPrincipalPixelsWidth * ledPrincipalPixelsHeight;
            
            // Get formatted power/weight values
            const principalPowerMax = getValueOrTextById('power-max'); // '69000 W'
            const principalPowerAvg = getValueOrTextById('power-avg'); // '23000 W'
            const principalWeight = getValueOrTextById('total-weight'); // '3000 kg'

            // --- Get LED Configuration (Teto) ---
            const ledTetoWidth = getValueOrTextById('roof-width-value'); // Raw value '8'
            const ledTetoHeight = getValueOrTextById('roof-height-value'); // Raw value '6'
            const ledTetoModules = getIntegerById('teto-module-count'); // Raw number 192
            const ledTetoResolution = getValueOrTextById('teto-resolution-value') || ledPrincipalResolution;
            
            // Calculate teto pixel values
            const roofWidthValue = getNumberById('roof-width-value');
            const roofHeightValue = getNumberById('roof-height-value');
            // Each 50cm tile has 192 pixels, so multiply by 2*192 for meters
            const ledTetoPixelsWidth = Math.round(roofWidthValue * 2 * 192); // width * 2 * 192 (2 tiles per meter)
            const ledTetoPixelsHeight = Math.round(roofHeightValue * 2 * 192); // height * 2 * 192 (2 tiles per meter)
            const ledTetoTotalPixels = ledTetoPixelsWidth * ledTetoPixelsHeight;
            
            // Get formatted teto power/weight values
            const tetoPowerMax = getValueOrTextById('teto-power-max'); // '33120 W'
            const tetoPowerAvg = getValueOrTextById('teto-power-avg'); // '11040 W'
            const tetoWeight = getValueOrTextById('teto-total-weight'); // '1440 kg'

            // --- Build Selected Services Array FROM RENDERED CART ---
            const selectedServices = [];
            // Select only actual item rows, excluding header and info lines
            const cartItemElements = this.cartItemsContainer.querySelectorAll('.cart-item:not(.cart-header):not(.cart-info-item)');

            console.log('[submitQuote] Processing rendered cart items:', cartItemElements);

            // --- Calculate Daily Rate from Rendered Cart Items (MOVED HERE) ---
            let calculatedDailyRate = 0;

            cartItemElements.forEach(element => {
                const nameElement = element.querySelector('.cart-item-name');
                // The subtotal displayed in the cart UI is the final, correct daily price for the item/quantity
                const qtyElement = element.querySelector('.cart-item-qty'); // Get quantity element
                const unitPriceElement = element.querySelector('.cart-item-price'); // Get unit price element
                const subtotalElement = element.querySelector('.cart-item-subtotal');

                // Ensure all required elements are found
                if (nameElement && qtyElement && unitPriceElement && subtotalElement) {
                    const name = nameElement.textContent.trim();
                    const quantityString = qtyElement.textContent.trim();
                    const unitPriceString = unitPriceElement.textContent.trim();
                    const subtotalString = subtotalElement.textContent.trim(); // This IS the correct subtotal string

                    const quantity = parseInt(quantityString, 10) || 0; // Parse quantity, default to 0
                    const unitPrice = parseCurrency(unitPriceString); // Use helper to parse unit price
                    const subtotal = parseCurrency(subtotalString); // Parse subtotal (used for filtering)

                    // Add to daily rate calculation for ALL items (not just valid services)
                    if (!name.startsWith('Config:') && subtotal > 0) {
                        calculatedDailyRate += subtotal;
                    }

                    // Filter out configuration lines and items with zero subtotal or zero quantity
                    if (!name.startsWith('Config:') && subtotal > 0 && quantity > 0) { 
                        console.log(`[submitQuote] Adding service: ${name} | Qty: ${quantity} | Unit Price: ${unitPrice} | Subtotal: ${subtotal}`);
                        selectedServices.push({
                            name: name, // Keep the name as rendered (may include units)
                            quantity: quantity, // Correct parsed quantity
                            unit_price: unitPrice // Correct parsed unit price (numeric)
                        });
                    } else {
                         console.log(`[submitQuote] Skipping rendered item: ${name}`);
                    }
                } else {
                    console.warn('[submitQuote] Could not find required elements (name, qty, price, subtotal) in a rendered cart item row:', element);
                }
            });

            // Log the final services array built from the DOM
            console.log('[submitQuote] Final selected services FROM RENDERED CART:', JSON.stringify(selectedServices));

            if (selectedServices.length === 0) {
                 console.warn('[submitQuote] No valid services found in the rendered cart to save.');
                 // Consider alerting the user if appropriate, though filtering Config/zero items is expected
            }

            // --- Get Selected Pod Type ---
            const selectedPodType = document.querySelector('input[name="disguise-mode"]:checked')?.value || '2d';
            
            const dailyRate = calculatedDailyRate; // Use calculated daily rate from cart items
            const rawTotalPriceString = getValueOrTextById('cart-total-price') || '';
            const totalPriceMatch = rawTotalPriceString.match(/R\$\s?[\d.,]+/); 
            const totalPrice = totalPriceMatch ? totalPriceMatch[0] : 'R$ 0,00';
            
            console.log(`[submitQuote] Calculated daily rate from cart: ${dailyRate}`);
            
            // Calculate discount information for saving
            let discountPercentage = 0;
            let originalTotalPrice = dailyRate * daysCount;
            let discountAmount = 0;
            let finalTotalPrice = originalTotalPrice; // Default to original if no discount
            
            if (window.DiscountCalculator && daysCount > 1) {
                const discountInfo = window.DiscountCalculator.applyDayBasedDiscount(dailyRate, daysCount);
                discountPercentage = discountInfo.discountPercentage;
                discountAmount = (originalTotalPrice - discountInfo.finalPrice);
                finalTotalPrice = discountInfo.finalPrice; // Use the calculated final price
                console.log(`[submitQuote] Discount info for saving:`, {
                    days: daysCount,
                    originalTotal: originalTotalPrice,
                    discountPercentage: discountPercentage,
                    discountAmount: discountAmount,
                    finalPrice: discountInfo.finalPrice
                });
            }

            // --- Prepare Data for Supabase ---
            const proposalDataToSave = {
                user_id: userId,
                status: 'pending',
                project_name: projectName,
                client_name: clientName,
                client_company: clientCompany,
                client_email: userEmail,
                client_phone: clientPhone,
                shooting_dates_start: shootingStartDate,
                shooting_dates_end: shootingEndDate,
                days_count: daysCount,
                
                // LED Principal Configuration
                led_principal_width: ledPrincipalWidth,
                led_principal_height: ledPrincipalHeight,
                led_principal_curvature: ledPrincipalCurvature,
                led_principal_modules: ledPrincipalModules,
                led_principal_resolution: ledPrincipalResolution,
                led_principal_pixels_width: ledPrincipalPixelsWidth,
                led_principal_pixels_height: ledPrincipalPixelsHeight,
                led_principal_total_pixels: ledPrincipalTotalPixels,
                
                // LED Teto Configuration
                led_teto_width: ledTetoWidth,
                led_teto_height: ledTetoHeight,
                led_teto_modules: ledTetoModules,
                led_teto_resolution: ledTetoResolution,
                led_teto_pixels_width: ledTetoPixelsWidth,
                led_teto_pixels_height: ledTetoPixelsHeight,
                led_teto_total_pixels: ledTetoTotalPixels,
                
                // Power and Weight data
                principal_power_max: principalPowerMax,
                principal_power_avg: principalPowerAvg,
                principal_weight: principalWeight,
                teto_power_max: tetoPowerMax,
                teto_power_avg: tetoPowerAvg,
                teto_weight: tetoWeight,
                
                // Service and Pricing data
                selected_pod_type: selectedPodType,
                selected_services: selectedServices, // Use the array built from the rendered cart
                daily_rate: dailyRate,
                total_price: formatCurrency(finalTotalPrice), // Save the calculated final price as formatted currency
                
                // Discount information
                discount_percentage: discountPercentage,
                discount_amount: discountAmount,
                original_total_price: originalTotalPrice
            };

            console.log('[QuoteCartModal] Data prepared for saving:', proposalDataToSave);

            // --- Save Data to Supabase ---
            const { data: savedProposal, error: saveError } = await supabase
                .from('proposals')
                .insert([proposalDataToSave])
                .select() // Important: Select the inserted data to get the ID
                .single(); // Expecting a single record back

            if (saveError) {
                console.error('[QuoteCartModal] Error saving quote:', saveError);
                throw new Error(`Erro ao salvar proposta: ${saveError.message}`);
            }

            if (!savedProposal || !savedProposal.id) {
                console.error('[QuoteCartModal] Error: Saved proposal data or ID is missing.', savedProposal);
                throw new Error('Erro ao salvar proposta: ID da proposta não retornado.');
            }
            
            const proposalId = savedProposal.id;
            console.log(`[QuoteCartModal] Quote saved successfully with ID: ${proposalId}`);

            // --- Invoke Edge Function to Generate and Email PDF ---
            console.log(`[QuoteCartModal] Invoking Edge Function for proposalId: ${proposalId}...`);
            try {
                const { data: functionData, error: functionError } = await supabase.functions.invoke(
                    'generate-and-email-proposal-pdf', 
                    {
                        body: { proposalId: proposalId } 
                    }
                );

                if (functionError) {
                    console.error('[QuoteCartModal] Error invoking Edge Function:', functionError);
                    // Show error to user, but maybe less critical as the proposal is saved
                    alert(`Proposta salva (ID: ${proposalId}), mas ocorreu um erro ao enviar o email: ${functionError.message}. Por favor, contate o suporte.`);
                    // Optionally, still show confirmation but with a warning
                } else {
                    console.log('[QuoteCartModal] Edge Function invoked successfully:', functionData);
                    // Email sending likely succeeded or is in progress
                }
            } catch (invokeError) {
                console.error('[QuoteCartModal] Critical error during function invocation:', invokeError);
                alert(`Proposta salva (ID: ${proposalId}), mas ocorreu um erro crítico ao tentar enviar o email: ${invokeError.message}. Por favor, contate o suporte.`);
            }

            // --- Success Handling ---
            console.log('[QuoteCartModal] Resetting cart and showing confirmation...');
            this.hide();
            this.showConfirmationModal(projectName, isGuestUser, guestUserCreated);
            console.log('[QuoteCartModal] Successfully called showConfirmationModal.');

        } catch (error) {
            console.error('[QuoteCartModal] Caught error during submitQuote process:', error);
            if (error && error.message) {
                 console.error('Error message:', error.message);
            }
            if (error && error.stack) {
                 console.error('Error stack trace:', error.stack);
            }
            // Show generic error message to user
             alert('Ocorreu um erro inesperado ao processar sua requisição. Verifique o console para detalhes.');

        } finally {
            // Re-enable submit button and reset submission flag
            this.isSubmitting = false;
            if (this.submitButton) {
                this.submitButton.disabled = false;
                this.submitButton.textContent = 'Requisitar Proposta';
            }
        }
    }
    
    // ... (other methods like showCalEmbed, etc.) ...

    showConfirmationModal(projectName, isGuestUser = false, guestUserCreated = false) {
        console.log('[QuoteCartModal] Entering showConfirmationModal...');
        const confirmationModal = document.getElementById('confirmation-modal');
        const confirmationHeader = document.getElementById('confirmation-header');
        const confirmationBody = document.getElementById('confirmation-body');
        const confirmationFooter = document.getElementById('confirmation-footer');
        const confirmationCloseBtn = document.getElementById('confirmation-close-btn');

        // Get user name for personalized message
        const currentUser = window.auth?.getCurrentUser();
        let userName = 'Cliente'; // Default fallback

        if (currentUser) {
            // Try user metadata first
            userName = currentUser.user_metadata?.full_name;

            // If not available, extract from email
            if (!userName) {
                const emailName = currentUser.email?.split('@')[0] || '';
                userName = emailName
                    .replace(/[._]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase()) || 'Cliente';
            }
        }

        // Update modal content based on user type
        if (confirmationHeader) {
            confirmationHeader.innerHTML = `<h2>Obrigado!</h2>`;
        }

        if (confirmationBody) {
            if (isGuestUser && guestUserCreated) {
                // New guest user - inform about login link
                confirmationBody.innerHTML = `
                    <p>Obrigado <strong>${userName}</strong>! Sua estimativa do projeto <strong>${projectName}</strong> foi enviada.</p>
                    <br>
                    <p>✉️ <strong>Enviamos um link de acesso para seu email</strong> onde você pode visualizar sua proposta a qualquer momento.</p>
                    <br>
                    <p>Saiba que a <strong>ONAV</strong> tem um desconto extra para esse projeto. Clique em "Falar com Especialista" e agende uma conversa sobre seu projeto e converta a estimativa em proposta oficial com desconto.</p>
                `;
            } else if (isGuestUser && !guestUserCreated) {
                // Existing user submitting as guest
                confirmationBody.innerHTML = `
                    <p>Obrigado <strong>${userName}</strong>. Sua estimativa do projeto <strong>${projectName}</strong> foi enviada e você já recebeu no seu email.</p>
                    <br>
                    <p><strong>${userName}</strong>, saiba que a <strong>ONAV</strong> tem um desconto extra para esse projeto. Clique em "Falar com Especialista" e agende uma conversa sobre seu projeto e converta a estimativa em proposta oficial com desconto.</p>
                `;
            } else {
                // Authenticated user - standard message
                confirmationBody.innerHTML = `
                    <p>Obrigado <strong>${userName}</strong>. Sua estimativa do projeto <strong>${projectName}</strong> foi enviada e você já recebeu no seu email.</p>
                    <br>
                    <p><strong>${userName}</strong>, saiba que a <strong>ONAV</strong> tem um desconto extra para esse projeto. Clique em "Falar com Especialista" e agende uma conversa sobre seu projeto e converta a estimativa em proposta oficial com desconto.</p>
                `;
            }
        }

        if (confirmationFooter) {
            if (isGuestUser) {
                // Guest users - show only "Falar com Especialista" button
                confirmationFooter.innerHTML = `
                    <button id="talk-to-specialist-btn" class="form-submit">Falar com Especialista</button>
                    <button id="close-modal-btn" class="form-submit" style="margin-left:10px; background-color: #6c757d;">Fechar</button>
                `;
            } else {
                // Authenticated users - show both buttons
                confirmationFooter.innerHTML = `
                    <button id="view-my-proposals-btn" class="form-submit">Minhas Propostas</button>
                    <button id="talk-to-specialist-btn" class="form-submit" style="margin-left:10px;">Falar com Especialista</button>
                `;
            }
        }

        // Hide the close button if present
        if (confirmationCloseBtn) confirmationCloseBtn.style.display = 'none';

        // Show modal
        if (confirmationModal) {
            confirmationModal.style.display = 'flex';
        }

        // Button event listeners
        setTimeout(() => {
            const myProposalsBtn = document.getElementById('view-my-proposals-btn');
            const talkBtn = document.getElementById('talk-to-specialist-btn');
            const closeBtn = document.getElementById('close-modal-btn');

            if (myProposalsBtn) {
                myProposalsBtn.onclick = () => {
                    window.location.href = 'my-quotes.html';
                    if (confirmationModal) confirmationModal.style.display = 'none';
                };
            }
            if (talkBtn) {
                talkBtn.onclick = () => {
                    // Open WhatsApp or Cal.com
                    window.open('https://wa.me/5519981454647?text=Olá! Gostaria de conversar sobre minha proposta.', '_blank');
                };
            }
            if (closeBtn) {
                closeBtn.onclick = () => {
                    if (confirmationModal) confirmationModal.style.display = 'none';
                    window.location.reload(); // Reload to reset calculator
                };
            }
        }, 0);
    }

    showCalEmbed(targetElement) {
        console.log("[QuoteCartModal] showCalEmbed called for target:", targetElement);
        if (!targetElement) {
            console.error("[QuoteCartModal] Target element for Cal embed is missing.");
            return;
        }

        // Clear previous embed if any to prevent duplicates
        targetElement.innerHTML = '<div style="width:100%;height:100%;overflow:scroll" id="my-cal-inline"></div>';
        const calContainer = targetElement.querySelector('#my-cal-inline');

        // Dynamically create and append the script tag to ensure it executes
        const calScript = document.createElement('script');
        calScript.type = 'text/javascript';
        calScript.innerHTML = `
          (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
          Cal("init", {origin:"https://cal.com"}); // General init

          // Init specific namespace for this embed
          Cal("init", "modal_30min", {origin:"https://cal.com"});

          Cal.ns["modal_30min"]("inline", {
            elementOrSelector: "#my-cal-inline",
             calLink: "us-aluga-h2l9n4/30min",
             config: {
                 layout: "month_view"
            }
          });

          Cal.ns["modal_30min"]("ui", {
            "styles":{"branding":{"brandColor":"#000000"}},
            "hideEventTypeDetails":false,
            "layout":"month_view"
          });

           console.log('Cal.com embed initialized for #my-cal-inline');
        `;
        // Append the script to the target element or body
        // Appending to body might be safer if targetElement gets cleared later
        document.body.appendChild(calScript);

        // Clean up script tag after it has likely run
        // Be cautious with this, ensure it doesn't remove too early
        setTimeout(() => {
            if (calScript.parentNode) {
                calScript.parentNode.removeChild(calScript);
                console.log('Cleaned up Cal embed script tag.');
            }
        }, 5000); // Remove after 5 seconds


        // // Old direct script injection - less reliable for execution timing
        // targetElement.innerHTML = `
        // <div style="width:100%;height:100%;overflow:scroll" id="my-cal-inline"></div>
        // <script type="text/javascript">
        //   (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
        // Cal("init", "30min", {origin:"https://cal.com"});
        //
        //   Cal.ns["30min"]("inline", {
        //     elementOrSelector:"#my-cal-inline",
        //     config: {"layout":"month_view"},
        //     calLink: "us-aluga-h2l9n4/30min",
        //   });
        //
        //   Cal.ns["30min"]("ui", {"hideEventTypeDetails":false,"layout":"month_view"});
        //   console.log('Cal embed shown via innerHTML');
        // <\/script>
        // `;
    }

    // New: Initialize Flatpickr for modal date inputs
    initFlatpickr() {
        if (typeof flatpickr === 'undefined') {
            console.error('[QuoteCartModal] flatpickr is not loaded!');
            return;
        }
        // Get today's date in YYYY-MM-DD format (required by flatpickr)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        if (this.startDateInput) {
            this.startPicker = flatpickr(this.startDateInput, {
                dateFormat: 'd/m/Y',
                locale: 'pt',
                allowInput: true,
                minDate: todayStr,
                onChange: (selectedDates, dateStr, instance) => {
                    // Save selected start date
                    if (selectedDates && selectedDates[0]) {
                        // Store as d/m/Y for parsing in renderCart
                        const d = selectedDates[0];
                        this.selectedStartDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                        // Optionally update endPicker's minDate
                        if (this.endPicker) {
                            this.endPicker.set('minDate', d);
                        }
                    }
                    // When a date is selected in Início, open the Fim picker
                    if (this.endDateInput) {
                        this.endDateInput.focus();
                        if (this.endPicker && this.endPicker.open) {
                            this.endPicker.open();
                        } else {
                            this.endDateInput.click();
                        }
                    }
                    // Re-render cart to update days count
                    this.renderCart();
                },
            });
        }
        if (this.endDateInput) {
            this.endPicker = flatpickr(this.endDateInput, {
                dateFormat: 'd/m/Y',
                locale: 'pt',
                allowInput: true,
                minDate: todayStr,
                onChange: (selectedDates, dateStr, instance) => {
                    if (selectedDates && selectedDates[0]) {
                        const d = selectedDates[0];
                        this.selectedEndDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                    }
                    // Re-render cart to update days count
                    this.renderCart();
                },
            });
        }
    }
}

// Instantiate the modal (or export the class if used as a module)
// This might be instantiated in main.js or led-wall.js depending on structure
// const quoteCartModal = new QuoteCartModal();

// Export if using modules
// export default QuoteCartModal;