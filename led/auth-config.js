// Supabase Configuration
// This file loads the public API key (anon key) for Supabase authentication from environment

// The anon key is safe to use in the browser with Row Level Security (RLS) enabled in Supabase
// Load from environment variable or fetch from server endpoint
if (typeof window.SUPABASE_KEY === 'undefined') {
  // In production, this should be loaded from a server endpoint or build-time environment variable
  // For now, we'll fetch it from the server
  fetch('/api/config/supabase-key')
    .then(response => response.json())
    .then(data => {
      window.SUPABASE_KEY = data.key;
    })
    .catch(error => {
      console.error('Failed to load Supabase key:', error);
    });
} else {
  console.warn('[auth-config.js] SUPABASE_KEY already defined. Skipping re-declaration.');
}

// Note: In a production environment, you would typically:
// 1. Use row-level security (RLS) in Supabase to restrict access
// 2. Consider server-side authentication for sensitive operations
