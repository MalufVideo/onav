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

    // Setup DOM elements first (needed for error display)
    this.setupElements();

    // Fetch prices first with retry
    let pricesLoaded = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!pricesLoaded && attempts < maxAttempts) {
      attempts++;
      console.log(`[MobileLEDCalculator] Attempting to fetch prices (attempt ${attempts}/${maxAttempts})...`);
      await this.fetchProductPrices();

      if (this.pricesLoaded && this.productPrices && Object.keys(this.productPrices).length > 0) {
        pricesLoaded = true;
        console.log('[MobileLEDCalculator] Prices loaded successfully');
      } else {
        console.warn(`[MobileLEDCalculator] Price fetch attempt ${attempts} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    if (!pricesLoaded) {
      console.error('[MobileLEDCalculator] Failed to load prices after all attempts');
      this.showPriceLoadError();
      // Continue initialization anyway - some features may still work
    }

    // Setup event listeners
    this.setupEventListeners();

    // Initial calculation (will check if prices are loaded)
    this.calculateAll();

    console.log('[MobileLEDCalculator] Initialized successfully. Prices loaded:', this.pricesLoaded);
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

    // Visual representation elements
    this.visualCanvas = document.getElementById('led-visual-canvas');
    this.visualCtx = this.visualCanvas?.getContext('2d');
    this.visualWidthLabel = document.getElementById('visual-width-label');
    this.visualHeightLabel = document.getElementById('visual-height-label');

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

    try {
      // Use the quote-service which handles Supabase client initialization
      if (!window.quoteService || typeof window.quoteService.getProductPrices !== 'function') {
        throw new Error('Quote service not available');
      }

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
    const totalModules = modulesX * modulesY;

    // Return both total and grid dimensions for processor calculation
    return {
      total: totalModules,
      modulesX: modulesX,
      modulesY: modulesY
    };
  }

  calculateProcessors(totalModules, modulesX, modulesY) {
    // Each module has 192x192 pixels (2.6mm LED resolution)
    // Each processor can handle up to 9,895,820 pixels
    const pixelsPerModule = 192 * 192; // 36,864 pixels per module
    const pixelsPerProcessor = 9895820;

    // Calculate total pixels based on module grid dimensions
    const totalPixelsWidth = modulesX * 192;
    const totalPixelsHeight = modulesY * 192;
    const totalPixels = totalPixelsWidth * totalPixelsHeight;

    // Calculate processors needed based on pixel count (matching desktop logic)
    const processorsNeeded = Math.ceil(totalPixels / pixelsPerProcessor);

    console.log(`[calculateProcessors] Modules: ${totalModules} (${modulesX}x${modulesY}), Pixels: ${totalPixels.toLocaleString()}, Processors: ${processorsNeeded}`);

    return processorsNeeded;
  }

  calculateAll() {
    // Calculate module counts
    const width = parseFloat(this.widthSlider?.value || 16);
    const height = parseFloat(this.heightSlider?.value || 5);
    const roofWidth = parseFloat(this.roofWidthSlider?.value || 0);
    const roofHeight = parseFloat(this.roofHeightSlider?.value || 0);

    // Get module information with grid dimensions
    const principalInfo = this.calculateModules(width, height);
    const tetoInfo = this.calculateModules(roofWidth, roofHeight);

    // Store for use in other methods
    this.principalInfo = principalInfo;
    this.tetoInfo = tetoInfo;

    // Update displays
    if (this.moduleCount) this.moduleCount.textContent = principalInfo.total;
    if (this.tetoModuleCount) this.tetoModuleCount.textContent = tetoInfo.total;

    // Update visual representation
    this.drawLEDVisualization(width, height, roofWidth, roofHeight);

    // Calculate prices
    this.calculatePrices();
  }

  drawLEDVisualization(principalWidth, principalHeight, tetoWidth, tetoHeight) {
    if (!this.visualCtx || !this.visualCanvas) return;

    const ctx = this.visualCtx;
    const canvas = this.visualCanvas;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update dimension labels
    if (this.visualWidthLabel) {
      this.visualWidthLabel.textContent = `${principalWidth.toFixed(1)}m largura`;
    }
    if (this.visualHeightLabel) {
      this.visualHeightLabel.textContent = `${principalHeight.toFixed(1)}m altura`;
    }

    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = 20;
    const drawWidth = canvasWidth - (padding * 2);
    const drawHeight = canvasHeight - (padding * 2);

    // Calculate scale to fit LED wall in canvas
    const maxWidth = principalWidth > 0 ? principalWidth : 16;
    const maxHeight = principalHeight + (tetoHeight > 0 ? tetoHeight : 0);
    const scaleX = drawWidth / maxWidth;
    const scaleY = drawHeight / maxHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate actual drawing dimensions
    const ledWallWidth = principalWidth * scale;
    const ledWallHeight = principalHeight * scale;
    const ledTetoWidth = tetoWidth * scale;
    const ledTetoHeight = tetoHeight * scale;

    // Center the visualization
    const startX = (canvasWidth - ledWallWidth) / 2;
    const startY = (canvasHeight - ledWallHeight - ledTetoHeight) / 2 + ledTetoHeight;

    // Draw teto (ceiling) if present
    if (tetoWidth > 0 && tetoHeight > 0) {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
      ctx.lineWidth = 2;

      const tetoX = (canvasWidth - ledTetoWidth) / 2;
      const tetoY = startY - ledTetoHeight - 5;

      ctx.fillRect(tetoX, tetoY, ledTetoWidth, ledTetoHeight);
      ctx.strokeRect(tetoX, tetoY, ledTetoWidth, ledTetoHeight);

      // Draw module grid for teto
      const tetoModulesX = this.tetoInfo?.modulesX || 0;
      const tetoModulesY = this.tetoInfo?.modulesY || 0;
      if (tetoModulesX > 1 && tetoModulesY > 1) {
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
        ctx.lineWidth = 0.5;
        const moduleWidthTeto = ledTetoWidth / tetoModulesX;
        const moduleHeightTeto = ledTetoHeight / tetoModulesY;

        for (let i = 1; i < tetoModulesX; i++) {
          ctx.beginPath();
          ctx.moveTo(tetoX + (i * moduleWidthTeto), tetoY);
          ctx.lineTo(tetoX + (i * moduleWidthTeto), tetoY + ledTetoHeight);
          ctx.stroke();
        }
        for (let i = 1; i < tetoModulesY; i++) {
          ctx.beginPath();
          ctx.moveTo(tetoX, tetoY + (i * moduleHeightTeto));
          ctx.lineTo(tetoX + ledTetoWidth, tetoY + (i * moduleHeightTeto));
          ctx.stroke();
        }
      }
    }

    // Draw principal LED wall
    ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 1)';
    ctx.lineWidth = 2;

    ctx.fillRect(startX, startY, ledWallWidth, ledWallHeight);
    ctx.strokeRect(startX, startY, ledWallWidth, ledWallHeight);

    // Draw module grid
    const principalModulesX = this.principalInfo?.modulesX || 0;
    const principalModulesY = this.principalInfo?.modulesY || 0;

    if (principalModulesX > 1 && principalModulesY > 1) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 0.5;

      const moduleWidth = ledWallWidth / principalModulesX;
      const moduleHeight = ledWallHeight / principalModulesY;

      // Vertical lines
      for (let i = 1; i < principalModulesX; i++) {
        ctx.beginPath();
        ctx.moveTo(startX + (i * moduleWidth), startY);
        ctx.lineTo(startX + (i * moduleWidth), startY + ledWallHeight);
        ctx.stroke();
      }

      // Horizontal lines
      for (let i = 1; i < principalModulesY; i++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + (i * moduleHeight));
        ctx.lineTo(startX + ledWallWidth, startY + (i * moduleHeight));
        ctx.stroke();
      }
    }

    // Draw dimension annotations
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    // Width annotation (bottom)
    ctx.fillText(`${principalWidth.toFixed(1)}m`, canvasWidth / 2, startY + ledWallHeight + 15);

    // Height annotation (right side)
    ctx.save();
    ctx.translate(startX + ledWallWidth + 15, startY + ledWallHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${principalHeight.toFixed(1)}m`, 0, 0);
    ctx.restore();
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
      console.warn('[MobileLEDCalculator] Prices not loaded yet, displaying placeholders');
      this.displayPricePlaceholders();
      return;
    }

    console.log('[MobileLEDCalculator] Calculating prices with loaded product data:', Object.keys(this.productPrices));

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

    console.log('[MobileLEDCalculator] Unit prices:', {
      modulePrice,
      processorPrice,
      vx4nBasePrice,
      vx4nBackupPrice,
      rxiiUnitPrice,
      trackingPrice,
      studioPrice,
      teamPrice
    });

    // Calculate quantities - use stored info objects for accurate values
    const principalModules = this.principalInfo?.total || 0;
    const tetoModules = this.tetoInfo?.total || 0;
    const totalModules = principalModules + tetoModules;

    console.log('[MobileLEDCalculator] Module counts:', {
      principalModules,
      tetoModules,
      totalModules
    });

    // Calculate processors using pixel-based logic from PRINCIPAL wall only (matching desktop)
    // Desktop only calculates processors from principal pixels, not teto
    const principalModulesX = this.principalInfo?.modulesX || 0;
    const principalModulesY = this.principalInfo?.modulesY || 0;
    const processorsNeeded = this.calculateProcessors(principalModules, principalModulesX, principalModulesY);

    console.log('[MobileLEDCalculator] Calculated processors:', processorsNeeded, 'for grid:', principalModulesX, 'x', principalModulesY);

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

    console.log('[MobileLEDCalculator] Price calculation complete:');
    console.log('  - LED Modules:', this.formatPrice(modulesTotalCost));
    console.log('  - Processors:', this.formatPrice(processorsCost));
    console.log('  - Server:', this.formatPrice(serverCost), this.isBackupActive ? '(with backup)' : '(base only)');
    if (this.currentMode === '3d') {
      const rxiiUnits = parseInt(this.rxiiSlider?.value || 2);
      console.log('  - RXII (' + rxiiUnits + ' units):', this.formatPrice(rxiiUnits * rxiiUnitPrice));
      console.log('  - Tracking:', this.formatPrice(trackingPrice));
    }
    console.log('  - Estúdio:', this.formatPrice(studioPrice));
    console.log('  - Equipe:', this.formatPrice(teamPrice));
    console.log('  TOTAL:', this.formatPrice(total));
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

    // Get current values from stored info objects (more accurate than DOM)
    const principalModules = this.principalInfo?.total || 0;
    const tetoModules = this.tetoInfo?.total || 0;
    const totalModules = principalModules + tetoModules;
    const processorsNeeded = this.calculateProcessors(
      principalModules,
      this.principalInfo?.modulesX || 0,
      this.principalInfo?.modulesY || 0
    );
    const rxiiUnits = parseInt(this.rxiiSlider?.value || 2);

    console.log('[MobileLEDCalculator] Populating cart with:', {
      principalModules,
      tetoModules,
      totalModules,
      processorsNeeded,
      rxiiUnits
    });

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
      total_modules: (this.principalInfo?.total || 0) + (this.tetoInfo?.total || 0),
      processors_needed: this.calculateProcessors(
        this.principalInfo?.total || 0,
        this.principalInfo?.modulesX || 0,
        this.principalInfo?.modulesY || 0
      ),
      rxii_units: this.currentMode === '3d' ? parseInt(this.rxiiSlider?.value || 2) : 0,
      backup_active: this.isBackupActive,

      // Total price (keep as formatted string for consistency with desktop version)
      total_price: this.totalPriceEl?.textContent || 'R$ 0'
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
        // Store calculator source for back navigation
        localStorage.setItem('calculatorSource', 'led');
        window.location.href = 'my-quotes.html';
      });
    }
  }

  displayPricePlaceholders() {
    // Display loading placeholders when prices aren't loaded yet
    const placeholder = 'Carregando...';
    if (this.modulesPriceEl) this.modulesPriceEl.textContent = placeholder;
    if (this.processorsPriceEl) this.processorsPriceEl.textContent = placeholder;
    if (this.serverPriceEl) this.serverPriceEl.textContent = placeholder;
    if (this.rxiiPriceEl) this.rxiiPriceEl.textContent = placeholder;
    if (this.trackingPriceEl) this.trackingPriceEl.textContent = placeholder;
    if (this.studioPriceEl) this.studioPriceEl.textContent = placeholder;
    if (this.teamPriceEl) this.teamPriceEl.textContent = placeholder;
    if (this.totalPriceEl) this.totalPriceEl.textContent = placeholder;
  }

  showPriceLoadError() {
    // Display error message when prices fail to load
    const errorMsg = 'Erro ao carregar preços';
    if (this.modulesPriceEl) this.modulesPriceEl.textContent = errorMsg;
    if (this.processorsPriceEl) this.processorsPriceEl.textContent = errorMsg;
    if (this.serverPriceEl) this.serverPriceEl.textContent = errorMsg;
    if (this.rxiiPriceEl) this.rxiiPriceEl.textContent = errorMsg;
    if (this.trackingPriceEl) this.trackingPriceEl.textContent = errorMsg;
    if (this.studioPriceEl) this.studioPriceEl.textContent = errorMsg;
    if (this.teamPriceEl) this.teamPriceEl.textContent = errorMsg;
    if (this.totalPriceEl) this.totalPriceEl.textContent = errorMsg;

    console.error('[MobileLEDCalculator] Please check:',
      '\n1. Supabase connection',
      '\n2. Products table has data',
      '\n3. Network connectivity');
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
