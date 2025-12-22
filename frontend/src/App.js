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
import CoverLetterTemplates from "./pages/CoverLetterTemplates";
import StrategyCallBooking from "./pages/StrategyCallBooking";
import Templates from "./pages/Templates";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PricingPage from "./pages/PricingPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import ATSChecker from "./pages/ATSChecker";
import Contact from "./pages/Contact";
import LinkedInTools from "./pages/LinkedInTools";
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

// Customer Portal Pages
import CustomerLayout from "./components/CustomerLayout";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerDocuments from "./pages/customer/CustomerDocuments";
import CustomerAnalytics from "./pages/customer/CustomerAnalytics";
import CustomerBilling from "./pages/customer/CustomerBilling";
import CustomerSettings from "./pages/customer/CustomerSettings";
import JobTracker from "./pages/customer/JobTracker";
import InterviewPrep from "./pages/customer/InterviewPrep";

// Wrapper to conditionally show Navbar
const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/super-admin') || 
                     location.pathname.startsWith('/reseller-dashboard') ||
                     location.pathname.startsWith('/dashboard');

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
        <Route path="/cover-letter-templates" element={<CoverLetterTemplates />} />
        <Route path="/book-strategy-call" element={<StrategyCallBooking />} />
        <Route path="/ats-checker" element={<ATSChecker />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* Protected Tools Routes (with Navbar) */}
        <Route path="/builder" element={<PrivateRoute><ResumeBuilder /></PrivateRoute>} />
        <Route path="/improve" element={<PrivateRoute><ResumeImprover /></PrivateRoute>} />
        <Route path="/cover-letter" element={<PrivateRoute><CoverLetterGenerator /></PrivateRoute>} />
        <Route path="/linkedin-tools" element={<PrivateRoute><LinkedInTools /></PrivateRoute>} />
        
        {/* Payment Routes */}
        <Route path="/payment/success" element={<PrivateRoute><PaymentSuccess /></PrivateRoute>} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        {/* Customer Portal Routes */}
        <Route path="/dashboard" element={<PrivateRoute><CustomerLayout><CustomerDashboard /></CustomerLayout></PrivateRoute>} />
        <Route path="/dashboard/documents" element={<PrivateRoute><CustomerLayout><CustomerDocuments /></CustomerLayout></PrivateRoute>} />
        <Route path="/dashboard/analytics" element={<PrivateRoute><CustomerLayout><CustomerAnalytics /></CustomerLayout></PrivateRoute>} />
        <Route path="/dashboard/billing" element={<PrivateRoute><CustomerLayout><CustomerBilling /></CustomerLayout></PrivateRoute>} />
        <Route path="/dashboard/jobs" element={<PrivateRoute><CustomerLayout><JobTracker /></CustomerLayout></PrivateRoute>} />
        <Route path="/dashboard/interview-prep" element={<PrivateRoute><CustomerLayout><InterviewPrep /></CustomerLayout></PrivateRoute>} />
        <Route path="/dashboard/settings" element={<PrivateRoute><CustomerLayout><CustomerSettings /></CustomerLayout></PrivateRoute>} />

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
