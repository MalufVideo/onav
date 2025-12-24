// Authentication UI Components

// Create and append authentication UI elements
function createAuthUI() {
  // Create auth card for right sidebar
  const authCard = document.createElement('div');
  authCard.className = 'control-card';
  authCard.id = 'auth-card';
  authCard.style.marginBottom = '15px';
  authCard.innerHTML = `
      <h2>Minha Conta</h2>
      <div class="selector-buttons" style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
        <button id="login-button" class="selector-btn" style="flex: 1;">Entrar</button>
        <button id="register-button" class="selector-btn" style="flex: 1;">Cadastrar</button>
        
        <div id="user-profile" class="user-profile" style="display: none; width: 100%; text-align: center;">
          <p id="user-name" style="margin-bottom: 10px; font-weight: bold; color: #fff;"></p>
          <div style="display: flex; gap: 10px; flex-direction: column;">
            <a href="my-quotes.html" class="selector-btn active" id="my-quotes-button" style="text-decoration: none; padding: 10px;">Minhas Propostas</a>
            <button id="logout-button" class="selector-btn" style="background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5);">Sair</button>
          </div>
        </div>
      </div>
  `;

  // Add auth card to the right sidebar at the top
  const infoSidebar = document.getElementById('info-sidebar');
  if (infoSidebar) {
    // Check if it already exists to avoid duplicates
    const existingCard = document.getElementById('auth-card');
    if (existingCard) {
      existingCard.remove();
    }
    // Insert auth card as the first element of the sidebar
    infoSidebar.insertBefore(authCard, infoSidebar.firstChild);
    console.log('[auth-ui.js] Auth card injected');
  } else {
    console.error('[auth-ui.js] info-sidebar not found!');
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
  if (!document.getElementById('login-modal')) document.body.appendChild(loginModal);
  if (!document.getElementById('register-modal')) document.body.appendChild(registerModal);

  // Set up event listeners
  setupAuthEventListeners();

  // Update UI based on authentication state
  updateAuthUI();
}

// Set up event listeners for auth UI elements
function setupAuthEventListeners() {
  // Dynamic buttons in sidebar
  const loginBtn = document.getElementById('login-button');
  const registerBtn = document.getElementById('register-button');
  const logoutBtn = document.getElementById('logout-button');

  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('login-modal');
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('register-modal');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

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
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // Registration form submission
  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
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

  // Check if auth module is available
  if (!window.auth || typeof window.auth.signIn !== 'function') {
    showError(document.getElementById('login-error'), 'Authentication system not ready. Please refresh the page and try again.');
    console.error('[auth-ui.js] Auth module not available in handleLogin');
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
      // Reload to ensure all state is updated
      setTimeout(() => location.reload(), 500);
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

  // Check if auth module is available
  if (!window.auth || typeof window.auth.signUp !== 'function') {
    showError(document.getElementById('register-error'), 'Sistema de autenticação não está pronto. Por favor, recarregue a página e tente novamente.');
    console.error('[auth-ui.js] Auth module not available in handleRegister');
    return;
  }

  try {
    // Show loading state
    setFormLoading(document.getElementById('register-form'), true);

    // Attempt registration
    const result = await window.auth.signUp(email, password, { name, company, phone });

    if (result.success) {
      showSuccess(document.getElementById('register-success'), 'Cadastro realizado com sucesso! Você já pode fazer login.');
      // Auto login or ask to login?
      // For now, let's close and open login
      setTimeout(() => {
        closeAllModals();
        openModal('login-modal');
        // Fill email
        document.getElementById('login-email').value = email;
        showSuccess(document.getElementById('login-success'), 'Conta criada! Digite sua senha.');
      }, 1500);
    } else {
      showError(document.getElementById('register-error'), result.error || 'Falha no cadastro. Tente novamente.');
    }
  } catch (error) {
    showError(document.getElementById('register-error'), error.message || 'Erro inesperado.');
    console.error('Register error:', error);
  } finally {
    setFormLoading(document.getElementById('register-form'), false);
  }
}

// Handle logout
async function handleLogout() {
  if (confirm('Tem certeza que deseja sair?')) {
    if (window.auth && window.auth.signOut) {
      await window.auth.signOut();
      updateAuthUI();
      location.reload();
    }
  }
}

// Helper to set form loading state
function setFormLoading(form, isLoading) {
  if (!form) return;
  const submitBtn = form.querySelector('.form-submit');
  if (submitBtn) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Processando...' : (form.id === 'login-form' ? 'Entrar' : 'Cadastrar');
  }
}

// Helper to show error message
function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

// Helper to show success message
function showSuccess(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

// Open a modal
function openModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    // Add active class if needed by CSS
    modal.classList.add('active');
  } else {
    console.error('[auth-ui.js] Modal not found:', modalId);
  }
}

// Close all modals
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.style.display = 'none';
    modal.classList.remove('active');
  });
  clearMessages();
}

// Update UI based on auth state
async function updateAuthUI() {
  console.log('[auth-ui.js] Updating Auth UI...');
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const userProfile = document.getElementById('user-profile');
  const userName = document.getElementById('user-name');

  if (!loginButton || !registerButton || !userProfile) {
    console.warn('[auth-ui.js] UI elements not found');
    return;
  }

  // If auth is not ready, just show login buttons (default state)
  if (!window.auth) {
    console.warn('[auth-ui.js] Auth module not ready yet, showing default login buttons');
    loginButton.style.display = 'inline-block';
    registerButton.style.display = 'inline-block';
    userProfile.style.display = 'none';
    userName.textContent = '';
    return;
  }

  const isAuthenticated = window.auth.isAuthenticated();
  console.log('[auth-ui.js] Is Authenticated:', isAuthenticated);

  if (isAuthenticated) {
    // User is logged in
    loginButton.style.display = 'none';
    registerButton.style.display = 'none';
    userProfile.style.display = 'block';

    const currentUser = window.auth.getCurrentUser();
    let displayName = 'Usuário';

    if (currentUser) {
      try {
        // Try to get profile if available (depends on implementation)
        const userProfile = await window.auth.getUserProfile();
        if (userProfile && userProfile.full_name) {
          displayName = userProfile.full_name;
        } else {
          // Fall back to user metadata
          const userData = currentUser.user_metadata || {};
          displayName = userData.name || userData.company || currentUser.email;
        }
      } catch (error) {
        // Fall back to user metadata if profile fetch fails
        const userData = currentUser.user_metadata || {};
        displayName = userData.name || userData.company || currentUser.email;
      }
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
    /* Modal Styles */
    .auth-modal {
      max-width: 400px;
    }
    
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .auth-error {
      color: #ef4444;
      font-size: 0.9em;
      display: none;
      padding: 10px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 6px;
    }
    
    .auth-success {
      color: #22c55e;
      font-size: 0.9em;
      display: none;
      padding: 10px;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 6px;
    }
  `;
  document.head.appendChild(styleSheet);
}

// Initialize auth UI
function initAuthUI() {
  console.log('[auth-ui.js] Initializing Auth UI immediately...');

  // Always create UI first, don't wait for auth
  addAuthStyles();
  createAuthUI();

  // If auth is not ready, we can wait to UPDATE the UI, but the buttons should exist
  if (!window.auth) {
    console.log('[auth-ui.js] Auth not ready, setting up poller to update UI when ready');
    const checkAuth = setInterval(() => {
      if (window.auth) {
        clearInterval(checkAuth);
        updateAuthUI();
      }
    }, 500);
  }
}

// Export auth UI functions
window.authUI = {
  initAuthUI,
  openModal,
  closeAllModals,
  updateAuthUI
};

// Auto-init if DOM is ready (fallback)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initAuthUI, 100);
} else {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initAuthUI, 100));
}

// Also listen for auth events to update UI when auth becomes available
window.addEventListener('authModuleReady', () => {
  console.log('[auth-ui.js] Received authModuleReady event, updating UI');
  updateAuthUI();
});

window.addEventListener('authReady', () => {
  console.log('[auth-ui.js] Received authReady event, updating UI');
  updateAuthUI();
});

// Helper functions (kept same)
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
