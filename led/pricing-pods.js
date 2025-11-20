// led/pricing-pods.js - Refactored for Single Dynamic Pod

document.addEventListener('DOMContentLoaded', () => {
    console.log('Pricing Pods Script Loaded - Single Pod Logic');

    // --- Main Pricing Pod Elements (#sidebar-pricing) ---
    const pricingPod = document.getElementById('sidebar-pricing');
    const podTitleSpan = document.getElementById('main-pod-title');
    const totalPriceSpan = document.getElementById('total-price');

    // Initially show the pricing pod (guest access enabled)
    // Pod will be populated once prices are loaded
    if (pricingPod) {
        pricingPod.style.display = ''; // Show by default
    } else {
        console.error('[pricing-pods.js] Pricing pod element #sidebar-pricing not found!');
    }

    // Always Visible Items
    const modulesPriceSpan = document.getElementById('modules-price');
    const processorsPriceSpan = document.getElementById('processors-price');
    const serverPriceSpan = document.getElementById('server-price');
    const backupBtn = document.getElementById('backup-btn');

    // 3D Mode Only Items
    const rxiiGroup = document.getElementById('rxii-group');
    const rxiiUnitsInput = document.getElementById('rxii-units');
    const rxiiUnitsValueSpan = document.getElementById('rxii-units-value');
    const rxiiPriceSpan = document.getElementById('rxii-price');
    const trackingItem = document.getElementById('tracking-item');
    const trackingPriceSpan = document.getElementById('tracking-price');

    // --- Mode Selector Elements ---
    const disguiseModeBtn3D = document.getElementById('disguise-mode-3d');
    const disguiseModeBtn2D = document.getElementById('disguise-mode-2d');
    const disguiseSelectorButtons = document.querySelectorAll('#card-disguise-selector .selector-btn');

    // --- State ---
    let currentMode = '3d'; // Default mode
    let isBackupActive = false; // Default backup state

    // --- Helper Functions ---
    function formatCurrency(value) {
        const numberValue = Number(value);
        if (isNaN(numberValue)) {
            console.error('Invalid value passed to formatCurrency:', value);
            return '0';
        }
        return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // Helper function (add if not present)
    function formatPrice(value) {
        // Ensure value is a number before formatting
        const numericValue = Number(value);
        if (isNaN(numericValue)) {
            console.warn('[formatPrice] Input value is not a number:', value);
            return 'N/A'; // Or handle appropriately
        }
        return 'R$ ' + numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // --- Core Logic ---

    class PricingPodsController {
        constructor() {
            this.pricingPodElement = document.getElementById('sidebar-pricing');
            this.modeSelectorButtons = document.querySelectorAll('.selector-btn[data-mode]');
            this.currentMode = '3d'; // Default mode - Ensure this matches the HTML 'active' class
            this.productPrices = {}; // Store fetched prices here
            this.isBackupActive = false; // Store backup state here
            this.pricesReady = false; // Flag for price fetch completion
            this.ledDataReady = false; // Flag for initial LED data
            this.initialCalculationDone = false; // Flag to prevent multiple initial calls

            // --- Add properties to store dynamic data ---
            this.totalModules = 0;
            this.processorsNeeded = 0;

            if (!this.pricingPodElement) {
                console.error('[PricingPodsController] Pricing pod element #sidebar-pricing not found!');
                return;
            }

            // --- Add event listener for LED wall data ---
            document.addEventListener('ledWallDataCalculated', (event) => {
                console.log('[pricing-pods.js] Received ledWallDataCalculated event:', event.detail);
                // Only get the quantities from the event, NOT the prices
                // We'll use our own fetched prices from Supabase
                this.totalModules = event.detail.totalModules || 0;
                this.processorsNeeded = event.detail.processorsNeeded || 0;

                this.ledDataReady = true; // Set flag

                // Recalculate with updated values
                console.log('[pricing-pods.js] LED data updated, recalculating...');
                this.calculateTotal(this.currentMode, 'LED Wall Data Updated');
            });

            this.initialize();
            console.log('[PricingPodsController] Initialized. Waiting for ledWallDataCalculated event...');
        }

        async fetchProductPrices() {
            console.log('[fetchProductPrices] Fetching prices from Supabase...');
            try {
                // Use the quote-service which handles Supabase client initialization
                if (!window.quoteService || typeof window.quoteService.getProductPrices !== 'function') {
                    throw new Error('Quote service not available');
                }

                const result = await window.quoteService.getProductPrices();

                if (result.success && result.data) {
                    this.productPrices = result.data;
                    console.log('[fetchProductPrices] Prices fetched successfully:', this.productPrices);
                    this.pricesReady = true;
                    // Initial calculation will be triggered at the end of initialize()
                } else {
                    throw new Error(result.error || 'No price data returned');
                }
            } catch (error) {
                console.error('[fetchProductPrices] Error fetching prices:', error);
                // Do NOT use hardcoded fallbacks as per user requirement. 
                // Prices must come from the database.
                this.productPrices = {}; 
                console.error('[fetchProductPrices] Failed to load prices. Pricing calculations will be incorrect.');
                
                // Optionally show a user-facing error
                if(window.showToast) window.showToast('Erro ao carregar tabela de preços. Por favor, recarregue a página.', 'error');
                
                this.pricesReady = false; // Keep false so we don't trigger calculations with bad data
            }
        }

        async initialize() { // Make initialize async
            console.log('[PricingPodsController] Initializing...');

            // Fetch prices BEFORE doing anything else
            await this.fetchProductPrices();

            // --- Get initial LED data from DOM (led-wall.js should have already populated these) ---
            const moduleCountElement = document.getElementById('module-count');
            const tetoModuleCountElement = document.getElementById('teto-module-count');
            const processorsElement = document.getElementById('processors');

            if (moduleCountElement && tetoModuleCountElement) {
                // Parse the text content as numbers
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

            // Mark LED data as ready since we've read from DOM
            this.ledDataReady = true;

            // --- Set Initial Pod Title ---
            const initialPodTitleSpan = this.pricingPodElement.querySelector('#main-pod-title');
            if (initialPodTitleSpan) {
                if (this.currentMode === '3d') {
                    initialPodTitleSpan.textContent = '3D ou 2.5D';
                } else if (this.currentMode === '2d') {
                    initialPodTitleSpan.textContent = '2D ou Car Plate';
                } else {
                    initialPodTitleSpan.textContent = 'Custo Estimado'; // Default fallback
                }
                console.log(`[initialize] Initial pod title set to: ${initialPodTitleSpan.textContent}`);
            }

            // Refactored function to switch mode and update UI
            this.switchMode = (newMode) => {
                if (!this.pricesReady) {
                    console.warn('[switchMode] Prices not ready yet, cannot switch mode effectively.');
                    // Optionally, defer the switch or show a message
                    // return;
                }
                if (newMode === this.currentMode) return; // No change

                console.log(`[switchMode] Switching to mode: ${newMode}`);
                this.currentMode = newMode;

                // Update button active states
                this.modeSelectorButtons.forEach(button => {
                    button.classList.toggle('active', button.dataset.mode === newMode);
                });

                // Update Pod Title
                const podTitleSpan = this.pricingPodElement.querySelector('#main-pod-title');
                if (podTitleSpan) {
                    if (newMode === '3d') {
                        podTitleSpan.textContent = '3D ou 2.5D';
                    } else if (newMode === '2d') {
                        podTitleSpan.textContent = '2D ou Car Plate';
                    } else {
                        podTitleSpan.textContent = 'Custo Estimado'; // Default fallback
                    }
                }

                // Recalculate and update UI elements based on the new mode
                // This will handle showing/hiding elements and updating prices
                this.calculateTotal(newMode, 'Mode Switch'); // Pass trigger source
            }

            // Mode Selector Buttons
            disguiseSelectorButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const selectedMode = button.dataset.mode;
                    // Use this.currentMode from the controller instance
                    if (selectedMode !== this.currentMode) {
                        disguiseSelectorButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        this.switchMode(selectedMode);
                    }
                });
            });

            // RXII Units Slider (Only triggers calculation in 3D mode)
            const rxiiSlider = this.pricingPodElement.querySelector('#rxii-units');
            const rxiiValueSpan = this.pricingPodElement.querySelector('#rxii-units-value'); // Get span
            if (rxiiSlider && rxiiValueSpan) { // Check both exist
                rxiiSlider.addEventListener('input', () => {
                    const currentUnits = rxiiSlider.value; // Get current value
                    console.log('[PricingPodsController] RXII slider changed to:', currentUnits);
                    rxiiValueSpan.textContent = currentUnits; // Explicitly update span *here*
                    if (this.currentMode === '3d') {
                        this.calculateTotal(this.currentMode, 'RXII Slider Change'); // Pass trigger info
                    }
                    // Removed buggy 2D mode code that referenced undefined variables
                });
            }

            // Backup Button
            const backupBtn = this.pricingPodElement.querySelector('#backup-btn'); // Assuming backup button is inside the pod
            backupBtn?.addEventListener('click', () => {
                this.isBackupActive = !this.isBackupActive; // Toggle state
                backupBtn.classList.toggle('active', this.isBackupActive); // Update button style
                backupBtn.textContent = this.isBackupActive ? 'remover backup' : 'adicionar backup ativo'; // Update text
                console.log(`[PricingPodsController] Backup toggled. Active: ${this.isBackupActive}`);
                // Pass trigger info and use stored backup state
                this.calculateTotal(this.currentMode, 'Backup Button Click');
            });

            // Listen for dynamic price updates (e.g., from main LED controls)
            // This event should ideally pass specific updated prices if possible
            document.addEventListener('dynamicPricesUpdated', (event) => {
                console.log('Received dynamicPricesUpdated event, recalculating pod total...');
                // Optional: Update data-price attributes if they change dynamically
                // Potentially update base prices from datasets if they changed
                const mainLedModules = document.getElementById('module-count');
                const mainLedProcessors = document.getElementById('processors');
                // Update dataset prices if the event carries them
                if (event.detail?.modulesPrice && modulesPriceSpan) modulesPriceSpan.dataset.price = event.detail.modulesPrice;
                if (event.detail?.processorsPrice && processorsPriceSpan) processorsPriceSpan.dataset.price = event.detail.processorsPrice;

                this.calculateTotal(this.currentMode); // Recalculate with potentially new base prices
                // REMOVED call to obsolete updateOrderSummary()
            });

            // --- Trigger initial calculation now that everything is set up ---
            console.log('[initialize] Setup complete. Triggering initial calculation...');
            console.log(`[initialize] Prices ready: ${this.pricesReady}, LED data ready: ${this.ledDataReady}`);
            if (this.pricesReady) {
                this.calculateTotal(this.currentMode, 'Initial Load from DOM');
                this.initialCalculationDone = true;
            } else {
                console.warn('[initialize] Prices not ready, calculation will be delayed');
            }
        }

        calculateTotal(mode, trigger = 'Other Trigger') { // Add trigger parameter
            console.log(`[PricingPodsController] calculateTotal called. Mode: ${mode}, Trigger: ${trigger}`);
            const pod = this.pricingPodElement;

            // Check for early exit condition - only check for pod element and if prices are loaded
            if (!pod) {
                console.warn(`[calculateTotal] Exiting early. Trigger: ${trigger}. Reason: Pod element not found`);
                return;
            }

            if (!this.pricesReady || !this.productPrices || Object.keys(this.productPrices).length === 0) {
                console.warn(`[calculateTotal] Exiting early. Trigger: ${trigger}. Reason: Prices not loaded yet`);
                // Update UI to show calculation is pending
                const mainTotalPriceSpan = pod.querySelector('#total-price');
                if (mainTotalPriceSpan) {
                    mainTotalPriceSpan.textContent = 'Carregando...';
                }
                return;
            }

            // Allow calculation even if totalModules is 0 (user might be setting up)
            if (this.totalModules === 0) {
                console.log(`[calculateTotal] Total modules is 0, will calculate with 0 modules`);
            }

            let total = 0;
            const itemsForCart = [];

            // --- Get Unit Prices from fetched data ---
            const modulePrice = this.productPrices['LED Module'] || 0;
            const processorPrice = this.productPrices['MX-40 Pro Processor'] || 0;
            const vx4nBasePrice = this.productPrices['Disguise VX4n (Base)'] || 0;
            const vx4nBackupPrice = this.productPrices['Disguise VX4n (Backup)'] || vx4nBasePrice || 0;
            const rxiiUnitPrice = this.productPrices['Disguise RXII Unit'] || 0; // Per unit price
            const trackingPrice = this.productPrices['Stype Tracking'] || 0;

            // Log warning if any critical prices are 0
            if (mode === '3d' && (rxiiUnitPrice === 0 || trackingPrice === 0)) {
                console.warn('[calculateTotal] Missing 3D prices - RXII:', rxiiUnitPrice, 'Tracking:', trackingPrice);
            }

            // --- Core Items (Always present) ---
            // 1. LED Modules (Use dynamic data received from led-wall.js)
            const modulesTotalCost = this.totalModules * modulePrice;
            total += modulesTotalCost;
            console.log(`[calculateTotal] LED Modules: ${this.totalModules} × ${modulePrice} = ${modulesTotalCost}`);
            itemsForCart.push({ id: 'led_modules', name: `Módulos LED (${this.totalModules} Unidades)`, quantity: this.totalModules, price: modulePrice }); // Store unit price
            const modulesPriceSpan = pod.querySelector('#modules-price');
            if (modulesPriceSpan) {
                modulesPriceSpan.textContent = formatPrice(modulesTotalCost);
                console.log(`[calculateTotal] Set modules-price to: ${formatPrice(modulesTotalCost)}`);
                modulesPriceSpan.dataset.price = modulesTotalCost; // Update data attribute too
            }

            // 2. Processors (Use actual calculated quantity from led-wall.js)
            const processorsPriceElement = pod.querySelector('#processors-price');
            const processorsQuantity = this.processorsNeeded || 1; // Use calculated quantity, fallback to 1
            const processorsCost = processorsQuantity * processorPrice;
            total += processorsCost;
            itemsForCart.push({ id: 'processors', name: 'Processadores MX-40 Pro', quantity: processorsQuantity, price: processorPrice });
            if (processorsPriceElement) processorsPriceElement.textContent = formatPrice(processorsCost);

            // 3. Disguise Server (VX4n price depends on backup status)
            const serverPriceElement = pod.querySelector('#server-price');
            const serverBackupBtn = pod.querySelector('#backup-btn'); // Get the button to read its state
            // Read backup state directly from the controller's property
            const isBackupServerActive = this.isBackupActive;
            const serverCost = isBackupServerActive ? (vx4nBasePrice + vx4nBackupPrice) : vx4nBasePrice;
            total += serverCost;
            
            // Add Base Unit
            itemsForCart.push({ id: 'disguise_vx4n', name: 'Disguise VX4n (Base)', quantity: 1, price: vx4nBasePrice });
            
            // Add Backup Unit if active
            if (isBackupServerActive) {
                itemsForCart.push({ id: 'disguise_vx4n_backup', name: 'Disguise VX4n (Backup)', quantity: 1, price: vx4nBackupPrice });
            }

            if (serverPriceElement) serverPriceElement.textContent = formatPrice(serverCost);

            // Declare 3D mode elements before conditional logic
            const rxiiGroup = pod.querySelector('#rxii-group');
            const trackingItem = pod.querySelector('#tracking-item');

            // --- 3D Mode Specific Items ---
            if (mode === '3d') {
                // 4. Disguise RXII (Read slider value, use fetched unit price)
                const rxiiUnitsInput = pod.querySelector('#rxii-units'); // The slider
                const rxiiUnitsValueSpan = pod.querySelector('#rxii-units-value'); // The display span
                const rxiiPriceElement = pod.querySelector('#rxii-price'); // The price display span
                const rxiiUnits = parseInt(rxiiUnitsInput?.value || '1'); // Read slider value HERE

                console.log(`[calculateTotal] Trigger: ${trigger} - RXII Units: ${rxiiUnits}, Unit Price: ${rxiiUnitPrice}`);

                const rxiiTotalCost = rxiiUnits * rxiiUnitPrice;
                total += rxiiTotalCost;
                // For cart: use unit price and quantity
                itemsForCart.push({ id: 'disguise_rxii', name: 'Disguise RXII', quantity: rxiiUnits, price: rxiiUnitPrice });
                if(rxiiUnitsValueSpan) rxiiUnitsValueSpan.textContent = rxiiUnits;
                if(rxiiPriceElement) {
                    console.log(`[calculateTotal] Setting RXII price display to: ${formatPrice(rxiiTotalCost)} (${rxiiTotalCost})`);
                    rxiiPriceElement.textContent = formatPrice(rxiiTotalCost);
                } else {
                    console.warn('[calculateTotal] RXII price element not found!');
                }

                // Show RXII Group
                if (rxiiGroup) rxiiGroup.style.display = '';

                // 5. Stype Tracking (Use fetched price)
                const trackingPriceElement = pod.querySelector('#tracking-price');
                const trackingCost = trackingPrice;
                total += trackingCost;
                itemsForCart.push({ id: 'stype_tracking', name: 'Stype Tracking', quantity: 1, price: trackingCost });
                // Update display
                if(trackingPriceElement) {
                    console.log(`[calculateTotal] Setting Tracking price display to: ${formatPrice(trackingCost)} (${trackingCost})`);
                    trackingPriceElement.textContent = formatPrice(trackingCost);
                } else {
                    console.warn('[calculateTotal] Tracking price element not found!');
                }

                // Show Tracking Item
                if (trackingItem) trackingItem.style.display = '';
            } else { // 2D Mode
                // Hide RXII Group
                if (rxiiGroup) rxiiGroup.style.display = 'none';
                // Hide Tracking Item
                if (trackingItem) trackingItem.style.display = 'none';
            }

            // --- Additional Items (Always Visible) ---
            // 6. Estúdio (Use fetched price from Supabase)
            const studioPriceElement = pod.querySelector('#studio-price');
            const studioPrice = this.productPrices['Estúdio'] || 6000;
            total += studioPrice;
            itemsForCart.push({ id: 'estudio', name: 'Estúdio', quantity: 1, price: studioPrice });
            if (studioPriceElement) {
                studioPriceElement.textContent = formatPrice(studioPrice);
                studioPriceElement.dataset.price = studioPrice;
            }

            // 7. Equipe Profissional (Use fetched price from Supabase)
            const teamPriceElement = pod.querySelector('#team-price');
            // Try exact match from DB then fallback
            const teamPrice = this.productPrices['Equipe Técnica da Diária'] || this.productPrices['Equipe Técnica Diária'] || 0;
            total += teamPrice;
            itemsForCart.push({ id: 'equipe_tecnica', name: 'Equipe Profissional', quantity: 1, price: teamPrice });
            if (teamPriceElement) {
                teamPriceElement.textContent = formatPrice(teamPrice);
                teamPriceElement.dataset.price = teamPrice;
            }

            // Update the subtotal display
            const subtotalPriceSpan = pod.querySelector('#subtotal-price');
            if (subtotalPriceSpan) {
                subtotalPriceSpan.textContent = formatPrice(total);
            }

            // Update the main total price display (same as subtotal for now)
            const mainTotalPriceSpan = pod.querySelector('#total-price');
            if (mainTotalPriceSpan) {
                mainTotalPriceSpan.textContent = formatPrice(total);
            }

            // Store items in the pod's dataset for cart integration
            pod.dataset.items = JSON.stringify(itemsForCart);
            pod.dataset.totalPrice = total;

            // Dispatch event for cart update
            document.dispatchEvent(new CustomEvent('podPricesUpdated', { detail: { podId: pod.id, items: itemsForCart, total: total } }));
            console.log(`[pricing-pods.js] Dispatched podPricesUpdated event`);
        }
    }

    // Instantiate the controller
    const controller = new PricingPodsController(); // Re-add const for reference

    // Function to update pod visibility based on auth state
    // UPDATED: Always show pricing pod for guest users
    const updatePodVisibility = (user) => {
        console.log('[pricing-pods.js] updatePodVisibility called with user:', user?.email || 'guest');

        if (pricingPod) {
            // Always show the pricing pod (guest access enabled)
            console.log('[pricing-pods.js] Showing pricing pod (guest access enabled)');
            pricingPod.style.display = ''; // Show the pod

            // Ensure calculation runs when pod becomes visible
            setTimeout(() => {
                if (controller && typeof controller.calculateTotal === 'function') {
                    controller.calculateTotal(controller.currentMode, user ? 'User Authenticated' : 'Guest Access');
                } else {
                    console.error('[pricing-pods.js] Controller or calculateTotal method not found for visibility update.');
                }
            }, 100);
        } else {
            console.error('[pricing-pods.js] Pricing pod element not found!');
        }
    };

    // Function to check current auth state and update visibility
    // UPDATED: Show pod even if auth is not available (guest access)
    const checkAuthStateAndUpdate = () => {
        if (window.auth && typeof window.auth.isAuthenticated === 'function') {
            const isAuth = window.auth.isAuthenticated();
            const currentUser = window.auth.getCurrentUser();
            console.log('[pricing-pods.js] Current auth state - isAuthenticated:', isAuth, 'user:', currentUser?.email || 'guest');
            updatePodVisibility(currentUser);
        } else {
            console.log('[pricing-pods.js] Auth not available yet, showing pod for guest access');
            // Show pod even without auth (guest access enabled)
            updatePodVisibility(null); // Pass null to indicate guest user
        }
    };

    // Wait for auth to be initialized and then set up listener
    const waitForAuthAndListen = () => {
        if (window.auth && typeof window.auth.onAuthStateChange === 'function') {
            console.log('[pricing-pods.js] Auth found, setting up listener and checking initial state.');
            
            // Set up listener for future changes
            window.auth.onAuthStateChange(updatePodVisibility);
            
            // Check current state immediately
            checkAuthStateAndUpdate();
            
        } else {
            console.log('[pricing-pods.js] Waiting for auth...');
            setTimeout(waitForAuthAndListen, 500); // Check again shortly
        }
    };

    // Start checking for auth immediately
    waitForAuthAndListen();
    
    // Also check periodically in case auth state changes without triggering the listener
    // UPDATED: Pod should always be visible now (guest access enabled)
    const periodicAuthCheck = setInterval(() => {
        if (window.auth && typeof window.auth.isAuthenticated === 'function') {
            // Just ensure pod is visible, regardless of auth state
            if (pricingPod && pricingPod.style.display === 'none') {
                console.log('[pricing-pods.js] Pod hidden detected, showing for guest access...');
                checkAuthStateAndUpdate();
            }

            // Clear interval after auth system is working
            clearInterval(periodicAuthCheck);
        }
    }, 2000);

});
// Ensure updateDisguisePod is globally accessible if called from led-wall.js
// This might be redundant if led-wall.js uses the controller or events instead
if (typeof updateDisguisePod === 'function') {
    window.updateDisguisePod = updateDisguisePod;
}
