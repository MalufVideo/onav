// Supabase Configuration
// This file loads the public API key (anon key) for Supabase authentication from environment

// The anon key is safe to use in the browser with Row Level Security (RLS) enabled in Supabase
// Load from environment variable or fetch from server endpoint

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
      console.log('[auth-config.js] Supabase key loaded successfully');
      
      // Dispatch event to notify that config is ready
      window.dispatchEvent(new CustomEvent('supabaseConfigReady'));
    } else {
      throw new Error('No key found in response');
    }
  } catch (error) {
    console.error('[auth-config.js] Failed to load Supabase key:', error);
    
    // Retry mechanism
    let retryCount = 0;
    const maxRetries = 3;
    
    const retryLoad = async () => {
      if (retryCount >= maxRetries) {
        console.error('[auth-config.js] Max retries reached, unable to load Supabase key');
        return;
      }
      
      retryCount++;
      console.log(`[auth-config.js] Retry attempt ${retryCount}/${maxRetries}`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay
        const response = await fetch('/api/config/supabase-key');
        const data = await response.json();
        
        if (data.key) {
          window.SUPABASE_KEY = data.key;
          console.log('[auth-config.js] Supabase key loaded successfully on retry');
          window.dispatchEvent(new CustomEvent('supabaseConfigReady'));
        } else {
          throw new Error('No key found in retry response');
        }
      } catch (retryError) {
        console.error(`[auth-config.js] Retry ${retryCount} failed:`, retryError);
        if (retryCount < maxRetries) {
          setTimeout(retryLoad, 1000);
        }
      }
    };
    
    setTimeout(retryLoad, 1000);
  }
})();

// Note: In a production environment, you would typically:
// 1. Use row-level security (RLS) in Supabase to restrict access
// 2. Consider server-side authentication for sensitive operations
