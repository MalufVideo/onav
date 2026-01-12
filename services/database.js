/**
 * Database Service
 * Centralizes Supabase client initialization and common database operations
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be provided in .env file');
  process.exit(1);
}

// Create both clients - anon for regular operations, service for admin operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : supabase;

// Warning if service key is missing
if (!supabaseServiceKey) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Admin functions (user creation from dashboard) will not work.');
  console.warn('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file for full functionality.');
}

/**
 * Helper function to safely convert string to number
 */
function safeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const cleanedValue = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(cleanedValue);
  return isNaN(num) ? null : num;
}

/**
 * Helper function to safely convert string to integer
 */
function safeInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Math.round(value);
  const cleanedValue = String(value).replace(/\D/g, '');
  const num = parseInt(cleanedValue, 10);
  return isNaN(num) ? null : num;
}

/**
 * Get user from authorization token
 */
async function getUserFromToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error || new Error('Invalid token') };
  }
  return { user, error: null };
}

module.exports = {
  supabase,
  supabaseAdmin,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceKey,
  safeNumber,
  safeInteger,
  getUserFromToken
};
