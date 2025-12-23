// Custom Authentication Module for Neon
// Simple API-based authentication to replace Supabase Auth

// Auth state
let currentUser = null;
let currentSession = null;
let authListeners = [];

// API base URL
const getApiUrl = (path) => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocal ? 'http://localhost:3000' : '';
  return `${baseUrl}${path}`;
};

// Initialize authentication
async function initAuth() {
  try {
    console.log('[auth.js] Initializing custom auth (Neon mode)');

    // Check for existing session in localStorage
    const storedSession = localStorage.getItem('auth_session');
    if (storedSession) {
      try {
        currentSession = JSON.parse(storedSession);

        // Verify session is still valid
        const response = await fetch(getApiUrl('/api/auth/user'), {
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          currentUser = data.user;
          console.log('[auth.js] Session restored:', currentUser.email);
        } else {
          // Session expired
          localStorage.removeItem('auth_session');
          currentSession = null;
          currentUser = null;
        }
      } catch (error) {
        console.warn('[auth.js] Failed to restore session:', error);
        localStorage.removeItem('auth_session');
      }
    }

    notifyListeners();
    console.log('[auth.js] Auth initialized');
  } catch (error) {
    console.error('[auth.js] Error initializing authentication:', error);
  }
}

// Sign up
async function signUp(email, password, metadata = {}) {
  try {
    const response = await fetch(getApiUrl('/api/auth/signup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        full_name: metadata.full_name || '',
        phone: metadata.phone || ''
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    // Store session
    currentUser = data.user;
    currentSession = data.session;
    localStorage.setItem('auth_session', JSON.stringify(currentSession));

    notifyListeners();

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('[auth.js] Signup error:', error);
    return { user: null, session: null, error };
  }
}

// Sign in
async function signIn(email, password) {
  try {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store session
    currentUser = data.user;
    currentSession = data.session;
    localStorage.setItem('auth_session', JSON.stringify(currentSession));

    notifyListeners();

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('[auth.js] Login error:', error);
    return { user: null, session: null, error };
  }
}

// Sign out
async function signOut() {
  try {
    if (currentSession) {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });
    }
  } catch (error) {
    console.warn('[auth.js] Logout request failed:', error);
  }

  // Clear local state regardless of API response
  currentUser = null;
  currentSession = null;
  localStorage.removeItem('auth_session');
  notifyListeners();

  return { error: null };
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Check if authenticated
function isAuthenticated() {
  return currentUser !== null;
}

// Get user profile (compatibility with old code)
function getUserProfile() {
  if (!currentUser) return null;
  return {
    id: currentUser.id,
    email: currentUser.email,
    full_name: currentUser.user_metadata?.full_name,
    phone: currentUser.user_metadata?.phone,
    role: currentUser.user_metadata?.role
  };
}

// Get Supabase client (compatibility - returns null in Neon mode)
function getSupabaseClient() {
  console.warn('[auth.js] getSupabaseClient() called but Supabase is not available in Neon mode');
  return null;
}

// Add auth state change listener
function onAuthStateChange(callback) {
  authListeners.push(callback);
  // Immediately call with current state
  callback('SIGNED_IN', currentSession);
}

// Notify all listeners
function notifyListeners() {
  const event = currentUser ? 'SIGNED_IN' : 'SIGNED_OUT';
  authListeners.forEach(listener => {
    try {
      listener(event, currentSession);
    } catch (error) {
      console.error('[auth.js] Error in auth listener:', error);
    }
  });
}

// Export the auth module
window.auth = {
  initAuth,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  isAuthenticated,
  getUserProfile,
  getSupabaseClient,
  onAuthStateChange
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

console.log('[auth.js] Custom auth module loaded (Neon mode)');
