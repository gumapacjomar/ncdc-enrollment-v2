import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import StudentApplication from './pages/StudentApplication';
import RegistrarDashboard from './pages/registrar/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import RegistrarManagement from './pages/admin/RegistrarManagement';
import ConfirmEnrollment from './pages/admin/ConfirmEnrollment';
import ConfirmEnrollments from './pages/admin/ConfirmEnrollments';
import AllApplications from './pages/admin/AllApplications';
import StudentDashboard from './pages/student/Dashboard';
import PasswordRequests from './pages/admin/PasswordRequests';
import Reports from './pages/admin/Reports';
import AdminProfile from './pages/admin/Profile';
import RegistrarProfile from './pages/registrar/Profile';
import StudentProfile from './pages/student/Profile';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/apply" element={<StudentApplication />} />
        
        {/* Registrar Routes */}
        <Route path="/registrar/dashboard" element={<RegistrarDashboard />} />
        <Route path="/registrar/profile" element={<RegistrarProfile />} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/registrars" element={<RegistrarManagement />} />
        <Route path="/admin/confirm/:id" element={<ConfirmEnrollment />} />
        <Route path="/admin/password-requests" element={<PasswordRequests />} />
        <Route path="/admin/approved" element={<ConfirmEnrollments />} />
        <Route path="/admin/applications" element={<AllApplications />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        
        {/* Student Routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/profile" element={<StudentProfile />} />
      </Routes>
    </Router>
  );
}

export default App;