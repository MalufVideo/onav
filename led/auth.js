// Auth module - exports window.auth immediately for availability
console.log('[auth.js] Script execution started');

// Initialize Supabase client
const supabaseUrl = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
let supabaseKey = '';
let supabase = null;
let currentUser = null;
let authListeners = [];
let authInitialized = false;

// Export window.auth IMMEDIATELY so other scripts can check for it
// Functions will work once initAuth is called
window.auth = {
  initAuth,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange,
  getSupabaseClient,
  getUserProfile,
  isInitialized: () => authInitialized
};

console.log('[auth.js] window.auth exported immediately');

async function initAuth() {
  console.log('[auth.js] initAuth called');

  // Prevent double initialization
  if (authInitialized) {
    console.log('[auth.js] Already initialized, skipping');
    return true;
  }

  try {
    // Wait for Supabase library
    if (typeof window.supabase === 'undefined') {
      console.log('[auth.js] Waiting for Supabase library...');
      await waitForSupabase();
    }

    if (typeof window.supabase === 'undefined') {
      console.error('[auth.js] Supabase library not loaded after waiting.');
      return false;
    }

    // Wait for config (SUPABASE_KEY)
    await waitForConfig();

    if (typeof window.SUPABASE_KEY !== 'undefined') {
      supabaseKey = window.SUPABASE_KEY;
      console.log('[auth.js] Got SUPABASE_KEY');

      if (!supabase) {
        if (window.supabaseClient) {
          supabase = window.supabaseClient.createClient(supabaseUrl, supabaseKey);
        } else {
          supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        }
        console.log('[auth.js] Supabase client created');
      }

      await restoreSession();

      supabase.auth.onAuthStateChange((event, session) => {
        console.log('[auth.js] Auth state changed:', event);
        currentUser = session?.user || null;
        if (session?.user) {
          localStorage.setItem('supabase_user_session', JSON.stringify({
            user: session.user,
            timestamp: Date.now()
          }));
        } else {
          localStorage.removeItem('supabase_user_session');
        }
        notifyListeners();
      });

      authInitialized = true;
      console.log('[auth.js] Auth initialized successfully');
      return true;
    } else {
      console.error('[auth.js] SUPABASE_KEY missing after waiting');
      return false;
    }
  } catch (error) {
    console.error('[auth.js] initAuth error:', error);
    return false;
  }
}

async function waitForSupabase() {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      if (typeof window.supabase !== 'undefined') {
        resolve();
      } else if (attempts > 30) {
        console.warn('[auth.js] Supabase library timeout');
        resolve();
      } else {
        attempts++;
        setTimeout(check, 100);
      }
    };
    check();
  });
}

async function waitForConfig() {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      if (typeof window.SUPABASE_KEY !== 'undefined') {
        resolve();
      } else if (attempts > 50) {
        console.warn('[auth.js] Config timeout, using fallback if available');
        resolve();
      } else {
        attempts++;
        setTimeout(check, 100);
      }
    };
    check();
  });
}

async function restoreSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session?.user) {
      currentUser = data.session.user;
      console.log('[auth.js] Session restored for:', currentUser.email);
      notifyListeners();
    }
  } catch (e) {
    console.warn('[auth.js] Session restore failed', e);
  }
}

async function signUp(email, password, userData) {
  if (!supabase) await initAuth();
  return supabase.auth.signUp({
    email, password, options: { data: userData }
  });
}

async function signIn(email, password) {
  if (!supabase) await initAuth();
  return supabase.auth.signInWithPassword({ email, password });
}

async function signOut() {
  if (!supabase) await initAuth();
  return supabase.auth.signOut();
}

function getCurrentUser() { return currentUser; }
function isAuthenticated() { return !!currentUser; }
function onAuthStateChange(cb) { authListeners.push(cb); if (cb) cb(currentUser); }
function notifyListeners() { authListeners.forEach(l => l && l(currentUser)); }
function getSupabaseClient() { return supabase; }

async function getUserProfile() {
  if (!currentUser || !supabase) return null;
  try {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', currentUser.id).single();
    return data;
  } catch (e) { return null; }
}

console.log('[auth.js] Script execution finished');

// Dispatch event to notify that auth module is ready
// Note: This signals that window.auth is available, not that initAuth has been called
try {
  window.dispatchEvent(new CustomEvent('authModuleReady'));
  console.log('[auth.js] authModuleReady event dispatched');

  // Also dispatch legacy event for backwards compatibility
  window.dispatchEvent(new CustomEvent('authReady'));
  console.log('[auth.js] authReady event dispatched');
} catch (e) {
  console.error('[auth.js] Failed to dispatch events:', e);
}

// Auto-initialize when Supabase config is ready
window.addEventListener('supabaseConfigReady', async () => {
  console.log('[auth.js] Received supabaseConfigReady, auto-initializing...');
  await initAuth();
});

// Fallback: If config is already available, initialize immediately
if (typeof window.SUPABASE_KEY !== 'undefined') {
  console.log('[auth.js] SUPABASE_KEY already available, initializing immediately');
  initAuth();
}
