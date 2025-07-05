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
    
    // Create user profile if user was created successfully
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            id: data.user.id,
            email: email,
            full_name: name || email.split('@')[0],
            phone: phone || '',
            role: 'end_user'
          }]);
        
        if (profileError) {
          console.warn('Could not create user profile:', profileError);
        }
      } catch (profileError) {
        console.warn('Error creating user profile:', profileError);
      }
    }
    
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
    
    // Update last login time in user_profiles
    if (data.user) {
      try {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.warn('Could not update last login:', updateError);
        }
      } catch (updateError) {
        console.warn('Error updating last login:', updateError);
      }
      
      // Auto-redirect based on role after successful login
      setTimeout(() => {
        redirectBasedOnRole();
      }, 1000); // Small delay to ensure auth state is updated
    }
    
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

// Get user profile information
async function getUserProfile() {
  if (!currentUser || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (error) {
      console.warn('User profile not found for:', currentUser.email);
      
      // Auto-create profile for known sales rep
      if (currentUser.email === 'nelson@avdesign.video') {
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([{
              id: currentUser.id,
              email: currentUser.email,
              full_name: 'Nelson (Sales Rep)',
              role: 'sales_rep',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
          
          if (!createError) {
            console.log('Auto-created sales rep profile');
            return newProfile;
          }
        } catch (createErr) {
          console.warn('Could not auto-create sales rep profile:', createErr.message);
        }
      }
      
      return { role: 'end_user', full_name: currentUser.email };
    }
    
    return data;
  } catch (error) {
    console.warn('Error fetching user profile:', error);
    return { role: 'end_user', full_name: currentUser.email };
  }
}

// Check if user has specific role
async function hasRole(role) {
  const profile = await getUserProfile();
  return profile?.role === role;
}

// Role-based redirect after login
async function redirectBasedOnRole() {
  if (!currentUser) return;
  
  try {
    const profile = await getUserProfile();
    const userRole = profile?.role || 'end_user';
    
    // Check for master admin emails
    const masterAdminEmails = [
      'nelson.maluf@onprojecoes.com.br',
      'nelson@avdesign.video'
    ];
    
    if (masterAdminEmails.includes(currentUser.email) || userRole === 'admin' || userRole === 'sales_rep') {
      // Redirect to dashboard for admin/sales rep
      window.location.href = '/admin/dashboard.html';
    } else {
      // Stay in calculator for end users/clients
      console.log('End user - staying in calculator');
    }
  } catch (error) {
    console.error('Error checking user role for redirect:', error);
    // Default to calculator on error
  }
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
  getSupabaseClient,
  getUserProfile,
  hasRole,
  redirectBasedOnRole
};