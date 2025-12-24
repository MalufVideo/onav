console.log('[auth.js] Script execution started');

// Initialize Supabase client
const supabaseUrl = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co';
let supabaseKey = '';
let supabase = null;
let currentUser = null;
let authListeners = [];

async function initAuth() {
  console.log('[auth.js] initAuth called');
  try {
    if (typeof window.supabase === 'undefined') {
      console.error('[auth.js] Supabase library not loaded.');
      return;
    }

    await waitForConfig();

    if (typeof window.SUPABASE_KEY !== 'undefined') {
      supabaseKey = window.SUPABASE_KEY;

      if (!supabase) {
        if (window.supabaseClient) {
          supabase = window.supabaseClient.createClient(supabaseUrl, supabaseKey);
        } else {
          supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        }
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
    } else {
      console.error('[auth.js] SUPABASE_KEY missing');
    }
  } catch (error) {
    console.error('[auth.js] initAuth error:', error);
  }
}

async function waitForConfig() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (typeof window.SUPABASE_KEY !== 'undefined') {
        resolve();
      } else if (attempts > 50) {
        console.warn('[auth.js] Config timeout, using fallback if available or failing');
        resolve(); // Resolve anyway to try continuing?
      } else {
        attempts++;
        setTimeout(check, 100);
      }
    };
    check();
  });
}

async function restoreSession() {
  // Simplified restoration logic
  try {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session?.user) {
      currentUser = data.session.user;
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

// Export
window.auth = {
  initAuth,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange,
  getSupabaseClient,
  getUserProfile
};

console.log('[auth.js] Script execution finished, window.auth exported:', !!window.auth);