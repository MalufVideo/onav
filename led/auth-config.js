// Supabase Configuration
// This file contains the public API key (anon key) for Supabase authentication

// The anon key is safe to use in the browser with Row Level Security (RLS) enabled in Supabase
// This is the key that starts with 'eyJ...'
if (typeof window.SUPABASE_KEY === 'undefined') {
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoaGp2cHN4a2ZqY3hpdHBuaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1ODk4NzksImV4cCI6MjA1NTE2NTg3OX0.kAcBsHJnlr56fJ6qvXSLOWRiLTnQR7ilXUi_2Qzj4RE';
  // Assign to window object if needed globally, though const usually suffices if script scope is correct
  window.SUPABASE_KEY = SUPABASE_KEY;
} else {
  console.warn('[auth-config.js] SUPABASE_KEY already defined. Skipping re-declaration.');
}

// Note: In a production environment, you would typically:
// 1. Use row-level security (RLS) in Supabase to restrict access
// 2. Consider server-side authentication for sensitive operations
