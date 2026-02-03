import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Layouts/Pages/Auth/Login';
import ForgotPassword from './Layouts/Pages/Auth/ForgotPassword';
import Layout from './Components/Layout';
import ProtectedRoute from './Components/ProtectedRoute';
import { UserProvider } from './Context/UserContext';

// Admin Pages
import AdminDashboard from './Components/Admin/AdminDashboard';
import Users from './Components/Admin/Users';

// CEO Pages
import CEODashboard from './Components/CEO/CEODashboard';
import CEOCalendar from './Components/CEO/CEOCalendar';
import CEOHistory from './Components/CEO/CEOHistory';
import CEOSettings from './Components/CEO/CEOSettings';

// CTO Pages
import CTODashboard from './Components/CTO/CTODashboard';
import CTOCalendar from './Components/CTO/CTOCalendar';
import CTOHistory from './Components/CTO/CTOHistory';
import CTOSettings from './Components/CTO/CTOSettings';

// HR Pages
import HRDashboard from './Components/HR/HRDashboard';
import HRReminder from './Components/HR/HRReminder';
import HRHistory from './Components/HR/HRHistory';
import HRSettings from './Components/HR/HRSettings';

import Unauthorized from './Layouts/Pages/Auth/Unauthorize';
import HRNotification from './Components/HR/HRNotification';

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
           <Route path="/unauthorized" element={<Unauthorized />} />
         

          {/* Protected Routes with Layout */}
          <Route path="/" element={<Layout />}>


         

            
            {/* Admin Routes */}
            <Route path="admin">
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="users" 
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Users/>
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* CEO Routes */}
            <Route path="ceo">
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['CEO']}>
                    <CEODashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="calendar" 
                element={
                  <ProtectedRoute allowedRoles={['CEO']}>
                    <CEOCalendar />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="history" 
                element={
                  <ProtectedRoute allowedRoles={['CEO']}>
                    <CEOHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="settings" 
                element={
                  <ProtectedRoute allowedRoles={['CEO']}>
                    <CEOSettings />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* CTO Routes */}
            <Route path="cto">
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['CTO']}>
                    <CTODashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="calendar" 
                element={
                  <ProtectedRoute allowedRoles={['CTO']}>
                    <CTOCalendar />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="history" 
                element={
                  <ProtectedRoute allowedRoles={['CTO']}>
                    <CTOHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="settings" 
                element={
                  <ProtectedRoute allowedRoles={['CTO']}>
                    <CTOSettings />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* HR Routes */}
            <Route path="hr">
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['HR']}>
                    <HRDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="reminders" 
                element={
                  <ProtectedRoute allowedRoles={['HR']}>
                    <HRReminder/>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="history" 
                element={
                  <ProtectedRoute allowedRoles={['HR']}>
                    <HRHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="notification" 
                element={
                  <ProtectedRoute allowedRoles={['HR']}>
                    <HRNotification/>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="settings" 
                element={
                  <ProtectedRoute allowedRoles={['HR']}>
                    <HRSettings />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Redirect index to login */}
            <Route index element={<Navigate to="/login" replace />} />
          </Route>

          {/* 404 - Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;