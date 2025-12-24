// Auth module - exports window.auth immediately for availability
console.log('[auth.js] Script execution started');

// Initialize Supabase client
const supabaseUrl = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
let supabaseKey = '';
let supabaseInstance = null;
let currentUser = null;
let authListeners = [];
let authInitialized = false;

// Export window.auth IMMEDIATELY so other scripts can check for it
// Functions will work once initAuth is called
try {
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
  console.log('[auth.js] window.auth exported successfully');
} catch (e) {
  console.error('[auth.js] Error exporting window.auth:', e);
}

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

      if (!supabaseInstance) {
        if (window.supabaseClient) {
          supabaseInstance = window.supabaseClient.createClient(supabaseUrl, supabaseKey);
        } else {
          supabaseInstance = window.supabase.createClient(supabaseUrl, supabaseKey);
        }
        console.log('[auth.js] Supabase client created');
      }

      await restoreSession();

      supabaseInstance.auth.onAuthStateChange((event, session) => {
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
    const { data, error } = await supabaseInstance.auth.getSession();
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
  if (!supabaseInstance) await initAuth();
  const { data, error } = await supabaseInstance.auth.signUp({
    email, password, options: { data: userData }
  });
  return { success: !error, error: error?.message, data };
}

async function signIn(email, password) {
  if (!supabaseInstance) await initAuth();
  const { data, error } = await supabaseInstance.auth.signInWithPassword({ email, password });
  return { success: !error, error: error?.message, data };
}

async function signOut() {
  if (!supabaseInstance) await initAuth();
  const { error } = await supabaseInstance.auth.signOut();
  return { success: !error, error: error?.message };
}

function getCurrentUser() { return currentUser; }
function isAuthenticated() { return !!currentUser; }
function onAuthStateChange(cb) { authListeners.push(cb); if (cb) cb(currentUser); }
function notifyListeners() { authListeners.forEach(l => l && l(currentUser)); }
function getSupabaseClient() { return supabaseInstance; }

async function getUserProfile() {
  if (!currentUser || !supabaseInstance) return null;
  try {
    const { data } = await supabaseInstance.from('user_profiles').select('*').eq('id', currentUser.id).single();
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
