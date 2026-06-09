import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import InstitutionalDashboard from './pages/InstitutionalDashboard';
import CitizenDashboard from './pages/CitizenDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/citizen" element={<CitizenDashboard />} />  
        <Route path="/institution" element={<InstitutionalDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

