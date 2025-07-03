class LEDWallCalculator {
  constructor() {
    this.productPrices = {}; // To store fetched prices
    this.pricesLoaded = false; // Flag to track if prices are loaded

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    try {
        await this.fetchProductPrices(); // Fetch prices first
        this.pricesLoaded = true;
    } catch (error) {
        console.error("Failed to load product prices. Using default/hardcoded values.", error);
        // Optionally, display an error message to the user on the page
        this.showPriceLoadingError();
        // We might still proceed with default values or stop initialization
        // For now, let's proceed cautiously, calculations might be incorrect
    }

    // Scene, camera and renderer settings
    this.scene = new THREE.Scene();
    // Use container width from DOM or calculate based on screen width
    const container = document.getElementById('canvas-container');
    // For screens smaller than Full HD (1920px), use 60%, otherwise use 64%
    const widthPercent = window.innerWidth >= 1920 ? 0.64 : 0.60;
    // Cache container dimensions to avoid forced reflows
    let containerWidth;
    if (container) {
      // Use requestAnimationFrame to batch DOM reads
      containerWidth = container.getBoundingClientRect().width;
    } else {
      containerWidth = window.innerWidth * widthPercent;
    }
    // Store dimensions for future use
    this.cachedDimensions = {
      width: containerWidth,
      height: window.innerHeight,
      lastUpdate: performance.now()
    };
    this.camera = new THREE.PerspectiveCamera(
      75,
      containerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Module size (each module is 0.5m x 0.5m)
    this.moduleSize = 0.5;

    // Groups for LED wall and roof
    this.wallGroup = new THREE.Group();
    this.roofGroup = new THREE.Group();
    this.scene.add(this.wallGroup);
    this.scene.add(this.roofGroup);

    // Append renderer to canvas container (using container's actual width)
    if (!container) {
        console.error('Canvas container not found!');
        return;
    }
    this.renderer.setSize(containerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // Camera control settings
    this.cameraControls = {
      target: new THREE.Vector3(0, 1.8, 0),
      position: new THREE.Vector3(0, 1.8, 15),
      minDistance: 5,
      maxDistance: 30,
      damping: 0.1,
      rotateSpeed: 1.0,
      panSpeed: 1.0,
      zoomSpeed: 1.0,
      minPolarAngle: 0.1, // radians
      maxPolarAngle: Math.PI - 0.1, // radians
      enableDamping: true
    };

    // Current state for smooth transitions
    this.currentState = {
      position: new THREE.Vector3().copy(this.cameraControls.position),
      target: new THREE.Vector3().copy(this.cameraControls.target)
    };

    // Mouse control state
    this.mouseState = {
      button: -1,
      lastX: 0,
      lastY: 0,
      isDragging: false,
      lastClickTime: 0
    };

    // Set initial camera position
    this.camera.position.copy(this.cameraControls.position);
    this.camera.lookAt(this.cameraControls.target);

    // Bind event listeners for mouse controls
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
    
    // Add window resize handler to ensure proper sizing
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 2, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);

    // Grid helper and ground plane
    const gridHelper = new THREE.GridHelper(60, 60, 0x444444, 0x333333);
    this.scene.add(gridHelper);
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x050505 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);


    // Responsive handling with debouncing to prevent forced reflows
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          this.updateDimensions();
        });
      }, 16); // ~60fps throttling
    });

    // Update HTML elements with dynamic prices *after* fetching
    if (this.pricesLoaded) {
        this.updateDynamicHTMLPrices();
    }

    this.setupControls(); // Setup controls *after* prices might be loaded and HTML updated
    this.createWall(); // Initial wall creation uses potentially updated prices
    this.animate();
  }

  // --- Price Handling ---
  async fetchProductPrices() {
    // Use absolute URL pointing to the backend server (assuming port 3000)
    const backendUrl = window.getApiUrl ? window.getApiUrl('/products') : '/api/products';
    const response = await fetch(backendUrl);
    if (!response.ok) {
      // Log the response status and text for better debugging
      const errorText = await response.text();
      console.error(`Failed to fetch prices from ${backendUrl}. Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    // Store prices in a key-value map for easy lookup
    this.productPrices = products.reduce((acc, product) => {
      acc[product.name] = parseFloat(product.price); // Store price as number
      return acc;
    }, {});
  }

  getPrice(productName, defaultValue = 0) {
    const price = this.productPrices[productName];
    if (price === undefined) {
      console.warn(`Price not found for product: "${productName}". Using default value: ${defaultValue}`);
      return defaultValue;
    }
    return price;
  }

  showPriceLoadingError() {
      // Example: Display a message in a specific div
      const errorDiv = document.createElement('div');
      errorDiv.textContent = 'Error loading prices. Calculations may be inaccurate.';
      errorDiv.style.color = 'red';
      errorDiv.style.position = 'fixed';
      errorDiv.style.top = '10px';
      errorDiv.style.left = '10px';
      errorDiv.style.backgroundColor = 'white';
      errorDiv.style.padding = '10px';
      errorDiv.style.border = '1px solid red';
      errorDiv.style.zIndex = '2000';
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000); // Remove after 5 seconds
  }

  // Update prices shown directly in HTML (e.g., Rube Draco, Estudios)
  updateDynamicHTMLPrices() {
      const format = (price) => price.toLocaleString('pt-BR'); // Use pt-BR for formatting

      // Rube Draco price updates removed

      // Estudios SP price updates removed
      // Trigger a custom event that pricing-pods.js can listen for
      // This helps ensure pricing-pods.js recalculates totals after HTML is updated
      document.dispatchEvent(new CustomEvent('dynamicPricesUpdated'));
  }


  // --- Controls Setup ---
  setupControls() {
    // Recalculate wall on any change in the controls
    ['width', 'height', 'curvature', 'roof-width', 'roof-height', 'rxii-units'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        // Update the display value in real-time as the slider moves
        el.addEventListener('input', (event) => {
          // Update the corresponding value display
          const valueId = id + '-value';
          const valueDisplay = document.getElementById(valueId);
          if (valueDisplay) {
            valueDisplay.textContent = event.target.value;
          }
          // Then recalculate the wall
          this.createWall();
        });
      }
    });

    // Setup backup buttons
    const backupBtn2D = document.getElementById('backup-btn-2d');
    const backupBtn3D = document.getElementById('backup-btn-3d');

    if (backupBtn2D && backupBtn3D) {
      backupBtn2D.addEventListener('click', () => {
        backupBtn2D.classList.add('active');
        backupBtn3D.classList.remove('active');
        this.updateServerPrice('2d');
        if (typeof updateDisguisePod === 'function') {
          updateDisguisePod('2d');
        }
      });

      backupBtn3D.addEventListener('click', () => {
        backupBtn3D.classList.add('active');
        backupBtn2D.classList.remove('active');
        this.updateServerPrice('3d');
        if (typeof updateDisguisePod === 'function') {
          updateDisguisePod('3d');
        }
      });
    }

    // Add change event listener for RXII units input
    const rxiiUnitsInput = document.getElementById('rxii-units');
    if (rxiiUnitsInput) {
      // Use an arrow function to maintain 'this' context
      const updateRXIIValues = () => {
        try {
          const rxiiUnits = parseInt(rxiiUnitsInput.value) || 1;
          // Use fetched prices
          const rxiiUnitPrice = this.getPrice('Disguise RXII Unit'); // Removed fallback
          const trackingPrice = this.getPrice('Stype Tracking'); // Removed fallback
          const modulePrice = parseFloat(document.getElementById('modules-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');
          const processorPrice = parseFloat(document.getElementById('processors-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');
          const serverPrice = parseFloat(document.getElementById('server-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');


          const rxiiPrice = rxiiUnitPrice * rxiiUnits;
          // Recalculate total 3D price based on current components
          const total3DPrice = modulePrice + processorPrice + serverPrice + rxiiPrice + trackingPrice;

          document.getElementById('rxii-units-value').textContent = rxiiUnits;
          document.getElementById('rxii-price').textContent = rxiiPrice.toLocaleString('pt-BR');
          document.getElementById('tracking-price').textContent = trackingPrice.toLocaleString('pt-BR');
          document.getElementById('total-price').textContent = total3DPrice.toLocaleString('pt-BR');

          // Update the summary in the proposal modal
          const summaryRxiiUnits = document.getElementById('summary-rxii-units');
          if (summaryRxiiUnits) summaryRxiiUnits.textContent = rxiiUnits;

          // Trigger the update of the proposal summary
          document.dispatchEvent(new CustomEvent('updateProposalSummary'));

          // Explicitly update the Equipamentos subtotal
          if (typeof addEquipamentosSubtotal === 'function') {
            addEquipamentosSubtotal();
          }
        } catch (e) {
          console.error('Error updating RXII units:', e);
        }
      };

      // Add multiple event listeners for real-time updates
      rxiiUnitsInput.addEventListener('change', updateRXIIValues);
      rxiiUnitsInput.addEventListener('input', updateRXIIValues);
      rxiiUnitsInput.addEventListener('keyup', updateRXIIValues);

      // Initial call to set values based on default slider position
      updateRXIIValues();
    }
  }

  // --- Mouse Controls ---
  onMouseDown(event) {
    event.preventDefault();

    const now = Date.now();
    if (now - this.mouseState.lastClickTime < 300) {
      // This is a double click (handled by onDoubleClick)
      return;
    }

    this.mouseState.button = event.button;
    this.mouseState.lastX = event.clientX;
    this.mouseState.lastY = event.clientY;
    this.mouseState.isDragging = true;
    this.mouseState.lastClickTime = now;
  }

  onMouseMove(event) {
    if (!this.mouseState.isDragging) return;

    const deltaX = event.clientX - this.mouseState.lastX;
    const deltaY = event.clientY - this.mouseState.lastY;

    switch (this.mouseState.button) {
      case 0: // Left button - Orbit
        this.orbit(deltaX, deltaY);
        break;
      case 2: // Right button - Pan
        this.pan(deltaX, deltaY);
        break;
    }

    this.mouseState.lastX = event.clientX;
    this.mouseState.lastY = event.clientY;
  }

  onMouseUp(event) {
    this.mouseState.isDragging = false;
    this.mouseState.button = -1;
  }

  onMouseWheel(event) {
    event.preventDefault();

    // Normalize wheel delta across browsers
    const delta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY) / 100, 1);
    this.zoom(delta * this.cameraControls.zoomSpeed);
  }

  onDoubleClick(event) {
    event.preventDefault();
    this.resetView();
  }
  
  // Handle window resize
  onWindowResize() {
    this.updateDimensions();
  }
  
  // Update dimensions helper method
  updateDimensions() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    // Use cached dimensions or update if stale (avoid forced reflows)
    const now = performance.now();
    if (!this.cachedDimensions || (now - this.cachedDimensions.lastUpdate) > 100) {
      this.cachedDimensions = {
        width: container.getBoundingClientRect().width,
        height: window.innerHeight,
        lastUpdate: now
      };
    }
    
    // Update camera aspect ratio using cached dimensions
    this.camera.aspect = this.cachedDimensions.width / this.cachedDimensions.height;
    this.camera.updateProjectionMatrix();
    
    // Resize renderer to match container width
    this.renderer.setSize(this.cachedDimensions.width, this.cachedDimensions.height);
  }

  // --- Camera Movements ---
  orbit(deltaX, deltaY) {
    const target = this.cameraControls.target;
    const position = this.cameraControls.position;

    // Calculate current spherical coordinates
    const offset = new THREE.Vector3().subVectors(position, target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    // Update spherical coordinates based on mouse movement
    spherical.theta -= deltaX * 0.01 * this.cameraControls.rotateSpeed;
    spherical.phi = Math.max(
      this.cameraControls.minPolarAngle,
      Math.min(this.cameraControls.maxPolarAngle, spherical.phi + deltaY * 0.01 * this.cameraControls.rotateSpeed)
    );

    // Convert back to Cartesian coordinates
    offset.setFromSpherical(spherical);
    this.cameraControls.position.copy(target).add(offset);
  }

  pan(deltaX, deltaY) {
    const camera = this.camera;
    const target = this.cameraControls.target;
    const position = this.cameraControls.position;

    // Calculate pan vectors in camera space
    const distance = position.distanceTo(target);
    const panSpeed = this.cameraControls.panSpeed * distance / 100;

    // Pan horizontally
    const v = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0); // Get right vector
    v.multiplyScalar(-deltaX * panSpeed);

    // Pan vertically - use world up vector for more intuitive panning
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3().subVectors(target, position).normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const upVector = new THREE.Vector3().crossVectors(right, forward).normalize();
    const v2 = upVector.multiplyScalar(deltaY * panSpeed);

    // Apply pan to both position and target
    this.cameraControls.position.add(v).add(v2);
    this.cameraControls.target.add(v).add(v2);
  }

  zoom(delta) {
    const offset = new THREE.Vector3().subVectors(
      this.cameraControls.position,
      this.cameraControls.target
    );

    const distance = offset.length();

    // Calculate new distance with constraints
    const newDistance = Math.max(
      this.cameraControls.minDistance,
      Math.min(this.cameraControls.maxDistance, distance * (1 + delta))
    );

    // Scale the offset vector
    offset.multiplyScalar(newDistance / distance);

    // Update position
    this.cameraControls.position.copy(this.cameraControls.target).add(offset);
  }

  resetView() {
    this.cameraControls.target.set(0, 1.8, 0);
    this.cameraControls.position.set(0, 1.8, 15);
  }


  // --- LED Wall Creation ---
  createLEDWall(width, height, curvature, group, yOffset) {
    group.clear();
    const modulesX = Math.ceil(width / this.moduleSize);
    const modulesY = Math.ceil(height / this.moduleSize);
    let radius = 0, totalAngle = 0;
    if (curvature > 0) {
      totalAngle = (modulesX - 1) * THREE.MathUtils.degToRad(curvature);
      const chordLength = this.moduleSize;
      radius = chordLength / (2 * Math.sin(THREE.MathUtils.degToRad(curvature) / 2));
    }
    const ledMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333,
      emissive: 0xffffff,
      emissiveIntensity: 0.2
    });
    const emissiveMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333,
      emissive: 0xffffff,
      emissiveIntensity: 0.2
    });
    for (let x = 0; x < modulesX; x++) {
      for (let y = 0; y < modulesY; y++) {
        const moduleGeo = new THREE.BoxGeometry(this.moduleSize, this.moduleSize, 0.1);
        const moduleMesh = new THREE.Mesh(moduleGeo, group === this.roofGroup ? emissiveMaterial : ledMaterial);
        moduleMesh.castShadow = true;
        moduleMesh.receiveShadow = true;
        const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const wireframeGeometry = new THREE.EdgesGeometry(moduleGeo);
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        moduleMesh.add(wireframe);
        let posX, posZ;
        if (group === this.roofGroup) {
          moduleMesh.rotation.x = -Math.PI / 2;
          posX = (x - (modulesX - 1) / 2) * this.moduleSize;
          posZ = (y - (modulesY - 1) / 2) * this.moduleSize + 5; // Adjusted Z for roof position
        } else if (curvature > 0 && radius > 0) {
          const angle = (x - (modulesX - 1) / 2) * THREE.MathUtils.degToRad(curvature);
          posX = radius * Math.sin(angle);
          posZ = radius * (1 - Math.cos(angle));
          moduleMesh.rotation.y = -angle;
        } else {
          posX = (x - (modulesX - 1) / 2) * this.moduleSize;
          posZ = 0;
        }
        const posY = group === this.roofGroup ? yOffset + this.moduleSize / 2 : y * this.moduleSize + this.moduleSize / 2; // Center modules vertically
        moduleMesh.position.set(posX, posY, posZ);
        group.add(moduleMesh);
      }
    }
    return { modulesX, modulesY, totalModules: modulesX * modulesY };
  }

  // --- Main Calculation Logic ---
  createWall() {
    if (!this.pricesLoaded) {
        console.warn('Prices not loaded yet, calculations might use defaults or be inaccurate.');
    }
    const format = (price) => price.toLocaleString('pt-BR');

    const physicalWidth = parseFloat(document.getElementById('width').value) || 0;
    const physicalHeight = parseFloat(document.getElementById('height').value) || 0;
    const curvatureVal = parseFloat(document.getElementById('curvature').value) || 0;
    const roofWidth = parseFloat(document.getElementById('roof-width').value) || 0;
    const roofHeight = parseFloat(document.getElementById('roof-height').value) || 0;

    const principalInfo = this.createLEDWall(physicalWidth, physicalHeight, curvatureVal, this.wallGroup, 0);
    const principalModules = principalInfo.totalModules;
    document.getElementById('module-count').textContent = principalModules;

    const principalPixelsWidth = principalInfo.modulesX * 192;
    const principalPixelsHeight = principalInfo.modulesY * 192;
    const principalTotalPixels = principalPixelsWidth * principalPixelsHeight;

    // Store pixel width and height for retrieval in quote data
    const principalResolution = `${principalPixelsWidth}×${principalPixelsHeight}`;

    // Update hidden inputs/spans for summary
    const updateElement = (id, value, isInput = false) => {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement(isInput ? 'input' : 'span');
            el.id = id;
            if (isInput) el.type = 'hidden'; else el.style.display = 'none';
            document.body.appendChild(el);
        }
        if (isInput) el.value = value; else el.textContent = value;
    };

    updateElement('summary-led-principal-resolution', principalResolution);
    updateElement('led-principal-pixels-width', principalPixelsWidth, true);
    updateElement('led-principal-pixels-height', principalPixelsHeight, true);
    updateElement('led-principal-total-pixels', principalTotalPixels, true);

    const resolutionElement = document.getElementById('resolution');
    if (resolutionElement) {
      resolutionElement.innerHTML = `${principalPixelsWidth} x ${principalPixelsHeight}<br>(${format(principalTotalPixels)} pixels)`;
    }

    const totalAreaPrincipal = physicalWidth * physicalHeight;
    document.getElementById('power-max').textContent = Math.round(totalAreaPrincipal * 690); // Keep estimations
    document.getElementById('power-avg').textContent = Math.round(totalAreaPrincipal * 230); // Keep estimations
    document.getElementById('total-weight').textContent = Math.round(principalModules * 7.5); // Keep estimations

    const pixelsPerProcessor = 9895820; // Keep estimation
    const processorsNeeded = Math.ceil(principalTotalPixels / pixelsPerProcessor);
    document.getElementById('processors').textContent = processorsNeeded;

    let tetoModules = 0, tetoModulesWide = 0, tetoModulesHigh = 0;
    let tetoPixelsWidth = 0, tetoPixelsHeight = 0, tetoTotalPixels = 0, tetoResolution = '0×0';

    if (roofWidth <= 0 || roofHeight <= 0) {
      this.roofGroup.clear();
      document.getElementById('teto-module-count').textContent = '0';
      document.getElementById('teto-resolution').textContent = '0×0 (0 pixels)';
      document.getElementById('teto-power-max').textContent = '0';
      document.getElementById('teto-power-avg').textContent = '0';
      document.getElementById('teto-total-weight').textContent = '0';
    } else {
      const tetoInfo = this.createLEDWall(roofWidth, roofHeight, 0, this.roofGroup, physicalHeight);
      tetoModules = tetoInfo.totalModules;
      tetoModulesWide = tetoInfo.modulesX;
      tetoModulesHigh = tetoInfo.modulesY;
      document.getElementById('teto-module-count').textContent = tetoModules;
      tetoPixelsWidth = tetoModulesWide * 192;
      tetoPixelsHeight = tetoModulesHigh * 192;
      tetoTotalPixels = tetoPixelsWidth * tetoPixelsHeight;
      tetoResolution = `${tetoPixelsWidth}×${tetoPixelsHeight}`;

      const tetoResolutionElement = document.getElementById('teto-resolution');
      if (tetoResolutionElement) {
        tetoResolutionElement.innerHTML = `${tetoPixelsWidth} x ${tetoPixelsHeight}<br>(${format(tetoTotalPixels)} pixels)`;
      }

      const totalAreaTeto = roofWidth * roofHeight;
      document.getElementById('teto-power-max').textContent = Math.round(totalAreaTeto * 690); // Estimation
      document.getElementById('teto-power-avg').textContent = Math.round(totalAreaTeto * 230); // Estimation
      document.getElementById('teto-total-weight').textContent = Math.round(tetoModules * 7.5); // Estimation
    }

    // Update hidden inputs/spans for teto summary
    updateElement('led-teto-resolution', tetoResolution);
    updateElement('led-teto-pixels-width', tetoPixelsWidth, true);
    updateElement('led-teto-pixels-height', tetoPixelsHeight, true);
    updateElement('led-teto-total-pixels', tetoTotalPixels, true);

    // --- Price Calculations using fetched prices ---
    const totalModulesCombined = principalModules + tetoModules;
    const moduleDailyPrice = this.getPrice('LED Module', 55); // Default 55
    const processorDailyPrice = this.getPrice('MX-40 Pro Processor', 4000); // Default 4000
    const serverBaseDailyPrice = this.getPrice('Disguise VX4n (Base)', 30000); // Default 30000
    const rxiiUnitDailyPrice = this.getPrice('Disguise RXII Unit', 7500); // Default 7500
    const trackingDailyPrice = this.getPrice('Stype Tracking', 5000); // Default 5000

    const modulePriceTotal = totalModulesCombined * moduleDailyPrice;
    const processorPriceTotal = processorsNeeded * processorDailyPrice;

    // Dispatch event with necessary data for pricing pods
    const eventData = {
        detail: {
            totalModules: totalModulesCombined,
            moduleUnitPrice: moduleDailyPrice,
            processorsNeeded: processorsNeeded, // Pass other relevant data if needed
            processorUnitPrice: processorDailyPrice,
            // Add other calculated values if pricing-pods needs them
            // For now, let's assume pricing-pods reads other base prices from HTML data attributes
        }
    };
    document.dispatchEvent(new CustomEvent('ledWallDataCalculated', eventData));

    // Update 3D Pod Prices
    this.updateServerPrice('3d'); // Call this to set initial server price and total
    document.getElementById('modules-price').textContent = format(modulePriceTotal);
    document.getElementById('processors-price').textContent = format(processorPriceTotal);

    // Update RXII and Tracking prices (also handled in updateRXIIValues, but good to set initially)
    try {
        const rxiiUnits = parseInt(document.getElementById('rxii-units').value) || 1;
        const rxiiPriceTotal = rxiiUnitDailyPrice * rxiiUnits;
        document.getElementById('rxii-units-value').textContent = rxiiUnits;
        document.getElementById('rxii-price').textContent = format(rxiiPriceTotal);
        document.getElementById('tracking-price').textContent = format(trackingDailyPrice);

        // Recalculate total 3D price based on current components
        const currentServerPrice3D = parseFloat(document.getElementById('server-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');
        const total3DPrice = modulePriceTotal + processorPriceTotal + currentServerPrice3D + rxiiPriceTotal + trackingDailyPrice;
        document.getElementById('total-price').textContent = format(total3DPrice);

    } catch (error) {
      console.error('Error updating initial 3D cost values:', error);
    }

    // Trigger the update of the proposal summary
    document.dispatchEvent(new CustomEvent('updateProposalSummary'));
  }

  // --- Update Server Price based on Backup ---
  updateServerPrice(podType) {
    const serverBasePrice = this.getPrice('Disguise VX4n (Base)'); // Removed fallback
    const serverBackupPrice = this.getPrice('Disguise VX4n (Backup)'); // Removed fallback // Fetch backup price

    const backupBtn = document.getElementById(`backup-btn-${podType}`);
    const serverPriceElement = document.getElementById(podType === '2d' ? 'server-price' : 'server-price');
    const totalPriceElement = document.getElementById(podType === '2d' ? 'total-price' : 'total-price');

    if (backupBtn && serverPriceElement && totalPriceElement) {
      const hasBackup = backupBtn.classList.contains('active');
      // Use specific backup price if active, otherwise just base price
      const serverPrice = hasBackup ? serverBasePrice + serverBackupPrice : serverBasePrice;

      const format = (price) => price.toLocaleString('pt-BR');
      serverPriceElement.textContent = format(serverPrice);

      // Update the total price
      // Need to parse current module/processor prices from the DOM as they are calculated in createWall
      const modulePrice = parseFloat(document.getElementById(podType === '2d' ? 'modules-price' : 'modules-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');
      const processorPrice = parseFloat(document.getElementById(podType === '2d' ? 'processors-price' : 'processors-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');

      // For 3D pod, also include RXII and Tracking
      const rxiiPrice = parseFloat(document.getElementById('rxii-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');
      const trackingPrice = parseFloat(document.getElementById('tracking-price')?.textContent.replace(/\./g, '').replace(',', '.') || '0');
      const total = modulePrice + processorPrice + serverPrice + rxiiPrice + trackingPrice;
      totalPriceElement.textContent = format(total);
       // Trigger proposal update after price change
       document.dispatchEvent(new CustomEvent('updateProposalSummary'));
    }
  }

  // --- Animation Loop ---
  animate() {
    requestAnimationFrame(() => this.animate());

    // Apply damping for smooth camera movements
    if (this.cameraControls.enableDamping) {
      this.currentState.position.lerp(this.cameraControls.position, this.cameraControls.damping);
      this.currentState.target.lerp(this.cameraControls.target, this.cameraControls.damping);

      this.camera.position.copy(this.currentState.position);
      this.camera.lookAt(this.currentState.target);
    } else {
      this.camera.position.copy(this.cameraControls.position);
      this.camera.lookAt(this.cameraControls.target);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the calculator
const calculator = new LEDWallCalculator();
