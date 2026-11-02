import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Landing from './pages/Landing';
import PublicMap from './pages/PublicMap';

// Citizen pages
import CitizenLogin from './pages/citizen/CitizenLogin';
import CitizenRegister from './pages/citizen/CitizenRegister';
import CitizenDashboard from './pages/citizen/Dashboard';
import NewComplaint from './pages/citizen/NewComplaint';
import MyComplaints from './pages/citizen/MyComplaints';
import ComplaintDetail from './pages/citizen/ComplaintDetail';

// Officer pages
import OfficerLogin from './pages/officer/OfficerLogin';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import OfficerQueue from './pages/officer/OfficerQueue';
import OfficerMap from './pages/officer/OfficerMap';
import OfficerComplaintDetail from './pages/officer/OfficerComplaintDetail';

import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1, paddingBottom: '40px' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/map" element={<PublicMap />} />
              <Route path="/login" element={<CitizenLogin />} />
              <Route path="/register" element={<CitizenRegister />} />
              <Route path="/officer/login" element={<OfficerLogin />} />

              {/* Citizen Protected Routes */}
              <Route
                path="/citizen/dashboard"
                element={
                  <ProtectedRoute role="citizen">
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/new"
                element={
                  <ProtectedRoute role="citizen">
                    <NewComplaint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/complaints"
                element={
                  <ProtectedRoute role="citizen">
                    <MyComplaints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/complaints/:id"
                element={
                  <ProtectedRoute role="citizen">
                    <ComplaintDetail />
                  </ProtectedRoute>
                }
              />

              {/* Officer Protected Routes */}
              <Route
                path="/officer/dashboard"
                element={
                  <ProtectedRoute role="officer">
                    <OfficerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/officer/queue"
                element={
                  <ProtectedRoute role="officer">
                    <OfficerQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/officer/map"
                element={
                  <ProtectedRoute role="officer">
                    <OfficerMap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/officer/complaints/:id"
                element={
                  <ProtectedRoute role="officer">
                    <OfficerComplaintDetail />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
