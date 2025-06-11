// Authentication UI Components

// Create and append authentication UI elements
function createAuthUI() {
  // Create auth card for right sidebar
  const authCard = document.createElement('div');
  authCard.className = 'info-card auth-container';
  authCard.id = 'auth-card';
  authCard.innerHTML = `
    <div class="auth-nav-buttons">
      <button id="login-button" class="auth-button">Entrar</button>
      <button id="register-button" class="auth-button">Cadastrar</button>
      <div id="user-profile" class="user-profile" style="display: none;">
        <span id="user-name" style="margin-right: 10px; font-weight: bold;"></span>
        <a href="my-quotes.html" class="auth-button" id="my-quotes-button" style="margin-right: 10px;">Minhas Propostas</a>
        <button id="logout-button" class="auth-button logout-btn">Sair</button>
      </div>
    </div>
  `;
  
  // Add auth card to the right sidebar at the top
  const infoSidebar = document.getElementById('info-sidebar');
  if (infoSidebar) {
    // Insert auth card as the first element of the sidebar
    infoSidebar.insertBefore(authCard, infoSidebar.firstChild);
  }
  
  // Create login modal
  const loginModal = document.createElement('div');
  loginModal.id = 'login-modal';
  loginModal.className = 'modal-overlay';
  loginModal.innerHTML = `
    <div class="modal-content auth-modal">
      <button class="modal-close">&times;</button>
      <h2>Entrar</h2>
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input type="email" id="login-email" name="email" required>
        </div>
        <div class="form-group">
          <label for="login-password">Senha</label>
          <input type="password" id="login-password" name="password" required>
        </div>
        <div id="login-error" class="auth-error"></div>
        <div id="login-success" class="auth-success"></div>
        <button type="submit" class="form-submit">Entrar</button>
      </form>
    </div>
  `;
  
  // Create registration modal
  const registerModal = document.createElement('div');
  registerModal.id = 'register-modal';
  registerModal.className = 'modal-overlay';
  registerModal.innerHTML = `
    <div class="modal-content auth-modal">
      <button class="modal-close">&times;</button>
      <h2>Criar Conta</h2>
      <form id="register-form" class="auth-form">
        <div class="form-group">
          <label for="register-name">Nome</label>
          <input type="text" id="register-name" name="name" required>
        </div>
        <div class="form-group">
          <label for="register-company">Empresa</label>
          <input type="text" id="register-company" name="company" required>
        </div>
        <div class="form-group">
          <label for="register-email">Email</label>
          <input type="email" id="register-email" name="email" required>
        </div>
        <div class="form-group">
          <label for="register-phone">Telefone</label>
          <input type="tel" id="register-phone" name="phone" required>
        </div>
        <div class="form-group">
          <label for="register-password">Senha</label>
          <input type="password" id="register-password" name="password" required>
        </div>
        <div class="form-group">
          <label for="register-password-confirm">Confirmar Senha</label>
          <input type="password" id="register-password-confirm" name="confirm-password" required>
        </div>
        <div id="register-error" class="auth-error"></div>
        <div id="register-success" class="auth-success"></div>
        <button type="submit" class="form-submit">Cadastrar</button>
      </form>
    </div>
  `;
  
  // Append modals to body
  document.body.appendChild(loginModal);
  document.body.appendChild(registerModal);
  
  // Set up event listeners
  setupAuthEventListeners();
  
  // Update UI based on authentication state
  updateAuthUI();
}

// Set up event listeners for auth UI elements
function setupAuthEventListeners() {
  // Login button click
  document.getElementById('login-button').addEventListener('click', () => {
    openModal('login-modal');
  });
  
  // Register button click
  document.getElementById('register-button').addEventListener('click', () => {
    openModal('register-modal');
  });
  
  // Logout button click
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  
  // Close modal buttons
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      closeAllModals();
    });
  });
  
  // Modal background click to close
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
  
  // Login form submission
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Registration form submission
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  clearMessages();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    showError(document.getElementById('login-error'), 'Please enter both email and password');
    return;
  }
  
  try {
    // Show loading state
    setFormLoading(document.getElementById('login-form'), true);
    
    // Attempt login
    const result = await window.auth.signIn(email, password);
    
    if (result.success) {
      showSuccess(document.getElementById('login-success'), 'Login successful!');
      closeAllModals();
      updateAuthUI();
    } else {
      showError(document.getElementById('login-error'), result.error || 'Login failed. Please check your credentials.');
    }
  } catch (error) {
    showError(document.getElementById('login-error'), error.message || 'An unexpected error occurred');
    console.error('Login error:', error);
  } finally {
    setFormLoading(document.getElementById('login-form'), false);
  }
}

// Handle registration form submission
async function handleRegister(e) {
  e.preventDefault();
  clearMessages();
  
  const name = document.getElementById('register-name').value;
  const company = document.getElementById('register-company').value;
  const email = document.getElementById('register-email').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-password-confirm').value;
  
  if (!name || !company || !email || !phone || !password) {
    showError(document.getElementById('register-error'), 'Por favor, preencha todos os campos');
    return;
  }
  
  if (password !== confirmPassword) {
    showError(document.getElementById('register-error'), 'As senhas não correspondem');
    return;
  }
  
  try {
    // Show loading state
    setFormLoading(document.getElementById('register-form'), true);
    
    // Attempt registration
    const result = await window.auth.signUp(email, password, { name, company, phone });
    
    if (result.success) {
      showSuccess(document.getElementById('register-success'), 'Cadastro realizado com sucesso! Você já pode fazer login.');
      
      // Clear the form
      document.getElementById('register-name').value = '';
      document.getElementById('register-company').value = '';
      document.getElementById('register-email').value = '';
      document.getElementById('register-phone').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-password-confirm').value = '';
      
      // Switch to login tab after 2 seconds
      setTimeout(() => {
        closeAllModals();
        openModal('login-modal');
      }, 2000);
    } else {
      showError(document.getElementById('register-error'), result.error || 'Erro ao criar conta. Tente novamente.');
    }
  } catch (error) {
    showError(document.getElementById('register-error'), error.message || 'Erro ao criar conta. Tente novamente mais tarde.');
    console.error('Registration error:', error);
  } finally {
    // Reset loading state
    setFormLoading(document.getElementById('register-form'), false);
  }
}

// Handle logout button click
async function handleLogout(e) {
  e.preventDefault();
  
  try {
    const result = await window.auth.signOut();
    if (!result.success) {
      console.error('Logout error:', result.error);
    }
    updateAuthUI();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Open a modal by ID
function openModal(modalId) {
  // Close any open modals first
  closeAllModals();
  
  // Open the requested modal
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close all modals
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('active');
  });
  document.body.style.overflow = '';
}

// Update UI based on authentication state
function updateAuthUI() {
  const currentUser = window.auth.getCurrentUser();
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const userProfile = document.getElementById('user-profile');
  const userName = document.getElementById('user-name');
  
  if (currentUser) {
    // User is logged in
    loginButton.style.display = 'none';
    registerButton.style.display = 'none';
    userProfile.style.display = 'flex';
    
    // Get user metadata to display name
    const userData = currentUser.user_metadata || {};
    // Display name if available, otherwise company, otherwise email
    let displayName = userData.name || userData.company || currentUser.email;
    // Limit the display name length
    if (displayName && displayName.length > 15) {
      displayName = displayName.substring(0, 12) + '...';
    }
    userName.textContent = displayName;
  } else {
    // User is logged out
    loginButton.style.display = 'inline-block';
    registerButton.style.display = 'inline-block';
    userProfile.style.display = 'none';
    userName.textContent = '';
  }
}

// Add authentication-related CSS
function addAuthStyles() {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
/* Main Auth Container Styles (mostly unchanged unless conflicting) */
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

/* Auth Navigation Buttons (mostly unchanged unless conflicting) */
.auth-nav-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 5px;
  background-color: transparent;
  width: 100%;
}

.auth-button { /* This is for sidebar buttons, not modal submit */
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background-color: #4CAF50; /* Existing green */
  color: white;
  font-weight: 500;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.auth-button:hover {
  background-color: #45a049;
}

.logout-btn {
  background-color: #f44336;
}

.logout-btn:hover {
  background-color: #d32f2f;
}

.user-profile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
}

#user-name {
  color: #333;
  font-weight: bold;
  flex-grow: 1;
  text-align: center;
  width: 100%;
  margin-bottom: 5px;
}

/* --- NEW/MODIFIED MODAL STYLES START HERE --- */

/* General Modal Overlay (assuming this is handled by existing .modal-overlay) */
/* .modal-overlay { ... } */

/* Modal Content Base (assuming this is handled by existing .modal-content) */
/* .modal-content { ... } */

/* Auth Modal Specific Styles */
.auth-modal { /* This class is on the modal-content div */
  background-color: #ffffff;
  padding: 30px 40px; /* Increased padding */
  border-radius: 12px; /* Softer, larger radius */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); /* More pronounced shadow */
  max-width: 480px; /* Increased width */
  width: 90%; /* Responsive width */
  text-align: left; /* Align content to the left */
}

.auth-modal h2 {
  font-size: 22px; /* Slightly smaller title */
  font-weight: 600;
  color: #333;
  margin-bottom: 20px; /* Reduced space below title */
  text-align: center; /* Center the title */
}

.auth-modal .modal-close { /* Style the close button */
  position: absolute;
  top: 15px;
  right: 15px;
  font-size: 28px;
  color: #aaa;
  background: none;
  border: none;
  cursor: pointer;
  line-height: 1;
}

.auth-modal .modal-close:hover {
  color: #333;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px; /* Reduced gap between form groups */
}

.auth-form .form-group {
  margin-bottom: 0; /* Remove margin as gap is handled by flex on auth-form */
}

.auth-form label {
  display: block;
  font-size: 14px;
  font-weight: 500; /* Slightly less bold */
  color: #555;
  margin-bottom: 5px; /* Reduced space between label and input */
}

.auth-form input[type="text"],
.auth-form input[type="email"],
.auth-form input[type="password"],
.auth-form input[type="tel"] {
  width: 100%;
  padding: 10px 12px; /* Reduced padding */
  font-size: 15px; /* Slightly smaller font in input */
  color: #333;
  background-color: #f9f9f9; /* Light background for inputs */
  border: 1px solid #ddd; /* Softer border */
  border-radius: 8px; /* Rounded corners */
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.auth-form input[type="text"]:focus,
.auth-form input[type="email"]:focus,
.auth-form input[type="password"]:focus,
.auth-form input[type="tel"]:focus {
  outline: none;
  border-color: #007bff; /* Highlight color on focus */
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1); /* Subtle glow on focus */
}

.auth-form .form-submit { /* This is the main action button in the modal */
  width: 100%;
  padding: 10px 15px; /* Reduced padding */
  font-size: 16px;
  font-weight: 600; /* Bolder text */
  color: #fff;
  background-color: #007bff; /* Modern blue */
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  margin-top: 15px; /* Adjusted space above the button, can be 10px if needed */
  text-transform: none; /* No uppercase, more modern */
}

.auth-form .form-submit:hover {
  background-color: #0056b3; /* Darker blue on hover */
}

.auth-form .form-submit:active {
  transform: translateY(1px); /* Slight press effect */
}

/* Error and Success Messages */
.auth-error,
.auth-success {
  display: none; /* Hidden by default */
  margin: 10px 0 0 0; /* Adjusted margin */
  padding: 12px 15px; /* Increased padding */
  border-radius: 8px; /* Rounded corners */
  font-size: 14px;
  text-align: left; /* Align text to left */
  border-width: 1px;
  border-style: solid;
}

.auth-error {
  background-color: #f8d7da; /* Softer red */
  color: #721c24;
  border-color: #f5c6cb;
}

.auth-success {
  background-color: #d4edda; /* Softer green */
  color: #155724;
  border-color: #c3e6cb;
}

/* Optional: Add a subtle divider line if needed */
/* .auth-modal hr {
  border: 0;
  height: 1px;
  background-color: #eee;
  margin: 25px 0;
} */

/* --- NEW/MODIFIED MODAL STYLES END HERE --- */
`;
  document.head.appendChild(styleSheet);
}

// Initialize auth UI
function initAuthUI() {
  // Check if auth is available
  if (!window.auth) {
    console.warn('Auth not available, waiting before initializing UI...');
    setTimeout(initAuthUI, 500);
    return;
  }
  
  addAuthStyles();
  createAuthUI();
}

// Export auth UI functions
window.authUI = {
  initAuthUI
};

// Helper functions
function clearMessages() {
  document.querySelectorAll('.auth-error').forEach(error => {
    error.textContent = '';
    error.style.display = 'none';
  });
  document.querySelectorAll('.auth-success').forEach(success => {
    success.textContent = '';
    success.style.display = 'none';
  });
}

function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

function showSuccess(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    // Color is handled by CSS class .auth-success
  }
}

function setFormLoading(form, isLoading) {
  if (isLoading) {
    form.querySelector('button[type="submit"]').disabled = true;
    form.querySelector('button[type="submit"]').textContent = 'Loading...';
  } else {
    form.querySelector('button[type="submit"]').disabled = false;
    form.querySelector('button[type="submit"]').textContent = 'Submit';
  }
}
