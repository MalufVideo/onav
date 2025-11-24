// Supabase Configuration
// This file loads the public API key (anon key) for Supabase authentication from environment

// The anon key is safe to use in the browser with Row Level Security (RLS) enabled in Supabase
// Load from environment variable or fetch from server endpoint

// Fallback anon key (safe to expose - public key protected by RLS)
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaGp2cHN4a2ZqY3hpdHBuaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1ODk4NzksImV4cCI6MjA1NTE2NTg3OX0.kAcBsHJnlr56fJ6qvXSLOWRiLTnQR7ilXUi_2Qzj4RE';

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

    // Use fallback key immediately instead of retrying
    console.log('[auth-config.js] Using fallback Supabase anon key');
    window.SUPABASE_KEY = FALLBACK_SUPABASE_ANON_KEY;

    // Dispatch event to notify that config is ready with fallback
    window.dispatchEvent(new CustomEvent('supabaseConfigReady'));
    console.log('[auth-config.js] Supabase key loaded successfully (fallback)');
  }
})();

// Note: In a production environment, you would typically:
// 1. Use row-level security (RLS) in Supabase to restrict access
// 2. Consider server-side authentication for sensitive operations
