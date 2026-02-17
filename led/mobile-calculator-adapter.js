// Mobile LED Calculator Adapter for Responsive Layout
// Uses shared-utils.js: ProductPriceCache, PRODUCT_NAMES, formatPrice, ledLog

class MobileCalculatorAdapter {
  constructor() {
    this.productPrices = {};
    this.pricesLoaded = false;
    this.currentMode = '3d';
    this.isBackupActive = false;
    this.moduleSize = 0.5;

    // Check if we're on mobile viewport
    this.isMobileViewport = () => window.innerWidth <= 768;

    // Initialize only if mobile viewport
    if (this.isMobileViewport()) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
      } else {
        this.initialize();
      }
    }

    // Re-initialize on resize if viewport changes
    window.addEventListener('resize', () => {
      if (this.isMobileViewport() && !this.initialized) {
        this.initialize();
      }
    });
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    ledLog('[MobileCalculatorAdapter] Initializing...');

    this.setupElements();

    // Use shared price cache
    try {
      this.productPrices = await window.ProductPriceCache.get();
      this.pricesLoaded = Object.keys(this.productPrices).length > 0;
    } catch (error) {
      console.error('[MobileCalculatorAdapter] Failed to load prices:', error);
      this.productPrices = {};
      this.pricesLoaded = false;
    }

    if (!this.pricesLoaded) {
      this.showPriceLoadError();
    }

    this.setupEventListeners();
    this.calculateAll();

    ledLog('[MobileCalculatorAdapter] Initialization complete');
  }

  setupElements() {
    // LED Principal controls
    this.widthSlider = document.getElementById('mobile-width');
    this.heightSlider = document.getElementById('mobile-height');
    this.widthValue = document.getElementById('mobile-width-value');
    this.heightValue = document.getElementById('mobile-height-value');
    this.moduleCount = document.getElementById('mobile-module-count');

    // Teto controls
    this.roofWidthSlider = document.getElementById('mobile-roof-width');
    this.roofHeightSlider = document.getElementById('mobile-roof-height');
    this.roofWidthValue = document.getElementById('mobile-roof-width-value');
    this.roofHeightValue = document.getElementById('mobile-roof-height-value');
    this.tetoModuleCount = document.getElementById('mobile-teto-module-count');

    // Mode buttons
    this.mode3dBtn = document.getElementById('mobile-mode-3d');
    this.mode2dBtn = document.getElementById('mobile-mode-2d');

    // RXII controls
    this.rxiiSection = document.getElementById('mobile-rxii-section');
    this.rxiiSlider = document.getElementById('mobile-rxii-units');
    this.rxiiValue = document.getElementById('mobile-rxii-units-value');

    // Backup button
    this.backupBtn = document.getElementById('mobile-backup-btn');

    // Price displays
    this.modulesPriceEl = document.getElementById('mobile-modules-price');
    this.processorsPriceEl = document.getElementById('mobile-processors-price');
    this.serverPriceEl = document.getElementById('mobile-server-price');
    this.rxiiPriceEl = document.getElementById('mobile-rxii-price');
    this.trackingPriceEl = document.getElementById('mobile-tracking-price');
    this.studioPriceEl = document.getElementById('mobile-studio-price');
    this.teamPriceEl = document.getElementById('mobile-team-price');
    this.totalPriceEl = document.getElementById('mobile-total-price');

    // Price rows
    this.rxiiPriceRow = document.getElementById('mobile-rxii-price-row');
    this.trackingPriceRow = document.getElementById('mobile-tracking-price-row');

    // Visual canvas
    this.visualCanvas = document.getElementById('led-visual-canvas');
    this.visualCtx = this.visualCanvas?.getContext('2d');
    this.visualWidthLabel = document.getElementById('visual-width-label');
    this.visualHeightLabel = document.getElementById('visual-height-label');

    // Proposta button
    this.propostaBtn = document.getElementById('mobile-proposta-btn');
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

    // Teto collapsible toggle
    const tetoToggle = document.getElementById('mobile-teto-toggle');
    const tetoContent = document.getElementById('mobile-teto-content');
    if (tetoToggle && tetoContent) {
      tetoToggle.addEventListener('click', function() {
        const isVisible = tetoContent.style.display !== 'none';
        tetoContent.style.display = isVisible ? 'none' : 'block';
        const toggleIcon = this.querySelector('.toggle-icon');
        if (toggleIcon) {
          toggleIcon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      });
    }
  }


  calculateModules(width, height) {
    const modulesX = Math.ceil(width / this.moduleSize);
    const modulesY = Math.ceil(height / this.moduleSize);
    return {
      total: modulesX * modulesY,
      modulesX: modulesX,
      modulesY: modulesY
    };
  }

  calculateProcessors(totalModules, modulesX, modulesY) {
    const pixelsPerProcessor = 9895820;
    const totalPixelsWidth = modulesX * 192;
    const totalPixelsHeight = modulesY * 192;
    const totalPixels = totalPixelsWidth * totalPixelsHeight;
    return Math.ceil(totalPixels / pixelsPerProcessor);
  }

  calculateAll() {
    const width = parseFloat(this.widthSlider?.value || 16);
    const height = parseFloat(this.heightSlider?.value || 5);
    const roofWidth = parseFloat(this.roofWidthSlider?.value || 0);
    const roofHeight = parseFloat(this.roofHeightSlider?.value || 0);

    this.principalInfo = this.calculateModules(width, height);
    this.tetoInfo = this.calculateModules(roofWidth, roofHeight);

    if (this.moduleCount) this.moduleCount.textContent = this.principalInfo.total;
    if (this.tetoModuleCount) this.tetoModuleCount.textContent = this.tetoInfo.total;

    this.drawLEDVisualization(width, height, roofWidth, roofHeight);
    this.calculatePrices();
  }

  drawLEDVisualization(principalWidth, principalHeight, tetoWidth, tetoHeight) {
    if (!this.visualCtx || !this.visualCanvas) return;

    const ctx = this.visualCtx;
    const canvas = this.visualCanvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.visualWidthLabel) {
      this.visualWidthLabel.textContent = `${principalWidth.toFixed(1)}m largura`;
    }
    if (this.visualHeightLabel) {
      this.visualHeightLabel.textContent = `${principalHeight.toFixed(1)}m altura`;
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = 20;
    const drawWidth = canvasWidth - (padding * 2);
    const drawHeight = canvasHeight - (padding * 2);

    const maxWidth = principalWidth > 0 ? principalWidth : 16;
    const maxHeight = principalHeight + (tetoHeight > 0 ? tetoHeight : 0);
    const scaleX = drawWidth / maxWidth;
    const scaleY = drawHeight / maxHeight;
    const scale = Math.min(scaleX, scaleY);

    const ledWallWidth = principalWidth * scale;
    const ledWallHeight = principalHeight * scale;
    const ledTetoWidth = tetoWidth * scale;
    const ledTetoHeight = tetoHeight * scale;

    const startX = (canvasWidth - ledWallWidth) / 2;
    const startY = (canvasHeight - ledWallHeight - ledTetoHeight) / 2 + ledTetoHeight;

    // Draw teto if present
    if (tetoWidth > 0 && tetoHeight > 0) {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
      ctx.lineWidth = 2;

      const tetoX = (canvasWidth - ledTetoWidth) / 2;
      const tetoY = startY - ledTetoHeight - 5;

      ctx.fillRect(tetoX, tetoY, ledTetoWidth, ledTetoHeight);
      ctx.strokeRect(tetoX, tetoY, ledTetoWidth, ledTetoHeight);
    }

    // Draw principal LED wall
    ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 1)';
    ctx.lineWidth = 2;

    ctx.fillRect(startX, startY, ledWallWidth, ledWallHeight);
    ctx.strokeRect(startX, startY, ledWallWidth, ledWallHeight);

    // Draw dimension annotations
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${principalWidth.toFixed(1)}m`, canvasWidth / 2, startY + ledWallHeight + 15);
  }

  switchMode(mode) {
    if (mode === this.currentMode) return;

    this.currentMode = mode;

    this.mode3dBtn?.classList.toggle('active', mode === '3d');
    this.mode2dBtn?.classList.toggle('active', mode === '2d');

    if (mode === '3d') {
      if (this.rxiiSection) this.rxiiSection.style.display = 'block';
      if (this.rxiiPriceRow) this.rxiiPriceRow.style.display = 'flex';
      if (this.trackingPriceRow) this.trackingPriceRow.style.display = 'flex';
    } else {
      if (this.rxiiSection) this.rxiiSection.style.display = 'none';
      if (this.rxiiPriceRow) this.rxiiPriceRow.style.display = 'none';
      if (this.trackingPriceRow) this.trackingPriceRow.style.display = 'none';
    }

    this.calculatePrices();
  }

  calculatePrices() {
    if (!this.pricesLoaded || !this.productPrices || Object.keys(this.productPrices).length === 0) {
      this.displayPricePlaceholders();
      return;
    }

    let total = 0;

    const modulePrice = this.productPrices[PRODUCT_NAMES.LED_MODULE] || 0;
    const processorPrice = this.productPrices[PRODUCT_NAMES.MX40_PROCESSOR] || 0;
    const vx4nBasePrice = this.productPrices[PRODUCT_NAMES.DISGUISE_VX4N_BASE] || 0;
    const vx4nBackupPrice = this.productPrices[PRODUCT_NAMES.DISGUISE_VX4N_BACKUP] || vx4nBasePrice || 0;
    const rxiiUnitPrice = this.productPrices[PRODUCT_NAMES.DISGUISE_RXII] || 0;
    const trackingPrice = this.productPrices[PRODUCT_NAMES.STYPE_TRACKING] || 0;
    const studioPrice = this.productPrices[PRODUCT_NAMES.ESTUDIO] || 6000;
    const teamPrice = this.productPrices[PRODUCT_NAMES.EQUIPE_TECNICA] || this.productPrices[PRODUCT_NAMES.EQUIPE_TECNICA_ALT] || 0;

    const principalModules = this.principalInfo?.total || 0;
    const tetoModules = this.tetoInfo?.total || 0;
    const totalModules = principalModules + tetoModules;
    const processorsNeeded = this.calculateProcessors(principalModules, this.principalInfo?.modulesX || 0, this.principalInfo?.modulesY || 0);

    // 1. LED Modules
    const modulesTotalCost = totalModules * modulePrice;
    total += modulesTotalCost;
    if (this.modulesPriceEl) this.modulesPriceEl.textContent = formatPrice(modulesTotalCost);

    // 2. Processors
    const processorsCost = processorsNeeded * processorPrice;
    total += processorsCost;
    if (this.processorsPriceEl) this.processorsPriceEl.textContent = formatPrice(processorsCost);

    // 3. Server
    const serverCost = this.isBackupActive ? (vx4nBasePrice + vx4nBackupPrice) : vx4nBasePrice;
    total += serverCost;
    if (this.serverPriceEl) this.serverPriceEl.textContent = formatPrice(serverCost);

    // 4. RXII (only in 3D mode)
    if (this.currentMode === '3d') {
      const rxiiUnits = parseInt(this.rxiiSlider?.value || 2);
      const rxiiTotalCost = rxiiUnits * rxiiUnitPrice;
      total += rxiiTotalCost;
      if (this.rxiiPriceEl) this.rxiiPriceEl.textContent = formatPrice(rxiiTotalCost);

      // 5. Tracking
      total += trackingPrice;
      if (this.trackingPriceEl) this.trackingPriceEl.textContent = formatPrice(trackingPrice);
    }

    // 6. Studio
    total += studioPrice;
    if (this.studioPriceEl) this.studioPriceEl.textContent = formatPrice(studioPrice);

    // 7. Team
    total += teamPrice;
    if (this.teamPriceEl) this.teamPriceEl.textContent = formatPrice(teamPrice);

    // Update total
    if (this.totalPriceEl) this.totalPriceEl.textContent = formatPrice(total);
  }

  handlePropostaClick() {
    console.log('[MobileCalculatorAdapter] Proposta button clicked');

    if (window.auth && window.auth.isAuthenticated()) {
      // User is logged in - trigger the desktop quote modal system
      if (window.quoteCartModal) {
        window.quoteCartModal.show();
      }
    } else {
      // User is not logged in
      if (window.authUI && typeof window.authUI.openModal === 'function') {
        window.authUI.openModal('login-modal');
      } else {
        alert('Por favor, faça login ou cadastre-se para gerar uma proposta.');
      }
    }
  }

  displayPricePlaceholders() {
    const placeholder = '...';
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
    const errorMsg = 'Erro';
    if (this.modulesPriceEl) this.modulesPriceEl.textContent = errorMsg;
    if (this.processorsPriceEl) this.processorsPriceEl.textContent = errorMsg;
    if (this.serverPriceEl) this.serverPriceEl.textContent = errorMsg;
    if (this.rxiiPriceEl) this.rxiiPriceEl.textContent = errorMsg;
    if (this.trackingPriceEl) this.trackingPriceEl.textContent = errorMsg;
    if (this.studioPriceEl) this.studioPriceEl.textContent = errorMsg;
    if (this.teamPriceEl) this.teamPriceEl.textContent = errorMsg;
    if (this.totalPriceEl) this.totalPriceEl.textContent = errorMsg;
  }
}

// Initialize
if (window.innerWidth <= 768) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.mobileCalculatorAdapter = new MobileCalculatorAdapter();
    });
  } else {
    window.mobileCalculatorAdapter = new MobileCalculatorAdapter();
  }
}
