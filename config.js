// Configuration for different environments
window.APP_CONFIG = {
  // Development (local server)
  development: {
    apiBaseUrl: 'http://localhost:3000/api',
    supabaseUrl: 'https://qhhjvpsxkfjcxitpnhxi.supabase.co'
  },
  
  // Production (Vercel deployment)
  production: {
    apiBaseUrl: '/api',
    supabaseUrl: 'https://qhhjvpsxkfjcxitpnhxi.supabase.co'
  },
  
  // Get current environment configuration
  get current() {
    // Detect environment based on hostname
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return this.development;
    } else {
      return this.production;
    }
  }
};

// Helper function to get API URL
window.getApiUrl = function(endpoint) {
  const config = window.APP_CONFIG.current;
  return `${config.apiBaseUrl}${endpoint}`;
};

console.log('Environment detected:', window.location.hostname === 'localhost' ? 'development' : 'production');
console.log('API Base URL:', window.APP_CONFIG.current.apiBaseUrl);