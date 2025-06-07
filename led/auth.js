// Supabase Authentication Module

// Initialize Supabase client
const supabaseUrl = 'https://qhhjvpsxkfjcxitpnhxi.supabase.co'; // Update this to match your project
let supabaseKey = ''; // This will be loaded from auth-config.js
let supabase = null;

// Auth state
let currentUser = null;
let authListeners = [];

// Initialize authentication
async function initAuth() {
  try {
    // Load the Supabase JavaScript library
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    
    // Load the configuration
    await loadScript('./auth-config.js');
    
    // Initialize client with API key from config
    if (typeof SUPABASE_KEY !== 'undefined') {
      supabaseKey = SUPABASE_KEY;
      
      // Use the global supabase object created by the UMD bundle
      if (typeof supabase === 'undefined' || supabase === null) {
        if (typeof window.supabaseClient !== 'undefined') {
          supabase = window.supabaseClient.createClient(supabaseUrl, supabaseKey);
        } else if (typeof window.supabase !== 'undefined') {
          supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        } else {
          console.error('Could not find Supabase client library. Make sure it\'s properly loaded.');
          return;
        }
      }
      
      // Check for existing session
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        currentUser = data.session.user;
        notifyListeners();
      }
      
      // Set up auth state change listener
      supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        notifyListeners();
        console.log('Auth state changed:', event, currentUser);
      });
    } else {
      console.error('Supabase API key not found. Make sure auth-config.js is properly configured.');
    }
  } catch (error) {
    console.error('Error initializing authentication:', error);
  }
}

// Helper function to load scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = (e) => {
      console.error(`Failed to load script: ${src}`, e);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
}

// Sign up with email and password
async function signUp(email, password, userData = {}) {
  if (!supabase) await initAuth();
  
  try {
    // Extract additional user data
    const { name, company, phone } = userData;
    
    // Create user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
          company: company || '',
          phone: phone || ''
        }
      }
    });
    
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error signing up:', error.message);
    return { success: false, error: error.message };
  }
}

// Sign in with email and password
async function signIn(email, password) {
  if (!supabase) await initAuth();
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error signing in:', error.message);
    return { success: false, error: error.message };
  }
}

// Sign out
async function signOut() {
  if (!supabase) await initAuth();
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error.message);
    return { success: false, error: error.message };
  }
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
  return !!currentUser;
}

// Subscribe to auth state changes
function onAuthStateChange(callback) {
  authListeners.push(callback);
  // Immediately call with current state
  if (callback) callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    const index = authListeners.indexOf(callback);
    if (index > -1) authListeners.splice(index, 1);
  };
}

// Notify all listeners of auth state change
function notifyListeners() {
  authListeners.forEach(listener => {
    if (listener) listener(currentUser);
  });
}

// Get Supabase client
function getSupabaseClient() {
  return supabase;
}

// Export auth functions
window.auth = {
  initAuth,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange,
  getSupabaseClient
};
