// Supabase Configuration
// This file loads the public API key (anon key) for Supabase authentication from environment

// The anon key is safe to use in the browser with Row Level Security (RLS) enabled in Supabase
// Load from environment variable or fetch from server endpoint

// No hardcoded fallback key - must be loaded from server

// Immediate check and async loading
(async function loadSupabaseKey() {
  if (typeof window.SUPABASE_KEY !== 'undefined') {
    console.log('[auth-config.js] SUPABASE_KEY already defined. Skipping re-declaration.');
    return;
  }

  try {
    console.log('[auth-config.js] Loading Supabase key from server...');
    const response = await fetch('/api/config/supabase-key');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.key) {
      window.SUPABASE_KEY = data.key;
      console.log('[auth-config.js] Supabase key loaded successfully from server');

      // Dispatch event to notify that config is ready
      window.dispatchEvent(new CustomEvent('supabaseConfigReady'));
    } else {
      throw new Error('No key found in response');
    }
  } catch (error) {
    console.error('[auth-config.js] Failed to load Supabase key from server:', error);

    console.error('[auth-config.js] Could not load Supabase key. Auth will not work.');
    // Still dispatch event so dependent code can handle the error gracefully
    window.dispatchEvent(new CustomEvent('supabaseConfigReady'));
  }
})();

// Note: In a production environment, you would typically:
// 1. Use row-level security (RLS) in Supabase to restrict access
// 2. Consider server-side authentication for sensitive operations
