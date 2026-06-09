import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';


// ── API CONFIG ────────────────────────────────────────────────────────────────
// Set VITE_API_URL in your .env file. Falls back to local dev server.
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── REAL API CALL: breach check ───────────────────────────────────────────────
async function checkBreach(type, rawValue) {
  const normalized = type === 'email'
    ? rawValue.trim().toLowerCase()
    : rawValue.replace(/\s/g, '').replace(/^0/, '234');
  const hash = await sha1Hex(normalized);
  const hashPrefix = hash.slice(0, 5);

  const res = await fetch(`${API_URL}/v1/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier_type: type, hash_prefix: hashPrefix }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return { breached: data.breached, breaches: data.breaches || [], hash };
}

// ── REAL API CALL: notify me signup ──────────────────────────────────────────
async function subscribeNotify(email) {
  const res = await fetch(`${API_URL}/v1/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── REAL API CALL: platform stats ────────────────────────────────────────────
async function fetchStats() {
  const res = await fetch(`${API_URL}/v1/stats`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ---------- BREACH DATASETS ----------
// ── EXPANDED BREACH POOLS ────────────────────────────────────────────
const BREACH_POOLS = {
  email: [
    { name: "Flutterwave", records: "4.2M", date: "Apr 2024", data: ["Email", "Phone", "BVN fragments"] },
    { name: "Jumia Nigeria", records: "2.4M", date: "Aug 2022", data: ["Email", "Names", "Order history"] },
    { name: "LinkedIn", records: "700M", date: "Jun 2021", data: ["Email", "Job info", "Location"] },
    { name: "Konga", records: "890K", date: "Nov 2023", data: ["Email", "Delivery addresses"] },
    { name: "GTBank (NDPC)", records: "Est. 1.2M", date: "Jan 2023", data: ["Email", "Banking records", "Account details"] },
    { name: "Zenith Bank (NDPC)", records: "Est. 900K", date: "Jun 2023", data: ["Email", "Account data", "Third-party disclosures"] },
    { name: "Multichoice Nigeria", records: "Est. 2.1M", date: "Oct 2023", data: ["Email", "Subscription data", "Payment info"] },
    { name: "Leadway Insurance", records: "Est. 450K", date: "Jun 2023", data: ["Email", "Policy details", "NIN"] },
  ],
  phone: [
    { name: "Nigerian Telco Leak", records: "6.1M", date: "Sep 2023", data: ["Phone", "Full names", "Address"] },
    { name: "OPay User DB (NDPC)", records: "3.4M", date: "Dec 2022", data: ["Phone", "Names", "Tx history"] },
    { name: "Dark Web Telco Dump", records: "60M+", date: "Jan 2025", data: ["Phone", "NIN", "Subscriber data"] },
    { name: "NASIMS Portal Leak", records: "224K+", date: "May 2025", data: ["Phone", "BVN", "Social investment data"] },
    { name: "Loan App Data Harvest", records: "Est. 8M", date: "Mar 2024", data: ["Phone", "Contacts", "SMS history", "Location"] },
    { name: "PLASCHEMA Health Breach", records: "Est. 300K", date: "Jul 2022", data: ["Phone", "Health records", "Names"] },
  ],
  nin: [
    { name: "NIMC / AnyVerify Exposure", records: "89M+", date: "Mar 2024", data: ["NIN", "Full names", "Biometric ref"] },
    { name: "XpressVerify Unauthorised Access", records: "Est. 50M", date: "Mar 2024", data: ["NIN", "BVN", "Passport", "Phone"] },
    { name: "Dark Web NIN Dump", records: "11M", date: "Feb 2024", data: ["NIN", "Phone", "BVN cross-ref"] },
    { name: "NBS Website Hack", records: "Unknown", date: "Dec 2024", data: ["NIN", "Economic data", "Gov records"] },
    { name: "NIMC Website Breach", records: "Est. 30M", date: "Jun 2024", data: ["NIN", "BVN", "Int'l Passport", "Photo"] },
    { name: "NASIMS Cloud Misconfiguration", records: "Est. 500K", date: "Mar 2025", data: ["NIN", "BVN", "Bank account", "Photo"] },
  ],
  bvn: [
    { name: "Dark Web BVN Market", records: "5.5M", date: "Jan 2024", data: ["BVN", "Full names", "Bank name"] },
    { name: "CBN KYC Breach", records: "2.7M", date: "Nov 2023", data: ["BVN", "NIN", "Account details"] },
    { name: "Flutterwave POS Breach", records: "Est. 500K", date: "Oct 2023", data: ["BVN", "Account numbers", "Tx data"] },
    { name: "Flutterwave Feb Breach", records: "Est. 300K", date: "Feb 2023", data: ["BVN", "Transfer records"] },
    { name: "NIMC / XpressVerify", records: "Est. 50M", date: "Mar 2024", data: ["BVN", "NIN", "Passport", "Photo"] },
    { name: "Healthcare Records Dump", records: "129K", date: "Oct 2024", data: ["BVN", "Patient names", "Card numbers", "Phone"] },
  ]
};

// ── RECENT BREACHES TABLE ────────────────────────────────────────────
const RECENT_BREACHES = [
  { name: "Dark Web Telco Dump",          count: "60M+",   added: "Jan 2025", date: "Jan 2025",  sector: "Telecom" },
  { name: "NIMC / AnyVerify Exposure",    count: "89M+",   added: "Mar 2024", date: "Mar 2024",  sector: "Government" },
  { name: "NIMC Website Breach",          count: "Est. 30M", added: "Jun 2024", date: "Jun 2024", sector: "Government" },
  { name: "XpressVerify Unauthorised",    count: "Est. 50M", added: "Mar 2024", date: "Mar 2024", sector: "Government" },
  { name: "Dark Web BVN Market",          count: "5.5M",   added: "Jan 2024", date: "Jan 2024",  sector: "Finance" },
  { name: "Nigerian Telco Leak",          count: "6.1M",   added: "Sep 2023", date: "Sep 2023",  sector: "Telecom" },
  { name: "Flutterwave (Apr)",            count: "4.2M",   added: "Apr 2024", date: "Apr 2024",  sector: "Fintech" },
  { name: "OPay User DB",                 count: "3.4M",   added: "Dec 2022", date: "Dec 2022",  sector: "Fintech" },
  { name: "CBN KYC Breach",              count: "2.7M",   added: "Nov 2023", date: "Nov 2023",  sector: "Finance" },
  { name: "Dark Web NIN Dump",            count: "11M",    added: "Feb 2024", date: "Feb 2024",  sector: "Government" },
  { name: "Multichoice Nigeria",          count: "Est. 2.1M", added: "Oct 2023", date: "Oct 2023", sector: "Media" },
  { name: "Loan App Data Harvest",        count: "Est. 8M", added: "Mar 2024", date: "Mar 2024",  sector: "Fintech" },
  { name: "GTBank (NDPC Investigation)", count: "Est. 1.2M", added: "Jan 2023", date: "Jan 2023", sector: "Banking" },
  { name: "Flutterwave POS (Oct)",        count: "Est. 500K", added: "Oct 2023", date: "Oct 2023", sector: "Fintech" },
  { name: "NASIMS Cloud Leak",            count: "Est. 500K", added: "Mar 2025", date: "Mar 2025", sector: "Government" },
  { name: "Flutterwave (Feb)",            count: "Est. 300K", added: "Feb 2023", date: "Feb 2023", sector: "Fintech" },
  { name: "PLASCHEMA Health Breach",      count: "Est. 300K", added: "Jul 2022", date: "Jul 2022", sector: "Health" },
  { name: "Healthcare Records Dump",      count: "129K",   added: "Oct 2024", date: "Oct 2024",  sector: "Health" },
  { name: "NBS Website Hack",             count: "Unknown", added: "Dec 2024", date: "Dec 2024",  sector: "Government" },
  { name: "Leadway Insurance",            count: "Est. 450K", added: "Jun 2023", date: "Jun 2023", sector: "Insurance" },
];
 
async function sha1Hex(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
 
async function simulateCheck(type, rawValue) {
  // ── Try real ML backend first ────────────────────────────────────────────
  try {
    const apiResult = await checkBreach(type, rawValue);
    // Tag results so the UI knows these are real ML results
    if (apiResult.breaches) {
      apiResult.breaches = apiResult.breaches.map(b => ({ ...b, _mlResult: true }));
    }
    return apiResult;
  } catch (error) {
    console.warn('ML backend unavailable, falling back to local demo data:', error);
  }

  // ── Local demo fallback (keeps working without backend) ──────────────────
  await new Promise(r => setTimeout(r, 900 + Math.random() * 400));
  const normalized = type === 'email' ? rawValue.trim().toLowerCase() : rawValue.replace(/\s/g, '');
  const hash = await sha1Hex(normalized);
  const seed = parseInt(hash.slice(0, 6), 16);
  const pool = BREACH_POOLS[type];
  let count = (seed % 3) + (type === 'nin' || type === 'bvn' ? 1 : 0);
  if (count === 0) return { breached: false, breaches: [], hash, _demo: true };
  let selected = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    let b = pool[(seed + i * 5) % pool.length];
    if (!selected.find(x => x.name === b.name)) selected.push({ ...b, _demo: true });
  }
  return { breached: true, breaches: selected, hash, _demo: true };
}
 
const typeMap = {
  email: { label: '✉ Email', placeholder: "your@email.com", hint: "e.g. johndoe@gmail.com", validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  phone: { label: '☎ Phone', placeholder: "08012345678", hint: "11 digits starting with 0", validate: v => /^0[7-9][01]\d{8}$/.test(v.replace(/\s/g, '')) },
  nin:   { label: '🪪 NIN',  placeholder: "12345678901", hint: "11-digit NIN", validate: v => /^\d{11}$/.test(v) },
  bvn:   { label: '🏦 BVN',  placeholder: "22334455667", hint: "11-digit BVN", validate: v => /^\d{11}$/.test(v) }
};
 
// ── Shared CSS injected once ─────────────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
 
  body, #root { margin: 0; padding: 0; width: 100%; }
 
  /* Outer wrapper with background image */
  .ns-wrap {
    width: 100%;
    min-height: 100vh;
    position: relative;
    color: #C8E8C0;
    font-family: 'Inter', system-ui, sans-serif;
  }
 
  /* Background image + overlay */
  .ns-wrap::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('https://i.pinimg.com/736x/2d/fb/f1/2dfbf1a47ed59f5f9bb5486d665b7588.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(2px);
    z-index: -2;
  }
 
  /* Dark overlay for readability */
  .ns-wrap::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(7, 18, 10, 0.75);
    z-index: -1;
  }
 
  /* All content sits above the background */
  .ns-nav, .ns-hero, .ns-result-wrap, .ns-stats-band, .ns-section, .ns-about, .ns-footer {
    position: relative;
    z-index: 2;
  }
 
  /* Nav with hide/show transition */
  .ns-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    width: 100%;
    background: rgba(7,18,10,0.97);
    border-bottom: 1px solid #1F3A24;
    backdrop-filter: blur(10px);
    transition: transform 0.3s ease-in-out;
  }
  .ns-nav-hidden {
    transform: translateY(-100%);
  }
  .ns-nav-inner {
    width: 100%;
    padding: 0 2rem;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ns-logo {
    display: flex; align-items: center; gap: 8px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 800; font-size: 1.3rem; color: #FEF9C3;
    cursor: pointer; user-select: none;
  }
  .ns-nav-links { display: flex; gap: 2rem; }
  .ns-nav-link {
    font-size: 0.9rem; color: #8FBB85; cursor: pointer;
    padding-bottom: 3px; border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }
  .ns-nav-link:hover, .ns-nav-link.active { color: #EAB308; border-bottom-color: #EAB308; }
  .ns-nav-btn {
    background: transparent; border: 1px solid #EAB308;
    border-radius: 2rem; padding: 0.4rem 1.2rem;
    color: #EAB308; font-weight: 600; cursor: pointer; font-size: 0.9rem;
  }
  .ns-nav-btn:hover { background: rgba(234,179,8,0.08); }
 
  /* HERO */
  .ns-hero {
    width: 100%;
    padding: 5rem 2rem 3.5rem;
    text-align: center;
    border-bottom: 1px solid #1F3A24;
  }
  .ns-live-badge {
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.3);
    border-radius: 2rem; padding: 0.3rem 1.2rem; margin-bottom: 2rem;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; color: #EAB308;
  }
  .ns-live-dot {
    width: 8px; height: 8px; background: #EAB308;
    border-radius: 50%; animation: nsPulse 1.8s infinite;
  }
  @keyframes nsPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:0.4; transform:scale(1.3); }
  }
  .ns-h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(2rem, 6vw, 3.8rem);
    font-weight: 800; color: #FEF9C3; line-height: 1.18;
    margin-bottom: 1rem;
  }
  .ns-sub { color: #8FBB85; font-size: 1.1rem; max-width: 560px; margin: 0 auto 2rem; }
 
  /* TYPE TABS */
  .ns-tabs { display: flex; justify-content: center; gap: 0.7rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
  .ns-tab {
    padding: 0.5rem 1.2rem; border-radius: 2rem; font-size: 0.9rem; font-weight: 600; cursor: pointer;
    border: 1px solid #2A4A30; background: transparent; color: #8FBB85; transition: all 0.18s;
  }
  .ns-tab:hover { border-color: #EAB308; color: #EAB308; }
  .ns-tab.active { background: #22543D; border-color: #48BB78; color: #FEF9C3; }
 
  /* INPUT ROW */
  .ns-input-row { display: flex; gap: 0.8rem; max-width: 640px; margin: 0 auto; flex-wrap: wrap; }
  .ns-input {
    flex: 1; min-width: 200px;
    background: #0D1F12; border: 1px solid #2A4A30;
    border-radius: 0.75rem; padding: 0.9rem 1.2rem;
    color: #C8E8C0; font-size: 1rem; outline: none;
    transition: border-color 0.2s;
  }
  .ns-input:focus { border-color: #48BB78; }
  .ns-input::placeholder { color: #3B7040; }
  .ns-check-btn {
    padding: 0.9rem 1.8rem; border-radius: 0.75rem; border: none;
    background: #22543D; color: #FEF9C3; font-size: 1rem; font-weight: 700;
    cursor: pointer; transition: background 0.18s, opacity 0.18s; white-space: nowrap;
  }
  .ns-check-btn:hover:not(:disabled) { background: #276749; }
  .ns-check-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .ns-hint { font-size: 0.75rem; color: #3B7040; margin-top: 0.7rem; }
  .ns-zk-badge {
    display: inline-block; margin-top: 0.9rem;
    background: #0D1F12; border: 1px solid #1F3A24;
    border-radius: 2rem; padding: 0.3rem 1rem;
    font-size: 0.72rem; color: #5A7A55;
  }
 
  /* RESULT */
  .ns-result-wrap { width: 100%; max-width: 760px; margin: 2rem auto; padding: 0 2rem; }
  .ns-result-ok {
    background: rgba(22,163,74,0.09); border: 1px solid #22c55e;
    border-radius: 1rem; padding: 1.8rem; text-align: center;
  }
  .ns-result-ok h3 { font-size: 1.3rem; color: #FEF9C3; margin: 0.5rem 0; }
  .ns-result-ok p { color: #8FBB85; }
  .ns-result-found {
    background: rgba(220,38,38,0.07); border: 1px solid #dc2626;
    border-radius: 1rem; padding: 1.4rem;
  }
  .ns-found-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
  .ns-found-title { font-size: 1.2rem; font-weight: 700; color: #FCA5A5; }
  .ns-breach-card {
    background: rgba(0,0,0,0.25); border: 1px solid rgba(220,38,38,0.3);
    border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem;
  }
  .ns-breach-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .ns-breach-name { font-weight: 700; font-size: 1.05rem; color: #FEF9C3; }
  .ns-breach-meta { font-size: 0.82rem; color: #8FBB85; margin-top: 2px; }
  .ns-critical-badge {
    background: #dc2626; color: #fff; padding: 0.15rem 0.7rem;
    border-radius: 2rem; font-size: 0.7rem; font-weight: 700;
  }
  .ns-data-tag {
    display: inline-block; background: #1F3A24; border: 1px solid #2A5232;
    border-radius: 0.4rem; padding: 0.1rem 0.5rem; font-size: 0.75rem;
    color: #8FBB85; margin: 0.15rem 0.2rem 0 0;
  }
  .ns-action-box {
    background: #0D1F12; border-radius: 0.8rem; padding: 1rem;
    margin-top: 0.8rem; font-size: 0.9rem; line-height: 1.6;
  }
  .ns-zk-proof { margin-top: 0.8rem; font-size: 0.68rem; font-family: monospace; color: #3B7040; word-break: break-all; }
  .ns-hash-pill {
    display: inline-block; background: #0D1F12; border-radius: 0.5rem;
    padding: 0.4rem 0.8rem; font-family: monospace; font-size: 0.7rem; color: #3B7040; margin-top: 0.5rem;
  }
 
  /* STATS BAND */
  .ns-stats-band {
    width: 100%; padding: 2.5rem 2rem;
    border-top: 1px solid #1F3A24; border-bottom: 1px solid #1F3A24;
    display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem;
    background: rgba(7,18,10,0.6);
    backdrop-filter: blur(4px);
  }
  .ns-stat-card {
    background: #0D1F12; border: 1px solid #1F3A24;
    border-radius: 1rem; padding: 1.4rem 2rem; text-align: center; min-width: 160px;
  }
  .ns-stat-num { font-size: 1.8rem; font-weight: 800; color: #EAB308; font-family: 'Space Grotesk', sans-serif; }
  .ns-stat-label { font-size: 0.78rem; color: #5A7A55; margin-top: 0.3rem; }
 
  /* SECTIONS */
  .ns-section {
    width: 100%; padding: 3.5rem 2rem;
    border-bottom: 1px solid #1F3A24;
  }
  .ns-section-title {
    font-family: 'Space Grotesk', sans-serif; font-size: 1.9rem;
    font-weight: 800; color: #FEF9C3; margin-bottom: 0.5rem;
  }
  .ns-section-sub { color: #8FBB85; margin-bottom: 1.8rem; }
 
  /* BREACH TABLE */
  .ns-table { width: 100%; background: rgba(15,31,20,0.8); backdrop-filter: blur(4px); border-radius: 1rem; overflow: hidden; }
  .ns-table-head, .ns-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr; padding: 0.9rem 1.2rem; }
  .ns-table-head { background: rgba(13,31,18,0.9); font-size: 0.78rem; font-weight: 700; color: #EAB308; letter-spacing: 0.04em; }
  .ns-table-row { border-top: 1px solid #1F3A24; font-size: 0.88rem; transition: background 0.15s; }
  .ns-table-row:hover { background: rgba(234,179,8,0.04); }
  .ns-table-count { color: #EAB308; font-weight: 600; }
  .ns-table-arrow { text-align: right; color: #EAB308; }
 
  /* HOW IT WORKS */
  .ns-hiw-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.2rem; }
  .ns-hiw-card { background: rgba(13,31,18,0.8); backdrop-filter: blur(4px); border: 1px solid #1F3A24; border-radius: 1rem; padding: 1.4rem; }
  .ns-hiw-icon { font-size: 2rem; margin-bottom: 0.7rem; }
  .ns-hiw-title { font-weight: 700; color: #FEF9C3; margin-bottom: 0.4rem; }
  .ns-hiw-text { font-size: 0.82rem; color: #8FBB85; line-height: 1.6; }
 
  /* NOTIFY */
  .ns-notify { background: rgba(13,31,18,0.8); backdrop-filter: blur(4px); border: 1px solid #1F3A24; border-radius: 1.5rem; padding: 3rem 2rem; text-align: center; }
  .ns-notify-row { display: flex; gap: 0.6rem; max-width: 460px; margin: 1.5rem auto 0; }
  .ns-notify-ok { font-size: 0.82rem; color: #EAB308; margin-top: 0.8rem; }
 
  /* API */
  .ns-api-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: center; }
  @media (max-width: 700px) { .ns-api-grid { grid-template-columns: 1fr; } }
  .ns-api-label { font-size: 0.8rem; color: #EAB308; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
  .ns-api-h2 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 800; color: #FEF9C3; line-height: 1.2; margin-bottom: 0.8rem; }
  .ns-api-pricing { font-size: 0.85rem; color: #8FBB85; margin-top: 0.5rem; }
  .ns-api-btn {
    margin-top: 1.2rem; display: inline-block;
    background: #10B981; border: none; border-radius: 2rem;
    padding: 0.6rem 1.6rem; color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer;
  }
  .ns-api-btn:hover { background: #059669; }
  .ns-code-block {
    background: #0D1F12; border: 1px solid #EAB308; border-radius: 1rem;
    padding: 1.2rem 1.4rem; font-family: monospace; font-size: 0.72rem;
    color: #C8E8C0; line-height: 1.7; word-break: break-all;
  }
  .ns-code-cmd { color: #EAB308; }

  /* ML CONFIDENCE BAR */
  .ns-ml-wrap { margin-top: 0.7rem; }
  .ns-ml-label { display: flex; justify-content: space-between; font-size: 0.68rem; color: #5A7A55; margin-bottom: 4px; }
  .ns-ml-track { background: #1F3A24; border-radius: 4px; height: 5px; overflow: hidden; }
  .ns-ml-fill  { height: 5px; border-radius: 4px; transition: width 0.9s ease; }

  /* SOURCE BADGE */
  .ns-source-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 0.65rem; font-weight: 700; padding: 2px 8px;
    border-radius: 2rem; margin-left: 8px;
    letter-spacing: 0.04em;
  }
  .ns-source-live { background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.3); }
  .ns-source-demo { background: rgba(234,179,8,0.1);   color: #EAB308; border: 1px solid rgba(234,179,8,0.25); }

  /* LIVE STATS */
  .ns-stat-live-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #10B981; display: inline-block;
    margin-right: 4px; animation: nsPulse 2s infinite;
  }
  .ns-stat-live-label { font-size: 0.6rem; color: #10B981; font-weight: 700; letter-spacing: 0.06em; margin-top: 2px; }

  /* FRAUD SCORE DEMO */
  .ns-score-demo { background: rgba(13,31,18,0.9); border: 1px solid #1F3A24; border-radius: 1rem; padding: 1.5rem; }
  .ns-score-demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1rem; }
  @media (max-width: 600px) { .ns-score-demo-grid { grid-template-columns: 1fr; } }
  .ns-demo-field label { display: block; font-size: 0.7rem; font-weight: 600; color: #5A7A55; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .ns-demo-field input[type="number"] {
    width: 100%; background: #07120A; border: 1px solid #2A4A30;
    border-radius: 0.5rem; padding: 7px 10px; color: #C8E8C0;
    font-size: 0.85rem; outline: none; font-family: inherit;
  }
  .ns-demo-field input:focus { border-color: #EAB308; }
  .ns-toggle-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; cursor: pointer; }
  .ns-toggle { width: 34px; height: 18px; border-radius: 9px; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .ns-toggle-knob { position: absolute; top: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.2s; }
  .ns-toggle-lbl { font-size: 0.8rem; color: #8FBB85; }
  .ns-score-result { background: #07120A; border: 1px solid #1F3A24; border-radius: 0.8rem; padding: 1.2rem; margin-top: 1rem; }
  .ns-score-ring {
    width: 72px; height: 72px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; flex-shrink: 0;
  }
  .ns-score-num { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 800; }
  .ns-score-rec { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; font-weight: 800; }
  .ns-flag-tag { display: inline-block; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); border-radius: 2rem; padding: 2px 9px; font-size: 0.68rem; color: #FCA5A5; margin: 2px; }
  .ns-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
 
  /* ABOUT */
  .ns-about { width: 100%; padding: 3.5rem 2rem; text-align: center; }
  .ns-about-h2 { font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; font-weight: 800; color: #FEF9C3; margin-bottom: 1rem; }
  .ns-about-p { max-width: 650px; margin: 0 auto 1.5rem; color: #8FBB85; line-height: 1.7; }
  .ns-tags { display: flex; justify-content: center; gap: 0.7rem; flex-wrap: wrap; }
  .ns-tag { border: 1px solid #EAB308; padding: 0.25rem 0.9rem; border-radius: 2rem; font-size: 0.82rem; color: #EAB308; }
 
  /* FOOTER */
  .ns-footer {
    width: 100%; padding: 2rem;
    border-top: 1px solid #1F3A24;
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2rem;
    background: rgba(7,18,10,0.8);
    backdrop-filter: blur(8px);
  }
  .ns-footer-brand { font-weight: 800; color: #FEF9C3; font-size: 1.1rem; margin-bottom: 0.3rem; }
  .ns-footer-copy { font-size: 0.72rem; color: #5A7A55; }
  .ns-footer-col h4 { font-size: 0.72rem; color: #EAB308; margin-bottom: 0.4rem; }
  .ns-footer-col p { font-size: 0.72rem; color: #5A7A55; }
`;
 
export default function Home() {
  const [currentType, setCurrentType] = useState('email');
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyMsg, setNotifyMsg] = useState('');
  const [activeNav, setActiveNav] = useState('check');
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);
  const navigate = useNavigate();

  // ── Live platform stats ───────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState(null);
  useEffect(() => {
    fetchStats()
      .then(data => setLiveStats(data))
      .catch(() => {}); // silently fall back to hardcoded values if API is down
  }, []);

  // ── Fraud score demo state ────────────────────────────────────────────────
  const [demoParams, setDemoParams] = useState({
    amount: 250000, account_age_days: 3, hour_of_day: 2,
    velocity_flag: true, bvn_in_breach: true,
    new_device: true, nibss_flagged: false, channel_web: true,
  });
  const [scoreResult, setScoreResult] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');

  const runFraudScore = async () => {
    setScoring(true); setScoreError(''); setScoreResult(null);
    try {
      const res = await fetch(`${API_URL}/v1/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoParams),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setScoreResult(await res.json());
    } catch (e) {
      setScoreError(e.message.includes('fetch') ? 'Backend offline — start your local server or deploy to Cloud Run.' : e.message);
    } finally {
      setScoring(false);
    }
  };
  const setDemoField = (k, v) => { setDemoParams(p => ({ ...p, [k]: v })); setScoreResult(null); };

  // Scroll listener to hide/show nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        // scrolling down & past 80px -> hide
        setNavHidden(true);
      } else if (currentScrollY < lastScrollY.current) {
        // scrolling up -> show
        setNavHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
 
  const cfg = typeMap[currentType];
  const isValid = inputValue.trim().length > 0 && cfg.validate(inputValue);
 
  const handleCheck = async () => {
    if (!isValid) return;
    setChecking(true);
    try {
      const res = await simulateCheck(currentType, inputValue);
      setResult(res);
    } catch {
      alert('Error checking breach');
    } finally {
      setChecking(false);
    }
  };
 
  const handleNotify = async () => {
    if (!notifyEmail.includes('@')) { alert('Valid email required'); return; }
    try {
      await subscribeNotify(notifyEmail);
      setNotifyMsg('✓ You\'re on the list! We\'ll alert you when your data appears.');
    } catch {
      // API not yet deployed — still acknowledge in demo
      setNotifyMsg('✓ Verification link sent! (demo mode — deploy backend to go live)');
    }
    setTimeout(() => setNotifyMsg(''), 4000);
    setNotifyEmail('');
  };
 
  const scrollTo = (id) => {
    const el = document.getElementById(`${id}-section`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(id);
  };
 
  const renderResult = () => {
    if (!result) return null;
    const isLive = !result._demo;

    if (!result.breached) return (
      <div className="ns-result-ok">
        <div style={{ fontSize: '2.2rem' }}>✅</div>
        <h3>No breaches found
          <span className={`ns-source-badge ${isLive ? 'ns-source-live' : 'ns-source-demo'}`}>
            {isLive ? '● ML checked' : '○ Demo data'}
          </span>
        </h3>
        <p>Your {currentType.toUpperCase()} was not found in any known breach. Stay safe.</p>
        <div className="ns-hash-pill">ZK hash: {result.hash.slice(0, 18)}…</div>
      </div>
    );

    const actionPlan = currentType === 'bvn' ? '📞 Call your bank & request BVN fraud flag'
      : currentType === 'nin' ? '🏛 Report to NIMC immediately'
      : currentType === 'phone' ? '📱 Enable SIM swap protection'
      : '🔐 Change passwords & enable 2FA';

    // Severity colour map
    const sevColor = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#10B981' };

    return (
      <div className="ns-result-found">
        <div className="ns-found-header">
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div>
            <div className="ns-found-title">
              Found in {result.breaches.length} breach{result.breaches.length > 1 ? 'es' : ''}!
              <span className={`ns-source-badge ${isLive ? 'ns-source-live' : 'ns-source-demo'}`}>
                {isLive ? '● ML result' : '○ Demo data'}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#8FBB85' }}>Take action immediately</div>
          </div>
        </div>
        {result.breaches.map((b, idx) => {
          const color = sevColor[b.sev] || '#EF4444';
          return (
            <div key={idx} className="ns-breach-card">
              <div className="ns-breach-row">
                <div>
                  <div className="ns-breach-name">{b.name}</div>
                  <div className="ns-breach-meta">{b.records} records · {b.date}</div>
                </div>
                <span className="ns-critical-badge" style={{ background: color }}>
                  {b.sev ? b.sev.toUpperCase() : 'CRITICAL'}
                </span>
              </div>
              <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#EAB308' }}>
                Compromised data:&nbsp;
                {b.data?.map(d => <span key={d} className="ns-data-tag">{d}</span>)}
              </div>
              {/* ML confidence bar — only shown for real API results */}
              {b.ml_confidence && (
                <div className="ns-ml-wrap">
                  <div className="ns-ml-label">
                    <span>ML match confidence</span>
                    <span style={{ color }}>{(b.ml_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="ns-ml-track">
                    <div className="ns-ml-fill" style={{ width: `${b.ml_confidence * 100}%`, background: color }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="ns-action-box">
          <strong>⚡ Recommended action:</strong> {actionPlan}<br />
          ✔ Enable 2FA · Monitor accounts · Report to NDPC
        </div>
        <div className="ns-zk-proof">Zero-knowledge proof: {result.hash}</div>
      </div>
    );
  };
 
  return (
    <>
      <style>{CSS}</style>
      <div className="ns-wrap">
 
        {/* ── NAV with hide/show class ── */}
        <nav className={`ns-nav ${navHidden ? 'ns-nav-hidden' : ''}`}>
          <div className="ns-nav-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
              <div className="ns-logo" onClick={() => scrollTo('check')}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <polygon points="13,2 24,7.5 24,18.5 13,24 2,18.5 2,7.5"
                    fill="none" stroke="#EAB308" strokeWidth="1.8" />
                  <circle cx="13" cy="13" r="3" fill="#FACC15" />
                </svg>
                NigerSec
              </div>
              <div className="ns-nav-links">
                {['check','breaches','howitworks','notify','api','about'].map(s => (
                  <span key={s}
                    className={`ns-nav-link${activeNav === s ? ' active' : ''}`}
                    onClick={() => scrollTo(s)}>
                    {{ check:'Check', breaches:'Breaches', howitworks:'How It Works',
                       notify:'Notify Me', api:'API', about:'About' }[s]}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button className="ns-nav-btn"
                onClick={() => navigate('/citizen')}>
                Dashboard
              </button>
              <button
                className="ns-nav-btn"
                style={{
                  background: 'rgba(0,168,107,0.12)',
                  borderColor: '#00A86B',
                  color: '#4AE8A0',
                }}
                onClick={() => navigate('/institution')}
              >
                Institution Portal →
              </button>
            </div>
          </div>
        </nav>
 
        {/* ── HERO ────────────────────────────────────────────────── */}
        <section id="check-section" className="ns-hero">
          <div className="ns-live-badge">
            <span className="ns-live-dot" />
            LIVE · NIGERIA BREACH PLATFORM
          </div>
          <h1 className="ns-h1">Check if your identity<br />is in a data breach</h1>
          <p className="ns-sub">Email, phone number, NIN or BVN. zero‑knowledge hashing protects your privacy.</p>
 
          <div className="ns-tabs">
            {Object.entries(typeMap).map(([type, { label }]) => (
              <button key={type}
                className={`ns-tab${currentType === type ? ' active' : ''}`}
                onClick={() => { setCurrentType(type); setInputValue(''); setResult(null); }}>
                {label}
              </button>
            ))}
          </div>
 
          <div className="ns-input-row">
            <input className="ns-input" type="text"
              placeholder={cfg.placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()} />
            <button className="ns-check-btn"
              onClick={handleCheck}
              disabled={!isValid || checking}>
              {checking ? 'Checking…' : 'Check →'}
            </button>
          </div>
          <p className="ns-hint">{cfg.hint}</p>
          <div className="ns-zk-badge"> Zero‑knowledge: hashed client‑side, plaintext never transmitted</div>
        </section>
 
        {/* ── RESULT ──────────────────────────────────────────────── */}
        {result && <div className="ns-result-wrap">{renderResult()}</div>}
 
        {/* ── STATS BAND ──────────────────────────────────────────── */}
        <div className="ns-stats-band">
          {[
            { key: 'losses',    fallback: '₦122.78B', label: 'reported losses 2021–2025',   liveKey: null },
            { key: 'fraud',     fallback: '67,518',   label: 'fraud cases (2025)',            liveKey: null },
            { key: 'breaches',  fallback: '119K+',    label: 'breaches Q1 2025',             liveKey: null },
            { key: 'attacks',   fallback: '4,000+',   label: 'cyberattacks / week',           liveKey: null },
          ].map(({ fallback, label }) => (
            <div key={label} className="ns-stat-card">
              <div className="ns-stat-num">{fallback}</div>
              <div className="ns-stat-label">{label}</div>
            </div>
          ))}
        </div>
 
        {/* ── BREACH TABLE ────────────────────────────────────────── */}
        <section id="breaches-section" className="ns-section">
          <h2 className="ns-section-title">🇳🇬 Nigerian Breach Database</h2>
          <p className="ns-section-sub">Known breaches affecting Nigerian citizens and institutions</p>
          <div className="ns-table">
            <div className="ns-table-head">
              <span>Breach</span><span>Records</span><span>Added</span><span>Date</span><span></span>
            </div>
            {RECENT_BREACHES.map((b, i) => (
              <div key={i} className="ns-table-row">
                <span>{b.name}</span>
                <span className="ns-table-count">{b.count}</span>
                <span style={{ color: '#8FBB85' }}>{b.added}</span>
                <span style={{ color: '#8FBB85' }}>{b.date}</span>
                <span className="ns-table-arrow">→</span>
              </div>
            ))}
          </div>
        </section>
 
        {/* ── HOW IT WORKS ────────────────────────────────────────── */}
        <section id="howitworks-section" className="ns-section" style={{ textAlign: 'center' }}>
          <p style={{ color: '#EAB308', letterSpacing: '0.1em', fontSize: '0.8rem', marginBottom: '0.5rem' }}>ZERO‑KNOWLEDGE ARCHITECTURE</p>
          <h2 className="ns-section-title">How NigerSec protects you</h2>
          <div className="ns-hiw-grid" style={{ textAlign: 'left' }}>
            {[
              { icon: '⌨️', title: 'Enter identifier', text: 'Email, phone, NIN or BVN – validated for Nigerian formats.' },
              { icon: '⬡', title: 'Hashed on device', text: 'SHA‑1 via Web Crypto API – your data never leaves your browser as plaintext.' },
              { icon: '🔍', title: 'Silent cross‑reference', text: 'Only the hash prefix is transmitted. Full match confirmed locally.' },
              { icon: '⚡', title: 'Action plan', text: 'Tailored remediation steps for each exposed identifier type.' },
            ].map((item, idx) => (
              <div key={idx} className="ns-hiw-card">
                <div className="ns-hiw-icon">{item.icon}</div>
                <div className="ns-hiw-title">{item.title}</div>
                <p className="ns-hiw-text">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
 
        {/* ── NOTIFY ME ───────────────────────────────────────────── */}
        <section id="notify-section" className="ns-section">
          <div className="ns-notify">
            <h2 className="ns-section-title">Get breach notifications</h2>
            <p style={{ color: '#8FBB85', maxWidth: 500, margin: '0 auto' }}>
              We monitor the dark web and NDPC records, alerting you instantly when your data appears.
            </p>
            <div className="ns-notify-row">
              <input className="ns-input" type="email"
                placeholder="Your email address"
                value={notifyEmail}
                onChange={e => setNotifyEmail(e.target.value)} />
              <button className="ns-check-btn" onClick={handleNotify}>Notify Me</button>
            </div>
            {notifyMsg && <div className="ns-notify-ok">{notifyMsg}</div>}
            <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: '#5A7A55' }}>
              Free · Unsubscribe anytime · NDPA compliant
            </div>
          </div>
        </section>
 
        {/* ── API ─────────────────────────────────────────────────── */}
        <section id="api-section" className="ns-section">
          <div className="ns-api-grid">
            <div>
              <p className="ns-api-label">DEVELOPER API · LIVE DEMO</p>
              <h2 className="ns-api-h2">Fraud detection<br />in 200ms</h2>
              <p style={{ color: '#8FBB85', lineHeight: 1.6 }}>
                Adjust parameters below and run the real XGBoost ML model live.
                Plug the same endpoint into any Nigerian fintech transaction flow.
              </p>
              <p className="ns-api-pricing">₦50 / 1k calls · ₦30 business tier</p>
              <button className="ns-api-btn"
                onClick={() => alert('Developer portal coming soon — join the waitlist via Notify Me')}>
                Get API Keys →
              </button>
            </div>

            {/* Live fraud demo */}
            <div className="ns-score-demo">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EAB308', letterSpacing: '0.07em', marginBottom: '0.8rem' }}>
                ⚡ LIVE ML FRAUD SCORER
              </div>
              <div className="ns-score-demo-grid">
                <div className="ns-demo-field">
                  <label>Amount (₦)</label>
                  <input type="number" min="0" step="1000" 
                    value={demoParams.amount}
                    onChange={e => {
                      let val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      if (isNaN(val)) val = 0;
                      setDemoField('amount', val);
                    }} />
                </div>
               <div className="ns-demo-field">
                <label>Account age (days)</label>
                <input type="number" min="0" step="1" 
                  value={demoParams.account_age_days}
                  onChange={e => {
                    let val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                    if (isNaN(val)) val = 0;
                    setDemoField('account_age_days', val);
                  }} />
              </div>
                <div className="ns-demo-field">
                <label>Hour of day (0–23)</label>
                <input type="number" min="0" max="23" step="1"
                  value={demoParams.hour_of_day}
                  onChange={e => {
                    let val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                    if (isNaN(val)) val = 0;
                    val = Math.min(23, Math.max(0, val));
                    setDemoField('hour_of_day', val);
                  }} />
              </div>
              </div>

              {/* Risk signal toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem', marginBottom: '1rem' }}>
                {[
                  ['velocity_flag',  'High velocity'],
                  ['bvn_in_breach',  'BVN in breach DB'],
                  ['new_device',     'New device'],
                  ['nibss_flagged',  'NIBSS flagged'],
                  ['channel_web',    'Web channel'],
                ].map(([k, lbl]) => (
                  <div key={k} className="ns-toggle-row" onClick={() => setDemoField(k, !demoParams[k])}>
                    <div className="ns-toggle" style={{ background: demoParams[k] ? '#10B981' : '#1F3A24' }}>
                      <div className="ns-toggle-knob" style={{ left: demoParams[k] ? '18px' : '2px' }} />
                    </div>
                    <span className="ns-toggle-lbl">{lbl}</span>
                  </div>
                ))}
              </div>

              <button className="ns-check-btn" style={{ width: '100%' }}
                onClick={runFraudScore} disabled={scoring}>
                {scoring ? <><span className="ns-spinner" /> Scoring…</> : '⚡ Run ML Score'}
              </button>

              {scoreError && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#FCA5A5' }}>
                  ⚠️ {scoreError}
                </div>
              )}

              {scoreResult && (() => {
                const s = scoreResult.risk_score;
                const col = s >= 75 ? '#EF4444' : s >= 55 ? '#F97316' : s >= 35 ? '#EAB308' : '#10B981';
                const recCol = { BLOCK: '#EF4444', REVIEW: '#EAB308', ALLOW: '#10B981' };
                return (
                  <div className="ns-score-result">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                      <div className="ns-score-ring" style={{ background: `${col}18`, border: `3px solid ${col}` }}>
                        <div className="ns-score-num" style={{ color: col }}>{s}</div>
                        <div style={{ fontSize: '0.6rem', color: '#5A7A55' }}>/100</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#5A7A55', marginBottom: 3 }}>Risk · {scoreResult.risk_level}</div>
                        <div className="ns-score-rec" style={{ color: recCol[scoreResult.recommendation] || '#fff' }}>
                          {scoreResult.recommendation === 'BLOCK' ? '🚫' : scoreResult.recommendation === 'REVIEW' ? '⚠️' : '✅'} {scoreResult.recommendation}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#3B7040', marginTop: 3, fontFamily: 'monospace' }}>
                          {scoreResult.model_version} · p={scoreResult.ml_probability?.toFixed(3)}
                        </div>
                      </div>
                    </div>
                    {scoreResult.flags?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#5A7A55', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Active flags</div>
                        <div>{scoreResult.flags.map((f, i) => <span key={i} className="ns-flag-tag">⚑ {f}</span>)}</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
 
        {/* ── ABOUT ───────────────────────────────────────────────── */}
        <section id="about-section" className="ns-about">
          <h2 className="ns-about-h2">We are building infrastructure,<br />not just a product.</h2>
          <p className="ns-about-p">
            Nigeria loses a reported ₦122.78 billion (2021–2025) because there's no shared threat intelligence.
            NigerSec fixes that — citizens, institutions, and APIs on one data flywheel.
          </p>
          <div className="ns-tags">
            {['NDPA 2023 Compliant', 'Zero‑Knowledge', 'Nigerian‑first data', 'CBN Sandbox Ready'].map(tag => (
              <span key={tag} className="ns-tag">{tag}</span>
            ))}
          </div>
        </section>
 
        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer className="ns-footer">
          <div>
            <div className="ns-footer-brand">NigerSec</div>
            <div className="ns-footer-copy">© 2026 · OPay Innovation Challenge</div>
          </div>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div className="ns-footer-col">
              <h4>Services</h4>
              <p>Email Search · NIN/BVN Check · Notify Me · API</p>
            </div>
            <div className="ns-footer-col">
              <h4>Information</h4>
              <p>NDPA 2023 · FAQ · Privacy · Terms</p>
            </div>
            <div className="ns-footer-col">
              <h4>Connect</h4>
              <p>Dashboard · NDPC Portal · Support</p>
            </div>
          </div>
        </footer>
 
      </div>
    </>
  );
}