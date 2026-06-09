import React, { useState, useEffect, useRef } from 'react';

// ── API CONFIG ────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// ── API: fetch live threat alerts ─────────────────────────────────────────────
async function apiFetchAlerts(orgId) {
  const res = await fetch(`${API_URL}/v1/institutional/alerts?org_id=${encodeURIComponent(orgId || 'demo')}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── API: fetch live KPI summary ───────────────────────────────────────────────
async function apiFetchKPIs(orgId) {
  const res = await fetch(`${API_URL}/v1/institutional/kpis?org_id=${encodeURIComponent(orgId || 'demo')}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── API: fetch live hotspots ──────────────────────────────────────────────────
async function apiFetchHotspots() {
  const res = await fetch(`${API_URL}/v1/institutional/hotspots`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── API: fetch BVN batch exposure ─────────────────────────────────────────────
async function apiFetchBVNBatches(orgId) {
  const res = await fetch(`${API_URL}/v1/institutional/bvn-exposure?org_id=${encodeURIComponent(orgId || 'demo')}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── API: submit anonymous peer report ────────────────────────────────────────
async function apiSubmitReport(payload) {
  const res = await fetch(`${API_URL}/v1/institutional/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── API: Gemini AI threat explainer ──────────────────────────────────────────
async function apiExplainThreat(alert) {
  if (!GEMINI_API_KEY) {
    return 'Add VITE_GEMINI_API_KEY to your .env file to enable AI threat analysis. Get it free at aistudio.google.com.';
  }
  const prompt = `You are a Nigerian financial cybersecurity analyst. A compliance officer is looking at this threat alert: "${alert.title}" — "${alert.detail}" (${alert.severity}, ${alert.region}). In under 120 words: explain what this attack is, how it works in the Nigerian context, and the single most important immediate action the institution should take. Be specific and actionable.`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 250, temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate analysis.';
}

// ── MOCK DATA (fallbacks when API is offline) ─────────────────────────────────
const ALERTS = [
  { id: 1, severity: 'CRITICAL', type: 'Phishing Campaign', title: 'BVN Harvesting Portal Active', detail: 'secure-bankng.com mimicking CBN portal. 2,340 clicks recorded in last 6 hours.', region: 'Nationwide', time: '2 min ago', match: true },
  { id: 2, severity: 'CRITICAL', type: 'Credential Breach', title: 'API Key Rotation Needed', detail: 'OAuth token hijacking pattern detected. Same pattern caused ₦11B loss at peer institution.', region: 'Lagos', time: '8 min ago', match: true },
  { id: 3, severity: 'HIGH', type: 'Card Testing', title: 'Burst Attack — 47 cards/min', detail: 'Automated card testing targeting payment endpoints. Velocity anomaly exceeds 40x baseline.', region: 'Lagos', time: '14 min ago', match: false },
  { id: 4, severity: 'HIGH', type: 'SIM Swap', title: 'OTP Interception Cluster', detail: '156 swap attempts in 24 hours. Coordinated attack pattern matching Abuja cluster from Sep 2023.', region: 'Abuja', time: '31 min ago', match: false },
  { id: 5, severity: 'MEDIUM', type: 'Fraud Pattern', title: 'Fake KYC Portal Detected', detail: 'nimcession-verify.gov.ng harvesting NIN submissions. 890 submissions recorded.', region: 'Port Harcourt', time: '1 hr ago', match: false },
];

const BVN_BATCHES = [
  { id: 'BATCH-001', count: '12M', exposed: '₦45B', severity: 'CRITICAL', source: 'Dark Web Market', detected: 'Jan 2024', yourExposure: true },
  { id: 'BATCH-008', count: '8.5M', exposed: '₦32B', severity: 'HIGH', source: 'Telco Insider Leak', detected: 'Sep 2023', yourExposure: false },
  { id: 'BATCH-NIN-4', count: '5.2M', exposed: '₦18B', severity: 'HIGH', source: 'NIMC Misconfiguration', detected: 'Mar 2024', yourExposure: false },
];

const PHISHING = [
  { id: 47, domains: ['secure-bankng.com', 'nimcession-verify.gov.ng', 'bvn-update-portal.com'], target: 'BVN + NIN Harvesting', active: '3 days', severity: 'CRITICAL', emails: ['"Your BVN will be suspended"', '"Verify NIN within 24 hours"', '"Update banking details immediately"'] },
  { id: 48, domains: ['cbno-verification.com', 'flutterwave-refund.net'], target: 'Fintech Account Takeover', active: '1 day', severity: 'HIGH', emails: ['"Unusual activity on your account"', '"Claim your refund"'] },
];

const PEER_REPORTS = [
  { id: 1847, time: '2 hours ago', sector: 'Fintech', issue: 'API Credential Theft', impact: '₦11B attempted fraud blocked', action: 'Rotate all API keys. Enable mTLS.', protected: 87 },
  { id: 1844, time: '5 hours ago', sector: 'Banking', issue: 'Phishing-linked login abuse', impact: '92 accounts targeted', action: 'Enforce MFA. Block IP range 41.242.x.x', protected: 63 },
  { id: 1841, time: '1 day ago', sector: 'Telecom', issue: 'SIM swap cluster', impact: 'OTP interception on 156 numbers', action: 'SIM swap verification layer required', protected: 44 },
];

const HOTSPOTS = [
  { city: 'Ikeja', count: 23, severity: 'CRITICAL', x: 38, y: 52 },
  { city: 'Victoria Island', count: 18, severity: 'HIGH', x: 42, y: 62 },
  { city: 'Surulere', count: 11, severity: 'MEDIUM', x: 36, y: 60 },
  { city: 'Abuja CBD', count: 12, severity: 'MEDIUM', x: 62, y: 38 },
  { city: 'Port Harcourt', count: 9, severity: 'LOW', x: 54, y: 72 },
  { city: 'Kano', count: 6, severity: 'LOW', x: 52, y: 22 },
];

const COMPLIANCE_MONTHS = [
  { m: 'Jan', status: 'submitted', score: 91 },
  { m: 'Feb', status: 'submitted', score: 88 },
  { m: 'Mar', status: 'submitted', score: 85 },
  { m: 'Apr', status: 'submitted', score: 87 },
  { m: 'May', status: 'submitted', score: 89 },
  { m: 'Jun', status: 'pending', score: 87 },
  { m: 'Jul', status: 'upcoming', score: null },
  { m: 'Aug', status: 'upcoming', score: null },
];

// ── CSS (Shared Styles) ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #07111F;
  --bg2:      #0C1A2E;
  --bg3:      #111F35;
  --border:   rgba(255,255,255,0.07);
  --border2:  rgba(255,255,255,0.12);
  --green:    #00A86B;
  --green2:   #008751;
  --yellow:   #EAB308;
  --red:      #EF4444;
  --orange:   #F97316;
  --amber:    #F59E0B;
  --text:     #E7EEFC;
  --muted:    #6B7FA3;
  --muted2:   #4A5A75;
  --mono:     'IBM Plex Mono', monospace;
  --head:     'Syne', sans-serif;
  --body:     'DM Sans', sans-serif;
  --radius:   14px;
  --radius-sm: 8px;
}

body, #root { margin: 0; padding: 0; width: 100%; }

.id-wrap {
  width: 100%; min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--body);
  font-size: 14px;
  line-height: 1.5;
}

/* SCROLLBAR */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--green2); border-radius: 4px; }

/* NAV */
.id-nav {
  position: sticky; top: 0; z-index: 200;
  width: 100%; height: 60px;
  background: rgba(7,17,31,0.92);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(16px);
  display: flex; align-items: center;
  padding: 0 1.5rem;
  justify-content: space-between;
}
.id-nav-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--head); font-weight: 700; font-size: 1rem;
  color: var(--text); text-decoration: none;
}
.id-nav-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(0,168,107,0.15);
  border: 1px solid rgba(0,168,107,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
}
.id-nav-right { display: flex; align-items: center; gap: 1rem; }
.id-nav-org {
  font-size: 12px; color: var(--muted);
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 20px; padding: 4px 12px;
}
.id-nav-alert-btn {
  position: relative; background: none; border: none; cursor: pointer;
  color: var(--muted); font-size: 16px; padding: 4px;
}
.id-nav-alert-dot {
  position: absolute; top: 0; right: 0;
  width: 8px; height: 8px; background: var(--red);
  border-radius: 50%; border: 2px solid var(--bg);
}
.id-nav-logout {
  background: none; border: 1px solid var(--border2);
  color: var(--muted); border-radius: 20px; padding: 5px 14px;
  font-size: 12px; cursor: pointer; font-family: var(--body);
}
.id-nav-logout:hover { color: var(--red); border-color: var(--red); }

/* LAYOUT */
.id-layout { display: flex; width: 100%; min-height: calc(100vh - 60px); }

/* SIDEBAR */
.id-sidebar {
  width: 220px; flex-shrink: 0;
  background: var(--bg2);
  border-right: 1px solid var(--border);
  padding: 1.2rem 0.8rem;
  position: sticky; top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}
.id-sidebar-section { margin-bottom: 1.5rem; }
.id-sidebar-label {
  font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
  color: var(--muted2); text-transform: uppercase;
  padding: 0 0.6rem; margin-bottom: 6px;
}
.id-sidebar-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: var(--radius-sm);
  color: var(--muted); cursor: pointer; font-size: 13px;
  transition: all 0.15s; margin-bottom: 2px;
  border: 1px solid transparent;
}
.id-sidebar-item:hover { background: var(--bg3); color: var(--text); }
.id-sidebar-item.active {
  background: rgba(0,168,107,0.12);
  border-color: rgba(0,168,107,0.2);
  color: #4AE8A0;
}
.id-sidebar-item .icon { font-size: 15px; width: 18px; text-align: center; }
.id-sidebar-badge {
  margin-left: auto; font-size: 10px; padding: 2px 6px;
  border-radius: 10px; background: var(--red);
  color: #fff; font-weight: 700;
}

/* MAIN */
.id-main { flex: 1; min-width: 0; padding: 1.5rem; overflow-y: auto; }

/* KPI ROW */
.id-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.5rem; }
.id-kpi {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.1rem 1.2rem;
  position: relative; overflow: hidden;
}
.id-kpi-accent {
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
}
.id-kpi-label { font-size: 11px; color: var(--muted); letter-spacing: 0.04em; margin-bottom: 8px; }
.id-kpi-value {
  font-family: var(--head); font-size: 1.7rem; font-weight: 700;
  line-height: 1; margin-bottom: 6px;
}
.id-kpi-delta { font-size: 11px; display: flex; align-items: center; gap: 4px; }
.delta-up { color: #4AE8A0; }
.delta-down { color: var(--red); }

/* SECTION HEADERS */
.id-section-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1rem;
}
.id-section-head h2 {
  font-family: var(--head); font-size: 1rem; font-weight: 700; color: var(--text);
}
.id-section-head span { font-size: 11px; color: var(--muted); }
.id-refresh-dot {
  display: inline-block; width: 6px; height: 6px; background: #4AE8A0;
  border-radius: 50%; margin-right: 5px; animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* GRID LAYOUTS */
.id-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.id-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.id-grid-60-40 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; margin-bottom: 14px; }

/* CARDS */
.id-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 1.2rem;
}

/* SEVERITY PILLS */
.sev {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  padding: 3px 8px; border-radius: 20px; white-space: nowrap;
}
.sev-CRITICAL { background: rgba(239,68,68,0.15); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.3); }
.sev-HIGH     { background: rgba(249,115,22,0.15); color: #FDBA74; border: 1px solid rgba(249,115,22,0.3); }
.sev-MEDIUM   { background: rgba(234,179,8,0.15);  color: #FDE68A; border: 1px solid rgba(234,179,8,0.3); }
.sev-LOW      { background: rgba(74,232,160,0.12); color: #6EE7B7; border: 1px solid rgba(74,232,160,0.2); }

/* ALERT CARDS */
.id-alert-item {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); margin-bottom: 8px;
  background: var(--bg3); transition: border-color 0.15s;
}
.id-alert-item:hover { border-color: var(--border2); }
.id-alert-item.match { border-left: 3px solid var(--red); }
.id-alert-body { flex: 1; min-width: 0; }
.id-alert-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.id-alert-detail { font-size: 12px; color: var(--muted); line-height: 1.5; }
.id-alert-meta { display: flex; gap: 8px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
.id-alert-region { font-size: 11px; color: var(--muted2); font-family: var(--mono); }
.id-alert-time { font-size: 11px; color: var(--muted2); margin-left: auto; }
.id-alert-actions { display: flex; gap: 6px; margin-top: 8px; }
.btn-xs {
  font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer;
  font-family: var(--body); font-weight: 500; border: none; transition: all 0.15s;
}
.btn-xs-red { background: rgba(239,68,68,0.15); color: #FCA5A5; }
.btn-xs-red:hover { background: rgba(239,68,68,0.25); }
.btn-xs-green { background: rgba(0,168,107,0.15); color: #4AE8A0; }
.btn-xs-green:hover { background: rgba(0,168,107,0.25); }
.btn-xs-ghost { background: var(--bg2); color: var(--muted); border: 1px solid var(--border); }
.btn-xs-ghost:hover { color: var(--text); }

/* MAP */
.id-map {
  position: relative; height: 320px;
  background: linear-gradient(135deg, #0A1624 0%, #0D1F35 100%);
  border-radius: var(--radius-sm); overflow: hidden;
  border: 1px solid var(--border);
}
.id-map-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 20px 20px;
}
.id-map-label {
  position: absolute; top: 10px; left: 12px;
  font-size: 10px; color: var(--muted); font-family: var(--mono);
}
.id-hotspot {
  position: absolute; transform: translate(-50%, -50%);
  cursor: pointer;
}
.id-hotspot-ring {
  position: absolute; inset: -6px;
  border-radius: 50%; animation: hotspot-ring 2s ease-out infinite;
}
@keyframes hotspot-ring {
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}
.id-hotspot-dot {
  width: 12px; height: 12px; border-radius: 50%;
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: center;
}
.id-hotspot-label {
  position: absolute; top: -24px; left: 50%;
  transform: translateX(-50%);
  white-space: nowrap; font-size: 10px;
  background: rgba(7,17,31,0.9); padding: 2px 6px;
  border-radius: 4px; border: 1px solid var(--border2);
}
.id-map-legend {
  position: absolute; bottom: 10px; right: 12px;
  display: flex; gap: 10px; flex-wrap: wrap;
}
.id-legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--muted); }
.id-legend-dot { width: 8px; height: 8px; border-radius: 50%; }

/* BVN BATCHES */
.id-batch-card {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px;
}
.id-batch-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.id-batch-id { font-family: var(--mono); font-size: 11px; color: var(--muted); }
.id-batch-count { font-family: var(--head); font-size: 1.2rem; font-weight: 700; }
.id-batch-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.id-batch-source { font-size: 11px; color: var(--muted); }
.id-exposure-warn {
  font-size: 11px; padding: 2px 8px; border-radius: 4px;
  background: rgba(239,68,68,0.1); color: #FCA5A5;
  border: 1px solid rgba(239,68,68,0.2);
}

/* PEER REPORTS */
.id-peer-item {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px;
}
.id-peer-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
.id-peer-id { font-family: var(--mono); font-size: 10px; color: var(--muted2); }
.id-peer-time { font-size: 11px; color: var(--muted2); }
.id-peer-issue { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
.id-peer-impact { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
.id-peer-action {
  font-size: 12px; color: #4AE8A0; padding: 6px 10px;
  background: rgba(74,232,160,0.06); border: 1px solid rgba(74,232,160,0.15);
  border-radius: 6px; margin-bottom: 8px; font-family: var(--mono);
}
.id-peer-protected { font-size: 11px; color: var(--muted); }
.id-peer-protected span { color: var(--yellow); font-weight: 600; }

/* PHISHING */
.id-phish-item {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px;
}
.id-phish-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.id-phish-title { font-weight: 600; font-size: 13px; }
.id-phish-active { font-size: 11px; color: var(--muted); }
.id-phish-domains { margin-bottom: 8px; }
.id-domain-tag {
  display: inline-block; font-family: var(--mono); font-size: 11px;
  padding: 3px 8px; background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2); border-radius: 4px;
  color: #FCA5A5; margin: 2px 4px 2px 0;
}
.id-phish-email { font-size: 11px; color: var(--muted); font-style: italic; margin-bottom: 2px; }

/* COMPLIANCE */
.id-score-ring { position: relative; width: 100px; height: 100px; margin: 0 auto 1rem; }
.id-score-value {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-family: var(--head); font-size: 1.5rem; font-weight: 800;
}
.id-score-label-sm { font-size: 10px; color: var(--muted); }
.id-month-row {
  display: flex; gap: 6px; margin-bottom: 1rem; flex-wrap: wrap; justify-content: center;
}
.id-month-chip {
  padding: 4px 10px; border-radius: 20px; font-size: 11px; cursor: pointer;
  border: 1px solid var(--border); background: var(--bg3); color: var(--muted);
  transition: all 0.15s;
}
.id-month-chip.submitted { border-color: rgba(74,232,160,0.3); color: #4AE8A0; background: rgba(74,232,160,0.07); }
.id-month-chip.pending   { border-color: rgba(234,179,8,0.3);  color: var(--yellow); background: rgba(234,179,8,0.07); }
.id-month-chip.upcoming  { color: var(--muted2); }
.id-compliance-items { margin-top: 10px; }
.id-compliance-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12px;
}
.id-compliance-row:last-child { border-bottom: none; }
.id-check { color: #4AE8A0; }
.id-warn-icon { color: var(--yellow); }

/* TABLE */
.id-table { width: 100%; border-collapse: collapse; }
.id-table th {
  font-size: 11px; color: var(--muted); font-weight: 600; text-align: left;
  padding: 8px 10px; border-bottom: 1px solid var(--border);
  letter-spacing: 0.04em;
}
.id-table td { padding: 10px 10px; border-bottom: 1px solid var(--border); font-size: 12.5px; }
.id-table tr:last-child td { border-bottom: none; }
.id-table tr:hover td { background: rgba(255,255,255,0.02); }
.id-table-mono { font-family: var(--mono); font-size: 11px; }

/* EXPORT BUTTONS */
.id-export-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 1rem; }
.id-export-btn {
  font-size: 12px; padding: 7px 14px; border-radius: 8px; cursor: pointer;
  font-family: var(--body); font-weight: 500; transition: all 0.15s;
}
.id-export-btn-green {
  background: rgba(0,168,107,0.15); color: #4AE8A0;
  border: 1px solid rgba(0,168,107,0.3);
}
.id-export-btn-green:hover { background: rgba(0,168,107,0.25); }
.id-export-btn-ghost {
  background: none; color: var(--muted);
  border: 1px solid var(--border);
}
.id-export-btn-ghost:hover { color: var(--text); border-color: var(--border2); }

/* SUBMIT FORM */
.id-form-field { margin-bottom: 12px; }
.id-form-label { font-size: 11px; color: var(--muted); margin-bottom: 5px; display: block; }
.id-form-input, .id-form-select, .id-form-textarea {
  width: 100%; background: var(--bg3); border: 1px solid var(--border2);
  border-radius: var(--radius-sm); color: var(--text); padding: 9px 12px;
  font-size: 13px; outline: none; font-family: var(--body);
  transition: border-color 0.15s;
}
.id-form-input:focus, .id-form-select:focus, .id-form-textarea:focus {
  border-color: var(--green);
}
.id-form-textarea { resize: vertical; min-height: 80px; }
.id-submit-btn {
  background: linear-gradient(135deg, var(--green), var(--green2));
  color: #fff; border: none; padding: 10px 18px;
  border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;
  font-size: 13px; font-family: var(--body); transition: opacity 0.15s;
}
.id-submit-btn:hover { opacity: 0.85; }

/* ANON BADGE */
.id-anon-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--muted); padding: 4px 10px;
  background: var(--bg3); border: 1px solid var(--border); border-radius: 20px;
  margin-bottom: 12px;
}

/* RESPONSIVE */
@media (max-width: 1100px) {
  .id-kpis { grid-template-columns: 1fr 1fr; }
  .id-grid-60-40 { grid-template-columns: 1fr; }
  .id-grid-2 { grid-template-columns: 1fr; }
  .id-grid-3 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .id-sidebar { display: none; }
  .id-kpis { grid-template-columns: 1fr 1fr; }
  .id-grid-3 { grid-template-columns: 1fr; }
  .id-main { padding: 1rem; }
}
`;

// ── LOGIN PAGE COMPONENT ────────────────────────────────────────────────────
function InstitutionalLogin({ onLogin }) {
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
      setError('Please enter your institution email');
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
          localStorage.setItem('nigersec_institution', JSON.stringify({
            email,
            name: email.split('@')[0],
            tier: 'MID_BANK'
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
      backgroundImage: 'url("https://i.pinimg.com/736x/9d/30/40/9d3040af6b3363e9e71cb94c5899be18.jpg")',
      backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "var(--body), 'DM Sans', sans-serif"
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(7, 17, 31, 0.5)', backdropFilter: 'blur(0.5px)' }} />
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '460px', margin: '1.5rem', animation: 'fadeUp 0.5s ease-out' }}>
        <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', background: 'linear-gradient(135deg, rgba(0,168,107,0.2), rgba(0,135,81,0.15))', border: '1px solid rgba(0,168,107,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🛡</div>
          <h1 style={{ fontFamily: "var(--head), 'Syne', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: '#FEF9C3', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>NigerSec</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Institutional Threat Intelligence</p>
        </div>
        <div style={{ background: 'rgba(12, 26, 46, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0, 168, 107, 0.3)', borderRadius: '20px', padding: '2rem 1.8rem', boxShadow: '0 25px 45px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,168,107,0.1)', border: '1px solid rgba(0,168,107,0.2)', borderRadius: '20px', padding: '5px 14px', fontSize: '11px', color: '#4AE8A0' }}>Secure Institution Login</div>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 500 }}>Institution Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="compliance@yourbank.ng" style={{ width: '100%', background: 'rgba(7, 17, 31, 0.8)', border: error && !email ? '1px solid var(--red)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 0.2px', color: 'var(--text)', fontSize: '14px', outline: 'none', transition: 'all 0.2s', textAlign: 'center' }} onFocus={(e) => e.target.style.borderColor = 'var(--green)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 500 }}>Password</label>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', background: 'rgba(7, 17, 31, 0.8)', border: error && !password ? '1px solid var(--red)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 0.2px', color: 'var(--text)', fontSize: '14px', outline: 'none', transition: 'all 0.2s', textAlign: 'center' }} onFocus={(e) => e.target.style.borderColor = 'var(--green)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
            <div style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="showPassword" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} style={{ cursor: 'pointer' }} />
              <label htmlFor="showPassword" style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>Show Password</label>
            </div>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '1.2rem', fontSize: '12px', color: '#FCA5A5', textAlign: 'center' }}>{error}</div>}
            <button type="submit" disabled={isLoading} style={{ width: '100%', background: 'linear-gradient(135deg, #00A86B, #008751)', border: 'none', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isLoading ? 0.7 : 1, marginBottom: '1rem' }}>{isLoading ? 'Authenticating...' : 'LOGIN →'}</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><span style={{ color: 'var(--muted)' }}>Remember me</span></label>
              <a href="#" style={{ color: '#4AE8A0', textDecoration: 'none' }} onClick={(e) => e.preventDefault()}>Forgot Password?</a>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.2rem' }}>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>Don't have access?</p>
              <a href="#" style={{ color: '#4AE8A0', fontSize: '12px', textDecoration: 'none' }} onClick={(e) => e.preventDefault()}>Request Institution Access →</a>
            </div>
          </form>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '11px', color: 'var(--muted2)', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span>256-bit SSL Encrypted</span><span>•</span><span>NDPA 2023 Compliant</span>
        </div>
      </div>
    </div>
  );
}

// ── HELPER FUNCTIONS ────────────────────────────────────────────────────────
function SevPill({ s }) {
  return <span className={`sev sev-${s}`}>{s}</span>;
}

function KPI({ label, value, delta, up, color }) {
  return (
    <div className="id-kpi">
      <div className="id-kpi-accent" style={{ background: color }} />
      <div className="id-kpi-label">{label}</div>
      <div className="id-kpi-value" style={{ color }}>{value}</div>
      <div className={`id-kpi-delta ${up ? 'delta-up' : 'delta-down'}`}>{up ? '↑' : '↓'} {delta}</div>
    </div>
  );
}

// ── GEMINI THREAT EXPLAINER ──────────────────────────────────────────────────
function ExplainButton({ alert }) {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const explain = async () => {
    if (explanation) { setOpen(o => !o); return; }
    setLoading(true); setOpen(true);
    try {
      const text = await apiExplainThreat(alert);
      setExplanation(text);
    } catch {
      setExplanation('Gemini API unavailable. Add VITE_GEMINI_API_KEY to your .env to enable AI analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="btn-xs btn-xs-ghost" onClick={explain} style={{ color: '#4AE8A0', borderColor: 'rgba(74,232,160,0.3)' }}>
        {loading ? '⏳ Analysing…' : open ? '▲ Hide AI analysis' : '✦ AI Explain'}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(74,232,160,0.05)', border: '1px solid rgba(74,232,160,0.2)', borderRadius: 8, fontSize: 12, color: '#C8E8C0', lineHeight: 1.7 }}>
          {loading ? 'Gemini is analysing this threat…' : explanation}
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD PANELS ──────────────────────────────────────────────────────────
function PanelAlerts({ orgId }) {
  const [alerts, setAlerts] = useState(null);
  const [source, setSource] = useState('loading');

  useEffect(() => {
    const load = () => {
      apiFetchAlerts(orgId).then(data => { setAlerts(data.alerts || []); setSource('live'); })
        .catch(() => { setAlerts(ALERTS); setSource('demo'); });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  const items = alerts || [];
  return (
    <div>
      <div className="id-section-head">
        <h2><span className="id-refresh-dot" />Live Alert Feed{source === 'live' && <span style={{ marginLeft: 8, fontSize: 10, color: '#4AE8A0', fontWeight: 700 }}> ● Live API</span>}{source === 'demo' && <span style={{ marginLeft: 8, fontSize: 10, color: '#EAB308', fontWeight: 700 }}> ○ Demo data</span>}</h2>
        <span>Auto-refreshes every 30s</span>
      </div>
      {source === 'loading' && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Fetching live threats…</div>}
      {items.map(a => (
        <div key={a.id} className={`id-alert-item${a.match ? ' match' : ''}`}>
          <div><SevPill s={a.severity} /></div>
          <div className="id-alert-body">
            <div className="id-alert-title">{a.title}</div>
            <div className="id-alert-detail">{a.detail}</div>
            {a.ml_score !== undefined && (
              <div style={{ margin: '6px 0' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}><span>ML threat score</span><span style={{ color: a.severity === 'CRITICAL' ? '#FCA5A5' : '#FDBA74' }}>{a.ml_score}/100</span></div>
                <div style={{ background: 'var(--border)', borderRadius: 3, height: 4, overflow: 'hidden' }}><div style={{ width: `${a.ml_score}%`, height: 4, borderRadius: 3, background: a.severity === 'CRITICAL' ? '#EF4444' : '#F97316', transition: 'width 0.8s ease' }} /></div>
              </div>
            )}
            <div className="id-alert-meta"><span className="id-alert-region">📍 {a.region}</span>{a.match && <span style={{ fontSize: 11, color: '#FCA5A5', padding: '2px 6px', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>⚠ Matches your profile</span>}<span className="id-alert-time">{a.time}</span></div>
            <div className="id-alert-actions"><button className="btn-xs btn-xs-red">Block</button><button className="btn-xs btn-xs-ghost">Details</button>{a.match && <button className="btn-xs btn-xs-green">Apply protection</button>}</div>
            <div style={{ marginTop: 6 }}><ExplainButton alert={a} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelBVN({ orgId }) {
  const [batches, setBatches] = useState(null);
  const [source, setSource] = useState('loading');

  useEffect(() => {
    apiFetchBVNBatches(orgId).then(data => { setBatches(data.batches || []); setSource('live'); })
      .catch(() => { setBatches(BVN_BATCHES); setSource('demo'); });
  }, [orgId]);

  const items = batches || [];
  return (
    <div>
      <div className="id-section-head"><h2>BVN &amp; NIN Batch Tracker</h2><span>{items.length} active batches {source === 'live' && <span style={{ color: '#4AE8A0' }}>● Live</span>}</span></div>
      <div style={{ padding: '8px 12px', background: 'rgba(74,232,160,0.07)', border: '1px solid rgba(74,232,160,0.15)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#4AE8A0' }}>✓ Your institution's BVNs — 0 confirmed exposures in active batches</div>
      {items.map(b => (
        <div key={b.id} className="id-batch-card">
          <div className="id-batch-head"><div><div className="id-batch-id">{b.id}</div><div className="id-batch-count">{b.count} records</div><div style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 600 }}>Est. {b.exposed} exposed</div></div><SevPill s={b.severity} /></div>
          <div className="id-batch-meta"><span className="id-batch-source">Source: {b.source}</span><span className="id-batch-source">Detected: {b.detected}</span>{b.yourExposure && <span className="id-exposure-warn">⚠ Your customers may be affected</span>}</div>
          <div className="id-alert-actions" style={{ marginTop: 8 }}><button className="btn-xs btn-xs-ghost">View full batch</button><button className="btn-xs btn-xs-red">Flag for review</button></div>
        </div>
      ))}
    </div>
  );
}

function PanelPhishing() {
  const [campaigns, setCampaigns] = useState(null);
  const [source, setSource] = useState('loading');

  useEffect(() => {
    fetch(`${API_URL}/v1/institutional/phishing`).then(r => r.json()).then(data => { setCampaigns(data.campaigns || []); setSource('live'); })
      .catch(() => { setCampaigns(PHISHING); setSource('demo'); });
  }, []);

  const items = campaigns || [];
  return (
    <div>
      <div className="id-section-head"><h2>Phishing Campaigns</h2><span>{items.length} active campaigns {source === 'live' && <span style={{ color: '#4AE8A0' }}>● Live</span>}</span></div>
      {items.map(p => (
        <div key={p.id} className="id-phish-item">
          <div className="id-phish-head"><div><div className="id-phish-title">Campaign #{p.id}</div><div className="id-phish-active">Active {p.active} · {p.target}</div></div><SevPill s={p.severity} /></div>
          <div className="id-phish-domains">{p.domains.map(d => <span key={d} className="id-domain-tag">⚠ {d}</span>)}</div>
          <div style={{ marginBottom: 8 }}>{p.emails.map(e => <div key={e} className="id-phish-email">"{e}"</div>)}</div>
          <div className="id-alert-actions"><button className="btn-xs btn-xs-red">Block all domains</button><button className="btn-xs btn-xs-ghost">Export signatures</button><button className="btn-xs btn-xs-ghost">Report to NDPC</button></div>
        </div>
      ))}
    </div>
  );
}

function PanelPeer({ orgId }) {
  const [submitted, setSubmitted] = useState(false);
  const [reports, setReports] = useState(null);
  const [source, setSource] = useState('loading');

  useEffect(() => {
    fetch(`${API_URL}/v1/institutional/peer-reports`).then(r => r.json()).then(data => { setReports(data.reports || []); setSource('live'); })
      .catch(() => { setReports(PEER_REPORTS); setSource('demo'); });
  }, []);

  const items = reports || [];
  return (
    <div>
      <div className="id-section-head"><h2>Peer Intelligence</h2><span>Identity stripped before sharing {source === 'live' && <span style={{ color: '#4AE8A0' }}>● Live</span>}</span></div>
      <div className="id-grid-2">
        <div>
          <div className="id-anon-badge">🔒 Anonymised — institution identity removed before sharing</div>
          {items.map(r => (
            <div key={r.id} className="id-peer-item">
              <div className="id-peer-head"><span className="id-peer-id">REPORT-{r.id} · {r.sector}</span><span className="id-peer-time">{r.time}</span></div>
              <div className="id-peer-issue">{r.issue}</div>
              <div className="id-peer-impact">{r.impact}</div>
              <div className="id-peer-action">→ {r.action}</div>
              <div className="id-peer-protected"><span>{r.protected}</span> institutions already applied this protection</div>
              <div className="id-alert-actions" style={{ marginTop: 8 }}><button className="btn-xs btn-xs-green">Apply protection</button><button className="btn-xs btn-xs-ghost">Full report</button></div>
            </div>
          ))}
        </div>
        <div className="id-card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Submit a breach report</div>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#4AE8A0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div><div style={{ fontWeight: 600, marginBottom: 4 }}>Report submitted anonymously</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Your institution identity has been removed. The intelligence will be shared with the network within 10 minutes.</div>
              <button className="btn-xs btn-xs-ghost" style={{ marginTop: 12 }} onClick={() => setSubmitted(false)}>Submit another</button>
            </div>
          ) : (
            <>
              <div className="id-form-field"><label className="id-form-label">Incident type</label><select className="id-form-select"><option>API Credential Theft</option><option>Phishing Campaign</option><option>BVN/NIN Batch Exposure</option><option>SIM Swap Cluster</option><option>Card Testing Burst</option><option>Other</option></select></div>
              <div className="id-form-field"><label className="id-form-label">Region affected</label><input className="id-form-input" placeholder="e.g. Lagos" /></div>
              <div className="id-form-field"><label className="id-form-label">Anonymised description</label><textarea className="id-form-textarea" placeholder="Describe in general terms. Do not include institution name, customer names, or account numbers." /></div>
              <button className="id-submit-btn" onClick={() => setSubmitted(true)}>Submit anonymously →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelCompliance() {
  const [activeMonth, setActiveMonth] = useState('Jun');
  const [months, setMonths] = useState(null);
  const [source, setSource] = useState('loading');

  useEffect(() => {
    fetch(`${API_URL}/v1/institutional/compliance`).then(r => r.json()).then(data => { setMonths(data.months || []); setSource('live'); })
      .catch(() => { setMonths(COMPLIANCE_MONTHS); setSource('demo'); });
  }, []);

  const items = months || COMPLIANCE_MONTHS;
  return (
    <div>
      <div className="id-section-head"><h2>NDPA 2023 Compliance</h2><span>Auto-generated from submitted data {source === 'live' && <span style={{ color: '#4AE8A0' }}>● Live</span>}</span></div>
      <div className="id-grid-2">
        <div className="id-card">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}><svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto 8px' }}><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" /><circle cx="50" cy="50" r="40" fill="none" stroke="#00A86B" strokeWidth="8" strokeDasharray={`${87 * 2.51} ${100 * 2.51}`} strokeLinecap="round" transform="rotate(-90 50 50)" /><text x="50" y="46" textAnchor="middle" fill="#E7EEFC" fontSize="18" fontWeight="800" fontFamily="Syne,sans-serif">87%</text><text x="50" y="60" textAnchor="middle" fill="#6B7FA3" fontSize="9" fontFamily="DM Sans,sans-serif">COMPLIANCE</text></svg></div>
          <div className="id-month-row">{items.map(m => (<div key={m.m} className={`id-month-chip ${m.status}${activeMonth === m.m ? ' active' : ''}`} onClick={() => setActiveMonth(m.m)} style={activeMonth === m.m ? { outline: '2px solid var(--green)' } : {}}>{m.m}{m.score ? ` ${m.score}%` : ''}</div>))}</div>
          <div className="id-compliance-items">{[
            ['Data breach reporting', true, 'Submitted Mar 15, 2026'],
            ['DPO assigned', true, 'Named Nov 2025'],
            ['NDPA registration', true, 'NDPC/REG/2024/0847'],
            ['Privacy policy published', true, 'Updated Feb 2026'],
            ['Data mapping complete', false, 'In progress — due Jul 2026'],
          ].map(([item, ok, note]) => (<div key={item} className="id-compliance-row"><span>{item}</span><div style={{ textAlign: 'right' }}><span className={ok ? 'id-check' : 'id-warn-icon'}>{ok ? '✓' : '⚠'}</span><div style={{ fontSize: 10, color: 'var(--muted)' }}>{note}</div></div></div>))}</div>
          <div className="id-export-row"><button className="id-export-btn id-export-btn-green">Export PDF</button><button className="id-export-btn id-export-btn-ghost">Export Excel</button><button className="id-export-btn id-export-btn-ghost">Submit to NDPC</button></div>
        </div>
        <div className="id-card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Reporting history</div>
          <table className="id-table"><thead><tr><th>Month</th><th>Status</th><th>Score</th><th>Submitted</th></tr></thead><tbody>{items.filter(m => m.status !== 'upcoming').map(m => (<tr key={m.m}><td>{m.m} 2026</td><td><span className={`sev sev-${m.status === 'submitted' ? 'LOW' : 'MEDIUM'}`}>{m.status.toUpperCase()}</span></td><td>{m.score ? `${m.score}%` : '—'}</td><td>{m.status === 'submitted' ? '✓ On time' : 'Draft ready'}</td></tr>))}</tbody></table>
        </div>
      </div>
    </div>
  );
}

function PanelDashboard({ orgId }) {
  const [kpis, setKpis] = useState(null);
  const [source, setSource] = useState('loading');
  const [hotspots, setHotspots] = useState(null);
  const [mapSource, setMapSource] = useState('loading');

  useEffect(() => {
    apiFetchKPIs(orgId).then(data => { setKpis(data); setSource('live'); }).catch(() => { setKpis({ criticalAlerts: 3, threatsBlocked: 127, fraudHotspots: 12, complianceScore: 87 }); setSource('demo'); });
    apiFetchHotspots().then(data => { setHotspots(data.hotspots || []); setMapSource('live'); }).catch(() => { setHotspots(HOTSPOTS); setMapSource('demo'); });
  }, [orgId]);

  const k = kpis || { criticalAlerts: 3, threatsBlocked: 127, fraudHotspots: 12, complianceScore: 87 };
  const mapPoints = hotspots || HOTSPOTS;

  return (
    <div>
      <div className="id-kpis">
        <KPI label="Critical alerts" value={String(k.criticalAlerts).padStart(2,'0')} delta="2 in last hour" up={false} color="#EF4444" />
        <KPI label="Threats blocked" value={k.threatsBlocked} delta="34% vs last week" up={true} color="#4AE8A0" />
        <KPI label="Fraud hotspots" value={k.fraudHotspots} delta="1 region downgraded" up={true} color="#EAB308" />
        <KPI label="Compliance score" value={`${k.complianceScore}%`} delta="Report auto-generated" up={true} color="#00A86B" />
      </div>
      <div className="id-grid-60-40">
        <div className="id-card"><div className="id-section-head"><h2><span className="id-refresh-dot" />Critical alerts</h2><span>5s refresh</span></div>{ALERTS.slice(0,3).map(a => (<div key={a.id} className={`id-alert-item${a.match ? ' match' : ''}`}><SevPill s={a.severity} /><div className="id-alert-body"><div className="id-alert-title">{a.title}</div><div className="id-alert-detail">{a.detail}</div><div className="id-alert-meta"><span className="id-alert-region">📍 {a.region}</span><span className="id-alert-time">{a.time}</span></div></div></div>))}</div>
        <div className="id-card"><div className="id-section-head"><h2>Fraud hotspots</h2><span>Nigeria {mapSource === 'live' && <span style={{ color: '#4AE8A0' }}>● Live</span>}</span></div><div className="id-map"><div className="id-map-grid" /><div className="id-map-label">NIGERIA · FRAUD DENSITY MAP</div>{mapPoints.map(h => (<div key={h.city} className="id-hotspot" style={{ left: `${h.x}%`, top: `${h.y}%` }}><div className="id-hotspot-ring" style={{ background: SEV_COLOR[h.severity] + '33' }} /><div className="id-hotspot-dot" style={{ background: SEV_COLOR[h.severity] }}><div className="id-hotspot-label" style={{ color: SEV_COLOR[h.severity] }}>{h.city} ({h.count})</div></div></div>))}<div className="id-map-legend">{Object.entries(SEV_COLOR).map(([sev, col]) => (<div key={sev} className="id-legend-item"><div className="id-legend-dot" style={{ background: col }} />{sev}</div>))}</div></div></div>
      </div>
      <div className="id-grid-2">
        <div className="id-card"><div className="id-section-head"><h2>Active attack patterns</h2><span>Matched to your profile</span></div><table className="id-table"><thead><tr><th>Pattern</th><th>Location</th><th>Severity</th><th>Match</th></tr></thead><tbody><tr><td>API credential theft</td><td>Lagos</td><td><SevPill s="HIGH" /></td><td style={{ color: '#FCA5A5' }}>✓ Matches</td></tr><tr><td>Login brute force</td><td>Nationwide</td><td><SevPill s="CRITICAL" /></td><td style={{ color: '#FCA5A5' }}>✓ Matches</td></tr><tr><td>Fake KYC portal</td><td>Abuja</td><td><SevPill s="MEDIUM" /></td><td style={{ color: 'var(--muted)' }}>Monitoring</td></tr></tbody></table></div>
        <div className="id-card"><div className="id-section-head"><h2>Peer reports</h2><span>Anonymised pool</span></div><table className="id-table"><thead><tr><th>Sector</th><th>Issue</th><th>Action</th></tr></thead><tbody>{PEER_REPORTS.map(r => (<tr key={r.id}><td>{r.sector}</td><td>{r.issue}</td><td style={{ fontSize: 11, color: '#4AE8A0', fontFamily: 'var(--mono)' }}>{r.action.split('.')[0]}</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

const SEV_COLOR = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#4AE8A0' };

// ── MAIN DASHBOARD COMPONENT ─────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'alerts',    label: 'Live Alerts', badge: 3 },
  { id: 'bvn',       label: 'BVN/NIN Batches' },
  { id: 'phishing',  label: 'Phishing Campaigns' },
  { id: 'peer',      label: 'Peer Reports' },
  { id: 'compliance',label: 'NDPA Compliance' },
];

function InstitutionDashboard({ user, onLogout }) {
  const [activePanel, setActivePanel] = useState('dashboard');
  const orgId = user?.email?.split('@')[0] || 'demo';

  const renderPanel = () => {
    switch (activePanel) {
      case 'alerts':     return <PanelAlerts orgId={orgId} />;
      case 'bvn':        return <PanelBVN orgId={orgId} />;
      case 'phishing':   return <PanelPhishing />;
      case 'peer':       return <PanelPeer orgId={orgId} />;
      case 'compliance': return <PanelCompliance />;
      default:           return <PanelDashboard orgId={orgId} />;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="id-wrap">
        <nav className="id-nav">
          <a href="#" className="id-nav-brand" onClick={(e) => e.preventDefault()}><div className="id-nav-icon">🛡</div>NigerSec · Institution Portal</a>
          <div className="id-nav-right"><span className="id-nav-org">{user?.name || 'Flutterwave'} · Compliance Officer</span><button className="id-nav-alert-btn" aria-label="Alerts">🔔 <span className="id-nav-alert-dot" /></button><button className="id-nav-logout" onClick={onLogout}>← Logout</button></div>
        </nav>
        <div className="id-layout">
          <aside className="id-sidebar">
            <div className="id-sidebar-section"><div className="id-sidebar-label">Intelligence</div>{NAV_ITEMS.map(item => (<div key={item.id} className={`id-sidebar-item${activePanel === item.id ? ' active' : ''}`} onClick={() => setActivePanel(item.id)}><span className="icon">{item.icon}</span>{item.label}{item.badge && <span className="id-sidebar-badge">{item.badge}</span>}</div>))}</div>
            <div className="id-sidebar-section"><div className="id-sidebar-label">Account</div><div className="id-sidebar-item"><span className="icon">⚙</span> Settings</div><div className="id-sidebar-item" onClick={onLogout}><span className="icon">→</span> Sign out</div></div>
          </aside>
          <main className="id-main">{renderPanel()}</main>
        </div>
      </div>
    </>
  );
}

// ── MAIN APP COMPONENT (Routes between Login and Dashboard) ─────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('nigersec_institution');
    if (saved) { const userData = JSON.parse(saved); setUser(userData); setIsAuthenticated(true); }
  }, []);

  const handleLogin = (userData) => { setUser(userData); setIsAuthenticated(true); };
  const handleLogout = () => { localStorage.removeItem('nigersec_institution'); setUser(null); setIsAuthenticated(false); };

  if (!isAuthenticated) return <InstitutionalLogin onLogin={handleLogin} />;
  return <InstitutionDashboard user={user} onLogout={handleLogout} />;
}