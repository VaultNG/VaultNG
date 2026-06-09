import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── API CONFIG ────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── SHA-256 (zero-knowledge hashing, runs in browser) ─────────────────────────
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── API: fetch citizen alerts ─────────────────────────────────────────────────
async function apiFetchAlerts(userId) {
  const res = await fetch(`${API_URL}/v1/citizen/alerts?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── API: fetch check history ──────────────────────────────────────────────────
async function apiFetchHistory(userId) {
  const res = await fetch(`${API_URL}/v1/citizen/history?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── API: run a new breach check ───────────────────────────────────────────────
async function apiRunCheck(type, value) {
  const normalized = type === 'email'
    ? value.trim().toLowerCase()
    : value.replace(/\s/g, '').replace(/^0/, '234');
  const hash = await sha256Hex(normalized);
  const res = await fetch(`${API_URL}/v1/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier_type: type, hash_prefix: hash.slice(0, 5) }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return { ...data, hash, timestamp: new Date().toISOString() };
}

// ── API: get AI advisor response (Gemini API) ────────────────────────────────
// Get your free key at: https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function apiAskAdvisor(question, context) {
  if (!GEMINI_API_KEY) {
    return 'Add your Gemini API key as VITE_GEMINI_API_KEY in your .env file. Get it free at aistudio.google.com.';
  }
  const systemPrompt = `You are NigerSec's AI security advisor helping Nigerian citizens understand data breaches. Be direct, practical, and specific to Nigeria — reference NIMC, BVN, NIN, NIBSS, NDPA 2023 where relevant. Keep responses under 150 words. User context: ${JSON.stringify(context)}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to get advice right now.';
}


// ── MOCK DATA (fallbacks when API is offline) ─────────────────────────────────
const MONITORED_ITEMS = [
  { type: 'BVN',    status: 'Active', icon: '🏦', detail: 'Checked against known breach databases and leak sources.' },
  { type: 'NIN',    status: 'Active', icon: '🪪', detail: 'Monitored for exposure in public breach records and dumps.' },
  { type: 'Phone',  status: 'Active', icon: '📱', detail: 'Alerted if your number appears in a new dataset.' },
  { type: 'Email',  status: 'Active', icon: '✉️', detail: 'Tracked for breach reuse, phishing risk, and credential leaks.' },
];

const ALERTS_DATA = [
  { id: 1, title: 'No current alerts', severity: 'SAFE',   time: 'Just now',   body: 'We have not found a new match for your monitored data today. All clear.' },
  { id: 2, title: 'BVN Exposure Example', severity: 'HIGH', time: '3 days ago', body: 'Your BVN appeared in a known breach source. Recommended: notify your bank and change linked account passwords.' },
  { id: 3, title: 'Phone number detected', severity: 'MEDIUM', time: '1 week ago', body: 'Your phone number was found in the Nigerian Telco Leak dataset. Enable SIM swap protection with your carrier.' },
];

const HISTORY_DATA = [
  { date: 'Today, 12:04 PM',     identifier: 'BVN + Email',    outcome: 'No match found',     status: 'SAFE' },
  { date: 'Yesterday, 08:31 AM', identifier: 'Phone number',   outcome: 'Monitoring active',  status: 'SAFE' },
  { date: '3 days ago',          identifier: 'NIN',            outcome: 'No match found',     status: 'SAFE' },
  { date: '5 days ago',          identifier: 'BVN',            outcome: 'Breach detected',    status: 'HIGH' },
  { date: '1 week ago',          identifier: 'Email',          outcome: 'No match found',     status: 'SAFE' },
  { date: '2 weeks ago',         identifier: 'Phone number',   outcome: 'Breach detected',    status: 'MEDIUM' },
];

const NEXT_ACTIONS = [
  { title: 'Turn on SMS alerts',      badge: 'WARN',   body: 'Get instant text alerts when new exposure appears for any of your monitored identifiers.' },
  { title: 'Review security steps',   badge: 'SAFE',   body: 'Enable 2FA on all accounts, change weak passwords, and stay alert for phishing messages.' },
  { title: 'Update contact details',  badge: 'SAFE',   body: 'Make sure alerts reach your current phone number and email address.' },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #F4F7FF;
  --bg2:     #FFFFFF;
  --bg3:     #EEF2FF;
  --border:  #DDE3F0;
  --border2: #C7D1E8;
  --text:    #0F172A;
  --muted:   #64748B;
  --muted2:  #94A3B8;
  --green:   #059669;
  --green2:  #D1FAE5;
  --blue:    #2563EB;
  --blue2:   #DBEAFE;
  --red:     #DC2626;
  --red2:    #FEE2E2;
  --amber:   #D97706;
  --amber2:  #FEF3C7;
  --mono:    'IBM Plex Mono', monospace;
  --head:    'Syne', sans-serif;
  --body:    'DM Sans', sans-serif;
  --radius:  16px;
  --radius-sm: 10px;
  --shadow:  0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.06);
  --shadow-lg: 0 8px 32px rgba(15,23,42,0.12);
}

body, #root { margin: 0; padding: 0; width: 100%; background: var(--bg); }

/* LOGIN PAGE STYLES */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* DASHBOARD STYLES */
.cd-wrap {
  width: 100%; min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--body);
  font-size: 14px;
  line-height: 1.5;
}

/* ── NAV ── */
.cd-nav {
  position: sticky; top: 0; z-index: 100;
  width: 100%; height: 64px;
  background: rgba(255,255,255,0.95);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
  display: flex; align-items: center;
  padding: 0 1.5rem;
  justify-content: space-between;
  box-shadow: 0 1px 0 var(--border);
}
.cd-nav-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--head); font-weight: 700; font-size: 1rem; color: var(--text);
  cursor: pointer; text-decoration: none;
}
.cd-nav-mark {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, var(--blue), #1D4ED8);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}
.cd-nav-sub { font-size: 11px; color: var(--muted); font-family: var(--body); font-weight: 400; }
.cd-nav-right { display: flex; align-items: center; gap: 0.5rem; }
.cd-nav-user {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--muted);
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 20px; padding: 5px 12px;
}
.cd-nav-back {
  background: none; border: 1px solid var(--border2);
  color: var(--muted); border-radius: 20px; padding: 5px 14px;
  font-size: 12px; cursor: pointer; font-family: var(--body);
  transition: all 0.15s;
}
.cd-nav-back:hover { color: var(--red); border-color: var(--red); }

/* ── LAYOUT ── */
.cd-layout { display: flex; width: 100%; min-height: calc(100vh - 64px); }

/* ── SIDEBAR ── */
.cd-sidebar {
  width: 210px; flex-shrink: 0;
  background: #fff;
  border-right: 1px solid var(--border);
  padding: 1.2rem 0.75rem;
  position: sticky; top: 64px;
  height: calc(100vh - 64px);
  overflow-y: auto;
}
.cd-sidebar-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--muted2); text-transform: uppercase;
  padding: 0 0.5rem; margin-bottom: 6px;
}
.cd-sidebar-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: var(--radius-sm);
  color: var(--muted); cursor: pointer; font-size: 13px; font-weight: 500;
  transition: all 0.15s; margin-bottom: 2px;
  border: 1px solid transparent;
}
.cd-sidebar-item:hover { background: var(--bg3); color: var(--text); }
.cd-sidebar-item.active {
  background: var(--blue2);
  border-color: rgba(37,99,235,0.15);
  color: var(--blue);
}
.cd-sidebar-item .cd-icon { font-size: 15px; width: 20px; text-align: center; }
.cd-sidebar-divider { height: 1px; background: var(--border); margin: 10px 0; }

/* ── MAIN ── */
.cd-main { flex: 1; min-width: 0; padding: 1.5rem; }

/* ── HERO CARD ── */
.cd-hero {
  background: linear-gradient(135deg, #fff 0%, #F0F7FF 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.5rem;
  box-shadow: var(--shadow); margin-bottom: 1.2rem;
  position: relative; overflow: hidden;
}
.cd-hero::before {
  content: ''; position: absolute;
  top: -40px; right: -40px;
  width: 180px; height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%);
}
.cd-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.cd-hero-title { font-family: var(--head); font-size: 1.4rem; font-weight: 700; margin-bottom: 0.4rem; }
.cd-hero-sub { color: var(--muted); font-size: 13px; max-width: 500px; line-height: 1.6; }
.cd-hero-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1.2rem; }

/* ── BADGES ── */
.cd-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; padding: 4px 10px;
  border-radius: 20px; white-space: nowrap;
}
.cd-badge-SAFE   { background: var(--green2); color: var(--green); }
.cd-badge-MEDIUM { background: var(--amber2); color: var(--amber); }
.cd-badge-HIGH   { background: var(--red2);   color: var(--red);   }
.cd-badge-BLUE   { background: var(--blue2);  color: var(--blue);  }
.cd-badge-GRAY   { background: var(--bg3);    color: var(--muted); }
.cd-badge-WARN   { background: var(--amber2); color: var(--amber); }

/* ── BUTTONS ── */
.cd-btn {
  border: none; border-radius: var(--radius-sm);
  padding: 10px 18px; font-weight: 600; cursor: pointer;
  font-size: 13px; font-family: var(--body); transition: all 0.15s;
  white-space: nowrap;
}
.cd-btn-primary {
  background: linear-gradient(135deg, var(--blue), #1D4ED8);
  color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.25);
}
.cd-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.cd-btn-secondary {
  background: #fff; border: 1px solid var(--border2);
  color: var(--text);
}
.cd-btn-secondary:hover { background: var(--bg3); }
.cd-btn-danger {
  background: var(--red2); color: var(--red);
  border: 1px solid rgba(220,38,38,0.2);
}

/* ── KPI ROW ── */
.cd-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.2rem; }
.cd-kpi {
  background: #fff; border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.1rem 1.2rem;
  box-shadow: var(--shadow);
}
.cd-kpi-label { font-size: 11px; color: var(--muted); font-weight: 600; letter-spacing: 0.04em; margin-bottom: 8px; }
.cd-kpi-value { font-family: var(--head); font-size: 1.8rem; font-weight: 700; color: var(--text); }
.cd-kpi-sub { font-size: 11px; color: var(--muted); margin-top: 5px; }

/* ── GRID ── */
.cd-grid-2 { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.cd-grid-1 { margin-bottom: 1rem; }

/* ── CARD ── */
.cd-card {
  background: #fff; border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.2rem;
  box-shadow: var(--shadow);
}
.cd-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.cd-card-title { font-family: var(--head); font-size: 1rem; font-weight: 700; }
.cd-card-sub { font-size: 11px; color: var(--muted); }

/* ── MONITORED ITEMS ── */
.cd-monitor-item {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); margin-bottom: 8px; transition: border-color 0.15s;
}
.cd-monitor-item:hover { border-color: var(--border2); }
.cd-monitor-icon { font-size: 1.3rem; margin-right: 10px; margin-top: 2px; }
.cd-monitor-label { font-weight: 600; font-size: 13px; margin-bottom: 3px; }
.cd-monitor-detail { font-size: 12px; color: var(--muted); line-height: 1.5; }
.cd-monitor-status {
  font-size: 11px; font-weight: 600; color: var(--green);
  background: var(--green2); padding: 3px 8px; border-radius: 20px;
  white-space: nowrap;
}

/* ── TIMELINE / EVENTS ── */
.cd-event {
  padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); margin-bottom: 8px;
}
.cd-event-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.cd-event-title { font-weight: 600; font-size: 13px; }
.cd-event-body { font-size: 12px; color: var(--muted); line-height: 1.6; }
.cd-event-time { font-size: 11px; color: var(--muted2); font-family: var(--mono); white-space: nowrap; }

/* ── ALERT ITEMS ── */
.cd-alert-item {
  padding: 14px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); margin-bottom: 8px;
  background: #fff; transition: all 0.15s;
}
.cd-alert-item.HIGH   { border-left: 3px solid var(--red);   background: #FFFAFA; }
.cd-alert-item.MEDIUM { border-left: 3px solid var(--amber); background: #FFFDF5; }
.cd-alert-item.SAFE   { border-left: 3px solid var(--green); background: #F0FDF4; }
.cd-alert-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.cd-alert-title { font-weight: 600; font-size: 13px; }
.cd-alert-body { font-size: 12px; color: var(--muted); line-height: 1.6; }

/* ── TABLE ── */
.cd-table { width: 100%; border-collapse: collapse; }
.cd-table th {
  font-size: 11px; color: var(--muted); font-weight: 700;
  padding: 8px 12px; border-bottom: 1px solid var(--border);
  text-align: left; letter-spacing: 0.04em;
}
.cd-table td {
  padding: 11px 12px; border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.cd-table tr:last-child td { border-bottom: none; }
.cd-table tr:hover td { background: var(--bg); }

/* ── MONITORING TOGGLE ── */
.cd-toggle-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); margin-bottom: 8px;
}
.cd-toggle-label { font-weight: 600; font-size: 13px; }
.cd-toggle-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
.cd-toggle {
  width: 40px; height: 22px; border-radius: 11px; border: none; cursor: pointer;
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.cd-toggle.on  { background: var(--blue); }
.cd-toggle.off { background: var(--muted2); }
.cd-toggle::after {
  content: ''; position: absolute;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  top: 3px; transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.cd-toggle.on::after  { left: 21px; }
.cd-toggle.off::after { left: 3px; }

/* ── PROFILE FORM ── */
.cd-field { margin-bottom: 12px; }
.cd-field label { font-size: 11px; color: var(--muted); font-weight: 600; display: block; margin-bottom: 5px; }
.cd-field input, .cd-field select {
  width: 100%; background: var(--bg); border: 1px solid var(--border2);
  border-radius: var(--radius-sm); color: var(--text); padding: 10px 12px;
  font-size: 13px; outline: none; font-family: var(--body); transition: border-color 0.15s;
}
.cd-field input:focus, .cd-field select:focus { border-color: var(--blue); }

/* ── SUBSCRIPTION CARD ── */
.cd-plan-card {
  background: linear-gradient(135deg, var(--blue) 0%, #1D4ED8 100%);
  border-radius: var(--radius); padding: 1.4rem;
  color: #fff; position: relative; overflow: hidden; margin-bottom: 1rem;
}
.cd-plan-card::after {
  content: '🛡'; position: absolute; right: 1.2rem; top: 50%;
  transform: translateY(-50%); font-size: 3rem; opacity: 0.15;
}
.cd-plan-name { font-family: var(--head); font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
.cd-plan-price { font-size: 1.8rem; font-weight: 800; font-family: var(--head); }
.cd-plan-cycle { font-size: 12px; opacity: 0.75; margin-left: 4px; }
.cd-plan-features { margin-top: 1rem; display: flex; flex-direction: column; gap: 4px; }
.cd-plan-feat { font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 6px; }

/* ── RESPONSIVE ── */
@media (max-width: 1024px) {
  .cd-grid-2 { grid-template-columns: 1fr; }
  .cd-kpis   { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .cd-sidebar { display: none; }
  .cd-kpis    { grid-template-columns: 1fr; }
  .cd-main    { padding: 1rem; }
}
`;

// ── LOGIN PAGE COMPONENT ────────────────────────────────────────────────────
function CitizenLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      if (email.includes('@') && password.length > 0) {
        if (rememberMe) {
          localStorage.setItem('nigersec_citizen', JSON.stringify({
            email,
            name: email.split('@')[0]
          }));
        }
        onLogin({ email, name: email.split('@')[0] });
      } else {
        setError('Invalid credentials. Please try again.');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: 'url("https://i.pinimg.com/736x/4e/83/42/4e8342492352e83f8cbe060c94d11c81.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "var(--body), 'DM Sans', sans-serif"
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(7, 17, 31, 0.75)',
        backdropFilter: 'blur(2px)'
      }} />
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: '440px',
        margin: '1.5rem',
        animation: 'fadeUp 0.4s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, rgba(0,168,107,0.2), rgba(0,135,81,0.15))',
            border: '1px solid rgba(0,168,107,0.4)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px'
          }}>🛡</div>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 800,
            color: '#FEF9C3', letterSpacing: '-0.02em'
          }}>NigerSec</h1>
          <p style={{
            fontSize: '0.85rem', color: '#9CA3AF',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>Citizen Breach Protection</p>
        </div>
        <div style={{
          background: 'rgba(17,24,39,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,168,107,0.3)',
          borderRadius: '20px',
          padding: '2rem 1.8rem',
          boxShadow: '0 20px 35px -10px black'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{
              display: 'inline-block',
              background: 'rgba(0,168,107,0.1)',
              border: '1px solid rgba(0,168,107,0.2)',
              borderRadius: '20px',
              padding: '5px 14px',
              fontSize: '11px',
              color: '#4AE8A0'
            }}>Secure Citizen Login</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                style={{ width: '100%', background: '#111827', border: `1px solid ${error && !email ? '#EF4444' : '#374151'}`, borderRadius: '10px', padding: '12px 0.2px', color: '#F9FAFB', fontSize: '14px', outline: 'none', textAlign: 'center' }} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', display: 'block' }}>Password</label>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', background: '#111827', border: `1px solid ${error && !password ? '#EF4444' : '#374151'}`, borderRadius: '10px', padding: '12px 0.2px', color: '#F9FAFB', fontSize: '14px', outline: 'none', textAlign: 'center' }} />
            </div>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="showPassword" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} />
              <label htmlFor="showPassword" style={{ fontSize: '12px', color: '#9CA3AF', cursor: 'pointer' }}>Show Password</label>
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '8px 12px', marginBottom: '1rem', fontSize: '12px', color: '#FCA5A5', textAlign: 'center' }}>{error}</div>}
            <button type="submit" disabled={isLoading}
              style={{ width: '100%', background: 'linear-gradient(135deg, #00A86B, #008751)', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', marginBottom: '1rem' }}>
              {isLoading ? 'Authenticating...' : 'LOGIN →'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span style={{ color: '#9CA3AF' }}>Remember me</span>
              </label>
              <a href="#" style={{ color: '#4AE8A0', textDecoration: 'none' }} onClick={e => e.preventDefault()}>Forgot Password?</a>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #374151', paddingTop: '1rem' }}>
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>Don't have an account?</p>
              <a href="#" style={{ color: '#4AE8A0', fontSize: '12px', textDecoration: 'none' }} onClick={e => e.preventDefault()}>Sign up for free →</a>
            </div>
          </form>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.2rem', fontSize: '11px', color: '#6B7280', display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <span>256-bit SSL Encrypted</span> <span>•</span> <span>NDPA 2023 Compliant</span>
        </div>
      </div>
    </div>
  );
}

// ── AI ADVISOR WIDGET ─────────────────────────────────────────────────────────
function AIAdvisor({ context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I am your NigerSec AI security advisor. Ask me anything about protecting your data. BVN, NIN, breach steps, NDPA rights, and more.' }
]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = React.useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const reply = await apiAskAdvisor(question, context);
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Backend offline. Deploy your API to enable AI advice.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200,
        background: 'linear-gradient(135deg, var(--blue), #1D4ED8)',
        border: 'none', borderRadius: '50px', padding: '12px 20px',
        color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--body)',
      }}>
      🤖 AI Advisor
    </button>
  );

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200,
      width: 340, background: '#fff', borderRadius: 16,
      boxShadow: '0 8px 40px rgba(15,23,42,0.18)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ background: 'linear-gradient(135deg, var(--blue), #1D4ED8)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>🤖 NigerSec AI Advisor</div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', maxHeight: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            background: m.role === 'user' ? 'var(--blue2)' : 'var(--bg)',
            color: m.role === 'user' ? 'var(--blue)' : 'var(--text)',
            padding: '8px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.6,
            maxWidth: '85%', border: '1px solid var(--border)',
          }}>{m.text}</div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg)', padding: '8px 12px', borderRadius: 10, fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border)' }}>
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your breach…"
          style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', color: 'var(--text)', fontFamily: 'var(--body)' }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ background: 'var(--blue)', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: loading || !input.trim() ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ── PANEL: DASHBOARD ──────────────────────────────────────────────────────────
function PanelDashboard({ setPanel, userId }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    // Try to fetch a real risk summary; fall back to safe defaults
    fetch(`${API_URL}/v1/citizen/summary?user_id=${encodeURIComponent(userId || 'demo')}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setSummary(data))
      .catch(() => setSummary({ active_alerts: 0, last_check: '2h ago', risk_level: 'SAFE', breaches_total: 0 }));
  }, [userId]);

  const isBreached = summary?.active_alerts > 0;
  const advisorContext = { risk_level: summary?.risk_level, active_alerts: summary?.active_alerts };

  return (
    <div>
      <div className="cd-hero">
        <div className="cd-hero-top">
          <div>
            <div style={{ marginBottom: 8 }}>
              <span className={`cd-badge cd-badge-${isBreached ? 'HIGH' : 'SAFE'}`}>
                {isBreached ? '⚠ Breach detected' : '✓ Safe today'}
              </span>
            </div>
            <div className="cd-hero-title">
              {isBreached
                ? `${summary.active_alerts} active breach alert${summary.active_alerts !== 1 ? 's' : ''} detected.`
                : 'No breach match found in latest check.'}
            </div>
            <div className="cd-hero-sub">
              Your BVN, NIN, phone number, and email are checked against Nigerian
              breach databases and dark web sources every 6 hours.
            </div>
          </div>
        </div>
        <div className="cd-hero-actions">
          <button className="cd-btn cd-btn-primary" onClick={() => setPanel('monitoring')}>
            Start Monitoring
          </button>
          <button className="cd-btn cd-btn-secondary" onClick={() => setPanel('history')}>
            View History
          </button>
          {isBreached && (
            <button className="cd-btn" style={{ background: 'var(--red2)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.2)' }}
              onClick={() => setPanel('alerts')}>
              View alerts →
            </button>
          )}
        </div>
      </div>

      <div className="cd-kpis">
        <div className="cd-kpi">
          <div className="cd-kpi-label">LAST CHECK</div>
          <div className="cd-kpi-value">{summary?.last_check || '—'}</div>
          <div className="cd-kpi-sub">Latest scan completed</div>
        </div>
        <div className="cd-kpi">
          <div className="cd-kpi-label">WATCHED ITEMS</div>
          <div className="cd-kpi-value">4</div>
          <div className="cd-kpi-sub">BVN, NIN, Phone, Email</div>
        </div>
        <div className="cd-kpi">
          <div className="cd-kpi-label">ACTIVE ALERTS</div>
          <div className="cd-kpi-value" style={{ color: isBreached ? 'var(--red)' : 'var(--green)' }}>
            {summary?.active_alerts ?? '—'}
          </div>
          <div className="cd-kpi-sub">{isBreached ? 'Action required' : 'No new exposure detected'}</div>
        </div>
      </div>

      <div className="cd-grid-2">
        <div className="cd-card">
          <div className="cd-card-head">
            <div className="cd-card-title">What is being monitored</div>
            <span className="cd-card-sub">Real-time protection</span>
          </div>
          {MONITORED_ITEMS.map(item => (
            <div key={item.type} className="cd-monitor-item">
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span className="cd-monitor-icon">{item.icon}</span>
                <div>
                  <div className="cd-monitor-label">{item.type}</div>
                  <div className="cd-monitor-detail">{item.detail}</div>
                </div>
              </div>
              <span className="cd-monitor-status">{item.status}</span>
            </div>
          ))}
        </div>

        <div className="cd-card">
          <div className="cd-card-head">
            <div className="cd-card-title">Next actions</div>
            <span className="cd-card-sub">Recommended now</span>
          </div>
          {NEXT_ACTIONS.map((a, i) => (
            <div key={i} className="cd-event">
              <div className="cd-event-top">
                <span className="cd-event-title">{a.title}</span>
                <span className={`cd-badge cd-badge-${a.badge}`}>{a.badge}</span>
              </div>
              <div className="cd-event-body">{a.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Advisor floating button */}
      <AIAdvisor context={advisorContext} />
    </div>
  );
}

// ── PANEL: ALERTS ─────────────────────────────────────────────────────────────
function PanelAlerts({ userId }) {
  const [alerts, setAlerts] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [source, setSource] = useState('loading');

  useEffect(() => {
    apiFetchAlerts(userId || 'demo')
      .then(data => { setAlerts(data.alerts || []); setSource('live'); })
      .catch(() => { setAlerts(ALERTS_DATA); setSource('demo'); });
  }, [userId]);

  const dismiss = (id) => setDismissed(s => new Set([...s, id]));
  const visible = (alerts || []).filter(a => !dismissed.has(a.id));

  return (
    <div>
      <div className="cd-card">
        <div className="cd-card-head">
          <div className="cd-card-title">Alert Feed</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="cd-card-sub">Plain-language notifications</span>
            {source === 'live' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>● Live</span>
            )}
            {source === 'demo' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 20 }}>○ Demo</span>
            )}
            {source === 'loading' && (
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Loading…</span>
            )}
          </div>
        </div>
        {source === 'loading' && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Fetching alerts…
          </div>
        )}
        {visible.map(a => (
          <div key={a.id} className={`cd-alert-item ${a.severity}`}>
            <div className="cd-alert-head">
              <span className="cd-alert-title">{a.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`cd-badge cd-badge-${a.severity}`}>{a.severity}</span>
                <span className="cd-event-time">{a.time}</span>
              </div>
            </div>
            <div className="cd-alert-body">{a.body}</div>
            {/* ML confidence if present */}
            {a.ml_confidence && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <span>ML match confidence</span>
                  <span style={{ color: a.severity === 'HIGH' ? 'var(--red)' : 'var(--amber)' }}>
                    {(a.ml_confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${a.ml_confidence * 100}%`, height: 4, borderRadius: 4,
                    background: a.severity === 'HIGH' ? 'var(--red)' : 'var(--amber)',
                    transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>
            )}
            {a.severity !== 'SAFE' && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                <button className="cd-btn cd-btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Take action
                </button>
                <button className="cd-btn cd-btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => dismiss(a.id)}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && source !== 'loading' && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            ✓ No active alerts. Your identifiers are clear.
          </div>
        )}
      </div>
    </div>
  );
}

// ── PANEL: MONITORING ─────────────────────────────────────────────────────────
function PanelMonitoring() {
  const [toggles, setToggles] = useState({ sms: true, email: true, push: false });
  const [subActive, setSubActive] = useState(false);

  const toggle = (key) => setToggles(t => ({ ...t, [key]: !t[key] }));

  return (
    <div>
      <div className="cd-plan-card">
        <div className="cd-plan-name">NigerSec Monitor</div>
        <div style={{ marginTop: 4 }}>
          <span className="cd-plan-price">₦500</span>
          <span className="cd-plan-cycle">/month</span>
        </div>
        <div className="cd-plan-features">
          {['Real-time breach alerts', 'Dark web monitoring 24/7', 'BVN, NIN, Phone & Email coverage', 'SMS + Email + Push notifications', 'NDPA compliant — no raw data stored'].map(f => (
            <div key={f} className="cd-plan-feat"><span>✓</span>{f}</div>
          ))}
        </div>
      </div>

      <div className="cd-grid-2">
        <div className="cd-card">
          <div className="cd-card-head">
            <div className="cd-card-title">Subscription</div>
            <span className={`cd-badge cd-badge-${subActive ? 'SAFE' : 'GRAY'}`}>
              {subActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Receive alerts by SMS, email, or push notification the moment new exposure is detected for any of your monitored identifiers.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`cd-btn ${subActive ? 'cd-btn-danger' : 'cd-btn-primary'}`}
              onClick={() => setSubActive(s => !s)}
            >
              {subActive ? 'Cancel monitoring' : 'Enable monitoring →'}
            </button>
            {subActive && (
              <button className="cd-btn cd-btn-secondary">Manage billing</button>
            )}
          </div>
          {subActive && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--green2)', borderRadius: 8, fontSize: 12, color: 'var(--green)' }}>
              ✓ Monitoring is active. Next scan in ~4 hours.
            </div>
          )}
        </div>

        <div className="cd-card">
          <div className="cd-card-head">
            <div className="cd-card-title">Alert Channels</div>
            <span className="cd-card-sub">Where we notify you</span>
          </div>
          {[
            { key: 'sms',   label: 'SMS',   sub: 'Fastest for urgent alerts. Delivered instantly.' },
            { key: 'email', label: 'Email', sub: 'Best for detailed breach reports.' },
            { key: 'push',  label: 'Push',  sub: 'In-app instant notifications.' },
          ].map(ch => (
            <div key={ch.key} className="cd-toggle-row">
              <div>
                <div className="cd-toggle-label">{ch.label}</div>
                <div className="cd-toggle-sub">{ch.sub}</div>
              </div>
              <button
                className={`cd-toggle ${toggles[ch.key] ? 'on' : 'off'}`}
                onClick={() => toggle(ch.key)}
                aria-label={`Toggle ${ch.label}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PANEL: HISTORY ────────────────────────────────────────────────────────────
function PanelHistory({ userId, onNewCheck }) {
  const [history, setHistory] = useState(null);
  const [source, setSource] = useState('loading');
  const [checking, setChecking] = useState(false);
  const [checkType, setCheckType] = useState('email');
  const [checkValue, setCheckValue] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    apiFetchHistory(userId || 'demo')
      .then(data => { setHistory(data.history || []); setSource('live'); })
      .catch(() => { setHistory(HISTORY_DATA); setSource('demo'); });
  }, [userId]);

  const runNewCheck = async () => {
    if (!checkValue.trim()) return;
    setChecking(true); setCheckResult(null);
    try {
      const result = await apiRunCheck(checkType, checkValue);
      const newRow = {
        date: 'Just now',
        identifier: checkType.toUpperCase(),
        outcome: result.breached ? `Found in ${result.breach_count} breach${result.breach_count !== 1 ? 'es' : ''}` : 'No match found',
        status: result.breached ? (result.breaches?.[0]?.sev === 'critical' ? 'HIGH' : 'MEDIUM') : 'SAFE',
        hash: result.hash,
        _live: true,
      };
      setHistory(h => [newRow, ...(h || [])]);
      setCheckResult(result);
      if (onNewCheck) onNewCheck(result);
      setCheckValue('');
      setSource('live');
    } catch (e) {
      alert('Check failed: ' + e.message);
    } finally {
      setChecking(false);
    }
  };

  const rows = history || [];

  return (
    <div>
      {/* Quick check widget */}
      <div className="cd-card" style={{ marginBottom: '1rem' }}>
        <div className="cd-card-head">
          <div className="cd-card-title">Run a new check</div>
          <span className="cd-card-sub">Zero-knowledge · hashed in browser</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['email','phone','nin','bvn'].map(t => (
            <button key={t}
              className={`cd-btn ${checkType === t ? 'cd-btn-primary' : 'cd-btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={() => setCheckType(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            className="cd-field"
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, color: 'var(--text)', outline: 'none' }}
            placeholder={{ email: 'your@email.com', phone: '08012345678', nin: '12345678901', bvn: '12345678901' }[checkType]}
            value={checkValue}
            onChange={e => { setCheckValue(e.target.value); setCheckResult(null); }}
            onKeyDown={e => e.key === 'Enter' && runNewCheck()}
          />
          <button className="cd-btn cd-btn-primary" onClick={runNewCheck} disabled={checking || !checkValue.trim()}>
            {checking ? 'Checking…' : 'Check →'}
          </button>
        </div>
        {checkResult && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 12,
            background: checkResult.breached ? 'var(--red2)' : 'var(--green2)',
            color: checkResult.breached ? 'var(--red)' : 'var(--green)',
            border: `1px solid ${checkResult.breached ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}` }}>
            {checkResult.breached
              ? `⚠ Found in ${checkResult.breach_count} breach${checkResult.breach_count !== 1 ? 'es' : ''}. Take action immediately.`
              : '✓ No breaches found. Stay vigilant.'}
            {checkResult.hash && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, marginTop: 4, opacity: 0.7 }}>
                ZK hash: {checkResult.hash.slice(0, 16)}…
              </div>
            )}
          </div>
        )}
      </div>

      {/* History table */}
      <div className="cd-card">
        <div className="cd-card-head">
          <div className="cd-card-title">Check History</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="cd-card-sub">Recent scans and outcomes</span>
            {source === 'live' && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>● Live</span>}
            {source === 'demo' && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 20 }}>○ Demo</span>}
          </div>
        </div>
        {source === 'loading' ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading history…</div>
        ) : (
          <table className="cd-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Identifier</th>
                <th>Outcome</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{row.date}</td>
                  <td style={{ fontWeight: 500 }}>
                    {row.identifier}
                    {row._live && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>ML</span>}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{row.outcome}</td>
                  <td>
                    <span className={`cd-badge cd-badge-${row.status}`}>
                      {row.status === 'SAFE' ? '✓ Clear' : row.status === 'HIGH' ? '⚠ High' : '⚠ Medium'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── PANEL: PROFILE ────────────────────────────────────────────────────────────
function PanelProfile() {
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <div className="cd-grid-2">
        <div className="cd-card">
          <div className="cd-card-head">
            <div className="cd-card-title">Account Details</div>
          </div>
          <div className="cd-field">
            <label>Full name</label>
            <input type="text" defaultValue="Olajide Abayomi" />
          </div>
          <div className="cd-field">
            <label>Email address</label>
            <input type="email" defaultValue="olajide@example.com" />
          </div>
          <div className="cd-field">
            <label>Phone number</label>
            <input type="tel" defaultValue="08012345678" />
          </div>
          <div className="cd-field">
            <label>Preferred alert channel</label>
            <select>
              <option>SMS + Email</option>
              <option>Email only</option>
              <option>SMS only</option>
              <option>All channels</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="cd-btn cd-btn-primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
              {saved ? '✓ Saved!' : 'Save changes'}
            </button>
            <button className="cd-btn cd-btn-secondary">Cancel</button>
          </div>
        </div>

        <div>
          <div className="cd-card" style={{ marginBottom: '1rem' }}>
            <div className="cd-card-head">
              <div className="cd-card-title">Security</div>
            </div>
            <div className="cd-field">
              <label>Current password</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <div className="cd-field">
              <label>New password</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <button className="cd-btn cd-btn-secondary">Change password</button>
          </div>

          <div className="cd-card">
            <div className="cd-card-head">
              <div className="cd-card-title">Data & Privacy</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
              NigerSec never stores your raw BVN, NIN, phone number, or email. Only SHA-256 hashes are used for breach matching. NDPA 2023 compliant.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="cd-btn cd-btn-secondary" style={{ fontSize: 12 }}>Export my data</button>
              <button className="cd-btn cd-btn-danger" style={{ fontSize: 12 }}>Delete account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR NAV ITEMS ─────────────────────────────────────────────────────────
// badge is now dynamic — passed as prop from main component
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard'  },
  { id: 'alerts',    label: 'Alerts'     },
  { id: 'monitoring',label: 'Monitoring' },
  { id: 'history',   label: 'History'    },
  { id: 'profile',   label: 'Profile'    },
];

// ── PANEL TITLES ──────────────────────────────────────────────────────────────
const PANEL_TITLES = {
  dashboard:  'Your Breach Dashboard',
  alerts:     'Alert Feed',
  monitoring: 'Monitoring & Subscriptions',
  history:    'Check History',
  profile:    'Account & Profile',
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [panel, setPanel] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('nigersec_citizen');
    if (saved) {
      const userData = JSON.parse(saved);
      setUser(userData);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('nigersec_citizen');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  const renderPanel = () => {
    const uid = user?.email || 'demo';
    switch (panel) {
      case 'alerts':     return <PanelAlerts userId={uid} />;
      case 'monitoring': return <PanelMonitoring />;
      case 'history':    return <PanelHistory userId={uid} />;
      case 'profile':    return <PanelProfile />;
      default:           return <PanelDashboard setPanel={setPanel} userId={uid} />;
    }
  };

  if (!isAuthenticated) {
    return <CitizenLogin onLogin={handleLogin} />;
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="cd-wrap">
        <nav className="cd-nav">
          <div className="cd-nav-brand" onClick={() => navigate('/')}>
            <div className="cd-nav-mark">U</div>
            <div>
              <div>USER</div>
              <div className="cd-nav-sub">Citizen breach dashboard</div>
            </div>
          </div>
          <div className="cd-nav-right">
            <div className="cd-nav-user">👤 {user?.name || 'Citizen'} A.</div>
            <button className="cd-nav-back" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>

        <div className="cd-layout">
          <aside className="cd-sidebar">
            <div style={{ marginBottom: '1rem' }}>
              <div className="cd-sidebar-label">Menu</div>
              {NAV_ITEMS.map(item => (
                <div
                  key={item.id}
                  className={`cd-sidebar-item${panel === item.id ? ' active' : ''}`}
                  onClick={() => setPanel(item.id)}
                >
                  <span className="cd-icon">{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, padding: '2px 6px',
                      borderRadius: 10, background: 'var(--red)',
                      color: '#fff', fontWeight: 700
                    }}>{item.badge}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="cd-sidebar-divider" />
            <div>
              <div className="cd-sidebar-label">Account</div>
              <div className="cd-sidebar-item" onClick={() => navigate('/')}>
                <span className="cd-icon"></span> NigerSec Home
              </div>
              <div className="cd-sidebar-item" onClick={handleLogout}>
                <span className="cd-icon">→</span> Sign out
              </div>
            </div>
          </aside>

          <main className="cd-main">
            <div style={{ marginBottom: '1.2rem' }}>
              <h1 style={{ fontFamily: 'var(--head)', fontSize: '1.3rem', fontWeight: 700, marginBottom: 2 }}>
                {PANEL_TITLES[panel]}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                NigerSec · Zero-knowledge breach protection · NDPA 2023 compliant
              </p>
            </div>
            {renderPanel()}
          </main>
        </div>
      </div>
    </>
  );
}