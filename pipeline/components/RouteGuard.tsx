import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  redirectAuthenticatedTo?: string;
}

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
  </div>
);

/**
 * RouteGuard - Unified route protection component
 * 
 * @param requireAuth - If true, user must be authenticated
 * @param requireAdmin - If true, user must be master admin
 * @param redirectTo - Where to redirect if auth requirements not met
 * @param redirectAuthenticatedTo - Where to redirect authenticated users (for public routes)
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = false,
  requireAdmin = false,
  redirectTo = '/login',
  redirectAuthenticatedTo
}) => {
  const { user, loading, isMasterAdmin } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // For public routes - redirect authenticated users
  if (redirectAuthenticatedTo && user) {
    return <Navigate to={isMasterAdmin ? "/dashboard" : redirectAuthenticatedTo} replace />;
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isMasterAdmin) {
    return <Navigate to="/leads" replace />;
  }

  return <>{children}</>;
};

// Pre-configured route guards for common use cases
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard requireAuth>{children}</RouteGuard>
);

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard requireAuth requireAdmin>{children}</RouteGuard>
);

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard redirectAuthenticatedTo="/leads">{children}</RouteGuard>
);

export default RouteGuard;
