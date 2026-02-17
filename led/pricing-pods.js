// led/pricing-pods.js - Single Dynamic Pricing Pod Controller
// Uses shared-utils.js: ProductPriceCache, PRODUCT_NAMES, formatPrice, ledLog

document.addEventListener('DOMContentLoaded', () => {
    ledLog('[pricing-pods] Script loaded');

    const pricingPod = document.getElementById('sidebar-pricing');
    if (pricingPod) {
        pricingPod.style.display = '';
    } else {
        console.error('[pricing-pods] #sidebar-pricing not found!');
        return;
    }

    class PricingPodsController {
        constructor() {
            this.pricingPodElement = pricingPod;
            this.modeSelectorButtons = document.querySelectorAll('.selector-btn[data-mode]');
            this.currentMode = '3d';
            this.isBackupActive = false;
            this.pricesReady = false;
            this.ledDataReady = false;
            this.initialCalculationDone = false;
            this.totalModules = 0;
            this.processorsNeeded = 0;

            document.addEventListener('ledWallDataCalculated', (event) => {
                ledLog('[pricing-pods] Received ledWallDataCalculated:', event.detail);
                this.totalModules = event.detail.totalModules || 0;
                this.processorsNeeded = event.detail.processorsNeeded || 0;
                this.ledDataReady = true;
                this.calculateTotal(this.currentMode, 'LED Wall Data Updated');
            });

            this.initialize();
        }

        async initialize() {
            ledLog('[pricing-pods] Initializing...');

            // Show loading state
            this._showLoadingState();

            // Fetch prices via shared cache
            try {
                const prices = await window.ProductPriceCache.get();
                if (prices && Object.keys(prices).length > 0) {
                    this.pricesReady = true;
                    ledLog('[pricing-pods] Prices ready:', Object.keys(prices).length, 'products');
                } else {
                    throw new Error('Empty price data');
                }
            } catch (error) {
                console.error('[pricing-pods] Failed to load prices:', error.message);
                this.pricesReady = false;
                this._showUserError('Não foi possível carregar os preços. Recarregue a página ou contate o suporte.');
            }

            this._clearLoadingState();

            // Read initial LED data from DOM
            const moduleCountEl = document.getElementById('module-count');
            const tetoModuleCountEl = document.getElementById('teto-module-count');
            const processorsEl = document.getElementById('processors');

            if (moduleCountEl && tetoModuleCountEl) {
                this.totalModules = (parseInt(moduleCountEl.textContent) || 0) + (parseInt(tetoModuleCountEl.textContent) || 0);
            }
            if (processorsEl) {
                this.processorsNeeded = parseInt(processorsEl.textContent) || 0;
            }
            this.ledDataReady = true;

            // Set initial pod title
            const titleSpan = this.pricingPodElement.querySelector('#main-pod-title');
            if (titleSpan) {
                titleSpan.textContent = this.currentMode === '3d' ? '3D ou 2.5D' : '2D ou Car Plate';
            }

            this._bindEventHandlers();

            // Trigger initial calculation
            if (this.pricesReady) {
                this.calculateTotal(this.currentMode, 'Initial Load');
                this.initialCalculationDone = true;
            } else {
                // Fallback: retry after delay
                setTimeout(() => {
                    if (!this.initialCalculationDone && this.ledDataReady) {
                        this.calculateTotal(this.currentMode, 'Fallback Calculation');
                    }
                }, 3000);
            }
        }

        _bindEventHandlers() {
            const disguiseSelectorButtons = document.querySelectorAll('#card-disguise-selector .selector-btn');

            // Mode Selector Buttons
            disguiseSelectorButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const selectedMode = button.dataset.mode;
                    if (selectedMode !== this.currentMode) {
                        disguiseSelectorButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        this._switchMode(selectedMode);
                    }
                });
            });

            // RXII Units Slider
            const rxiiSlider = this.pricingPodElement.querySelector('#rxii-units');
            const rxiiValueSpan = this.pricingPodElement.querySelector('#rxii-units-value');
            if (rxiiSlider && rxiiValueSpan) {
                rxiiSlider.addEventListener('input', () => {
                    rxiiValueSpan.textContent = rxiiSlider.value;
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
                    this.calculateTotal(this.currentMode, 'Backup Toggle');
                });
            }

            // Dynamic price updates
            document.addEventListener('dynamicPricesUpdated', () => {
                this.calculateTotal(this.currentMode, 'Dynamic Prices Updated');
            });
        }

        _switchMode(newMode) {
            if (newMode === this.currentMode) return;
            this.currentMode = newMode;

            this.modeSelectorButtons.forEach(button => {
                button.classList.toggle('active', button.dataset.mode === newMode);
            });

            const titleSpan = this.pricingPodElement.querySelector('#main-pod-title');
            if (titleSpan) {
                titleSpan.textContent = newMode === '3d' ? '3D ou 2.5D' : '2D ou Car Plate';
            }

            this.calculateTotal(newMode, 'Mode Switch');
        }

        calculateTotal(mode, trigger = 'Unknown') {
            ledLog(`[pricing-pods] calculateTotal - Mode: ${mode}, Trigger: ${trigger}`);
            const pod = this.pricingPodElement;
            if (!pod) return;

            const prices = window.ProductPriceCache._prices;
            if (!prices || Object.keys(prices).length === 0) {
                const subtotalEl = pod.querySelector('#subtotal-price');
                if (subtotalEl) subtotalEl.textContent = 'Carregando preços...';
                return;
            }

            let total = 0;
            const itemsForCart = [];

            // Get unit prices from cache
            const modulePrice = prices[PRODUCT_NAMES.LED_MODULE] || 0;
            const processorPrice = prices[PRODUCT_NAMES.MX40_PROCESSOR] || 0;
            const vx4nBasePrice = prices[PRODUCT_NAMES.DISGUISE_VX4N_BASE] || 0;
            const vx4nBackupPrice = prices[PRODUCT_NAMES.DISGUISE_VX4N_BACKUP] || vx4nBasePrice || 0;
            const rxiiUnitPrice = prices[PRODUCT_NAMES.DISGUISE_RXII] || 0;
            const trackingPrice = prices[PRODUCT_NAMES.STYPE_TRACKING] || 0;

            // 1. LED Modules
            const modulesTotalCost = this.totalModules * modulePrice;
            total += modulesTotalCost;
            itemsForCart.push({ id: 'led_modules', name: `Módulos LED (${this.totalModules} Unidades)`, quantity: this.totalModules, price: modulePrice });
            const modulesPriceEl = pod.querySelector('#modules-price');
            if (modulesPriceEl) {
                modulesPriceEl.textContent = formatPrice(modulesTotalCost);
                modulesPriceEl.dataset.price = modulesTotalCost;
            }

            // 2. Processors
            const processorsQty = this.processorsNeeded || 1;
            const processorsCost = processorsQty * processorPrice;
            total += processorsCost;
            itemsForCart.push({ id: 'processors', name: 'Processadores MX-40 Pro', quantity: processorsQty, price: processorPrice });
            const processorsEl = pod.querySelector('#processors-price');
            if (processorsEl) processorsEl.textContent = formatPrice(processorsCost);

            // 3. Disguise Server
            const serverCost = this.isBackupActive ? (vx4nBasePrice + vx4nBackupPrice) : vx4nBasePrice;
            total += serverCost;
            itemsForCart.push({ id: 'disguise_vx4n', name: 'Disguise VX4n (Base)', quantity: 1, price: vx4nBasePrice });
            if (this.isBackupActive) {
                itemsForCart.push({ id: 'disguise_vx4n_backup', name: 'Disguise VX4n (Backup)', quantity: 1, price: vx4nBackupPrice });
            }
            const serverEl = pod.querySelector('#server-price');
            if (serverEl) serverEl.textContent = formatPrice(serverCost);

            // 3D mode elements
            const rxiiGroup = pod.querySelector('#rxii-group');
            const trackingItem = pod.querySelector('#tracking-item');

            if (mode === '3d') {
                // 4. Disguise RXII
                const rxiiUnitsInput = pod.querySelector('#rxii-units');
                const rxiiUnitsValueSpan = pod.querySelector('#rxii-units-value');
                const rxiiPriceEl = pod.querySelector('#rxii-price');
                const rxiiUnits = parseInt(rxiiUnitsInput?.value || '1');
                const rxiiTotalCost = rxiiUnits * rxiiUnitPrice;
                total += rxiiTotalCost;
                itemsForCart.push({ id: 'disguise_rxii', name: 'Disguise RXII', quantity: rxiiUnits, price: rxiiUnitPrice });
                if (rxiiUnitsValueSpan) rxiiUnitsValueSpan.textContent = rxiiUnits;
                if (rxiiPriceEl) rxiiPriceEl.textContent = formatPrice(rxiiTotalCost);
                if (rxiiGroup) rxiiGroup.style.display = '';

                // 5. Stype Tracking
                total += trackingPrice;
                itemsForCart.push({ id: 'stype_tracking', name: 'Stype Tracking', quantity: 1, price: trackingPrice });
                const trackingEl = pod.querySelector('#tracking-price');
                if (trackingEl) trackingEl.textContent = formatPrice(trackingPrice);
                if (trackingItem) trackingItem.style.display = '';
            } else {
                if (rxiiGroup) rxiiGroup.style.display = 'none';
                if (trackingItem) trackingItem.style.display = 'none';
            }

            // 6. Estúdio
            const studioPrice = prices[PRODUCT_NAMES.ESTUDIO] || 6000;
            total += studioPrice;
            itemsForCart.push({ id: 'estudio', name: 'Estúdio', quantity: 1, price: studioPrice });
            const studioEl = pod.querySelector('#studio-price');
            if (studioEl) {
                studioEl.textContent = formatPrice(studioPrice);
                studioEl.dataset.price = studioPrice;
            }

            // 7. Equipe Profissional
            const teamPrice = prices[PRODUCT_NAMES.EQUIPE_TECNICA] || prices[PRODUCT_NAMES.EQUIPE_TECNICA_ALT] || 0;
            total += teamPrice;
            itemsForCart.push({ id: 'equipe_tecnica', name: 'Equipe Profissional', quantity: 1, price: teamPrice });
            const teamEl = pod.querySelector('#team-price');
            if (teamEl) {
                teamEl.textContent = formatPrice(teamPrice);
                teamEl.dataset.price = teamPrice;
            }

            // Update subtotal
            const subtotalEl = pod.querySelector('#subtotal-price');
            if (subtotalEl) subtotalEl.textContent = formatPrice(total);

            // Store items for cart integration
            pod.dataset.items = JSON.stringify(itemsForCart);
            pod.dataset.totalPrice = total;

            // Dispatch event for cart
            document.dispatchEvent(new CustomEvent('podPricesUpdated', {
                detail: { podId: pod.id, items: itemsForCart, total: total }
            }));
            ledLog(`[pricing-pods] Total: ${formatPrice(total)}, Items: ${itemsForCart.length}`);
        }

        _showLoadingState() {
            ['modules-price', 'processors-price', 'server-price', 'rxii-price',
             'tracking-price', 'studio-price', 'team-price', 'subtotal-price'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.textContent = 'Carregando...'; el.style.opacity = '0.6'; }
            });
        }

        _clearLoadingState() {
            ['modules-price', 'processors-price', 'server-price', 'rxii-price',
             'tracking-price', 'studio-price', 'team-price', 'subtotal-price'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.opacity = '1';
            });
        }

        _showUserError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background-color:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:10px;margin-bottom:10px;color:#721c24;font-size:12px;';
            errorDiv.innerHTML = `<strong>Erro:</strong> ${message}`;
            if (this.pricingPodElement?.firstChild) {
                this.pricingPodElement.insertBefore(errorDiv, this.pricingPodElement.firstChild);
            }
        }
    }

    // Instantiate
    const controller = new PricingPodsController();
    window.pricingPodsController = controller;

    // Auth visibility — simplified: always show pod, recalculate on auth change
    const updatePodVisibility = (user) => {
        if (pricingPod) {
            pricingPod.style.display = '';
            setTimeout(() => {
                controller.calculateTotal(controller.currentMode, user ? 'Auth Change' : 'Guest Access');
            }, 100);
        }
    };

    // Single auth wait mechanism
    let authSetup = false;
    const setupAuthListener = () => {
        if (authSetup) return;
        if (window.auth && typeof window.auth.onAuthStateChange === 'function') {
            authSetup = true;
            window.auth.onAuthStateChange(updatePodVisibility);
            updatePodVisibility(window.auth.getCurrentUser?.());
        } else {
            updatePodVisibility(null);
        }
    };

    window.addEventListener('authReady', setupAuthListener);
    window.addEventListener('authModuleReady', setupAuthListener);

    // Start immediately, with a single fallback
    setupAuthListener();
    setTimeout(() => { if (!authSetup) setupAuthListener(); }, 5000);
});
