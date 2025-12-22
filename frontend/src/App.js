import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Home from "./pages/Home";
import ResumeBuilder from "./pages/ResumeBuilder";
import ResumeImprover from "./pages/ResumeImprover";
import CoverLetterGenerator from "./pages/CoverLetterGenerator";
import Templates from "./pages/Templates";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PricingPage from "./pages/PricingPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "./components/ui/toaster";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminResellers from "./pages/admin/AdminResellers";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";

// Reseller Pages
import ResellerLayout from "./pages/reseller/ResellerLayout";
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import ResellerCustomers from "./pages/reseller/ResellerCustomers";
import ResellerRevenue from "./pages/reseller/ResellerRevenue";
import ResellerInvoices from "./pages/reseller/ResellerInvoices";
import ResellerPricing from "./pages/reseller/ResellerPricing";
import ResellerBranding from "./pages/reseller/ResellerBranding";
import ResellerSettings from "./pages/reseller/ResellerSettings";

// Wrapper to conditionally show Navbar
const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/super-admin') || location.pathname.startsWith('/reseller-dashboard');

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/templates" element={<Templates />} />
        
        {/* Protected Customer Routes */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/builder" element={<PrivateRoute><ResumeBuilder /></PrivateRoute>} />
        <Route path="/improve" element={<PrivateRoute><ResumeImprover /></PrivateRoute>} />
        <Route path="/cover-letter" element={<PrivateRoute><CoverLetterGenerator /></PrivateRoute>} />
        
        {/* Payment Routes */}
        <Route path="/payment/success" element={<PrivateRoute><PaymentSuccess /></PrivateRoute>} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="resellers" element={<AdminResellers />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Reseller Dashboard Routes */}
        <Route path="/reseller-dashboard" element={<ResellerLayout />}>
          <Route index element={<ResellerDashboard />} />
          <Route path="customers" element={<ResellerCustomers />} />
          <Route path="revenue" element={<ResellerRevenue />} />
          <Route path="invoices" element={<ResellerInvoices />} />
          <Route path="pricing" element={<ResellerPricing />} />
          <Route path="branding" element={<ResellerBranding />} />
          <Route path="settings" element={<ResellerSettings />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
