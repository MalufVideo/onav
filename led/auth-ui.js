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
    /* Main Auth Container Styles */
    .auth-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
    }
    
    /* Auth Navigation Buttons */
    .auth-nav-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      padding: 5px;
      background-color: transparent;
      width: 100%;
    }
    
    .auth-button {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      background-color: #4CAF50;
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
    
    /* Error and Success Messages */
    .auth-error, 
    .auth-success {
      margin: 6px 0;
      padding: 6px;
      border-radius: 4px;
      font-size: 14px;
      text-align: center;
    }
    
    .auth-error {
      background-color: #ffebee;
      color: #c62828;
      border: 1px solid #ef9a9a;
    }
    
    .auth-success {
      background-color: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #a5d6a7;
    }
    
    /* Auth Modal Specific Styles */
    .auth-modal {
      max-width: 400px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
    }
    
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
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
  });
  document.querySelectorAll('.auth-success').forEach(success => {
    success.textContent = '';
  });
}

function showError(element, message) {
  element.textContent = message;
}

function showSuccess(element, message) {
  element.textContent = message;
  element.style.color = '#388e3c';
  element.style.display = 'block';
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
