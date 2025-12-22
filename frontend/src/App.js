import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ResumeBuilder from "./pages/ResumeBuilder";
import ResumeImprover from "./pages/ResumeImprover";
import CoverLetterGenerator from "./pages/CoverLetterGenerator";
import Templates from "./pages/Templates";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/builder" element={<ResumeBuilder />} />
          <Route path="/improve" element={<ResumeImprover />} />
          <Route path="/cover-letter" element={<CoverLetterGenerator />} />
          <Route path="/templates" element={<Templates />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;
