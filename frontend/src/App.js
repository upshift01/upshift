import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import CVBuilder from "./pages/CVBuilder";
import Templates from "./pages/Templates";
import CoverLetter from "./pages/CoverLetter";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/builder" element={<CVBuilder />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/cover-letter" element={<CoverLetter />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;
