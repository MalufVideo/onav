import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { SalesPipelinePage } from './pages/SalesPipelinePage';
import { JobsPipelinePage } from './pages/JobsPipelinePage';
import { ProtectedRoute, AdminRoute, PublicRoute, RouteGuard } from './components/RouteGuard';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter basename="/pipeline">
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <AdminRoute>
                  <DashboardPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/leads" 
              element={
                <ProtectedRoute>
                  <SalesPipelinePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/jobs" 
              element={
                <ProtectedRoute>
                  <JobsPipelinePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/project/:projectId" 
              element={
                <ProtectedRoute>
                  <ProjectPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<RouteGuard requireAuth redirectAuthenticatedTo="/leads"><SalesPipelinePage /></RouteGuard>} />
            <Route path="*" element={<RouteGuard requireAuth redirectAuthenticatedTo="/leads"><SalesPipelinePage /></RouteGuard>} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
