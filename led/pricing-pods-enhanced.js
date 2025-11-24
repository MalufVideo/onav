// led/pricing-pods-enhanced.js - Enhanced version with better error handling and loading states
// This is an improved version of pricing-pods.js with:
// 1. Better loading state management
// 2. Enhanced error handling with user-friendly messages
// 3. Retry logic for price fetching
// 4. Visual feedback during loading
// 5. Detailed logging for debugging

document.addEventListener('DOMContentLoaded', () => {
    console.log('[pricing-pods-enhanced] Script loaded - Enhanced version with improved error handling');

    // --- Main Pricing Pod Elements (#sidebar-pricing) ---
    const pricingPod = document.getElementById('sidebar-pricing');
    const podTitleSpan = document.getElementById('main-pod-title');

    // Initially show the pricing pod (guest access enabled)
    if (pricingPod) {
        pricingPod.style.display = ''; // Show by default
    } else {
        console.error('[pricing-pods-enhanced] Pricing pod element #sidebar-pricing not found!');
    }

    // --- Helper Functions ---
    function formatCurrency(value) {
        const numberValue = Number(value);
        if (isNaN(numberValue)) {
            console.error('[formatCurrency] Invalid value:', value);
            return 'R$ 0';
        }
        return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function formatPrice(value) {
        const numericValue = Number(value);
        if (isNaN(numericValue)) {
            console.warn('[formatPrice] Input value is not a number:', value);
            return 'Carregando...';
        }
        return 'R$ ' + numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // Show loading state in all price elements
    function showLoadingState() {
        const priceElements = [
            'modules-price',
            'processors-price',
            'server-price',
            'rxii-price',
            'tracking-price',
            'studio-price',
            'team-price',
            'subtotal-price'
        ];

        priceElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Carregando...';
                element.style.opacity = '0.6';
            }
        });
    }

    // Clear loading state
    function clearLoadingState() {
        const priceElements = [
            'modules-price',
            'processors-price',
            'server-price',
            'rxii-price',
            'tracking-price',
            'studio-price',
            'team-price',
            'subtotal-price'
        ];

        priceElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.opacity = '1';
            }
        });
    }

    // --- Core Logic ---
    class PricingPodsController {
        constructor() {
            this.pricingPodElement = document.getElementById('sidebar-pricing');
            this.modeSelectorButtons = document.querySelectorAll('.selector-btn[data-mode]');
            this.currentMode = '3d'; // Default mode
            this.productPrices = {}; // Store fetched prices here
            this.isBackupActive = false; // Store backup state here
            this.pricesReady = false; // Flag for price fetch completion
            this.ledDataReady = false; // Flag for initial LED data
            this.initialCalculationDone = false; // Flag to prevent multiple initial calls
            this.fetchAttempts = 0; // Track fetch attempts for retry logic
            this.maxFetchAttempts = 3; // Maximum retry attempts

            // --- Add properties to store dynamic data ---
            this.totalModules = 0;
            this.processorsNeeded = 0;

            if (!this.pricingPodElement) {
                console.error('[PricingPodsController] Pricing pod element #sidebar-pricing not found!');
                return;
            }

            // --- Add event listener for LED wall data ---
            document.addEventListener('ledWallDataCalculated', (event) => {
                console.log('[pricing-pods-enhanced] Received ledWallDataCalculated event:', event.detail);
                this.totalModules = event.detail.totalModules || 0;
                this.processorsNeeded = event.detail.processorsNeeded || 0;
                this.ledDataReady = true;

                console.log('[pricing-pods-enhanced] LED data updated, recalculating...');
                this.calculateTotal(this.currentMode, 'LED Wall Data Updated');
            });

            this.initialize();
            console.log('[PricingPodsController] Initialized. Waiting for prices and LED data...');
        }

        async fetchProductPrices() {
            console.log(`[fetchProductPrices] Attempt ${this.fetchAttempts + 1}/${this.maxFetchAttempts} - Fetching prices...`);
            console.log('[fetchProductPrices] Window.SUPABASE_KEY present:', !!window.SUPABASE_KEY);
            console.log('[fetchProductPrices] Window.supabase present:', !!window.supabase);
            console.log('[fetchProductPrices] Window.quoteService present:', !!window.quoteService);

            try {
                // Show loading state
                showLoadingState();

                // Use the quote-service which handles Supabase client initialization
                if (!window.quoteService || typeof window.quoteService.getProductPrices !== 'function') {
                    throw new Error('Quote service not available');
                }

                const result = await window.quoteService.getProductPrices();
                console.log('[fetchProductPrices] Raw result from getProductPrices:', result);

                if (result.success && result.data) {
                    this.productPrices = result.data;
                    console.log('[fetchProductPrices] ✅ Prices fetched successfully:', this.productPrices);
                    console.log('[fetchProductPrices] Number of products loaded:', Object.keys(this.productPrices).length);

                    // Validate that all critical products are present
                    const requiredProducts = [
                        'LED Module',
                        'MX-40 Pro Processor',
                        'Disguise VX4n (Base)',
                        'Disguise VX4n (Backup)',
                        'Disguise RXII Unit',
                        'Stype Tracking',
                        'Estúdio',
                        'Equipe Técnica Diária'
                    ];

                    const missingProducts = requiredProducts.filter(name => !this.productPrices[name]);

                    if (missingProducts.length > 0) {
                        console.error('[fetchProductPrices] ⚠️ Missing critical products:', missingProducts);
                        console.error('[fetchProductPrices] Please run setup-products-table.sql in Supabase');

                        // Show warning to user but don't block functionality
                        this.showUserWarning(
                            `Alguns preços podem estar faltando: ${missingProducts.join(', ')}. ` +
                            `O administrador deve executar o script de configuração da tabela de produtos.`
                        );
                    }

                    if (Object.keys(this.productPrices).length === 0) {
                        console.error('[fetchProductPrices] ⚠️ Products table is empty!');
                        this.showUserWarning(
                            'A tabela de produtos está vazia. Os preços não serão exibidos. ' +
                            'Execute o script setup-products-table.sql no Supabase SQL Editor.'
                        );
                    }

                    this.pricesReady = true;
                    this.fetchAttempts = 0; // Reset attempts on success
                    clearLoadingState();
                } else {
                    throw new Error(result.error || 'No price data returned');
                }
            } catch (error) {
                this.fetchAttempts++;
                console.error(`[fetchProductPrices] Error (attempt ${this.fetchAttempts}):`, error);
                console.error('[fetchProductPrices] Error stack:', error.stack);

                // Retry logic
                if (this.fetchAttempts < this.maxFetchAttempts) {
                    console.log(`[fetchProductPrices] Retrying in ${this.fetchAttempts * 2} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, this.fetchAttempts * 2000));
                    return this.fetchProductPrices(); // Retry
                } else {
                    // Max attempts reached
                    console.error('[fetchProductPrices] ❌ Failed to load prices after', this.maxFetchAttempts, 'attempts');
                    this.productPrices = {};
                    this.pricesReady = false;
                    clearLoadingState();

                    // Show detailed error to user
                    this.showUserError(
                        'Não foi possível carregar os preços após múltiplas tentativas. ' +
                        'Verifique sua conexão com a internet e recarregue a página. ' +
                        'Se o problema persistir, contate o suporte. ' +
                        `Erro: ${error.message}`
                    );
                }
            }
        }

        showUserWarning(message) {
            // Create a warning banner at the top of the pricing pod
            const warningDiv = document.createElement('div');
            warningDiv.style.cssText = `
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 10px;
                color: #856404;
                font-size: 12px;
            `;
            warningDiv.innerHTML = `<strong>⚠️ Aviso:</strong> ${message}`;

            if (this.pricingPodElement && this.pricingPodElement.firstChild) {
                this.pricingPodElement.insertBefore(warningDiv, this.pricingPodElement.firstChild);
            }
        }

        showUserError(message) {
            // Create an error banner at the top of the pricing pod
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                padding: 10px;
                margin-bottom: 10px;
                color: #721c24;
                font-size: 12px;
            `;
            errorDiv.innerHTML = `<strong>❌ Erro:</strong> ${message}`;

            if (this.pricingPodElement && this.pricingPodElement.firstChild) {
                this.pricingPodElement.insertBefore(errorDiv, this.pricingPodElement.firstChild);
            }
        }

        async initialize() {
            console.log('[PricingPodsController] Initializing...');

            // Fetch prices BEFORE doing anything else
            await this.fetchProductPrices();

            // --- Get initial LED data from DOM ---
            const moduleCountElement = document.getElementById('module-count');
            const tetoModuleCountElement = document.getElementById('teto-module-count');
            const processorsElement = document.getElementById('processors');

            if (moduleCountElement && tetoModuleCountElement) {
                const principalModules = parseInt(moduleCountElement.textContent) || 0;
                const tetoModules = parseInt(tetoModuleCountElement.textContent) || 0;
                this.totalModules = principalModules + tetoModules;
                console.log(`[initialize] Read initial modules from DOM: Principal=${principalModules}, Teto=${tetoModules}, Total=${this.totalModules}`);
            } else {
                console.warn('[initialize] Could not find module count elements in DOM, using default 0');
                this.totalModules = 0;
            }

            if (processorsElement) {
                this.processorsNeeded = parseInt(processorsElement.textContent) || 0;
                console.log(`[initialize] Read initial processors from DOM: ${this.processorsNeeded}`);
            } else {
                console.warn('[initialize] Could not find processors element in DOM, using default 0');
                this.processorsNeeded = 0;
            }

            this.ledDataReady = true;

            // --- Set Initial Pod Title ---
            const initialPodTitleSpan = this.pricingPodElement.querySelector('#main-pod-title');
            if (initialPodTitleSpan) {
                initialPodTitleSpan.textContent = this.currentMode === '3d' ? '3D ou 2.5D' : '2D ou Car Plate';
                console.log(`[initialize] Initial pod title set to: ${initialPodTitleSpan.textContent}`);
            }

            // Bind event handlers
            this.bindEventHandlers();

            // --- Trigger initial calculation ---
            console.log('[initialize] Setup complete. Triggering initial calculation...');
            console.log(`[initialize] Prices ready: ${this.pricesReady}, LED data ready: ${this.ledDataReady}`);

            if (this.pricesReady) {
                this.calculateTotal(this.currentMode, 'Initial Load from DOM');
                this.initialCalculationDone = true;
            } else {
                console.warn('[initialize] Prices not ready, calculation will be delayed');
                // Set a fallback timer to try calculation after a delay
                setTimeout(() => {
                    if (!this.initialCalculationDone && this.ledDataReady) {
                        console.log('[initialize] Fallback: Attempting calculation after delay...');
                        this.calculateTotal(this.currentMode, 'Fallback Calculation');
                    }
                }, 3000);
            }
        }

        bindEventHandlers() {
            // Mode Selector Buttons
            const disguiseSelectorButtons = document.querySelectorAll('#card-disguise-selector .selector-btn');
            disguiseSelectorButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const selectedMode = button.dataset.mode;
                    if (selectedMode !== this.currentMode) {
                        disguiseSelectorButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        this.switchMode(selectedMode);
                    }
                });
            });

            // RXII Units Slider
            const rxiiSlider = this.pricingPodElement.querySelector('#rxii-units');
            const rxiiValueSpan = this.pricingPodElement.querySelector('#rxii-units-value');
            if (rxiiSlider && rxiiValueSpan) {
                rxiiSlider.addEventListener('input', () => {
                    const currentUnits = rxiiSlider.value;
                    console.log('[PricingPodsController] RXII slider changed to:', currentUnits);
                    rxiiValueSpan.textContent = currentUnits;
                    if (this.currentMode === '3d') {
                        this.calculateTotal(this.currentMode, 'RXII Slider Change');
                    }
                });
            }

            // Backup Button
            const backupBtn = this.pricingPodElement.querySelector('#backup-btn');
            if (backupBtn) {
                backupBtn.addEventListener('click', () => {
                    this.isBackupActive = !this.isBackupActive;
                    backupBtn.classList.toggle('active', this.isBackupActive);
                    backupBtn.textContent = this.isBackupActive ? 'remover backup' : '+backup';
                    console.log(`[PricingPodsController] Backup toggled. Active: ${this.isBackupActive}`);
                    this.calculateTotal(this.currentMode, 'Backup Button Click');
                });
            }

            // Listen for dynamic price updates
            document.addEventListener('dynamicPricesUpdated', (event) => {
                console.log('[PricingPodsController] Received dynamicPricesUpdated event, recalculating...');
                this.calculateTotal(this.currentMode, 'Dynamic Prices Updated');
            });
        }

        switchMode(newMode) {
            if (!this.pricesReady) {
                console.warn('[switchMode] Prices not ready yet, mode switch may not calculate correctly');
            }
            if (newMode === this.currentMode) return;

            console.log(`[switchMode] Switching from ${this.currentMode} to ${newMode}`);
            this.currentMode = newMode;

            // Update button active states
            this.modeSelectorButtons.forEach(button => {
                button.classList.toggle('active', button.dataset.mode === newMode);
            });

            // Update Pod Title
            const podTitleSpan = this.pricingPodElement.querySelector('#main-pod-title');
            if (podTitleSpan) {
                podTitleSpan.textContent = newMode === '3d' ? '3D ou 2.5D' : '2D ou Car Plate';
            }

            // Recalculate
            this.calculateTotal(newMode, 'Mode Switch');
        }

        calculateTotal(mode, trigger = 'Unknown Trigger') {
            console.log(`[calculateTotal] Called - Mode: ${mode}, Trigger: ${trigger}`);
            const pod = this.pricingPodElement;

            // Check for early exit
            if (!pod) {
                console.warn(`[calculateTotal] Pod element not found - Trigger: ${trigger}`);
                return;
            }

            if (!this.pricesReady || !this.productPrices || Object.keys(this.productPrices).length === 0) {
                console.warn(`[calculateTotal] Prices not loaded yet - Trigger: ${trigger}`);
                const mainTotalPriceSpan = pod.querySelector('#subtotal-price');
                if (mainTotalPriceSpan) {
                    mainTotalPriceSpan.textContent = 'Carregando preços...';
                }
                return;
            }

            if (this.totalModules === 0) {
                console.log(`[calculateTotal] Total modules is 0, calculating with 0 modules`);
            }

            let total = 0;
            const itemsForCart = [];

            // --- Get Unit Prices from fetched data ---
            const modulePrice = this.productPrices['LED Module'] || 0;
            const processorPrice = this.productPrices['MX-40 Pro Processor'] || 0;
            const vx4nBasePrice = this.productPrices['Disguise VX4n (Base)'] || 0;
            const vx4nBackupPrice = this.productPrices['Disguise VX4n (Backup)'] || vx4nBasePrice || 0;
            const rxiiUnitPrice = this.productPrices['Disguise RXII Unit'] || 0;
            const trackingPrice = this.productPrices['Stype Tracking'] || 0;

            // Log warnings for missing prices
            if (mode === '3d' && (rxiiUnitPrice === 0 || trackingPrice === 0)) {
                console.warn('[calculateTotal] Missing 3D prices - RXII:', rxiiUnitPrice, 'Tracking:', trackingPrice);
            }

            // --- Core Items (Always present) ---
            // 1. LED Modules
            const modulesTotalCost = this.totalModules * modulePrice;
            total += modulesTotalCost;
            console.log(`[calculateTotal] LED Modules: ${this.totalModules} × ${modulePrice} = ${modulesTotalCost}`);
            itemsForCart.push({
                id: 'led_modules',
                name: `Módulos LED (${this.totalModules} Unidades)`,
                quantity: this.totalModules,
                price: modulePrice
            });

            const modulesPriceSpan = pod.querySelector('#modules-price');
            if (modulesPriceSpan) {
                modulesPriceSpan.textContent = formatPrice(modulesTotalCost);
                modulesPriceSpan.dataset.price = modulesTotalCost;
            }

            // 2. Processors
            const processorsPriceElement = pod.querySelector('#processors-price');
            const processorsQuantity = this.processorsNeeded || 1;
            const processorsCost = processorsQuantity * processorPrice;
            total += processorsCost;
            itemsForCart.push({
                id: 'processors',
                name: 'Processadores MX-40 Pro',
                quantity: processorsQuantity,
                price: processorPrice
            });
            if (processorsPriceElement) processorsPriceElement.textContent = formatPrice(processorsCost);

            // 3. Disguise Server
            const serverPriceElement = pod.querySelector('#server-price');
            const isBackupServerActive = this.isBackupActive;
            const serverCost = isBackupServerActive ? (vx4nBasePrice + vx4nBackupPrice) : vx4nBasePrice;
            total += serverCost;

            itemsForCart.push({
                id: 'disguise_vx4n',
                name: 'Disguise VX4n (Base)',
                quantity: 1,
                price: vx4nBasePrice
            });

            if (isBackupServerActive) {
                itemsForCart.push({
                    id: 'disguise_vx4n_backup',
                    name: 'Disguise VX4n (Backup)',
                    quantity: 1,
                    price: vx4nBackupPrice
                });
            }

            if (serverPriceElement) serverPriceElement.textContent = formatPrice(serverCost);

            // Get mode-specific elements
            const rxiiGroup = pod.querySelector('#rxii-group');
            const trackingItem = pod.querySelector('#tracking-item');

            // --- 3D Mode Specific Items ---
            if (mode === '3d') {
                // 4. Disguise RXII
                const rxiiUnitsInput = pod.querySelector('#rxii-units');
                const rxiiUnitsValueSpan = pod.querySelector('#rxii-units-value');
                const rxiiPriceElement = pod.querySelector('#rxii-price');
                const rxiiUnits = parseInt(rxiiUnitsInput?.value || '1');

                const rxiiTotalCost = rxiiUnits * rxiiUnitPrice;
                total += rxiiTotalCost;
                itemsForCart.push({
                    id: 'disguise_rxii',
                    name: 'Disguise RXII',
                    quantity: rxiiUnits,
                    price: rxiiUnitPrice
                });

                if (rxiiUnitsValueSpan) rxiiUnitsValueSpan.textContent = rxiiUnits;
                if (rxiiPriceElement) {
                    console.log(`[calculateTotal] Setting RXII price: ${formatPrice(rxiiTotalCost)}`);
                    rxiiPriceElement.textContent = formatPrice(rxiiTotalCost);
                }

                if (rxiiGroup) rxiiGroup.style.display = '';

                // 5. Stype Tracking
                const trackingPriceElement = pod.querySelector('#tracking-price');
                total += trackingPrice;
                itemsForCart.push({
                    id: 'stype_tracking',
                    name: 'Stype Tracking',
                    quantity: 1,
                    price: trackingPrice
                });

                if (trackingPriceElement) {
                    console.log(`[calculateTotal] Setting Tracking price: ${formatPrice(trackingPrice)}`);
                    trackingPriceElement.textContent = formatPrice(trackingPrice);
                }

                if (trackingItem) trackingItem.style.display = '';
            } else { // 2D Mode
                if (rxiiGroup) rxiiGroup.style.display = 'none';
                if (trackingItem) trackingItem.style.display = 'none';
            }

            // --- Additional Items (Always Visible) ---
            // 6. Estúdio
            const studioPriceElement = pod.querySelector('#studio-price');
            const studioPrice = this.productPrices['Estúdio'] || 6000;
            total += studioPrice;
            itemsForCart.push({
                id: 'estudio',
                name: 'Estúdio',
                quantity: 1,
                price: studioPrice
            });
            if (studioPriceElement) {
                studioPriceElement.textContent = formatPrice(studioPrice);
                studioPriceElement.dataset.price = studioPrice;
            }

            // 7. Equipe Profissional
            const teamPriceElement = pod.querySelector('#team-price');
            const teamPrice = this.productPrices['Equipe Técnica da Diária'] ||
                             this.productPrices['Equipe Técnica Diária'] || 0;
            total += teamPrice;
            itemsForCart.push({
                id: 'equipe_tecnica',
                name: 'Equipe Profissional',
                quantity: 1,
                price: teamPrice
            });
            if (teamPriceElement) {
                teamPriceElement.textContent = formatPrice(teamPrice);
                teamPriceElement.dataset.price = teamPrice;
            }

            // Update the subtotal display
            const subtotalPriceSpan = pod.querySelector('#subtotal-price');
            if (subtotalPriceSpan) {
                subtotalPriceSpan.textContent = formatPrice(total);
            }

            // Store items in the pod's dataset for cart integration
            pod.dataset.items = JSON.stringify(itemsForCart);
            pod.dataset.totalPrice = total;

            // Dispatch event for cart update
            document.dispatchEvent(new CustomEvent('podPricesUpdated', {
                detail: { podId: pod.id, items: itemsForCart, total: total }
            }));

            console.log(`[calculateTotal] ✅ Calculation complete - Total: ${formatPrice(total)}, Items: ${itemsForCart.length}`);
        }
    }

    // Instantiate the controller
    const controller = new PricingPodsController();

    // Make controller globally accessible for debugging
    window.pricingPodsController = controller;

    // Function to update pod visibility based on auth state
    const updatePodVisibility = (user) => {
        console.log('[pricing-pods-enhanced] updatePodVisibility called with user:', user?.email || 'guest');

        if (pricingPod) {
            console.log('[pricing-pods-enhanced] Showing pricing pod (guest access enabled)');
            pricingPod.style.display = '';

            setTimeout(() => {
                if (controller && typeof controller.calculateTotal === 'function') {
                    controller.calculateTotal(controller.currentMode, user ? 'User Authenticated' : 'Guest Access');
                }
            }, 100);
        }
    };

    // Function to check current auth state
    const checkAuthStateAndUpdate = () => {
        if (window.auth && typeof window.auth.isAuthenticated === 'function') {
            const isAuth = window.auth.isAuthenticated();
            const currentUser = window.auth.getCurrentUser();
            console.log('[pricing-pods-enhanced] Auth state - isAuthenticated:', isAuth, 'user:', currentUser?.email || 'guest');
            updatePodVisibility(currentUser);
        } else {
            console.log('[pricing-pods-enhanced] Auth not available, showing pod for guest access');
            updatePodVisibility(null);
        }
    };

    // Wait for auth and set up listener
    const waitForAuthAndListen = () => {
        if (window.auth && typeof window.auth.onAuthStateChange === 'function') {
            console.log('[pricing-pods-enhanced] Auth found, setting up listener');
            window.auth.onAuthStateChange(updatePodVisibility);
            checkAuthStateAndUpdate();
        } else {
            console.log('[pricing-pods-enhanced] Waiting for auth...');
            setTimeout(waitForAuthAndListen, 500);
        }
    };

    waitForAuthAndListen();
});

console.log('[pricing-pods-enhanced] ✅ Enhanced pricing pods module loaded successfully');
