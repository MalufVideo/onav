// Supabase Route Protection Module

// List of routes that require authentication
const protectedRoutes = [
  '/led/dashboard.html',
  '/led/profile.html',
  '/led/calculator-advanced.html',
  '/led/my-quotes.html',
  // Add more protected routes as needed
];

// List of routes that are accessible only to non-authenticated users
const guestOnlyRoutes = [
  // Uncomment if you want to prevent authenticated users from accessing login page
  // '/led/login.html',
];

// Delay in milliseconds to wait for auth initialization
const AUTH_INIT_DELAY = 250;
const MAX_AUTH_WAIT_ATTEMPTS = 20;

/**
 * Redirects the user to the appropriate page based on authentication status
 * @param {string} destination - Where to redirect if authentication check fails
 */
async function protectRoute(destination = '/led/login.html') {
  console.log('[auth-protection.js] Starting route protection for:', window.location.pathname);

  // Wait for auth module to be available
  let authAvailable = false;
  let attempts = 0;

  while (!authAvailable && attempts < MAX_AUTH_WAIT_ATTEMPTS) {
    attempts++;

    // Check if window.auth exists and has the initAuth function
    if (window.auth && typeof window.auth.initAuth === 'function') {
      authAvailable = true;
      console.log('[auth-protection.js] Auth module found after', attempts, 'attempts');
    } else {
      console.log(`[auth-protection.js] Waiting for auth module to load... (attempt ${attempts}/${MAX_AUTH_WAIT_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, AUTH_INIT_DELAY));
    }
  }

  // If auth module couldn't be loaded after maximum attempts
  // DON'T redirect - just log and continue so users can still use the calculator
  if (!authAvailable) {
    console.warn('[auth-protection.js] Auth module could not be loaded. Continuing without auth protection.');
    // Do NOT redirect - allow guest access to calculator
    return;
  }

  // Now initialize auth if not already initialized
  try {
    console.log('[auth-protection.js] Calling initAuth...');
    await window.auth.initAuth();
    console.log('[auth-protection.js] Auth module initialized successfully');
  } catch (error) {
    console.warn('[auth-protection.js] Error initializing auth:', error);
    // Continue without auth - allow guest access
    return;
  }

  // Wait a bit more for session to be fully restored
  await new Promise(resolve => setTimeout(resolve, 500));

  const isAuthenticated = window.auth.isAuthenticated();
  const currentUser = window.auth.getCurrentUser();
  const currentPath = window.location.pathname;

  console.log('[auth-protection.js] Auth state - isAuthenticated:', isAuthenticated, 'user:', currentUser?.email || 'null');

  // Check if route requires authentication
  const needsAuth = protectedRoutes.some(route => currentPath.endsWith(route));

  // Check if route is guest-only
  const isGuestOnly = guestOnlyRoutes.some(route => currentPath.endsWith(route));

  console.log('[auth-protection.js] Route check - needsAuth:', needsAuth, 'isGuestOnly:', isGuestOnly);

  // Redirect logic - DISABLED FOR GUEST ACCESS
  // if (needsAuth && !isAuthenticated) {
  //   console.log('[auth-protection.js] Protected route accessed without authentication, redirecting to login');
  //   // Protect authenticated routes from unauthenticated users
  //   redirectToLoginWithRedirect(currentPath);
  // } else if (isGuestOnly && isAuthenticated) {
  //   console.log('[auth-protection.js] Guest-only route accessed by authenticated user, redirecting to calculator');
  //   // Protect guest-only routes from authenticated users
  //   window.location.href = '/led/index.html';
  // } else {
  //   console.log('[auth-protection.js] Route protection passed, user can access this page');
  // }

  // Allow all users (authenticated and guests) to access calculator
  console.log('[auth-protection.js] Guest access enabled - allowing access to all users');

  // Dispatch event to signal that route protection is complete
  window.dispatchEvent(new CustomEvent('authProtectionComplete'));
}

/**
 * Redirects to login page with a return URL
 * @param {string} returnPath - Path to return to after login
 */
function redirectToLoginWithRedirect(returnPath) {
  const returnUrl = encodeURIComponent(returnPath);
  window.location.href = `/led/login.html?redirect=${returnUrl}`;
}

/**
 * Redirects to a safe page
 * @param {string} destination - Where to redirect
 */
function redirectToSafePage(destination) {
  window.location.href = destination;
}

// Export protection functions
window.authProtection = {
  protectRoute
};

// Track initialization state
let authProtectionInitialized = false;

// Initialize when auth module is ready
function initProtection() {
  if (authProtectionInitialized) {
    console.log('[auth-protection.js] Already initialized, skipping');
    return;
  }
  authProtectionInitialized = true;
  console.log('[auth-protection.js] Initializing protection...');
  protectRoute();
}

// Listen for both event names (legacy and new)
window.addEventListener('authReady', () => {
  console.log('[auth-protection.js] Received authReady event');
  initProtection();
});

window.addEventListener('authModuleReady', () => {
  console.log('[auth-protection.js] Received authModuleReady event');
  initProtection();
});

// Fallback: Check if auth is already available
if (window.auth && typeof window.auth.initAuth === 'function') {
  console.log('[auth-protection.js] Auth module already available on load');
  setTimeout(initProtection, 100);
} else if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // Auto-run route protection with a delay to allow auth scripts to load
  setTimeout(() => {
    if (!authProtectionInitialized) {
      console.log('[auth-protection.js] Fallback initialization triggered');
      initProtection();
    }
  }, 500);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (!authProtectionInitialized) {
        console.log('[auth-protection.js] DOMContentLoaded fallback initialization');
        initProtection();
      }
    }, 500);
  });
}

console.log('[auth-protection.js] Script loaded');
