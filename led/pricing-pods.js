// led/pricing-pods.js - Refactored for Single Dynamic Pod

document.addEventListener('DOMContentLoaded', () => {
    console.log('Pricing Pods Script Loaded - Single Pod Logic');

    // --- Main Pricing Pod Elements (#card-custo-3d) ---
    const pricingPod = document.getElementById('card-custo-3d');
    const podTitleSpan = document.getElementById('main-pod-title');
    const totalPriceSpan = document.getElementById('total-price');

    // Initially hide the pricing pod
    if (pricingPod) {
        pricingPod.style.display = 'none';
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
        return numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // --- Core Logic ---

    class PricingPodsController {
        constructor() {
            this.pricingPodElement = document.getElementById('card-custo-3d');
            this.modeSelectorButtons = document.querySelectorAll('.selector-btn[data-mode]');
            this.currentMode = '3d'; // Default mode - Ensure this matches the HTML 'active' class
            this.productPrices = {}; // Store fetched prices here
            this.isBackupActive = false; // Store backup state here
            this.pricesReady = false; // Flag for price fetch completion
            this.ledDataReady = false; // Flag for initial LED data
            this.initialCalculationDone = false; // Flag to prevent multiple initial calls

            // --- Add properties to store dynamic data ---
            this.totalModules = 0;
            this.moduleUnitPrice = 0;
            this.processorsNeeded = 0;
            this.processorUnitPrice = 0;

            if (!this.pricingPodElement) {
                console.error('[PricingPodsController] Pricing pod element #card-custo-3d not found!');
                return;
            }

            // --- Add event listener for LED wall data ---
            document.addEventListener('ledWallDataCalculated', (event) => {
                console.log('[pricing-pods.js] Received ledWallDataCalculated event:', event.detail);
                this.totalModules = event.detail.totalModules || 0;
                this.moduleUnitPrice = event.detail.moduleUnitPrice || 0;
                this.processorsNeeded = event.detail.processorsNeeded || 0;
                this.processorUnitPrice = event.detail.processorUnitPrice || 0;

                this.ledDataReady = true; // Set flag

                // Check if both prices and LED data are ready to trigger initial calc
                this.triggerInitialCalculationCheck('LED Data Ready');

                // Always recalculate on subsequent events if initial calc is done
                if (this.initialCalculationDone) {
                    console.log('[pricing-pods.js] Recalculating total due to subsequent ledWallDataCalculated event.');
                    this.calculateTotal(this.currentMode, 'LED Wall Data Updated'); // Pass trigger info
                }
            });

            this.initialize();
            console.log('[PricingPodsController] Initialized. Waiting for ledWallDataCalculated event...');
        }

        async fetchProductPrices() {
            console.log('[fetchProductPrices] Fetching prices from Supabase...');
            try {
                const supabase = window.auth?.getSupabaseClient();
                if (!supabase) {
                    throw new Error('Supabase client not available');
                }

                const { data, error } = await supabase
                    .from('product_prices') // Assuming table name is 'product_prices'
                    .select('item_name, price');

                if (error) throw error;

                if (data) {
                    this.productPrices = data.reduce((acc, item) => {
                        acc[item.item_name] = item.price;
                        return acc;
                    }, {});
                    console.log('[fetchProductPrices] Prices fetched successfully:', this.productPrices);
                    this.pricesReady = true; // Set flag
                    this.triggerInitialCalculationCheck('Prices Ready'); // Check if ready
                } else {
                    console.warn('[fetchProductPrices] No price data returned from Supabase.');
                    this.pricesReady = true; // Still ready, even if empty/error, to allow calc attempt
                    this.triggerInitialCalculationCheck('Prices Ready (No Data)'); // Check if ready
                }
            } catch (error) {
                console.error('[fetchProductPrices] Error fetching prices:', error);
                // Handle error appropriately, maybe set default prices or show an error message
                this.productPrices = { // Fallback basic prices (consider removing if error handling is robust)
                    'LED Module': 85,
                    'MX-40 Pro Processor': 1890,
                    'Disguise VX4n (Base)': 10000,
                    'Disguise RXII Unit': 7750, // Price per unit
                    'Stype Tracking': 3890
                };
                this.pricesReady = true; // Set flag even on error (using fallback)
                this.triggerInitialCalculationCheck('Prices Ready (Error/Fallback)'); // Check if ready
            }
        }

        async initialize() { // Make initialize async
            console.log('[PricingPodsController] Initializing...');

            // Fetch prices BEFORE doing anything else
            await this.fetchProductPrices();

            // --- Set Initial Pod Title ---
            const initialPodTitleSpan = this.pricingPodElement.querySelector('#main-pod-title');
            if (initialPodTitleSpan) {
                if (this.currentMode === '3d') {
                    initialPodTitleSpan.textContent = 'Virtual Production 3D ou 2.5D';
                } else if (this.currentMode === '2d') {
                    initialPodTitleSpan.textContent = 'Virtual Production 2D ou Car Plate';
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
                        podTitleSpan.textContent = 'Virtual Production 3D ou 2.5D';
                    } else if (newMode === '2d') {
                        podTitleSpan.textContent = 'Virtual Production 2D ou Car Plate';
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
                    console.log('[PricingPodsController] RXII slider changed.');
                    const currentUnits = rxiiSlider.value; // Get current value
                    rxiiValueSpan.textContent = currentUnits; // Explicitly update span *here*
                    if (this.currentMode === '3d') {
                        this.calculateTotal(this.currentMode, 'RXII Slider Change'); // Pass trigger info
                    } else {
                         // Update only the unit count display if in 2D mode (calculation doesn't happen)
                         if (rxiiUnitsValueSpan) rxiiUnitsValueSpan.textContent = rxiiUnitsInput.value;
                    }
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
        }

        // NEW METHOD: Check and trigger initial calculation
        triggerInitialCalculationCheck(triggerSource) {
            console.log(`[triggerInitialCalculationCheck] Source: ${triggerSource}. Prices Ready: ${this.pricesReady}, LED Data Ready: ${this.ledDataReady}, Initial Calc Done: ${this.initialCalculationDone}`);
            if (this.pricesReady && this.ledDataReady && !this.initialCalculationDone) {
                console.log('[triggerInitialCalculationCheck] Both prices and LED data ready. Performing initial calculation...');
                this.calculateTotal(this.currentMode, 'Initial Calculation');
                this.initialCalculationDone = true; // Mark initial calculation as done
            }
        }

        calculateTotal(mode, trigger = 'Other Trigger') { // Add trigger parameter
            console.log(`[PricingPodsController] calculateTotal called. Mode: ${mode}, Trigger: ${trigger}`);
            const pod = this.pricingPodElement;

            // Check for early exit condition
            if (!pod || this.totalModules === 0 || this.moduleUnitPrice === 0) {
                console.warn(`[calculateTotal] Exiting early. Trigger: ${trigger}. Reason: Pod element or LED data missing (Modules: ${this.totalModules}, Unit Price: ${this.moduleUnitPrice})`);
                // Optionally update UI to show calculation is pending
                const mainTotalPriceSpan = pod?.querySelector('#total-price');
                if (mainTotalPriceSpan) {
                    mainTotalPriceSpan.textContent = 'Calculating...';
                }
                return; // Exit calculation if essential data is missing
            }

            let total = 0;
            const itemsForCart = [];

            // --- Get Unit Prices from fetched data ---
            const modulePrice = this.productPrices['LED Module'] || 0;
            const processorPrice = this.productPrices['MX-40 Pro Processor'] || 0;
            const vx4nBasePrice = this.productPrices['Disguise VX4n (Base)'] || 0;
            const rxiiUnitPrice = this.productPrices['Disguise RXII Unit'] || 0; // Per unit price
            const trackingPrice = this.productPrices['Stype Tracking'] || 0;

            // --- Core Items (Always present) ---
            // 1. LED Modules (Use dynamic data received from led-wall.js)
            const modulesTotalCost = this.totalModules * modulePrice;
            total += modulesTotalCost;
            itemsForCart.push({ id: 'led_modules', name: `Módulos LED (${this.totalModules} Unidades)`, quantity: this.totalModules, price: modulePrice }); // Store unit price
            const modulesPriceSpan = pod.querySelector('#modules-price');
            if (modulesPriceSpan) {
                modulesPriceSpan.textContent = formatPrice(modulesTotalCost);
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
            const serverCost = isBackupServerActive ? (vx4nBasePrice * 2) : vx4nBasePrice;
            total += serverCost;
            // Cart item name reflects backup status
            const serverName = isBackupServerActive ? 'Disguise VX4n (Principal + Backup)' : 'Disguise VX4n';
            // For the cart, store the base unit price and quantity (1 or 2)
            itemsForCart.push({ id: 'disguise_vx4n', name: serverName, quantity: isBackupServerActive ? 2 : 1, price: vx4nBasePrice });
            if (serverPriceElement) serverPriceElement.textContent = formatPrice(serverCost);

            // --- 3D Mode Specific Items ---
            if (mode === '3d') {
                // 4. Disguise RXII (Read slider value, use fetched unit price)
                const rxiiGroup = pod.querySelector('#rxii-group');
                const rxiiUnitsInput = pod.querySelector('#rxii-units'); // The slider
                const rxiiUnitsValueSpan = pod.querySelector('#rxii-units-value'); // The display span
                const rxiiPriceElement = pod.querySelector('#rxii-price'); // The price display span
                // const rxiiUnitPrice = parseFloat(rxiiPriceElement?.dataset.unitPrice || '0'); // Now fetched
                const rxiiUnits = parseInt(rxiiUnitsInput?.value || '1'); // Read slider value HERE

                console.log(`[calculateTotal] Trigger: ${trigger} - Read rxiiUnits slider value: ${rxiiUnits}`);

                const rxiiTotalCost = rxiiUnits * rxiiUnitPrice;
                total += rxiiTotalCost;
                // For cart: use unit price and quantity
                itemsForCart.push({ id: 'disguise_rxii', name: 'Disguise RXII', quantity: rxiiUnits, price: rxiiUnitPrice });
                if(rxiiUnitsValueSpan) rxiiUnitsValueSpan.textContent = rxiiUnits;
                if(rxiiPriceElement) rxiiPriceElement.textContent = formatPrice(rxiiTotalCost);

                // Show RXII Group
                if (rxiiGroup) rxiiGroup.style.display = '';

                // 5. Stype Tracking (Use fetched price)
                const trackingItem = pod.querySelector('#tracking-item');
                const trackingPriceElement = pod.querySelector('#tracking-price');
                // const trackingCost = parseFloat(trackingPriceElement?.dataset.price || '0'); // Now fetched
                const trackingCost = trackingPrice;
                total += trackingCost;
                itemsForCart.push({ id: 'stype_tracking', name: 'Stype Tracking', quantity: 1, price: trackingCost });
                 // Update display
                if(trackingPriceElement) trackingPriceElement.textContent = formatPrice(trackingCost);

                // Show Tracking Item
                 if (trackingItem) trackingItem.style.display = '';
            } else { // 2D Mode
                 // Hide RXII Group
                 if (rxiiGroup) rxiiGroup.style.display = 'none';
                 // Hide Tracking Item
                 if (trackingItem) trackingItem.style.display = 'none';
            }

            // Update the main total price display
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
    const updatePodVisibility = (user) => {
        if (pricingPod) {
            if (user) {
                console.log('[pricing-pods.js] User authenticated, showing pricing pod.');
                pricingPod.style.display = ''; // Show the pod
                // Ensure calculation runs when pod becomes visible
                // Check if controller and calculateTotal exist before calling
                if (controller && typeof controller.calculateTotal === 'function') {
                    controller.calculateTotal(controller.currentMode, 'Initialization');
                } else {
                    console.error('[pricing-pods.js] Controller or calculateTotal method not found for visibility update.');
                }
            } else {
                console.log('[pricing-pods.js] User not authenticated, hiding pricing pod.');
                pricingPod.style.display = 'none'; // Hide the pod
            }
        }
    };

    // Wait for auth to be initialized and then set up listener
    const waitForAuthAndListen = () => {
        if (window.auth && typeof window.auth.onAuthStateChange === 'function') {
            console.log('[pricing-pods.js] Auth found, setting up listener.');
            window.auth.onAuthStateChange(updatePodVisibility);
        } else {
            console.log('[pricing-pods.js] Waiting for auth...');
            setTimeout(waitForAuthAndListen, 500); // Check again shortly
        }
    };

    waitForAuthAndListen(); // Start checking for auth

});
// Ensure updateDisguisePod is globally accessible if called from led-wall.js
// This might be redundant if led-wall.js uses the controller or events instead
if (typeof updateDisguisePod === 'function') {
    window.updateDisguisePod = updateDisguisePod;
}
