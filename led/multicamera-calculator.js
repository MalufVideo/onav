// led/multicamera-calculator.js - Multi-Camera / Live Calculator with 3D Viewer

class MulticameraCalculator {
  constructor() {
    this.productPrices = {};
    this.pricesLoaded = false;
    
    // Camera prices (defaults, will be overwritten by DB)
    this.cameraPrices = {
      'ex3': 500,
      'fx6': 1200,
      'fx9': 1800
    };
    
    // Fixed prices
    this.tripodPrice = 125;
    this.operatorPrice = 800;
    this.vmixPrice = 3500;
    this.diretorPrice = 1500;
    this.vmixOperatorPrice = 1500;
    this.intercomPrice = 850;
    
    // Switcher prices
    this.switcherPrices = {
      'hs400': 650,
      'atem': 1200
    };
    
    // Disguise prices (will be loaded from DB)
    this.disguiseVXPrice = 10000;
    this.disguiseVXBackupPrice = 5000;
    this.rxiiUnitPrice = 7500;
    this.trackingPrice = 5000;
    this.teamPrice = 0;
    this.studioPrice = 6000;
    
    // Current selections
    this.selectedCamera = 'ex3';
    this.cameraCount = 3;
    this.selectedService = 'streaming';
    this.selectedSwitcher = 'hs400';
    
    // Camera and switcher names for display
    this.cameraNames = {
      'ex3': 'Sony EX3',
      'fx6': 'Sony FX6',
      'fx9': 'Sony FX9'
    };
    this.switcherNames = {
      'hs400': 'Panasonic HS400',
      'atem': 'Blackmagic ATEM 2M/E'
    };
    this.selectedMode = '2d'; // Default to 2D
    this.rxiiUnits = 2;
    this.hasBackup = false;
    
    // Module size (each module is 0.5m x 0.5m)
    this.moduleSize = 0.5;
    
    // Camera 3D models array
    this.cameraModels = [];

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    try {
      await this.fetchProductPrices();
      this.pricesLoaded = true;
    } catch (error) {
      console.error("Failed to load product prices. Using default values.", error);
    }

    // Initialize Three.js scene
    this.initThreeJS();
    
    // Setup controls
    this.setupControls();
    
    // Initial wall and cameras creation
    this.createWall();
    this.createCameras();
    
    // Update pricing
    this.updatePricing();
    
    // Start animation loop
    this.animate();
    
    console.log('[MulticameraCalculator] Initialized successfully');
  }

  async fetchProductPrices() {
    // Fetch directly from Supabase
    const supabaseUrl = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaGp2cHN4a2ZqY3hpdHBuaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1ODk4NzksImV4cCI6MjA1NTE2NTg3OX0.kAcBsHJnlr56fJ6qvXSLOWRiLTnQR7ilXUi_2Qzj4RE';
    
    const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch prices from Supabase. Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    
    this.productPrices = products.reduce((acc, product) => {
      acc[product.name] = parseFloat(product.price);
      return acc;
    }, {});
    
    // Update camera prices from DB
    if (this.productPrices['Camera Sony EX3']) this.cameraPrices['ex3'] = this.productPrices['Camera Sony EX3'];
    if (this.productPrices['Camera Sony FX6']) this.cameraPrices['fx6'] = this.productPrices['Camera Sony FX6'];
    if (this.productPrices['Camera Sony FX9']) this.cameraPrices['fx9'] = this.productPrices['Camera Sony FX9'];
    if (this.productPrices['Tripé']) this.tripodPrice = this.productPrices['Tripé'];
    if (this.productPrices['Operador de Câmera']) this.operatorPrice = this.productPrices['Operador de Câmera'];
    if (this.productPrices['Switcher Panasonic HS400']) this.switcherPrices['hs400'] = this.productPrices['Switcher Panasonic HS400'];
    if (this.productPrices['Switcher Blackmagic ATEM 2M/E']) this.switcherPrices['atem'] = this.productPrices['Switcher Blackmagic ATEM 2M/E'];
    // Also check for alternate name
    if (this.productPrices['Switcher ATEM 2M/E']) this.switcherPrices['atem'] = this.productPrices['Switcher ATEM 2M/E'];
    if (this.productPrices['Operador de vMix']) this.vmixOperatorPrice = this.productPrices['Operador de vMix'];
    if (this.productPrices['Servidor vMix']) this.vmixPrice = this.productPrices['Servidor vMix'];
    if (this.productPrices['Diretor de Corte']) this.diretorPrice = this.productPrices['Diretor de Corte'];
    if (this.productPrices['Intercom Clearcom']) this.intercomPrice = this.productPrices['Intercom Clearcom'];
    
    // Disguise prices - use same product names as original calculator
    if (this.productPrices['Disguise VX4n (Base)']) this.disguiseVXPrice = this.productPrices['Disguise VX4n (Base)'];
    if (this.productPrices['Disguise VX4n (Backup)']) this.disguiseVXBackupPrice = this.productPrices['Disguise VX4n (Backup)'];
    if (this.productPrices['Disguise RXII Unit']) this.rxiiUnitPrice = this.productPrices['Disguise RXII Unit'];
    if (this.productPrices['Stype Tracking']) this.trackingPrice = this.productPrices['Stype Tracking'];
    if (this.productPrices['Equipe Profissional']) this.teamPrice = this.productPrices['Equipe Profissional'];
    if (this.productPrices['Equipe LED/Servidores']) this.teamPrice = this.productPrices['Equipe LED/Servidores'];
    if (this.productPrices['Equipe Técnica Diaria']) this.teamPrice = this.productPrices['Equipe Técnica Diaria'];
    if (this.productPrices['Equipe Técnica Diária']) this.teamPrice = this.productPrices['Equipe Técnica Diária'];
    if (this.productPrices['Estúdio']) this.studioPrice = this.productPrices['Estúdio'];
    
    console.log('[MulticameraCalculator] Prices loaded:', this.productPrices);
    console.log('[MulticameraCalculator] LED Module price:', this.productPrices['LED Module']);
    console.log('[MulticameraCalculator] MX-40 Pro Processor price:', this.productPrices['MX-40 Pro Processor']);
  }

  getPrice(productName, defaultValue = 0) {
    const price = this.productPrices[productName];
    if (price === undefined) {
      console.warn(`Price not found for product: "${productName}". Using default value: ${defaultValue}`);
      return defaultValue;
    }
    return price;
  }

  initThreeJS() {
    // Scene setup
    this.scene = new THREE.Scene();
    
    const container = document.getElementById('canvas-container');
    const widthPercent = window.innerWidth >= 1920 ? 0.64 : 0.60;
    const containerWidth = container ? container.offsetWidth : (window.innerWidth * widthPercent);
    const containerHeight = container ? container.offsetHeight : window.innerHeight;
    
    this.camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x080808);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    // Groups for LED wall and cameras
    this.wallGroup = new THREE.Group();
    this.cameraGroup = new THREE.Group();
    this.scene.add(this.wallGroup);
    this.scene.add(this.cameraGroup);

    if (!container) {
      console.error('Canvas container not found!');
      return;
    }
    this.renderer.setSize(containerWidth, containerHeight);
    container.appendChild(this.renderer.domElement);

    // Camera controls
    this.cameraControls = {
      target: new THREE.Vector3(0, 1.8, 0),
      position: new THREE.Vector3(0, 3, 18),
      minDistance: 5,
      maxDistance: 30,
      damping: 0.1,
      rotateSpeed: 1.0,
      panSpeed: 1.0,
      zoomSpeed: 1.0,
      minPolarAngle: 0.1,
      maxPolarAngle: Math.PI - 0.1,
      enableDamping: true
    };

    this.currentState = {
      position: new THREE.Vector3().copy(this.cameraControls.position),
      target: new THREE.Vector3().copy(this.cameraControls.target)
    };

    this.mouseState = {
      button: -1,
      lastX: 0,
      lastY: 0,
      isDragging: false,
      lastClickTime: 0
    };

    this.camera.position.copy(this.cameraControls.position);
    this.camera.lookAt(this.cameraControls.target);

    // Mouse event listeners
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
    
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(ambientLight);
    
    const hemiLight = new THREE.HemisphereLight(0x9fb6ff, 0x1b1b1b, 0.35);
    this.scene.add(hemiLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 2, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Grid and ground
    const gridHelper = new THREE.GridHelper(60, 60, 0x444444, 0x333333);
    this.scene.add(gridHelper);
    
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x050505 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Responsive handling
    window.addEventListener('resize', () => {
      const updatedContainerWidth = container ? container.offsetWidth : (window.innerWidth * widthPercent);
      const updatedContainerHeight = container ? container.offsetHeight : window.innerHeight;
      this.camera.aspect = updatedContainerWidth / updatedContainerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(updatedContainerWidth, updatedContainerHeight);
    });
  }

  setupControls() {
    // LED Wall controls
    ['width', 'height', 'curvature'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          document.getElementById(`${id}-value`).textContent = el.value;
          this.createWall();
          this.updatePricing();
        });
      }
    });

    // Camera count control
    const cameraCountEl = document.getElementById('camera-count');
    if (cameraCountEl) {
      cameraCountEl.addEventListener('input', () => {
        this.cameraCount = parseInt(cameraCountEl.value);
        document.getElementById('camera-count-value').textContent = this.cameraCount;
        this.createCameras();
        this.updatePricing();
        this.updateCameraInfo();
      });
    }

    // Camera dropdown (clickable item in pricing pod)
    const cameraClickable = document.querySelector('.clickable-item[data-item="camera"]');
    const cameraDropdown = document.getElementById('camera-dropdown');
    if (cameraClickable && cameraDropdown) {
      cameraClickable.addEventListener('click', (e) => {
        e.stopPropagation();
        // Position dropdown near the clicked item
        const rect = cameraClickable.getBoundingClientRect();
        cameraDropdown.style.top = `${rect.bottom + 5}px`;
        cameraDropdown.style.right = '20px';
        cameraDropdown.style.display = cameraDropdown.style.display === 'none' ? 'block' : 'none';
        // Hide switcher dropdown
        document.getElementById('switcher-dropdown').style.display = 'none';
      });
      
      // Camera dropdown items
      cameraDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          this.selectedCamera = item.dataset.camera;
          document.getElementById('camera-model-name').textContent = this.cameraNames[this.selectedCamera];
          cameraDropdown.style.display = 'none';
          // Update active state
          cameraDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this.updatePricing();
          this.updateCameraInfo();
        });
      });
    }
    
    // Switcher dropdown (clickable item in pricing pod)
    const switcherClickable = document.querySelector('.clickable-item[data-item="switcher"]');
    const switcherDropdown = document.getElementById('switcher-dropdown');
    if (switcherClickable && switcherDropdown) {
      switcherClickable.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = switcherClickable.getBoundingClientRect();
        switcherDropdown.style.top = `${rect.bottom + 5}px`;
        switcherDropdown.style.right = '20px';
        switcherDropdown.style.display = switcherDropdown.style.display === 'none' ? 'block' : 'none';
        // Hide camera dropdown
        document.getElementById('camera-dropdown').style.display = 'none';
      });
      
      // Switcher dropdown items
      switcherDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          this.selectedSwitcher = item.dataset.switcher;
          document.getElementById('switcher-model-name').textContent = this.switcherNames[this.selectedSwitcher];
          switcherDropdown.style.display = 'none';
          // Update active state
          switcherDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this.updatePricing();
        });
      });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      if (cameraDropdown) cameraDropdown.style.display = 'none';
      if (switcherDropdown) switcherDropdown.style.display = 'none';
    });

    // Service type buttons
    document.querySelectorAll('.service-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedService = btn.dataset.service;
        this.updatePricing();
      });
    });

    // 2D/3D Mode selector
    document.querySelectorAll('.selector-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.selector-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMode = btn.dataset.mode;
        this.updateModeUI();
        this.updatePricing();
      });
    });

    // Backup button
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        this.hasBackup = !this.hasBackup;
        backupBtn.classList.toggle('active', this.hasBackup);
        backupBtn.textContent = this.hasBackup ? '✓ backup' : '+backup';
        this.updatePricing();
      });
    }

    // RXII units slider
    const rxiiSlider = document.getElementById('rxii-units');
    if (rxiiSlider) {
      rxiiSlider.addEventListener('input', () => {
        this.rxiiUnits = parseInt(rxiiSlider.value);
        document.getElementById('rxii-units-value').textContent = this.rxiiUnits;
        this.updatePricing();
      });
    }

    // Proposal button
    const propostaBtn = document.getElementById('proposta-btn');
    if (propostaBtn) {
      propostaBtn.addEventListener('click', () => {
        this.showQuoteModal();
      });
    }

    // Modal close button
    const closeBtn = document.getElementById('quote-cart-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('quote-cart-modal').style.display = 'none';
      });
    }

    // Submit quote button
    const submitBtn = document.getElementById('quote-cart-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitQuote();
      });
    }
  }

  createWall() {
    // Clear existing wall
    while (this.wallGroup.children.length > 0) {
      this.wallGroup.remove(this.wallGroup.children[0]);
    }

    const width = parseFloat(document.getElementById('width').value) || 16;
    const height = parseFloat(document.getElementById('height').value) || 5;
    const curvatureEl = document.getElementById('curvature');
    const curvature = curvatureEl ? parseFloat(curvatureEl.value) : 5;

    const modulesX = Math.ceil(width / this.moduleSize);
    const modulesY = Math.ceil(height / this.moduleSize);
    const totalModules = modulesX * modulesY;

    // Update module count display
    const moduleCountEl = document.getElementById('module-count');
    if (moduleCountEl) moduleCountEl.textContent = totalModules;

    // Create LED modules - using same logic as original led-wall.js
    const moduleGeo = new THREE.BoxGeometry(this.moduleSize, this.moduleSize, 0.1);
    const ledMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333,
      emissive: 0x4488ff,
      emissiveIntensity: 0.3
    });

    // Calculate curve parameters - curvature is degrees per column (same as original)
    let radius = 0;
    if (curvature > 0) {
      const chordLength = this.moduleSize;
      radius = chordLength / (2 * Math.sin(THREE.MathUtils.degToRad(curvature) / 2));
    }

    for (let x = 0; x < modulesX; x++) {
      for (let y = 0; y < modulesY; y++) {
        const module = new THREE.Mesh(moduleGeo, ledMaterial.clone());
        
        // Add wireframe edges
        const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const wireframeGeometry = new THREE.EdgesGeometry(moduleGeo);
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        module.add(wireframe);
        
        let posX, posZ;
        
        if (curvature > 0 && radius > 0) {
          // Curved wall - angle per column
          const angle = (x - (modulesX - 1) / 2) * THREE.MathUtils.degToRad(curvature);
          posX = radius * Math.sin(angle);
          posZ = radius * (1 - Math.cos(angle));
          module.rotation.y = -angle;
        } else {
          // Flat wall
          posX = (x - (modulesX - 1) / 2) * this.moduleSize;
          posZ = 0;
        }
        
        const posY = y * this.moduleSize + this.moduleSize / 2;
        module.position.set(posX, posY, posZ);
        module.castShadow = true;
        module.receiveShadow = true;
        
        this.wallGroup.add(module);
      }
    }

    // Update LED info
    this.updateLEDInfo(width, height, totalModules);
  }

  createCameras() {
    // Clear existing cameras
    while (this.cameraGroup.children.length > 0) {
      this.cameraGroup.remove(this.cameraGroup.children[0]);
    }
    this.cameraModels = [];

    const width = parseFloat(document.getElementById('width').value) || 16;
    const cameraDistance = 10; // Distance from LED wall
    const cameraHeight = 1.6; // Camera height from ground (on tripod)
    
    // Calculate camera positions - closer together in the center
    // Use a smaller spread (40% of wall width) to keep cameras more centered
    const spreadWidth = Math.min(width * 0.4, 6); // Max 6 meters spread
    const spacing = spreadWidth / (this.cameraCount + 1);
    
    for (let i = 0; i < this.cameraCount; i++) {
      const cameraModel = this.createCameraModel();
      
      // Position cameras in front of the LED wall, centered
      const xPos = (i + 1) * spacing - spreadWidth / 2;
      cameraModel.position.set(xPos, cameraHeight, cameraDistance);
      
      // Camera already faces -Z direction (towards LED wall at Z=0)
      // No rotation needed as we build it facing the correct direction
      
      this.cameraGroup.add(cameraModel);
      this.cameraModels.push(cameraModel);
    }
  }

  createCameraModel() {
    // Create a professional video camera model facing -Z (towards LED wall)
    const cameraGroup = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x5a5f73,
      metalness: 0.5,
      roughness: 0.25
    });
    
    const detailMat = new THREE.MeshStandardMaterial({ 
      color: 0x9aa3c2,
      metalness: 0.6,
      roughness: 0.35
    });
    
    // Camera body - main rectangular body
    const bodyGeo = new THREE.BoxGeometry(0.25, 0.18, 0.35);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    cameraGroup.add(body);
    
    // Lens housing - cylinder pointing towards -Z (LED wall)
    const lensHousingGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.2, 16);
    const lensHousing = new THREE.Mesh(lensHousingGeo, detailMat);
    lensHousing.rotation.x = Math.PI / 2; // Rotate to point along Z axis
    lensHousing.position.z = -0.27; // Position in front of body (towards LED wall)
    cameraGroup.add(lensHousing);
    
    // Lens glass - facing the LED wall
    const glassGeo = new THREE.CircleGeometry(0.055, 16);
    const glassMat = new THREE.MeshStandardMaterial({ 
      color: 0x66b7ff,
      metalness: 0.2,
      roughness: 0.05,
      emissive: 0x1b64ff,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.z = -0.37; // At the front of the lens
    cameraGroup.add(glass);
    
    // Lens ring
    const ringGeo = new THREE.TorusGeometry(0.06, 0.008, 8, 24);
    const ring = new THREE.Mesh(ringGeo, detailMat);
    ring.position.z = -0.36;
    cameraGroup.add(ring);
    
    // Viewfinder - on top back of camera
    const viewfinderGeo = new THREE.BoxGeometry(0.06, 0.05, 0.08);
    const viewfinder = new THREE.Mesh(viewfinderGeo, bodyMat);
    viewfinder.position.set(-0.08, 0.11, 0.1);
    cameraGroup.add(viewfinder);
    
    // Handle on top
    const handleGeo = new THREE.BoxGeometry(0.18, 0.03, 0.08);
    const handle = new THREE.Mesh(handleGeo, detailMat);
    handle.position.set(0, 0.1, 0);
    cameraGroup.add(handle);
    
    // Tripod mount plate
    const plateMat = new THREE.MeshStandardMaterial({ 
      color: 0xb8c0ff,
      metalness: 0.8,
      roughness: 0.2
    });
    const plateGeo = new THREE.BoxGeometry(0.12, 0.02, 0.15);
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -0.1;
    cameraGroup.add(plate);
    
    // Tripod
    const tripodGroup = this.createTripod();
    tripodGroup.position.y = -0.12;
    cameraGroup.add(tripodGroup);
    
    return cameraGroup;
  }

  createTripod() {
    const tripodGroup = new THREE.Group();
    
    const legMat = new THREE.MeshStandardMaterial({ 
      color: 0xc0c4d6,
      metalness: 0.7,
      roughness: 0.25
    });
    
    // Tripod head (where camera mounts) - at the TOP
    const headGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.06, 8);
    const head = new THREE.Mesh(headGeo, legMat);
    head.position.y = 0;
    tripodGroup.add(head);
    
    // Three legs - meet at top (head), spread out at bottom (ground)
    const legHeight = 1.4;
    const legSpreadAtBottom = 0.5; // How far legs spread at the ground
    
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3; // 0, 120, 240 degrees
      
      // Create a single leg as a tapered cylinder (thicker at top, thinner at bottom)
      const legGeo = new THREE.CylinderGeometry(0.018, 0.012, legHeight, 8);
      const leg = new THREE.Mesh(legGeo, legMat);
      
      // Calculate the tilt angle - legs tilt OUTWARD as they go DOWN
      const tiltAngle = Math.atan(legSpreadAtBottom / legHeight);
      
      // Position: legs start near head (y=0) and go down
      // Center of leg is at half the height down, offset outward by half the spread
      leg.position.set(
        Math.sin(angle) * (legSpreadAtBottom / 2),
        -legHeight / 2,
        Math.cos(angle) * (legSpreadAtBottom / 2)
      );
      
      // Rotate to tilt outward - INVERT the tilt direction
      leg.rotation.x = -tiltAngle * Math.cos(angle);
      leg.rotation.z = tiltAngle * Math.sin(angle);
      
      tripodGroup.add(leg);
    }
    
    return tripodGroup;
  }

  updateModeUI() {
    const rxiiGroup = document.getElementById('rxii-group');
    const trackingItem = document.getElementById('tracking-item');
    const mainPodTitle = document.getElementById('main-pod-title');
    
    if (this.selectedMode === '3d') {
      // Show 3D-specific items
      if (rxiiGroup) rxiiGroup.style.display = 'block';
      if (trackingItem) trackingItem.style.display = 'block';
      if (mainPodTitle) mainPodTitle.textContent = '3D ou 2.5D';
    } else {
      // Hide 3D-specific items for 2D mode
      if (rxiiGroup) rxiiGroup.style.display = 'none';
      if (trackingItem) trackingItem.style.display = 'none';
      if (mainPodTitle) mainPodTitle.textContent = '2D - Plates';
    }
  }

  updateLEDInfo(width, height, modules) {
    const pixelsPerModule = 192; // 2.6mm pitch, 500mm module = ~192 pixels
    const pixelsWidth = Math.round(width * 2 * pixelsPerModule);
    const pixelsHeight = Math.round(height * 2 * pixelsPerModule);
    
    const resolutionEl = document.getElementById('resolution');
    if (resolutionEl) resolutionEl.textContent = `${pixelsWidth} x ${pixelsHeight} pixels`;
    
    const processorsNeeded = Math.ceil(modules / 100);
    const processorsEl = document.getElementById('processors');
    if (processorsEl) processorsEl.textContent = `${processorsNeeded} unidades`;
    
    const powerMax = modules * 172.5;
    const powerAvg = modules * 57.5;
    const weight = modules * 7.5;
    
    const powerMaxEl = document.getElementById('power-max');
    if (powerMaxEl) powerMaxEl.textContent = `${powerMax.toLocaleString('pt-BR')}`;
    
    const powerAvgEl = document.getElementById('power-avg');
    if (powerAvgEl) powerAvgEl.textContent = `${powerAvg.toLocaleString('pt-BR')}`;
    
    const weightEl = document.getElementById('total-weight');
    if (weightEl) weightEl.textContent = `${weight.toLocaleString('pt-BR')}`;
  }

  updateCameraInfo() {
    const cameraInfoEl = document.getElementById('camera-info');
    if (cameraInfoEl) cameraInfoEl.textContent = `${this.cameraCount}x ${this.cameraNames[this.selectedCamera]}`;
    
    const tripodInfoEl = document.getElementById('tripod-info');
    if (tripodInfoEl) tripodInfoEl.textContent = `${this.cameraCount} unidades`;
    
    const operatorInfoEl = document.getElementById('operator-info');
    if (operatorInfoEl) operatorInfoEl.textContent = `${this.cameraCount} profissionais`;
  }

  updatePricing() {
    const width = parseFloat(document.getElementById('width').value) || 16;
    const height = parseFloat(document.getElementById('height').value) || 5;
    
    const modulesX = Math.ceil(width / this.moduleSize);
    const modulesY = Math.ceil(height / this.moduleSize);
    const totalModules = modulesX * modulesY;
    
    // Calculate pixels (each module is 192x192 pixels)
    const pixelsWidth = modulesX * 192;
    const pixelsHeight = modulesY * 192;
    const totalPixels = pixelsWidth * pixelsHeight;
    
    // LED Module price
    const ledModulePrice = this.getPrice('LED Module', 74);
    const ledTotal = totalModules * ledModulePrice;
    
    // Processors - based on total pixels (same logic as original calculator)
    const pixelsPerProcessor = 9895820;
    const processorsNeeded = Math.ceil(totalPixels / pixelsPerProcessor);
    const processorPrice = this.getPrice('MX-40 Pro Processor', 1000);
    const processorsTotal = processorsNeeded * processorPrice;
    
    // Disguise VX Server (with optional backup)
    let disguiseTotal = this.disguiseVXPrice;
    if (this.hasBackup) {
      disguiseTotal += this.disguiseVXBackupPrice;
    }
    
    // RXII and Tracking (only for 3D mode)
    let rxiiTotal = 0;
    let trackingTotal = 0;
    if (this.selectedMode === '3d') {
      rxiiTotal = this.rxiiUnits * this.rxiiUnitPrice;
      trackingTotal = this.trackingPrice;
    }
    
    // Cameras
    const cameraPrice = this.cameraPrices[this.selectedCamera];
    const camerasTotal = this.cameraCount * cameraPrice;
    
    // Tripods
    const tripodsTotal = this.cameraCount * this.tripodPrice;
    
    // Operators
    const operatorsTotal = this.cameraCount * this.operatorPrice;
    
    // Switcher (use selected switcher price)
    const switcherTotal = this.switcherPrices[this.selectedSwitcher];
    
    // vMix Server
    const vmixTotal = this.vmixPrice;
    
    // vMix Operator
    const vmixOperatorTotal = this.vmixOperatorPrice;
    
    // Intercom
    const intercomTotal = this.intercomPrice;
    
    // Diretor de Corte
    const diretorTotal = this.diretorPrice;
    
    // Studio
    const studioPrice = this.studioPrice;
    
    // Professional Team
    const teamTotal = this.teamPrice;
    
    // Calculate total
    const dailyTotal = ledTotal + processorsTotal + disguiseTotal + rxiiTotal + trackingTotal +
                       camerasTotal + tripodsTotal + operatorsTotal + switcherTotal + 
                       vmixTotal + vmixOperatorTotal + intercomTotal + diretorTotal + studioPrice + teamTotal;
    
    // Update UI
    this.updatePriceDisplay('modules-price', ledTotal);
    this.updatePriceDisplay('processors-price', processorsTotal);
    this.updatePriceDisplay('disguise-server-price', disguiseTotal);
    this.updatePriceDisplay('rxii-price', rxiiTotal);
    this.updatePriceDisplay('tracking-price', trackingTotal);
    this.updatePriceDisplay('cameras-price', camerasTotal);
    this.updatePriceDisplay('tripods-price', tripodsTotal);
    this.updatePriceDisplay('operators-price', operatorsTotal);
    this.updatePriceDisplay('switcher-price', switcherTotal);
    this.updatePriceDisplay('server-price', vmixTotal);
    this.updatePriceDisplay('vmix-operator-price', vmixOperatorTotal);
    this.updatePriceDisplay('intercom-price', intercomTotal);
    this.updatePriceDisplay('diretor-corte-price', diretorTotal);
    this.updatePriceDisplay('studio-price', studioPrice);
    this.updatePriceDisplay('team-price', teamTotal);
    this.updatePriceDisplay('subtotal-price', dailyTotal);
    
    // Update quantity displays
    const cameraQtyEl = document.getElementById('camera-qty');
    if (cameraQtyEl) cameraQtyEl.textContent = this.cameraCount;
    
    const tripodQtyEl = document.getElementById('tripod-qty');
    if (tripodQtyEl) tripodQtyEl.textContent = this.cameraCount;
    
    const operatorQtyEl = document.getElementById('operator-qty');
    if (operatorQtyEl) operatorQtyEl.textContent = this.cameraCount;
    
    // Store current pricing for cart
    this.currentPricing = {
      mode: this.selectedMode,
      ledModules: { quantity: totalModules, unitPrice: ledModulePrice, total: ledTotal },
      processors: { quantity: processorsNeeded, unitPrice: processorPrice, total: processorsTotal },
      disguiseServer: { quantity: 1, unitPrice: this.disguiseVXPrice, total: disguiseTotal, hasBackup: this.hasBackup },
      rxii: { quantity: this.rxiiUnits, unitPrice: this.rxiiUnitPrice, total: rxiiTotal },
      tracking: { quantity: 1, unitPrice: this.trackingPrice, total: trackingTotal },
      cameras: { quantity: this.cameraCount, unitPrice: cameraPrice, total: camerasTotal, model: this.selectedCamera },
      tripods: { quantity: this.cameraCount, unitPrice: this.tripodPrice, total: tripodsTotal },
      operators: { quantity: this.cameraCount, unitPrice: this.operatorPrice, total: operatorsTotal },
      switcher: { quantity: 1, unitPrice: this.switcherPrices[this.selectedSwitcher], total: switcherTotal, model: this.selectedSwitcher },
      vmix: { quantity: 1, unitPrice: this.vmixPrice, total: vmixTotal },
      vmixOperator: { quantity: 1, unitPrice: this.vmixOperatorPrice, total: vmixOperatorTotal },
      intercom: { quantity: 1, unitPrice: this.intercomPrice, total: intercomTotal },
      diretor: { quantity: 1, unitPrice: this.diretorPrice, total: diretorTotal },
      studio: { quantity: 1, unitPrice: studioPrice, total: studioPrice },
      team: { quantity: 1, unitPrice: this.teamPrice, total: teamTotal },
      dailyTotal: dailyTotal
    };
    
    this.updateCameraInfo();
  }

  updatePriceDisplay(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
      // Format without decimals if it's a round number
      const formatted = value % 1 === 0 
        ? `R$ ${value.toLocaleString('pt-BR')}` 
        : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      el.textContent = formatted;
    }
  }

  showQuoteModal() {
    const modal = document.getElementById('quote-cart-modal');
    if (modal) {
      modal.style.display = 'block';
      this.updateCart();
    }
  }

  updateCart() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-price');
    
    if (!container || !this.currentPricing) return;
    
    // Get dates
    const startDateInput = document.getElementById('cart-shooting-dates-start');
    const endDateInput = document.getElementById('cart-shooting-dates-end');
    
    let numberOfDays = 1;
    if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
      const parseDate = (str) => {
        const parts = str.split('/');
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day);
      };
      
      const startDate = parseDate(startDateInput.value);
      const endDate = parseDate(endDateInput.value);
      
      if (startDate && endDate && endDate >= startDate) {
        const timeDiff = endDate.getTime() - startDate.getTime();
        numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      }
    }
    
    // Build cart items
    const items = [
      { name: 'Módulos LED', qty: this.currentPricing.ledModules.quantity, unitPrice: this.currentPricing.ledModules.unitPrice },
      { name: 'Processadores MX-40 Pro', qty: this.currentPricing.processors.quantity, unitPrice: this.currentPricing.processors.unitPrice },
      { name: this.currentPricing.disguiseServer.hasBackup ? 'Disguise VX + Backup' : 'Disguise VX', qty: 1, unitPrice: this.currentPricing.disguiseServer.total }
    ];
    
    // Add 3D-specific items
    if (this.currentPricing.mode === '3d') {
      items.push({ name: 'Disguise RXII', qty: this.currentPricing.rxii.quantity, unitPrice: this.currentPricing.rxii.unitPrice });
      items.push({ name: 'Camera Tracking (Stype)', qty: 1, unitPrice: this.currentPricing.tracking.unitPrice });
    }
    
    // Add multi-camera items
    items.push({ name: `Câmeras ${this.cameraNames[this.currentPricing.cameras.model]}`, qty: this.currentPricing.cameras.quantity, unitPrice: this.currentPricing.cameras.unitPrice });
    items.push({ name: 'Tripés Sachtler', qty: this.currentPricing.tripods.quantity, unitPrice: this.currentPricing.tripods.unitPrice });
    items.push({ name: `Switcher ${this.switcherNames[this.currentPricing.switcher.model]}`, qty: 1, unitPrice: this.currentPricing.switcher.unitPrice });
    items.push({ name: 'Servidor vMix', qty: 1, unitPrice: this.currentPricing.vmix.unitPrice });
    items.push({ name: 'Operadores de Câmera', qty: this.currentPricing.operators.quantity, unitPrice: this.currentPricing.operators.unitPrice });
    items.push({ name: 'Operador vMix', qty: 1, unitPrice: this.currentPricing.vmixOperator.unitPrice });
    items.push({ name: 'Intercom Clearcom', qty: 1, unitPrice: this.currentPricing.intercom.unitPrice });
    items.push({ name: 'Diretor de Corte', qty: 1, unitPrice: this.currentPricing.diretor.unitPrice });
    items.push({ name: 'Estúdio', qty: 1, unitPrice: this.currentPricing.studio.unitPrice });
    
    // Add professional team if price > 0
    if (this.currentPricing.team.total > 0) {
      items.push({ name: 'Equipe Profissional', qty: 1, unitPrice: this.currentPricing.team.unitPrice });
    }
    
    // Render cart
    container.innerHTML = `
      <div class="cart-item cart-header">
        <span class="cart-item-name">Item</span>
        <span class="cart-item-qty">Qtd</span>
        <span class="cart-item-price">Preço Unit. (Diária)</span>
        <span class="cart-item-subtotal">Subtotal (Diária)</span>
      </div>
    `;
    
    let dailyTotal = 0;
    items.forEach(item => {
      const subtotal = item.qty * item.unitPrice;
      dailyTotal += subtotal;
      
      container.innerHTML += `
        <div class="cart-item">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-qty">${item.qty}</span>
          <span class="cart-item-price">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span class="cart-item-subtotal">R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      `;
    });
    
    // Apply discount
    const originalTotal = dailyTotal * numberOfDays;
    let finalTotal = originalTotal;
    let discountInfo = null;
    
    if (window.DiscountCalculator && numberOfDays > 0) {
      discountInfo = window.DiscountCalculator.applyDayBasedDiscount(dailyTotal, numberOfDays);
      finalTotal = discountInfo.finalPrice;
    }
    
    // Update total display
    if (totalEl) {
      if (discountInfo && discountInfo.hasDiscount) {
        totalEl.innerHTML = `
          <div>
            <span style="text-decoration: line-through; color: #999; font-size: 0.9em;">
              R$ ${originalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <br>
            <span style="color: #e74c3c; font-weight: bold;">
              R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style="color: #27ae60; font-size: 0.9em; display: block;">
              ${discountInfo.discountPercentage}% desconto progressivo - ${numberOfDays} dia${numberOfDays > 1 ? 's' : ''}
            </span>
          </div>
        `;
      } else {
        totalEl.textContent = `R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${numberOfDays} dia${numberOfDays > 1 ? 's' : ''})`;
      }
    }
  }

  async submitQuote() {
    const projectName = document.getElementById('cart-project-name')?.value;
    const startDate = document.getElementById('cart-shooting-dates-start')?.value;
    const endDate = document.getElementById('cart-shooting-dates-end')?.value;
    
    if (!projectName) {
      alert('Por favor, insira um nome para o projeto.');
      return;
    }
    
    if (!startDate || !endDate) {
      alert('Por favor, selecione as datas do evento.');
      return;
    }
    
    // Hide the quote cart modal
    document.getElementById('quote-cart-modal').style.display = 'none';
    
    // Show confirmation modal
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
      confirmationModal.style.display = 'flex';
      
      const closeBtn = document.getElementById('confirmation-close-btn');
      if (closeBtn) {
        closeBtn.onclick = () => {
          confirmationModal.style.display = 'none';
        };
      }
      
      const viewProposalsBtn = document.getElementById('view-my-proposals-btn');
      if (viewProposalsBtn) {
        viewProposalsBtn.onclick = () => {
          window.location.href = 'my-quotes.html';
        };
      }
    }
  }

  // Mouse control methods
  onMouseDown(event) {
    this.mouseState.button = event.button;
    this.mouseState.lastX = event.clientX;
    this.mouseState.lastY = event.clientY;
    this.mouseState.isDragging = true;
  }

  onMouseMove(event) {
    if (!this.mouseState.isDragging) return;

    const deltaX = event.clientX - this.mouseState.lastX;
    const deltaY = event.clientY - this.mouseState.lastY;

    if (this.mouseState.button === 0) {
      // Left button - rotate
      const rotateSpeed = 0.005;
      
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.cameraControls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      
      spherical.theta -= deltaX * rotateSpeed;
      spherical.phi -= deltaY * rotateSpeed;
      spherical.phi = Math.max(this.cameraControls.minPolarAngle, Math.min(this.cameraControls.maxPolarAngle, spherical.phi));
      
      offset.setFromSpherical(spherical);
      this.camera.position.copy(this.cameraControls.target).add(offset);
      this.camera.lookAt(this.cameraControls.target);
    } else if (this.mouseState.button === 2) {
      // Right button - pan
      const panSpeed = 0.01;
      
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      
      this.camera.getWorldDirection(up);
      right.crossVectors(up, this.camera.up).normalize();
      up.crossVectors(right, up).normalize();
      
      const panOffset = new THREE.Vector3();
      panOffset.addScaledVector(right, -deltaX * panSpeed);
      panOffset.addScaledVector(up, deltaY * panSpeed);
      
      this.camera.position.add(panOffset);
      this.cameraControls.target.add(panOffset);
    }

    this.mouseState.lastX = event.clientX;
    this.mouseState.lastY = event.clientY;
  }

  onMouseUp() {
    this.mouseState.isDragging = false;
    this.mouseState.button = -1;
  }

  onMouseWheel(event) {
    event.preventDefault();
    
    const zoomSpeed = 0.001;
    const delta = event.deltaY * zoomSpeed;
    
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.cameraControls.target);
    const distance = offset.length();
    const newDistance = Math.max(this.cameraControls.minDistance, Math.min(this.cameraControls.maxDistance, distance * (1 + delta)));
    
    offset.normalize().multiplyScalar(newDistance);
    this.camera.position.copy(this.cameraControls.target).add(offset);
  }

  onDoubleClick() {
    // Reset camera position
    this.camera.position.copy(this.cameraControls.position);
    this.camera.lookAt(this.cameraControls.target);
  }

  onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (container) {
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Animate LED wall glow
    const time = Date.now() * 0.001;
    this.wallGroup.children.forEach((module, i) => {
      if (module.material && module.material.emissiveIntensity !== undefined) {
        module.material.emissiveIntensity = 0.2 + Math.sin(time + i * 0.1) * 0.1;
      }
    });
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the calculator
window.multicameraCalculator = new MulticameraCalculator();

console.log('[multicamera-calculator.js] Multi-Camera Calculator loaded successfully.');
