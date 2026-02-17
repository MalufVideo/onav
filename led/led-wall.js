class LEDWallCalculator {
  constructor() {
    this.productPrices = {};
    this.pricesLoaded = false;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    try {
        const prices = await window.ProductPriceCache.get();
        this.productPrices = prices;
        this.pricesLoaded = Object.keys(prices).length > 0;
    } catch (error) {
        console.error("Failed to load product prices.", error);
    }

    // Scene, camera and renderer settings
    this.scene = new THREE.Scene();
    // Use container width from DOM or calculate based on screen width
    const container = document.getElementById('canvas-container');
    // For screens smaller than Full HD (1920px), use 60%, otherwise use 64%
    const widthPercent = window.innerWidth >= 1920 ? 0.64 : 0.60;
    const containerWidth = container ? container.offsetWidth : (window.innerWidth * widthPercent);
    const containerHeight = container ? container.offsetHeight : window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      75,
      containerWidth / containerHeight,
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
    this.renderer.setSize(containerWidth, containerHeight);
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


    // Update HTML elements with dynamic prices *after* fetching
    if (this.pricesLoaded) {
        this.updateDynamicHTMLPrices();
    }

    this.setupControls(); // Setup controls *after* prices might be loaded and HTML updated
    this.createWall(); // Initial wall creation uses potentially updated prices
    this.animate();
  }

  getPrice(productName, defaultValue = 0) {
    return window.ProductPriceCache.getPrice(productName, defaultValue);
  }

  updateDynamicHTMLPrices() {
      document.dispatchEvent(new CustomEvent('dynamicPricesUpdated'));
  }


  setupControls() {
    ['width', 'height', 'curvature', 'roof-width', 'roof-height', 'rxii-units'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (event) => {
          const valueDisplay = document.getElementById(id + '-value');
          if (valueDisplay) {
            valueDisplay.textContent = event.target.value;
          }
          this.createWall();
        });
      }
    });
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
    const delta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY) / 1000, 1);
    this.zoom(delta * this.cameraControls.zoomSpeed);
  }

  onDoubleClick(event) {
    event.preventDefault();
    this.resetView();
  }
  
  // Handle window resize
  onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    // Get actual container width or calculate based on screen size
    const containerWidth = container.offsetWidth;
    
    // Update camera aspect ratio
    this.camera.aspect = containerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Resize renderer to match container width
    this.renderer.setSize(containerWidth, window.innerHeight);
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

  createWall() {
    const format = (price) => formatNumber(price);

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

    // Dispatch event with quantities for pricing pods
    const totalModulesCombined = principalModules + tetoModules;
    document.dispatchEvent(new CustomEvent('ledWallDataCalculated', {
        detail: {
            totalModules: totalModulesCombined,
            processorsNeeded: processorsNeeded
        }
    }));

    document.dispatchEvent(new CustomEvent('updateProposalSummary'));
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
