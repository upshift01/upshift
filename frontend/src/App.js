import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AIAssistantBot from "./components/AIAssistantBot";
import PrivateRoute from "./components/PrivateRoute";
import ScrollToTop from "./components/ScrollToTop";
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
import About from "./pages/About";
import LinkedInTools from "./pages/LinkedInTools";
import SkillsGenerator from "./pages/SkillsGenerator";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import POPIACompliance from "./pages/POPIACompliance";
import WhiteLabelPage from "./pages/WhiteLabelPage";
import { Toaster } from "./components/ui/toaster";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminResellers from "./pages/admin/AdminResellers";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminContent from "./pages/admin/AdminContent";
import AdminCRM from "./pages/admin/AdminCRM";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminCVTemplates from "./pages/admin/AdminCVTemplates";

// Reseller Pages
import ResellerLayout from "./pages/reseller/ResellerLayout";
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import ResellerCustomers from "./pages/reseller/ResellerCustomers";
import ResellerRevenue from "./pages/reseller/ResellerRevenue";
import ResellerInvoices from "./pages/reseller/ResellerInvoices";
import ResellerPricing from "./pages/reseller/ResellerPricing";
import ResellerBranding from "./pages/reseller/ResellerBranding";
import ResellerSettings from "./pages/reseller/ResellerSettings";
import ActivityLog from "./pages/reseller/ActivityLog";
import EmailCampaigns from "./pages/reseller/EmailCampaigns";
import DomainSetup from "./pages/reseller/DomainSetup";
import EmailTemplates from "./pages/reseller/EmailTemplates";
import ResellerCalendar from "./pages/reseller/ResellerCalendar";
import ResellerCVTemplates from "./pages/reseller/ResellerCVTemplates";

// Partner Pages (White-Label URL-based routing)
import PartnerLayout from "./components/PartnerLayout";
import PartnerHome from "./pages/partner/PartnerHome";
import PartnerPricing from "./pages/partner/PartnerPricing";
import PartnerAbout from "./pages/partner/PartnerAbout";
import PartnerContact from "./pages/partner/PartnerContact";
import PartnerATSChecker from "./pages/partner/PartnerATSChecker";
import PartnerCVBuilder from "./pages/partner/PartnerCVBuilder";
import PartnerCoverLetterCreator from "./pages/partner/PartnerCoverLetterCreator";
import PartnerResumeImprover from "./pages/partner/PartnerResumeImprover";
import PartnerSkillsGenerator from "./pages/partner/PartnerSkillsGenerator";
import PartnerCVTemplates from "./pages/partner/PartnerCVTemplates";
import PartnerCoverLetterTemplates from "./pages/partner/PartnerCoverLetterTemplates";
import PartnerLogin from "./pages/partner/PartnerLogin";
import PartnerRegister from "./pages/partner/PartnerRegister";
import PartnerForgotPassword from "./pages/partner/PartnerForgotPassword";
import PartnerResetPassword from "./pages/partner/PartnerResetPassword";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerLinkedInTools from "./pages/partner/PartnerLinkedInTools";
import PartnerBookStrategyCall from "./pages/partner/PartnerBookStrategyCall";
import PartnerPrivacyPolicy from "./pages/partner/PartnerPrivacyPolicy";
import PartnerTermsOfService from "./pages/partner/PartnerTermsOfService";
import PartnerRefundPolicy from "./pages/partner/PartnerRefundPolicy";
import PartnerPaymentSuccess from "./pages/partner/PartnerPaymentSuccess";
import PartnerPaymentCancel from "./pages/partner/PartnerPaymentCancel";
import PartnerDocuments from "./pages/partner/PartnerDocuments";
import PartnerAnalytics from "./pages/partner/PartnerAnalytics";
import PartnerBilling from "./pages/partner/PartnerBilling";
import PartnerSettings from "./pages/partner/PartnerSettings";
import PartnerJobTracker from "./pages/partner/PartnerJobTracker";
import PartnerInterviewPrep from "./pages/partner/PartnerInterviewPrep";

// Main Site Password Reset
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Customer Portal Pages
import CustomerLayout from "./components/CustomerLayout";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerDocuments from "./pages/customer/CustomerDocuments";
import CustomerAnalytics from "./pages/customer/CustomerAnalytics";
import CustomerBilling from "./pages/customer/CustomerBilling";
import CustomerSettings from "./pages/customer/CustomerSettings";
import JobTracker from "./pages/customer/JobTracker";
import InterviewPrep from "./pages/customer/InterviewPrep";

// Wrapper to conditionally show Navbar and Footer
const AppContent = () => {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith('/super-admin') || 
                     location.pathname.startsWith('/reseller-dashboard') ||
                     location.pathname.startsWith('/dashboard') ||
                     location.pathname.startsWith('/partner/');
  const hideFooter = hideNavbar; // Hide footer on same pages as navbar

  return (
    <>
      <ScrollToTop />
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/cover-letter-templates" element={<CoverLetterTemplates />} />
        <Route path="/book-strategy-call" element={<StrategyCallBooking />} />
        <Route path="/ats-checker" element={<ATSChecker />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/skills-generator" element={<SkillsGenerator />} />
        
        {/* Legal Pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/popia-compliance" element={<POPIACompliance />} />
        <Route path="/white-label" element={<WhiteLabelPage />} />
        <Route path="/reseller" element={<WhiteLabelPage />} />
        <Route path="/partners" element={<WhiteLabelPage />} />
        
        {/* Protected Tools Routes (with Navbar) */}
        <Route path="/builder" element={<PrivateRoute><ResumeBuilder /></PrivateRoute>} />
        <Route path="/improve" element={<PrivateRoute><ResumeImprover /></PrivateRoute>} />
        <Route path="/cover-letter" element={<PrivateRoute><CoverLetterGenerator /></PrivateRoute>} />
        <Route path="/linkedin-tools" element={<PrivateRoute><LinkedInTools /></PrivateRoute>} />
        
        {/* Payment Routes - PaymentSuccess handles both authenticated (subscription) and public (booking) flows */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
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
          <Route path="crm" element={<AdminCRM />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="pricing" element={<AdminPricing />} />
          <Route path="cv-templates" element={<AdminCVTemplates />} />
          <Route path="content" element={<AdminContent />} />
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
          <Route path="activity" element={<ActivityLog />} />
          <Route path="campaigns" element={<EmailCampaigns />} />
          <Route path="domain-setup" element={<DomainSetup />} />
          <Route path="email-templates" element={<EmailTemplates />} />
          <Route path="calendar" element={<ResellerCalendar />} />
          <Route path="cv-templates" element={<ResellerCVTemplates />} />
        </Route>

        {/* Partner/White-Label Routes (URL-based subdomain routing) */}
        <Route path="/partner/:subdomain" element={<PartnerLayout />}>
          <Route index element={<PartnerHome />} />
          <Route path="pricing" element={<PartnerPricing />} />
          <Route path="about" element={<PartnerAbout />} />
          <Route path="contact" element={<PartnerContact />} />
          {/* Auth */}
          <Route path="login" element={<PartnerLogin />} />
          <Route path="register" element={<PartnerRegister />} />
          <Route path="forgot-password" element={<PartnerForgotPassword />} />
          <Route path="reset-password" element={<PartnerResetPassword />} />
          {/* Dashboard and Portal Pages */}
          <Route path="dashboard" element={<PartnerDashboard />} />
          <Route path="dashboard/documents" element={<PartnerDocuments />} />
          <Route path="dashboard/analytics" element={<PartnerAnalytics />} />
          <Route path="dashboard/billing" element={<PartnerBilling />} />
          <Route path="dashboard/settings" element={<PartnerSettings />} />
          <Route path="dashboard/jobs" element={<PartnerJobTracker />} />
          <Route path="dashboard/interview-prep" element={<PartnerInterviewPrep />} />
          {/* Tools - matching main site URLs */}
          <Route path="ats-checker" element={<PartnerATSChecker />} />
          <Route path="builder" element={<PartnerCVBuilder />} />
          <Route path="improve" element={<PartnerResumeImprover />} />
          <Route path="cover-letter" element={<PartnerCoverLetterCreator />} />
          <Route path="skills-generator" element={<PartnerSkillsGenerator />} />
          <Route path="templates" element={<PartnerCVTemplates />} />
          <Route path="cover-letter-templates" element={<PartnerCoverLetterTemplates />} />
          {/* Additional Tools */}
          <Route path="linkedin-tools" element={<PartnerLinkedInTools />} />
          <Route path="book-strategy-call" element={<PartnerBookStrategyCall />} />
          {/* Legal Pages */}
          <Route path="privacy-policy" element={<PartnerPrivacyPolicy />} />
          <Route path="terms-of-service" element={<PartnerTermsOfService />} />
          <Route path="refund-policy" element={<PartnerRefundPolicy />} />
          {/* Payment Pages */}
          <Route path="payment/success" element={<PartnerPaymentSuccess />} />
          <Route path="payment/cancel" element={<PartnerPaymentCancel />} />
          {/* Aliases for backward compatibility */}
          <Route path="cv-builder" element={<PartnerCVBuilder />} />
          <Route path="improve-resume" element={<PartnerResumeImprover />} />
          <Route path="cv-templates" element={<PartnerCVTemplates />} />
        </Route>
      </Routes>
      {!hideFooter && <Footer />}
      <AIAssistantBot />
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
