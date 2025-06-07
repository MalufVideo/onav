// Supabase Route Protection Module

// List of routes that require authentication
const protectedRoutes = [
  '/led/dashboard.html',
  '/led/profile.html',
  '/led/calculator-advanced.html',
  // Add more protected routes as needed
];

// List of routes that are accessible only to non-authenticated users
const guestOnlyRoutes = [
  // Uncomment if you want to prevent authenticated users from accessing login page
  // '/led/login.html',
];

// Delay in milliseconds to wait for auth initialization
const AUTH_INIT_DELAY = 500;
const MAX_AUTH_WAIT_ATTEMPTS = 10;

/**
 * Redirects the user to the appropriate page based on authentication status
 * @param {string} destination - Where to redirect if authentication check fails
 */
async function protectRoute(destination = '/led/login.html') {
  // Wait for auth module to initialize
  let authChecked = false;
  let attempts = 0;
  
  while (!authChecked && attempts < MAX_AUTH_WAIT_ATTEMPTS) {
    attempts++;
    
    if (window.auth) {
      authChecked = true;
    } else {
      console.log(`Waiting for auth module to load... (attempt ${attempts}/${MAX_AUTH_WAIT_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, AUTH_INIT_DELAY));
    }
  }
  
  // If auth module couldn't be loaded after maximum attempts
  if (!authChecked) {
    console.error('Auth module could not be loaded. Redirecting to safe page.');
    redirectToSafePage(destination);
    return;
  }
  
  const isAuthenticated = window.auth.isAuthenticated();
  const currentPath = window.location.pathname;
  
  // Check if route requires authentication
  const needsAuth = protectedRoutes.some(route => currentPath.endsWith(route));
  
  // Check if route is guest-only
  const isGuestOnly = guestOnlyRoutes.some(route => currentPath.endsWith(route));
  
  // Redirect logic
  if (needsAuth && !isAuthenticated) {
    // Protect authenticated routes from unauthenticated users
    redirectToLoginWithRedirect(currentPath);
  } else if (isGuestOnly && isAuthenticated) {
    // Protect guest-only routes from authenticated users
    window.location.href = '/led/index.html';
  }
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

// Auto-run route protection if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => protectRoute(), 100);
} else {
  document.addEventListener('DOMContentLoaded', () => protectRoute());
}
