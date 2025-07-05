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
          supabase = window.supabaseClient.createClient(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              storage: window.localStorage
            }
          });
        } else if (typeof window.supabase !== 'undefined') {
          supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              storage: window.localStorage
            }
          });
        } else {
          console.error('Could not find Supabase client library. Make sure it\'s properly loaded.');
          return;
        }
      }
      
      // Set up auth state change listener FIRST (before checking session)
      supabase.auth.onAuthStateChange(async (event, session) => {
        const previousUser = currentUser;
        currentUser = session?.user || null;
        
        console.log('Auth state changed:', event, currentUser ? currentUser.email : 'null');
        
        // Only update UI if user actually changed
        if (!previousUser && currentUser) {
          console.log('User logged in:', currentUser.email);
        } else if (previousUser && !currentUser) {
          console.log('User logged out');
        }
        
        notifyListeners();
        
        // Handle successful confirmation
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User confirmed and signed in automatically!');
          
          // Check if this is an email confirmation (has hash tokens)
          const isEmailConfirmation = window.location.hash.includes('access_token');
          
          if (isEmailConfirmation) {
            showSuccessMessage('Email confirmado! Você está logado e pode usar o calculador.');
            // Clear the URL hash to remove confirmation tokens
            window.history.replaceState(null, null, window.location.pathname);
            // Don't trigger role-based redirect for email confirmations
          } else {
            // This is a regular login, allow role-based redirect
            setTimeout(() => {
              redirectBasedOnRole(true);
            }, 500);
          }
        }
        
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        // Handle session recovery
        if (event === 'INITIAL_SESSION' && session?.user) {
          console.log('Session recovered from storage:', session.user.email);
        }
      });
      
      // Handle email confirmation on page load
      await handleEmailConfirmation();
      
      // Force session recovery with retry mechanism
      let sessionRecovered = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!sessionRecovered && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempting to recover session (attempt ${attempts}/${maxAttempts})`);
        
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.warn(`Session recovery attempt ${attempts} failed:`, error);
            if (attempts === maxAttempts) {
              console.log('No session could be recovered after all attempts');
            }
          } else if (data?.session?.user) {
            currentUser = data.session.user;
            console.log('Session successfully recovered for:', currentUser.email);
            sessionRecovered = true;
            notifyListeners();
          } else {
            console.log(`No session found on attempt ${attempts}`);
            if (attempts === maxAttempts) {
              console.log('No existing session found after all attempts');
            }
          }
        } catch (sessionError) {
          console.warn(`Session recovery attempt ${attempts} error:`, sessionError);
        }
        
        // Wait a bit before retrying (except on last attempt)
        if (!sessionRecovered && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
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
        emailRedirectTo: 'https://onav.com.br/led/',
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
      
      // Auto-redirect based on role after successful login (only for direct login, not email confirmation)
      setTimeout(() => {
        redirectBasedOnRole(false); // false = don't redirect if on same domain
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
  // If no current user, try to recover from localStorage as backup
  if (!currentUser && typeof window !== 'undefined') {
    try {
      const storedSession = localStorage.getItem('supabase.auth.token');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        if (sessionData?.user && sessionData?.expires_at && new Date(sessionData.expires_at * 1000) > new Date()) {
          console.log('Found valid session in localStorage:', sessionData.user.email);
          currentUser = sessionData.user;
          notifyListeners();
        }
      }
    } catch (error) {
      console.warn('Error recovering session from localStorage:', error);
    }
  }
  return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
  // Use getCurrentUser() which has fallback recovery logic
  return !!getCurrentUser();
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
async function redirectBasedOnRole(forceRedirect = true) {
  if (!currentUser) return;
  
  try {
    const profile = await getUserProfile();
    const userRole = profile?.role || 'end_user';
    
    // Check for master admin emails
    const masterAdminEmails = [
      'nelson.maluf@onprojecoes.com.br',
      'nelson@avdesign.video'
    ];
    
    // Get current page to avoid unnecessary redirects
    const currentPath = window.location.pathname;
    const isOnLedCalculator = currentPath.includes('/led/') && 
                             (currentPath.includes('index.html') || 
                              currentPath.includes('my-quotes.html') || 
                              currentPath.endsWith('/led/'));
    
    if (masterAdminEmails.includes(currentUser.email) || userRole === 'admin' || userRole === 'sales_rep') {
      // Only redirect admins if they're not already on a valid LED page and forceRedirect is true
      if (forceRedirect && !currentPath.includes('/admin/')) {
        window.location.href = '/admin/dashboard.html';
      }
    } else {
      // End users - stay where they are if they're already on LED pages
      if (isOnLedCalculator) {
        console.log('End user - staying on current LED page');
      } else if (forceRedirect) {
        // Only redirect if not already on LED pages
        console.log('End user - redirecting to calculator');
        window.location.href = '/led/index.html';
      }
    }
  } catch (error) {
    console.error('Error checking user role for redirect:', error);
    // Default to staying on current page on error
  }
}

// Handle email confirmation from URL hash
async function handleEmailConfirmation() {
  if (!supabase) return;
  
  try {
    // Check for confirmation tokens in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    if (access_token && refresh_token && type) {
      console.log('Email confirmation tokens found, processing...');
      
      // Set the session using the tokens from the URL
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });
      
      if (error) {
        console.error('Error confirming email:', error);
        showErrorMessage('Erro ao confirmar email. Tente novamente.');
      } else if (data.user) {
        console.log('Email confirmation successful!');
        // The auth state change listener will handle the success message
        return true;
      }
    }
  } catch (error) {
    console.error('Error handling email confirmation:', error);
  }
  
  return false;
}

// Show success message
function showSuccessMessage(message) {
  // Create or update success message element
  let messageEl = document.getElementById('auth-success-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'auth-success-message';
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #10b981;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(messageEl);
  }
  
  messageEl.textContent = message;
  messageEl.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }, 5000);
}

// Show error message
function showErrorMessage(message) {
  // Create or update error message element
  let messageEl = document.getElementById('auth-error-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'auth-error-message';
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #ef4444;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 300px;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(messageEl);
  }
  
  messageEl.textContent = message;
  messageEl.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }, 5000);
}

// Force session refresh
async function refreshSession() {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return false;
  }
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('Session refresh failed:', error);
      return false;
    }
    
    if (data?.session?.user) {
      currentUser = data.session.user;
      console.log('Session refreshed for:', currentUser.email);
      notifyListeners();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
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
  redirectBasedOnRole,
  handleEmailConfirmation,
  showSuccessMessage,
  showErrorMessage,
  refreshSession
};
