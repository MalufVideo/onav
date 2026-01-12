/**
 * Pipeline App Configuration
 * Environment-based configuration for the pipeline application
 */

// Master admin email - can be overridden via environment variable
export const MASTER_ADMIN_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || 'nelsonhdvideo@gmail.com';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Feature flags
export const FEATURES = {
  ENABLE_JOBS_PIPELINE: true,
  ENABLE_PROJECT_MANAGEMENT: true,
};

export default {
  MASTER_ADMIN_EMAIL,
  API_BASE_URL,
  FEATURES,
};
