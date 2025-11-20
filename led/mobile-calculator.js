// Mobile LED Calculator
// Simplified version for mobile devices

class MobileLEDCalculator {
  constructor() {
    this.productPrices = {};
    this.pricesLoaded = false;
    this.currentMode = '3d'; // Default mode
    this.isBackupActive = false;

    // Module size (each module is 0.5m x 0.5m)
    this.moduleSize = 0.5;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    console.log('[MobileLEDCalculator] Initializing...');

    // Setup DOM elements first
    this.setupElements();

    // Setup event listeners
    this.setupEventListeners();

    // Show loading state immediately
    this.calculateAll();

    // Fetch prices (async)
    await this.fetchProductPrices();

    // Recalculate with actual prices after loading
    this.calculateAll();

    console.log('[MobileLEDCalculator] Initialized successfully with prices:', this.pricesLoaded);
  }

  setupElements() {
    // LED Principal controls
    this.widthSlider = document.getElementById('width');
    this.heightSlider = document.getElementById('height');
    this.widthValue = document.getElementById('width-value');
    this.heightValue = document.getElementById('height-value');
    this.moduleCount = document.getElementById('module-count');

    // Teto controls
    this.roofWidthSlider = document.getElementById('roof-width');
    this.roofHeightSlider = document.getElementById('roof-height');
    this.roofWidthValue = document.getElementById('roof-width-value');
    this.roofHeightValue = document.getElementById('roof-height-value');
    this.tetoModuleCount = document.getElementById('teto-module-count');

    // Mode buttons
    this.mode3dBtn = document.getElementById('mode-3d');
    this.mode2dBtn = document.getElementById('mode-2d');

    // RXII controls
    this.rxiiSection = document.getElementById('rxii-section');
    this.rxiiSlider = document.getElementById('rxii-units');
    this.rxiiValue = document.getElementById('rxii-units-value');

    // Backup button
    this.backupBtn = document.getElementById('backup-btn');

    // Price displays
    this.modulesPriceEl = document.getElementById('modules-price');
    this.processorsPriceEl = document.getElementById('processors-price');
    this.serverPriceEl = document.getElementById('server-price');
    this.rxiiPriceEl = document.getElementById('rxii-price');
    this.trackingPriceEl = document.getElementById('tracking-price');
    this.studioPriceEl = document.getElementById('studio-price');
    this.teamPriceEl = document.getElementById('team-price');
    this.totalPriceEl = document.getElementById('total-price');

    // Price rows (for hiding/showing)
    this.rxiiPriceRow = document.getElementById('rxii-price-row');
    this.trackingPriceRow = document.getElementById('tracking-price-row');

    // Modal elements
    this.propostaBtn = document.getElementById('proposta-btn');
    this.quoteModal = document.getElementById('quote-modal');
    this.quoteCloseBtn = document.getElementById('quote-close-btn');
    this.quoteSubmitBtn = document.getElementById('quote-submit-btn');
  }

  setupEventListeners() {
    // LED Principal sliders
    this.widthSlider?.addEventListener('input', (e) => {
      this.widthValue.textContent = e.target.value;
      this.calculateAll();
    });

    this.heightSlider?.addEventListener('input', (e) => {
      this.heightValue.textContent = e.target.value;
      this.calculateAll();
    });

    // Teto sliders
    this.roofWidthSlider?.addEventListener('input', (e) => {
      this.roofWidthValue.textContent = e.target.value;
      this.calculateAll();
    });

    this.roofHeightSlider?.addEventListener('input', (e) => {
      this.roofHeightValue.textContent = e.target.value;
      this.calculateAll();
    });

    // Mode buttons
    this.mode3dBtn?.addEventListener('click', () => this.switchMode('3d'));
    this.mode2dBtn?.addEventListener('click', () => this.switchMode('2d'));

    // RXII slider
    this.rxiiSlider?.addEventListener('input', (e) => {
      this.rxiiValue.textContent = e.target.value;
      if (this.currentMode === '3d') {
        this.calculatePrices();
      }
    });

    // Backup button
    this.backupBtn?.addEventListener('click', () => {
      this.isBackupActive = !this.isBackupActive;
      this.backupBtn.classList.toggle('active', this.isBackupActive);
      this.backupBtn.textContent = this.isBackupActive ? '- Remover Backup' : '+ Adicionar Backup';
      this.calculatePrices();
    });

    // Proposta button
    this.propostaBtn?.addEventListener('click', () => this.handlePropostaClick());

    // Modal close
    this.quoteCloseBtn?.addEventListener('click', () => this.closeModal());

    // Modal overlay click (close on outside click)
    this.quoteModal?.addEventListener('click', (e) => {
      if (e.target === this.quoteModal) {
        this.closeModal();
      }
    });

    // Quote submit
    this.quoteSubmitBtn?.addEventListener('click', () => this.submitQuote());
  }

  async fetchProductPrices() {
    console.log('[MobileLEDCalculator] Fetching prices from Supabase...');

    // Wait for Supabase config to be ready before fetching prices
    if (!window.SUPABASE_KEY) {
      console.log('[MobileLEDCalculator] Waiting for Supabase config...');
      await new Promise((resolve) => {
        if (window.SUPABASE_KEY) {
          resolve();
        } else {
          const handler = () => {
            window.removeEventListener('supabaseConfigReady', handler);
            resolve();
          };
          window.addEventListener('supabaseConfigReady', handler);

          // Timeout after 10 seconds
          setTimeout(() => {
            window.removeEventListener('supabaseConfigReady', handler);
            resolve();
          }, 10000);
        }
      });
    }

    // Wait for quote service to be ready
    if (!window.quoteService || typeof window.quoteService.getProductPrices !== 'function') {
      console.log('[MobileLEDCalculator] Waiting for quote service...');
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait

      while ((!window.quoteService || typeof window.quoteService.getProductPrices !== 'function') && attempts < maxAttempts) {
        console.log(`[MobileLEDCalculator] Quote service not ready, attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.quoteService || typeof window.quoteService.getProductPrices !== 'function') {
        console.error('[MobileLEDCalculator] Quote service not available after waiting');
        this.productPrices = {};
        this.pricesLoaded = false;
        return;
      }
    }

    try {
      const result = await window.quoteService.getProductPrices();

      if (result.success && result.data) {
        this.productPrices = result.data;
        console.log('[MobileLEDCalculator] Prices fetched successfully:', this.productPrices);
        this.pricesLoaded = true;
      } else {
        throw new Error(result.error || 'No price data returned');
      }
    } catch (error) {
      console.error('[MobileLEDCalculator] Error fetching prices:', error);
      this.productPrices = {};
      this.pricesLoaded = false;
    }
  }

  calculateModules(width, height) {
    // Each module is 0.5m x 0.5m
    const modulesX = Math.ceil(width / this.moduleSize);
    const modulesY = Math.ceil(height / this.moduleSize);
    return modulesX * modulesY;
  }

  calculateProcessors(totalModules) {
    // Each processor handles up to 100 modules
    return Math.ceil(totalModules / 100);
  }

  calculateAll() {
    // Calculate module counts
    const width = parseFloat(this.widthSlider?.value || 16);
    const height = parseFloat(this.heightSlider?.value || 5);
    const roofWidth = parseFloat(this.roofWidthSlider?.value || 0);
    const roofHeight = parseFloat(this.roofHeightSlider?.value || 0);

    const principalModules = this.calculateModules(width, height);
    const tetoModules = this.calculateModules(roofWidth, roofHeight);

    // Update displays
    if (this.moduleCount) this.moduleCount.textContent = principalModules;
    if (this.tetoModuleCount) this.tetoModuleCount.textContent = tetoModules;

    // Calculate prices
    this.calculatePrices();
  }

  switchMode(mode) {
    if (mode === this.currentMode) return;

    console.log('[MobileLEDCalculator] Switching to mode:', mode);
    this.currentMode = mode;

    // Update button states
    this.mode3dBtn?.classList.toggle('active', mode === '3d');
    this.mode2dBtn?.classList.toggle('active', mode === '2d');

    // Show/hide RXII section and price rows based on mode
    if (mode === '3d') {
      if (this.rxiiSection) this.rxiiSection.style.display = 'block';
      if (this.rxiiPriceRow) this.rxiiPriceRow.style.display = 'flex';
      if (this.trackingPriceRow) this.trackingPriceRow.style.display = 'flex';
    } else {
      if (this.rxiiSection) this.rxiiSection.style.display = 'none';
      if (this.rxiiPriceRow) this.rxiiPriceRow.style.display = 'none';
      if (this.trackingPriceRow) this.trackingPriceRow.style.display = 'none';
    }

    // Recalculate prices
    this.calculatePrices();
  }

  formatPrice(value) {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return 'R$ 0';
    return 'R$ ' + numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  calculatePrices() {
    if (!this.pricesLoaded || !this.productPrices || Object.keys(this.productPrices).length === 0) {
      console.warn('[MobileLEDCalculator] Prices not loaded yet, showing loading state');

      // Show loading state
      if (this.modulesPriceEl) this.modulesPriceEl.textContent = 'Carregando...';
      if (this.processorsPriceEl) this.processorsPriceEl.textContent = 'Carregando...';
      if (this.serverPriceEl) this.serverPriceEl.textContent = 'Carregando...';
      if (this.rxiiPriceEl) this.rxiiPriceEl.textContent = 'Carregando...';
      if (this.trackingPriceEl) this.trackingPriceEl.textContent = 'Carregando...';
      if (this.studioPriceEl) this.studioPriceEl.textContent = 'Carregando...';
      if (this.teamPriceEl) this.teamPriceEl.textContent = 'Carregando...';
      if (this.totalPriceEl) this.totalPriceEl.textContent = 'Carregando...';

      return;
    }

    let total = 0;

    // Get unit prices from database
    const modulePrice = this.productPrices['LED Module'] || 0;
    const processorPrice = this.productPrices['MX-40 Pro Processor'] || 0;
    const vx4nBasePrice = this.productPrices['Disguise VX4n (Base)'] || 0;
    const vx4nBackupPrice = this.productPrices['Disguise VX4n (Backup)'] || vx4nBasePrice || 0;
    const rxiiUnitPrice = this.productPrices['Disguise RXII Unit'] || 0;
    const trackingPrice = this.productPrices['Stype Tracking'] || 0;
    const studioPrice = this.productPrices['Estúdio'] || 6000;
    const teamPrice = this.productPrices['Equipe Técnica da Diária'] || this.productPrices['Equipe Técnica Diária'] || 0;

    // Calculate quantities
    const principalModules = parseInt(this.moduleCount?.textContent || 0);
    const tetoModules = parseInt(this.tetoModuleCount?.textContent || 0);
    const totalModules = principalModules + tetoModules;
    const processorsNeeded = this.calculateProcessors(totalModules);

    // 1. LED Modules
    const modulesTotalCost = totalModules * modulePrice;
    total += modulesTotalCost;
    if (this.modulesPriceEl) this.modulesPriceEl.textContent = this.formatPrice(modulesTotalCost);

    // 2. Processors
    const processorsCost = processorsNeeded * processorPrice;
    total += processorsCost;
    if (this.processorsPriceEl) this.processorsPriceEl.textContent = this.formatPrice(processorsCost);

    // 3. Disguise Server (with optional backup)
    const serverCost = this.isBackupActive ? (vx4nBasePrice + vx4nBackupPrice) : vx4nBasePrice;
    total += serverCost;
    if (this.serverPriceEl) this.serverPriceEl.textContent = this.formatPrice(serverCost);

    // 4. RXII (only in 3D mode)
    if (this.currentMode === '3d') {
      const rxiiUnits = parseInt(this.rxiiSlider?.value || 2);
      const rxiiTotalCost = rxiiUnits * rxiiUnitPrice;
      total += rxiiTotalCost;
      if (this.rxiiPriceEl) this.rxiiPriceEl.textContent = this.formatPrice(rxiiTotalCost);

      // 5. Tracking (only in 3D mode)
      total += trackingPrice;
      if (this.trackingPriceEl) this.trackingPriceEl.textContent = this.formatPrice(trackingPrice);
    }

    // 6. Studio
    total += studioPrice;
    if (this.studioPriceEl) this.studioPriceEl.textContent = this.formatPrice(studioPrice);

    // 7. Team
    total += teamPrice;
    if (this.teamPriceEl) this.teamPriceEl.textContent = this.formatPrice(teamPrice);

    // Update total
    if (this.totalPriceEl) this.totalPriceEl.textContent = this.formatPrice(total);

    console.log('[MobileLEDCalculator] Calculated total:', total);
  }

  handlePropostaClick() {
    console.log('[MobileLEDCalculator] Proposta button clicked');

    // Check authentication
    if (window.auth && window.auth.isAuthenticated()) {
      // User is logged in, show the quote modal
      this.showQuoteModal();
    } else {
      // User is not logged in, show login modal
      console.log('[MobileLEDCalculator] User not authenticated, opening login modal');
      if (window.authUI && typeof window.authUI.openModal === 'function') {
        window.authUI.openModal('login-modal');
      } else {
        alert('Por favor, faça login ou cadastre-se para gerar uma proposta.');
      }
    }
  }

  showQuoteModal() {
    if (!this.quoteModal) return;

    // Populate cart items
    this.populateCartItems();

    // Show modal
    this.quoteModal.style.display = 'flex';
  }

  closeModal() {
    if (this.quoteModal) {
      this.quoteModal.style.display = 'none';
    }
  }

  populateCartItems() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    const items = [];

    // Get current values
    const principalModules = parseInt(this.moduleCount?.textContent || 0);
    const tetoModules = parseInt(this.tetoModuleCount?.textContent || 0);
    const totalModules = principalModules + tetoModules;
    const processorsNeeded = this.calculateProcessors(totalModules);
    const rxiiUnits = parseInt(this.rxiiSlider?.value || 2);

    // Get prices
    const modulePrice = this.productPrices['LED Module'] || 0;
    const processorPrice = this.productPrices['MX-40 Pro Processor'] || 0;
    const vx4nBasePrice = this.productPrices['Disguise VX4n (Base)'] || 0;
    const vx4nBackupPrice = this.productPrices['Disguise VX4n (Backup)'] || 0;
    const rxiiUnitPrice = this.productPrices['Disguise RXII Unit'] || 0;
    const trackingPrice = this.productPrices['Stype Tracking'] || 0;
    const studioPrice = this.productPrices['Estúdio'] || 6000;
    const teamPrice = this.productPrices['Equipe Técnica da Diária'] || this.productPrices['Equipe Técnica Diária'] || 0;

    // Build items list
    items.push(`<div style="margin-bottom: 8px;"><strong>LED Modules:</strong> ${totalModules} × ${this.formatPrice(modulePrice)} = ${this.formatPrice(totalModules * modulePrice)}</div>`);
    items.push(`<div style="margin-bottom: 8px;"><strong>Processadores:</strong> ${processorsNeeded} × ${this.formatPrice(processorPrice)} = ${this.formatPrice(processorsNeeded * processorPrice)}</div>`);
    items.push(`<div style="margin-bottom: 8px;"><strong>Disguise VX4n Base:</strong> ${this.formatPrice(vx4nBasePrice)}</div>`);

    if (this.isBackupActive) {
      items.push(`<div style="margin-bottom: 8px;"><strong>Disguise VX4n Backup:</strong> ${this.formatPrice(vx4nBackupPrice)}</div>`);
    }

    if (this.currentMode === '3d') {
      items.push(`<div style="margin-bottom: 8px;"><strong>Disguise RXII:</strong> ${rxiiUnits} × ${this.formatPrice(rxiiUnitPrice)} = ${this.formatPrice(rxiiUnits * rxiiUnitPrice)}</div>`);
      items.push(`<div style="margin-bottom: 8px;"><strong>Tracking:</strong> ${this.formatPrice(trackingPrice)}</div>`);
    }

    items.push(`<div style="margin-bottom: 8px;"><strong>Estúdio:</strong> ${this.formatPrice(studioPrice)}</div>`);
    items.push(`<div style="margin-bottom: 8px;"><strong>Equipe:</strong> ${this.formatPrice(teamPrice)}</div>`);

    container.innerHTML = items.join('');

    // Update cart total
    const cartTotal = document.getElementById('cart-total-price');
    if (cartTotal) {
      cartTotal.textContent = this.totalPriceEl?.textContent || 'R$ 0';
    }
  }

  async submitQuote() {
    console.log('[MobileLEDCalculator] Submitting quote...');

    // Get form values
    const projectName = document.getElementById('project-name')?.value;
    const startDate = document.getElementById('shooting-dates-start')?.value;
    const endDate = document.getElementById('shooting-dates-end')?.value;

    // Validation
    if (!projectName || !startDate || !endDate) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Calculate days
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Build proposal data
    const proposalData = {
      project_name: projectName,
      shooting_dates_start: startDate,
      shooting_dates_end: endDate,
      days_count: days,
      selected_pod_type: this.currentMode,

      // LED configuration
      led_principal_width: parseFloat(this.widthSlider?.value || 0),
      led_principal_height: parseFloat(this.heightSlider?.value || 0),
      led_principal_modules: parseInt(this.moduleCount?.textContent || 0),

      led_teto_width: parseFloat(this.roofWidthSlider?.value || 0),
      led_teto_height: parseFloat(this.roofHeightSlider?.value || 0),
      led_teto_modules: parseInt(this.tetoModuleCount?.textContent || 0),

      // Pricing
      total_modules: parseInt(this.moduleCount?.textContent || 0) + parseInt(this.tetoModuleCount?.textContent || 0),
      processors_needed: this.calculateProcessors(parseInt(this.moduleCount?.textContent || 0) + parseInt(this.tetoModuleCount?.textContent || 0)),
      rxii_units: this.currentMode === '3d' ? parseInt(this.rxiiSlider?.value || 2) : 0,
      backup_active: this.isBackupActive,

      // Total price (extract number from formatted string)
      total_price: this.parsePrice(this.totalPriceEl?.textContent || '0')
    };

    console.log('[MobileLEDCalculator] Proposal data:', proposalData);

    // Save proposal using quote service
    try {
      if (!window.quoteService || typeof window.quoteService.saveProposal !== 'function') {
        throw new Error('Quote service not available');
      }

      const result = await window.quoteService.saveProposal(proposalData);

      if (result.success) {
        console.log('[MobileLEDCalculator] Quote saved successfully');
        this.closeModal();
        this.showConfirmationModal();
      } else {
        throw new Error(result.error || 'Failed to save proposal');
      }
    } catch (error) {
      console.error('[MobileLEDCalculator] Error saving quote:', error);
      alert('Erro ao salvar proposta. Por favor, tente novamente.');
    }
  }

  parseDate(dateStr) {
    // Parse DD/MM/YYYY format
    const parts = dateStr.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  parsePrice(priceStr) {
    // Extract number from "R$ 1.234" format
    return parseInt(priceStr.replace(/[^\d]/g, '')) || 0;
  }

  showConfirmationModal() {
    const confirmModal = document.getElementById('confirmation-modal');
    if (confirmModal) {
      confirmModal.style.display = 'flex';

      // Setup close button
      const closeBtn = document.getElementById('confirmation-close-btn');
      closeBtn?.addEventListener('click', () => {
        confirmModal.style.display = 'none';
      });

      // Setup view proposals button
      const viewBtn = document.getElementById('view-my-proposals-btn');
      viewBtn?.addEventListener('click', () => {
        window.location.href = '/led/my-quotes.html';
      });
    }
  }
}

// Initialize calculator when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mobileCalculator = new MobileLEDCalculator();
  });
} else {
  window.mobileCalculator = new MobileLEDCalculator();
}
