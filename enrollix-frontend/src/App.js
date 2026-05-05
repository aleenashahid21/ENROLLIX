import React, { useEffect, useState, useCallback, useRef } from 'react';

/* ─────────────────────────────────────────────
   API HELPERS
───────────────────────────────────────────── */
const API = 'http://localhost:5000';
const apiFetch = async (url, opts) => {
  const r = await fetch(API + url, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const get   = url      => apiFetch(url);
const post  = (url, b) => apiFetch(url, { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const patch = (url, b) => apiFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const del   = url      => apiFetch(url, { method: 'DELETE' });

/* ─────────────────────────────────────────────
   SOUND ENGINE  (Web Audio API — no files needed)
───────────────────────────────────────────── */
let audioCtx = null;
const getAudio = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
};
const playTone = (freq, dur, type = 'sine', vol = 0.12, delay = 0) => {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur);
  } catch (_) {}
};
const SFX = {
  click:   () => { playTone(880, 0.06, 'sine', 0.08); },
  success: () => { playTone(523, 0.1, 'sine', 0.1); playTone(659, 0.1, 'sine', 0.1, 0.12); playTone(784, 0.18, 'sine', 0.12, 0.24); },
  error:   () => { playTone(220, 0.15, 'sawtooth', 0.08); playTone(180, 0.2, 'sawtooth', 0.06, 0.1); },
  notify:  () => { playTone(740, 0.08, 'sine', 0.08); playTone(880, 0.12, 'sine', 0.08, 0.1); },
  login:   () => { [523,622,740,880].forEach((f,i)=>playTone(f,0.14,'sine',0.1,i*0.09)); },
  splash:  () => {
    const notes = [261,329,392,523,659,784,1046];
    notes.forEach((f,i) => playTone(f, 0.4, 'sine', 0.07, i*0.12));
  },
  nav:     () => { playTone(660, 0.05, 'sine', 0.06); },
};

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Exo 2', sans-serif;
  background: #04080f;
  color: #cdd9f0;
  overflow: hidden;
  cursor: default;
}
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1a3a6e; border-radius: 3px; }
select option { background: #08142a; color: #cdd9f0; }

/* ── Splash animations ── */
@keyframes splashFadeIn    { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
@keyframes splashFadeOut   { from{opacity:1;transform:scale(1)}   to{opacity:0;transform:scale(1.1);pointer-events:none} }
@keyframes logoReveal      { 0%{clip-path:inset(0 100% 0 0)} 100%{clip-path:inset(0 0% 0 0)} }
@keyframes logoGlow        { 0%,100%{text-shadow:0 0 20px rgba(56,182,255,.4),0 0 60px rgba(56,182,255,.2)} 50%{text-shadow:0 0 40px rgba(56,182,255,.8),0 0 100px rgba(56,182,255,.4),0 0 160px rgba(56,182,255,.2)} }
@keyframes scanline        { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
@keyframes gridPulse       { 0%,100%{opacity:.06} 50%{opacity:.14} }
@keyframes float           { 0%,100%{transform:translateY(0px) rotate(0deg)} 33%{transform:translateY(-18px) rotate(1deg)} 66%{transform:translateY(-8px) rotate(-1deg)} }
@keyframes orbit           { from{transform:rotate(0deg) translateX(120px) rotate(0deg)} to{transform:rotate(360deg) translateX(120px) rotate(-360deg)} }
@keyframes orbit2          { from{transform:rotate(120deg) translateX(160px) rotate(-120deg)} to{transform:rotate(480deg) translateX(160px) rotate(-480deg)} }
@keyframes orbit3          { from{transform:rotate(240deg) translateX(90px) rotate(-240deg)} to{transform:rotate(600deg) translateX(90px) rotate(-600deg)} }
@keyframes dash            { from{stroke-dashoffset:400} to{stroke-dashoffset:0} }
@keyframes blink           { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes countUp         { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes particleDrift   { 0%{transform:translate(0,0) scale(1);opacity:.7} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }
@keyframes ringExpand      { 0%{transform:scale(0);opacity:.8} 100%{transform:scale(3);opacity:0} }
@keyframes waveform        { 0%,100%{height:4px} 50%{height:var(--wh,24px)} }

/* ── Page transitions ── */
@keyframes pageIn  { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
@keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
@keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes spin    { to{transform:rotate(360deg)} }
@keyframes glow    { 0%,100%{box-shadow:0 0 6px rgba(56,182,255,.3)} 50%{box-shadow:0 0 20px rgba(56,182,255,.7)} }
@keyframes starPop { 0%{transform:scale(1)} 50%{transform:scale(1.4)} 100%{transform:scale(1)} }
@keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
@keyframes toastIn { from{opacity:0;transform:translateY(20px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes toastOut{ from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(10px)} }

.page-enter  { animation: pageIn .38s cubic-bezier(.22,1,.36,1) forwards; }
.fade-in     { animation: fadeIn .4s ease forwards; }
.slide-in    { animation: slideIn .3s ease forwards; }

/* ── Sidebar ── */
.sidebar {
  width: 224px; flex-shrink: 0;
  background: linear-gradient(180deg,#060f1e 0%,#04080f 100%);
  border-right: 1px solid rgba(56,182,255,.08);
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}
.sidebar::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(56,182,255,.02) 40px);
  pointer-events: none;
}
.logo-mark {
  font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 19px;
  background: linear-gradient(135deg,#38b6ff 0%,#7b8cde 50%,#38b6ff 100%);
  background-size: 200%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: 2px; animation: shimmer 4s linear infinite;
}
.logo-sub { font-size: 8.5px; color: #1a3a5c; letter-spacing: .18em; text-transform: uppercase; margin-top: 3px; font-weight: 600; }
.nav-section-label {
  font-size: 8.5px; font-weight: 700; color: #0f2540;
  text-transform: uppercase; letter-spacing: .14em;
  padding: 13px 18px 5px; font-family: 'Orbitron', sans-serif;
}
.nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 18px; cursor: pointer; font-size: 12px;
  color: #1e3d60; border-left: 2px solid transparent;
  transition: all .17s; user-select: none; position: relative; font-weight: 500;
}
.nav-item:hover { color: #7ab8e8; background: rgba(56,182,255,.04); }
.nav-item.active {
  color: #e2f0ff; border-left-color: #38b6ff;
  background: linear-gradient(90deg,rgba(56,182,255,.12),transparent);
  font-weight: 600;
}
.nav-item.active::before {
  content: ''; position: absolute; left: -1px; top: 0; bottom: 0;
  width: 2px; background: linear-gradient(180deg,#7ad4ff,#38b6ff);
  box-shadow: 0 0 8px rgba(56,182,255,.6);
}
.nav-icon { font-size: 13px; width: 16px; text-align: center; flex-shrink: 0; opacity: .6; transition: opacity .15s; }
.nav-item:hover .nav-icon, .nav-item.active .nav-icon { opacity: 1; }
.nav-badge { font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 700; margin-left: auto; font-family: 'Orbitron', sans-serif; }

/* ── Topbar ── */
.topbar {
  background: rgba(4,8,15,.92); border-bottom: 1px solid rgba(56,182,255,.07);
  padding: 0 24px; height: 54px; display: flex; align-items: center;
  justify-content: space-between; backdrop-filter: blur(12px); flex-shrink: 0;
  position: relative; overflow: hidden;
}
.topbar::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg,transparent,rgba(56,182,255,.3),transparent);
}
.topbar-title {
  font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 13px;
  color: #e2f0ff; letter-spacing: 1.5px;
}
.live-pill {
  font-size: 9.5px; padding: 3px 10px; border-radius: 20px;
  background: rgba(56,255,150,.07); color: #56ff96;
  border: 1px solid rgba(56,255,150,.2);
  font-family: 'Orbitron', sans-serif; font-weight: 700; letter-spacing: .08em;
  animation: glow 2.5s ease-in-out infinite;
  display: flex; align-items: center; gap: 5px;
}
.live-dot { width: 5px; height: 5px; border-radius: 50%; background: #56ff96; animation: pulse 1.5s infinite; }

/* ── Cards ── */
.card {
  background: linear-gradient(145deg,#080f1e,#060a17);
  border: 1px solid rgba(56,182,255,.07);
  border-radius: 14px; padding: 18px 20px; margin-bottom: 14px;
  position: relative; overflow: hidden; transition: border-color .2s;
}
.card:hover { border-color: rgba(56,182,255,.13); }
.card::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg,transparent,rgba(56,182,255,.15),transparent);
}
.card-title {
  font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700;
  color: #1a3a5c; text-transform: uppercase; letter-spacing: .12em;
  margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
}
.card-title::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,rgba(56,182,255,.1),transparent); }

/* ── Stat grid ── */
.stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 11px; margin-bottom: 16px; }
.stat-card {
  background: linear-gradient(145deg,#080f1e,#060a17);
  border: 1px solid rgba(56,182,255,.1); border-radius: 13px;
  padding: 16px 18px; position: relative; overflow: hidden;
  transition: all .22s; cursor: default;
}
.stat-card:hover { border-color: rgba(56,182,255,.22); transform: translateY(-2px); }
.stat-card::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse at top left,rgba(56,182,255,.04),transparent 70%);
}
.stat-icon { font-size: 18px; margin-bottom: 8px; display: block; }
.stat-num { font-family: 'Orbitron', sans-serif; font-size: 27px; font-weight: 900; line-height: 1; margin-bottom: 3px; }
.stat-label { font-size: 10px; color: #1a3a5c; text-transform: uppercase; letter-spacing: .07em; font-weight: 600; font-family: 'Orbitron', sans-serif; }
.stat-sub { font-size: 9.5px; color: #0f2540; margin-top: 2px; }

/* ── Tables ── */
.tbl { width: 100%; border-collapse: collapse; }
.tbl th {
  text-align: left; font-size: 9.5px; font-weight: 700; color: #1a3a5c;
  padding: 0 10px 9px; text-transform: uppercase; letter-spacing: .1em;
  font-family: 'Orbitron', sans-serif;
}
.tbl td { padding: 9px 10px; border-top: 1px solid rgba(255,255,255,.03); font-size: 12.5px; color: #7ab8e8; vertical-align: middle; }
.tbl tbody tr { transition: background .13s; }
.tbl tbody tr:hover td { background: rgba(56,182,255,.04); color: #b8d4f0; }
.tbl td:first-child { color: #d4e8ff; }

/* ── Forms ── */
.form-row   { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 130px; }
.form-label {
  font-size: 9px; font-weight: 700; color: #1a3a5c;
  text-transform: uppercase; letter-spacing: .1em; font-family: 'Orbitron', sans-serif;
}
.form-select, .form-input, .form-textarea {
  width: 100%; padding: 8px 12px;
  background: #030711; border: 1px solid rgba(56,182,255,.15);
  border-radius: 8px; color: #cdd9f0; font-size: 12.5px;
  font-family: 'Exo 2', sans-serif; transition: border-color .18s, box-shadow .18s;
}
.form-select {
  appearance: none; background-color: #030711;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%231a3a5c'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px;
}
.form-textarea { resize: vertical; min-height: 70px; }
.form-select:focus, .form-input:focus, .form-textarea:focus {
  outline: none; border-color: #38b6ff; box-shadow: 0 0 0 3px rgba(56,182,255,.1);
}

/* ── Buttons ── */
.btn {
  padding: 8px 18px; border-radius: 8px; font-size: 12px;
  font-family: 'Exo 2', sans-serif; font-weight: 600; cursor: pointer;
  transition: all .18s; white-space: nowrap; display: inline-flex;
  align-items: center; gap: 6px; border: none; letter-spacing: .03em;
}
.btn-primary {
  background: linear-gradient(135deg,#38b6ff,#1a7ecf);
  color: #fff; box-shadow: 0 3px 14px rgba(56,182,255,.25);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 5px 20px rgba(56,182,255,.4); }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.btn-success { background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; box-shadow: 0 3px 12px rgba(34,197,94,.2); }
.btn-success:hover { transform: translateY(-1px); }
.btn-danger  { background: transparent; color: #f87171; border: 1px solid rgba(248,113,113,.28); padding: 7px 13px; font-size: 12px; }
.btn-danger:hover { background: rgba(248,113,113,.08); border-color: #f87171; }
.btn-ghost   { background: rgba(56,182,255,.05); color: #7ab8e8; border: 1px solid rgba(56,182,255,.12); padding: 6px 12px; font-size: 11.5px; }
.btn-ghost:hover { background: rgba(56,182,255,.1); }
.btn-approve { background: rgba(34,197,94,.1); color: #4ade80; border: 1px solid rgba(34,197,94,.22); font-size: 11.5px; padding: 5px 11px; margin-right: 5px; }
.btn-approve:hover { background: rgba(34,197,94,.2); }
.btn-sm { padding: 4px 10px; font-size: 11px; border-radius: 6px; }

/* ── Pills ── */
.pill {
  display: inline-flex; align-items: center; font-size: 10px;
  padding: 2px 8px; border-radius: 10px; font-weight: 700;
  font-family: 'Orbitron', sans-serif; letter-spacing: .04em; white-space: nowrap;
}
.pill-green  { background: rgba(34,197,94,.09);  color: #4ade80; border: 1px solid rgba(34,197,94,.2); }
.pill-red    { background: rgba(248,113,113,.09); color: #f87171; border: 1px solid rgba(248,113,113,.2); }
.pill-amber  { background: rgba(251,191,36,.09);  color: #fbbf24; border: 1px solid rgba(251,191,36,.2); }
.pill-blue   { background: rgba(56,182,255,.09);  color: #38b6ff; border: 1px solid rgba(56,182,255,.2); }
.pill-purple { background: rgba(167,139,250,.09); color: #a78bfa; border: 1px solid rgba(167,139,250,.2); }
.pill-teal   { background: rgba(45,212,191,.09);  color: #2dd4bf; border: 1px solid rgba(45,212,191,.2); }
.pill-gray   { background: rgba(255,255,255,.04);  color: #3a5a7c; border: 1px solid rgba(255,255,255,.07); }

/* ── Messages ── */
.msg { padding: 10px 14px; border-radius: 8px; font-size: 12.5px; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 8px; }
.msg-ok   { background: rgba(34,197,94,.06);  border: 1px solid rgba(34,197,94,.18);  color: #4ade80; }
.msg-err  { background: rgba(248,113,113,.06); border: 1px solid rgba(248,113,113,.18); color: #f87171; }
.msg-warn { background: rgba(251,191,36,.06);  border: 1px solid rgba(251,191,36,.18);  color: #fbbf24; }
.msg-info { background: rgba(56,182,255,.06);  border: 1px solid rgba(56,182,255,.15);  color: #38b6ff; }

/* ── Seat bar ── */
.seat-wrap { display: inline-flex; align-items: center; gap: 7px; }
.seat-bar  { height: 4px; border-radius: 2px; background: rgba(255,255,255,.05); overflow: hidden; width: 60px; }
.seat-fill { height: 100%; border-radius: 2px; transition: width .45s ease; }

/* ── Stars ── */
.star-row { display: flex; gap: 2px; align-items: center; }
.star     { font-size: 16px; cursor: pointer; transition: transform .12s; line-height: 1; }
.star:hover { transform: scale(1.2); animation: starPop .18s ease; }
.star-sm  { font-size: 11.5px; cursor: default; }

/* ── Avatar ── */
.avatar {
  width: 30px; height: 30px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10.5px; font-weight: 700; font-family: 'Orbitron', sans-serif; flex-shrink: 0;
}

/* ── Tab row ── */
.tab-row { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; background: rgba(255,255,255,.02); border-radius: 10px; padding: 3px; width: fit-content; }
.tab-btn { padding: 5px 13px; border-radius: 7px; font-size: 11.5px; cursor: pointer; transition: all .17s; border: none; background: transparent; color: #1a3a5c; font-family: 'Exo 2', sans-serif; font-weight: 600; }
.tab-btn.active { background: linear-gradient(135deg,#38b6ff,#1a7ecf); color: #fff; box-shadow: 0 2px 8px rgba(56,182,255,.28); }
.tab-btn:hover:not(.active) { color: #7ab8e8; background: rgba(56,182,255,.06); }

/* ── Role badges ── */
.role-badge { padding: 2px 9px; border-radius: 20px; font-size: 9px; font-weight: 700; font-family: 'Orbitron', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
.role-student { background: rgba(56,182,255,.1);  color: #38b6ff; border: 1px solid rgba(56,182,255,.2); }
.role-teacher { background: rgba(167,139,250,.1); color: #a78bfa; border: 1px solid rgba(167,139,250,.2); }
.role-admin   { background: rgba(251,191,36,.1);  color: #fbbf24; border: 1px solid rgba(251,191,36,.2); }

/* ── Toast ── */
.toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.toast { pointer-events: all; padding: 11px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 500; display: flex; align-items: center; gap: 8px; min-width: 240px; max-width: 340px; backdrop-filter: blur(12px); }
.toast.entering { animation: toastIn .3s ease forwards; }
.toast.leaving  { animation: toastOut .3s ease forwards; }
.toast-ok   { background: rgba(34,197,94,.12);  border: 1px solid rgba(34,197,94,.25);  color: #4ade80; }
.toast-err  { background: rgba(248,113,113,.12); border: 1px solid rgba(248,113,113,.25); color: #f87171; }
.toast-info { background: rgba(56,182,255,.12);  border: 1px solid rgba(56,182,255,.25);  color: #38b6ff; }

/* ── Misc ── */
.spinner { width: 15px; height: 15px; border: 2px solid rgba(56,182,255,.2); border-top-color: #38b6ff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
.dot { width: 5px; height: 5px; border-radius: 50%; background: #38b6ff; animation: pulse 1.2s infinite; display: inline-block; margin: 0 2px; }
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
.empty { text-align: center; padding: 36px 20px; color: #0f2540; font-size: 12.5px; }
.empty-icon { font-size: 30px; margin-bottom: 8px; display: block; opacity: .3; }
.divider { height: 1px; background: linear-gradient(90deg,transparent,rgba(56,182,255,.1),transparent); margin: 12px 0; }
.fee-paid   { background: rgba(34,197,94,.05);  border: 1px solid rgba(34,197,94,.13);  border-radius: 11px; padding: 13px 16px; display: flex; align-items: center; gap: 11px; }
.fee-unpaid { background: rgba(248,113,113,.05); border: 1px solid rgba(248,113,113,.13); border-radius: 11px; padding: 13px 16px; display: flex; align-items: center; gap: 11px; }
.att-btn { width: 34px; height: 34px; border-radius: 7px; font-size: 10.5px; font-weight: 700; cursor: pointer; transition: all .13s; border: 1px solid rgba(255,255,255,.06); background: rgba(255,255,255,.03); color: #1a3a5c; font-family: 'Orbitron', sans-serif; }
.att-btn.Present { background: rgba(34,197,94,.14); color: #4ade80; border-color: rgba(34,197,94,.28); }
.att-btn.Absent  { background: rgba(248,113,113,.14); color: #f87171; border-color: rgba(248,113,113,.28); }
.att-btn.Late    { background: rgba(251,191,36,.14); color: #fbbf24; border-color: rgba(251,191,36,.28); }
.rating-bar-wrap { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
.rating-bar  { height: 5px; border-radius: 3px; background: rgba(255,255,255,.04); flex: 1; overflow: hidden; }
.rating-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg,#fbbf24,#f59e0b); }
.transcript-row { display: grid; grid-template-columns: 80px 1fr 55px 55px 55px; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.03); font-size: 12.5px; }
.audit-row { display: grid; grid-template-columns: 90px 80px 60px 1fr 120px; gap: 6px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,.03); font-size: 11.5px; align-items: start; }
.prereq-tree-wrap { overflow-x: auto; padding: 10px 0; }
.announcement { background: linear-gradient(135deg,rgba(56,182,255,.04),rgba(167,139,250,.02)); border: 1px solid rgba(56,182,255,.09); border-radius: 11px; padding: 12px 14px; margin-bottom: 9px; transition: border-color .18s; }
.announcement:hover { border-color: rgba(56,182,255,.18); }
.ann-title { font-weight: 600; font-size: 13px; color: #e2f0ff; margin-bottom: 3px; }
.ann-meta  { font-size: 10.5px; color: #1a3a5c; margin-bottom: 6px; display: flex; gap: 9px; align-items: center; }
.ann-body  { font-size: 12px; color: #3a6a94; line-height: 1.6; }
`;

/* ─────────────────────────────────────────────
   TOAST SYSTEM
───────────────────────────────────────────── */
let toastSetterFn = null;
let toastIdCounter = 0;
const showToast = (text, type = 'info') => {
  if (toastSetterFn) toastSetterFn(prev => [...prev, { id: ++toastIdCounter, text, type }]);
};
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  toastSetterFn = setToasts;
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts(t => t.slice(1)), 3000);
    return () => clearTimeout(timer);
  }, [toasts]);
  const icons = { ok: '✓', err: '✕', info: 'ℹ' };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type} entering`}>
          <span>{icons[t.type] || 'ℹ'}</span><span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SPLASH SCREEN
───────────────────────────────────────────── */
function SplashScreen({ onDone }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('enter'); // enter → loading → exit
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const animRef = useRef(null);

  const statuses = ['INITIALIZING', 'LOADING DATABASE', 'CONNECTING MODULES', 'SYNCING RECORDS', 'READY'];

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const lines = [];
    for (let i = 0; i < particles.length; i++)
      for (let j = i + 1; j < particles.length; j++) lines.push([i, j]);

    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,182,255,${p.opacity})`;
        ctx.fill();
      });
      lines.forEach(([i, j]) => {
        const a = particles[i], b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(56,182,255,${(1 - dist / 100) * 0.12})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  // Progress animation
  useEffect(() => {
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 3 + 1;
      if (prog >= 100) { prog = 100; clearInterval(interval); }
      setProgress(Math.min(prog, 100));
      const idx = Math.floor((prog / 100) * (statuses.length - 1));
      setStatusText(statuses[Math.min(idx, statuses.length - 1)]);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Auto-exit after load
  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => { setPhase('exit'); setTimeout(onDone, 600); }, 700);
      return () => clearTimeout(t);
    }
  }, [progress]);

  const handleEnableSound = () => {
    setSoundEnabled(true);
    SFX.splash();
  };

  const hexCount = 24;
  const hexPositions = Array.from({ length: hexCount }, (_, i) => ({
    x: (i % 6) * 170 - 100 + (Math.floor(i / 6) % 2) * 85,
    y: Math.floor(i / 6) * 140 - 80,
    delay: i * 0.07,
    opacity: 0.02 + Math.random() * 0.05,
  }));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse at 40% 35%, #040f24 0%, #02060f 60%, #010408 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: phase === 'exit' ? 'splashFadeOut .6s ease forwards' : 'splashFadeIn .7s ease forwards',
      overflow: 'hidden',
    }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity: .7 }} />

      {/* Hex grid background */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .4 }} viewBox="0 0 1024 768">
        {hexPositions.map((h, i) => (
          <polygon key={i} points="50,0 100,28 100,75 50,100 0,75 0,28"
            transform={`translate(${h.x},${h.y}) scale(.7)`}
            fill="none" stroke="rgba(56,182,255,.3)" strokeWidth=".5"
            style={{ opacity: h.opacity, animation: `gridPulse ${3 + i * .1}s ease-in-out infinite`, animationDelay: `${h.delay}s` }} />
        ))}
      </svg>

      {/* Scanline */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2, top: 0,
        background: 'linear-gradient(90deg,transparent,rgba(56,182,255,.6),transparent)',
        animation: 'scanline 4s linear infinite', zIndex: 2, pointerEvents: 'none',
      }} />

      {/* Corner decorations */}
      {[['0','0','right','down'],['0','auto','left','down'],['auto','0','right','up'],['auto','auto','left','up']].map(([t,b,h,v], i) => (
        <svg key={i} width="60" height="60" style={{ position: 'absolute', top: t !== 'auto' ? 20 : 'auto', bottom: b !== 'auto' ? 20 : 'auto', left: h === 'right' ? 20 : 'auto', right: h === 'left' ? 20 : 'auto', opacity: .4 }}>
          <polyline points={h==='right'?'40,5 5,5 5,40':'20,5 55,5 55,40'} fill="none" stroke="#38b6ff" strokeWidth="1.5" />
        </svg>
      ))}

      {/* Orbital rings */}
      <div style={{ position: 'absolute', width: 360, height: 360, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: .12, pointerEvents: 'none' }}>
        {[360, 280, 200].map((s, i) => (
          <div key={i} style={{ position: 'absolute', inset: `${(360 - s) / 2}px`, border: '1px solid rgba(56,182,255,.5)', borderRadius: '50%' }} />
        ))}
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 8, height: 8, borderRadius: '50%', background: '#38b6ff', transform: 'translate(-50%,-50%)', boxShadow: '0 0 20px rgba(56,182,255,.8)', animation: 'orbit 6s linear infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', transform: 'translate(-50%,-50%)', boxShadow: '0 0 14px rgba(167,139,250,.8)', animation: 'orbit2 9s linear infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 5, borderRadius: '50%', background: '#4ade80', transform: 'translate(-50%,-50%)', boxShadow: '0 0 12px rgba(74,222,128,.8)', animation: 'orbit3 4s linear infinite' }} />
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', animation: 'float 6s ease-in-out infinite' }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 'clamp(42px,7vw,72px)',
          background: 'linear-gradient(135deg,#7ad4ff 0%,#38b6ff 35%,#a78bfa 65%,#38b6ff 100%)',
          backgroundSize: '300%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '6px', animation: 'logoGlow 3s ease-in-out infinite, shimmer 5s linear infinite',
          marginBottom: 8,
        }}>ENROLLIX</div>

        <div style={{
          fontFamily: "'Exo 2', sans-serif", fontSize: 12, color: '#1a3a5c',
          letterSpacing: '6px', textTransform: 'uppercase', marginBottom: 50,
        }}>University Course Management System</div>

        {/* Progress bar */}
        <div style={{ width: 340, margin: '0 auto 12px', position: 'relative' }}>
          <div style={{ height: 2, background: 'rgba(56,182,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg,#38b6ff,#a78bfa)',
              width: `${progress}%`, transition: 'width .1s linear',
              boxShadow: '0 0 10px rgba(56,182,255,.6)',
              borderRadius: 2,
            }} />
          </div>
          <div style={{
            position: 'absolute', right: 0, top: -18,
            fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: '#38b6ff',
          }}>{Math.round(progress)}%</div>
        </div>

        {/* Status */}
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: '#1a3a5c', letterSpacing: '3px', marginBottom: 36, height: 14 }}>
          <span style={{ animation: 'blink 1s infinite' }}>▮</span> {statusText}
        </div>

        {/* Waveform decoration */}
        <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 36 }}>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} style={{
              width: 3, borderRadius: 2, background: `rgba(56,182,255,${0.2 + (i % 5) * 0.1})`,
              animation: `waveform ${0.8 + (i % 5) * 0.2}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.05}s`,
              '--wh': `${12 + (i % 7) * 5}px`,
            }} />
          ))}
        </div>

        {/* Sound button */}
        {!soundEnabled && (
          <button onClick={handleEnableSound} style={{
            background: 'rgba(56,182,255,.08)', border: '1px solid rgba(56,182,255,.2)',
            borderRadius: 8, padding: '7px 18px', color: '#38b6ff',
            fontFamily: "'Orbitron', sans-serif", fontSize: 9.5, letterSpacing: '2px',
            cursor: 'pointer', transition: 'all .2s',
          }}
            onMouseOver={e => e.target.style.background = 'rgba(56,182,255,.15)'}
            onMouseOut={e => e.target.style.background = 'rgba(56,182,255,.08)'}
          >
            ◉ ENABLE SOUND
          </button>
        )}
        {soundEnabled && (
          <div style={{ fontSize: 10, color: '#0f2540', letterSpacing: '2px', fontFamily: "'Orbitron', sans-serif" }}>
            ♪ AUDIO ACTIVE
          </div>
        )}
      </div>

      {/* Version */}
      <div style={{ position: 'absolute', bottom: 18, fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: '#0a1a30', letterSpacing: '3px' }}>
        v2.0 · FALL 2025 · SECURE MODE
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MICRO COMPONENTS
───────────────────────────────────────────── */
function Pill({ s }) {
  const m = { Registered:'green',Dropped:'red',Completed:'teal',Pending:'amber',Approved:'green',Rejected:'red',Open:'green',Full:'red',Paid:'green',Unpaid:'red',Present:'green',Absent:'red',Late:'amber' };
  return <span className={`pill pill-${m[s] || 'gray'}`}>{s}</span>;
}
function SeatsBar({ avail, total }) {
  const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
  const color = avail === 0 ? '#f87171' : avail <= 2 ? '#fbbf24' : '#4ade80';
  return (
    <span className="seat-wrap">
      <span className="seat-bar"><span className="seat-fill" style={{ width: pct + '%', background: color }} /></span>
      <span className={`pill pill-${avail === 0 ? 'red' : avail <= 2 ? 'amber' : 'green'}`}>{avail}/{total}</span>
    </span>
  );
}
function Msg({ msg }) {
  if (!msg) return null;
  const c = msg.type === 'ok' ? 'msg-ok' : msg.type === 'warn' ? 'msg-warn' : 'msg-err';
  return <div className={`msg ${c}`}><span>{msg.type === 'ok' ? '✓' : msg.type === 'warn' ? '⚠' : '✕'}</span><span>{msg.text}</span></div>;
}
function InfoBox({ children }) { return <div className="msg msg-info" style={{ marginBottom: 12 }}><span>ℹ</span><span>{children}</span></div>; }
function Sel({ value, onChange, options, placeholder, disabled }) {
  return (
    <select className="form-select" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
      <option value="">{options.length === 0 ? '⚠ No data' : placeholder || 'Select…'}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Stars({ value, onChange, readonly, size = 'lg' }) {
  const [hover, setHover] = useState(0);
  const cls = size === 'sm' ? 'star-sm' : 'star';
  return (
    <span className="star-row">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={cls}
          style={{ color: i <= (hover || value) ? '#fbbf24' : '#0f2540' }}
          onClick={() => { if (!readonly && onChange) { onChange(i); SFX.click(); } }}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}>★</span>
      ))}
      {size !== 'sm' && value > 0 && <span style={{ fontSize: 10, color: '#1a3a5c', marginLeft: 3 }}>{value}/5</span>}
    </span>
  );
}
function Avatar({ name, color = '#38b6ff' }) {
  const init = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return <span className="avatar" style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>{init}</span>;
}
function CGPAGauge({ cgpa }) {
  const val = Number(cgpa) || 0;
  const pct = (val / 4) * 100;
  const color = val >= 3.5 ? '#4ade80' : val >= 2.5 ? '#fbbf24' : '#f87171';
  const r = 36, cx = 42, cy = 42, stroke = 5;
  const circ = 2 * Math.PI * r;
  const dash = circ * 0.75;
  const offset = dash - (dash * pct / 100);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0} strokeLinecap="round" transform="rotate(135,42,42)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(135,42,42)" style={{ transition: 'stroke-dashoffset .8s ease', filter: `drop-shadow(0 0 4px ${color})` }} />
        <text x={cx} y={cy - 1} textAnchor="middle" fill={color} fontSize="13" fontWeight="900" fontFamily="Orbitron,sans-serif">{val.toFixed(2)}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#1a3a5c" fontSize="7" fontFamily="Orbitron,sans-serif">CGPA</text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PREREQ TREE
───────────────────────────────────────────── */
function PrereqTree({ nodes, edges, completedIds = [] }) {
  if (!nodes || !nodes.length) return <div className="empty"><span className="empty-icon">🌳</span>No course data.</div>;
  const prereqMap = {};
  edges.forEach(e => { if (!prereqMap[e.course_id]) prereqMap[e.course_id] = []; prereqMap[e.course_id].push(e.prerequisite_course_id); });
  const layers = [], placed = new Set();
  let layer = nodes.filter(n => !edges.find(e => e.course_id === n.course_id));
  while (layer.length > 0) {
    layers.push(layer); layer.forEach(n => placed.add(n.course_id));
    layer = nodes.filter(n => !placed.has(n.course_id) && (prereqMap[n.course_id] || []).every(p => placed.has(p)));
  }
  nodes.filter(n => !placed.has(n.course_id)).forEach(n => { layers[layers.length - 1]?.push(n); placed.add(n.course_id); });
  const W = 140, H = 56, GX = 64, GY = 28, positions = {};
  layers.forEach((l, li) => l.forEach((n, ni) => { positions[n.course_id] = { x: li * (W + GX), y: ni * (H + GY) + (li % 2 === 0 ? 0 : 28) }; }));
  const maxX = Math.max(...Object.values(positions).map(p => p.x)) + W + 20;
  const maxY = Math.max(...Object.values(positions).map(p => p.y)) + H + 20;
  const done = new Set(completedIds);
  return (
    <div className="prereq-tree-wrap">
      <svg width={maxX} height={maxY} style={{ minWidth: maxX }}>
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(56,182,255,.4)" /></marker></defs>
        {edges.map((e, i) => {
          const f = positions[e.prerequisite_course_id], t = positions[e.course_id];
          if (!f || !t) return null;
          return <line key={i} x1={f.x + W} y1={f.y + H / 2} x2={t.x} y2={t.y + H / 2} stroke="rgba(56,182,255,.28)" strokeWidth="1.5" markerEnd="url(#arr)" />;
        })}
        {nodes.map(n => {
          const p = positions[n.course_id]; if (!p) return null;
          const d = done.has(n.course_id);
          return (
            <g key={n.course_id}>
              <rect x={p.x} y={p.y} width={W} height={H} rx="9"
                fill={d ? 'rgba(34,197,94,.07)' : 'rgba(56,182,255,.05)'}
                stroke={d ? 'rgba(34,197,94,.28)' : 'rgba(56,182,255,.2)'} strokeWidth="1" />
              {d && <text x={p.x + W - 12} y={p.y + 14} fontSize="10" fill="#4ade80">✓</text>}
              <text x={p.x + W / 2} y={p.y + 20} textAnchor="middle" fontSize="11" fontWeight="700" fill={d ? '#4ade80' : '#38b6ff'} fontFamily="Orbitron,sans-serif">{n.course_code}</text>
              <text x={p.x + W / 2} y={p.y + 33} textAnchor="middle" fontSize="9" fill="#3a6a8a">{n.course_title.length > 18 ? n.course_title.slice(0, 17) + '…' : n.course_title}</text>
              <text x={p.x + W / 2} y={p.y + 46} textAnchor="middle" fontSize="8" fill="#1a3a5c">{n.credit_hours} cr · {n.department}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, flexWrap: 'wrap' }}>
        <span style={{ color: '#4ade80' }}>✓ Completed</span>
        <span style={{ color: '#38b6ff' }}>□ Pending</span>
        <span style={{ color: '#1a3a5c' }}>→ Requires</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOGIN PAGE
───────────────────────────────────────────── */
function LoginPage({ onLogin }) {
  const [role, setRole] = useState('student');
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ripples, setRipples] = useState([]);
  const boxRef = useRef(null);

  const colors = { student: '#38b6ff', teacher: '#a78bfa', admin: '#fbbf24' };
  const hints  = { student: 'ID: 1–4  ·  Pass: student123', teacher: 'ID: 1–3  ·  Pass: teacher123', admin: 'ID: 0  ·  Pass: admin123' };
  const icons  = { student: '🎓', teacher: '👨‍🏫', admin: '⚙️' };

  const addRipple = e => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700);
  };

  const doLogin = async () => {
    setMsg(null);
    if (!id || !pass) { setMsg({ type: 'err', text: 'Fill all fields.' }); SFX.error(); return; }
    setLoading(true);
    try {
      const res = await post('/login', { role, id: Number(id), password: pass });
      SFX.login();
      showToast(`Welcome, ${res.user.name}!`, 'ok');
      onLogin(res);
    } catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 40%,rgba(56,182,255,.06) 0%,transparent 55%), radial-gradient(ellipse at 70% 75%,rgba(167,139,250,.04) 0%,transparent 50%),#04080f',
    }}>
      <div ref={boxRef} onClick={addRipple} style={{
        width: 420, background: 'linear-gradient(145deg,#060f1e,#04080f)',
        border: '1px solid rgba(56,182,255,.14)', borderRadius: 20,
        padding: 38, position: 'relative', overflow: 'hidden',
        animation: 'fadeUp .5s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* Corner lines */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position: 'absolute',
            top: i < 2 ? 8 : 'auto', bottom: i >= 2 ? 8 : 'auto',
            left: i % 2 === 0 ? 8 : 'auto', right: i % 2 === 1 ? 8 : 'auto',
            width: 20, height: 20,
            borderTop: i < 2 ? '1px solid rgba(56,182,255,.35)' : 'none',
            borderBottom: i >= 2 ? '1px solid rgba(56,182,255,.35)' : 'none',
            borderLeft: i % 2 === 0 ? '1px solid rgba(56,182,255,.35)' : 'none',
            borderRight: i % 2 === 1 ? '1px solid rgba(56,182,255,.35)' : 'none',
          }} />
        ))}
        {/* Top gradient line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(56,182,255,.4),transparent)' }} />

        {/* Ripples */}
        {ripples.map(rp => (
          <div key={rp.id} style={{
            position: 'absolute', left: rp.x, top: rp.y, width: 6, height: 6,
            borderRadius: '50%', background: 'rgba(56,182,255,.3)', transform: 'translate(-50%,-50%)',
            animation: 'ringExpand .7s ease forwards', pointerEvents: 'none',
          }} />
        ))}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 28,
            background: 'linear-gradient(135deg,#7ad4ff,#38b6ff,#a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: 4, marginBottom: 4,
          }}>ENROLLIX</div>
          <div style={{ fontSize: 10.5, color: '#0f2540', letterSpacing: '.08em', fontFamily: "'Orbitron', sans-serif" }}>SECURE LOGIN</div>
        </div>

        {/* Role selector */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 22, background: 'rgba(255,255,255,.02)', borderRadius: 10, padding: 3 }}>
          {['student', 'teacher', 'admin'].map(r => (
            <button key={r} onClick={() => { setRole(r); SFX.click(); }} style={{
              flex: 1, padding: '7px 0', border: role === r ? `1px solid ${colors[r]}38` : '1px solid transparent',
              borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .18s',
              background: role === r ? `${colors[r]}14` : 'transparent',
              color: role === r ? colors[r] : '#1a3a5c', fontFamily: "'Exo 2', sans-serif", textTransform: 'capitalize',
            }}>{icons[r]} {r}</button>
          ))}
        </div>

        <Msg msg={msg} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">{role === 'student' ? 'Student ID' : role === 'teacher' ? 'Instructor ID' : 'Admin ID'}</label>
            <input className="form-input" type="number" placeholder="Enter ID" value={id}
              onChange={e => setId(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Enter password" value={pass}
              onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#0a1a2e', marginBottom: 16, padding: '6px 10px', background: 'rgba(56,182,255,.03)', borderRadius: 7, fontFamily: "'Orbitron', sans-serif", letterSpacing: '.04em' }}>
          ▸ {hints[role]}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 10, fontSize: 12.5, letterSpacing: 2, fontFamily: "'Orbitron', sans-serif" }}
          onClick={() => { SFX.click(); doLogin(); }} disabled={loading}>
          {loading ? <><span className="spinner" />&nbsp;AUTHENTICATING…</> : 'ACCESS SYSTEM →'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHARED PAGE COMPONENTS (reusable across roles)
───────────────────────────────────────────── */

// ─ Browse Courses
function BrowseCoursesPage({ courses }) {
  const [kw, setKw] = useState('');
  const filtered = courses.filter(c =>
    c.course_title?.toLowerCase().includes(kw.toLowerCase()) ||
    c.course_code?.toLowerCase().includes(kw.toLowerCase())
  );
  return (
    <div className="page-enter">
      <InfoBox>All courses with live seat counts. Search by name or code.</InfoBox>
      <input className="form-input" style={{ maxWidth: 280, marginBottom: 14 }} placeholder="🔍 Search courses…" value={kw} onChange={e => setKw(e.target.value)} />
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Code</th><th>Title</th><th>Cr</th><th>Dept</th><th>Instructor</th><th>Seats</th><th>Fill %</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.section_id}>
                <td style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, color: '#38b6ff', fontSize: 11 }}>{c.course_code}</td>
                <td style={{ fontWeight: 500, color: '#d4e8ff' }}>{c.course_title}</td>
                <td><span className="pill pill-purple">{c.credit_hours}</span></td>
                <td style={{ color: '#1a3a5c' }}>{c.department}</td>
                <td style={{ color: '#3a6a94' }}>{c.instructor}</td>
                <td><SeatsBar avail={c.available_seats} total={c.total_seats} /></td>
                <td style={{ color: '#3a6a94', fontSize: 11 }}>{c.fill_percentage}%</td>
                <td><Pill s={c.available_seats === 0 ? 'Full' : 'Open'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─ Prereq Tree Page
function PrereqTreePage({ user }) {
  const [tree, setTree] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  useEffect(() => {
    get('/prereq-tree').then(setTree).catch(() => {});
    if (user?.student_id) get('/completed-courses/' + user.student_id).then(cc => setCompletedIds(cc.map(c => c.course_id))).catch(() => {});
  }, []);
  return (
    <div className="page-enter">
      <InfoBox>Visual map of all course prerequisites. Arrows show what each course requires.</InfoBox>
      <div className="card">
        <div className="card-title">Course Prerequisite Map</div>
        {tree ? <PrereqTree nodes={tree.nodes} edges={tree.edges} completedIds={completedIds} />
          : <div className="empty"><span className="dot" /><span className="dot" /><span className="dot" /></div>}
      </div>
    </div>
  );
}

// ─ Enroll Page
function EnrollPage({ user, courses, onAction }) {
  const [secId, setSecId] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const avail = courses.filter(c => c.available_seats > 0);
  const doEnroll = async () => {
    setMsg(null);
    if (!secId) { setMsg({ type: 'warn', text: 'Select a section.' }); return; }
    if (!user.fees_paid) { setMsg({ type: 'err', text: 'Fees not paid. Go to Fees page first.' }); SFX.error(); return; }
    setLoading(true);
    try { const res = await post('/enroll', { student_id: user.student_id, section_id: Number(secId) }); setMsg({ type: 'ok', text: res.message }); setSecId(''); SFX.success(); showToast('Enrolled successfully!', 'ok'); onAction(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
    setLoading(false);
  };
  return (
    <div className="page-enter">
      <InfoBox>Checks: fees paid · no duplicate · seat available · prerequisites met · credit limit · not already passed.</InfoBox>
      {!user.fees_paid && <div className="msg msg-err"><span>✕</span><span>Fees unpaid — enrollment blocked. Pay fees to unlock.</span></div>}
      <Msg msg={msg} />
      <div className="card">
        <div className="card-title">New Enrollment</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Available Section ({avail.length})</label>
            <Sel value={secId} onChange={setSecId} options={avail.map(c => ({ value: String(c.section_id), label: c.course_code + ' · ' + c.course_title + ' (' + c.available_seats + ' seats)' }))} placeholder="Select section…" disabled={!user.fees_paid} />
          </div>
          <button className="btn btn-primary" onClick={() => { SFX.click(); doEnroll(); }} disabled={loading || !user.fees_paid}>
            {loading ? <><span className="spinner" />Enrolling…</> : '+ Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─ Drop Page
function DropPage({ user, enrollments, onAction }) {
  const [secId, setSecId] = useState('');
  const [msg, setMsg] = useState(null);
  const [history, setHistory] = useState([]);
  const active = enrollments.filter(e => e.student_id === user.student_id && e.status === 'Registered');
  const doDrop = async () => {
    setMsg(null);
    if (!secId) { setMsg({ type: 'warn', text: 'Select a section.' }); return; }
    try {
      const res = await post('/drop', { student_id: user.student_id, section_id: Number(secId) });
      const course = active.find(e => String(e.section_id) === secId)?.course_title || 'Section ' + secId;
      setHistory(h => [{ course, result: res.message }, ...h]);
      setMsg({ type: 'ok', text: res.message }); setSecId(''); SFX.notify(); onAction();
    } catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
  };
  return (
    <div className="page-enter">
      <InfoBox>Dropping frees the seat. The first waitlisted student is auto-promoted by trigger trg_AutoPromoteWaitingStudent.</InfoBox>
      <Msg msg={msg} />
      <div className="card">
        <div className="card-title">Drop a Course</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Enrolled Section</label>
            <Sel value={secId} onChange={setSecId} options={active.map(e => ({ value: String(e.section_id), label: e.course_title || 'Section ' + e.section_id }))} placeholder="Select section…" />
          </div>
          <button className="btn btn-danger" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => { SFX.click(); doDrop(); }}>Drop Course</button>
        </div>
      </div>
      {history.length > 0 && <div className="card"><div className="card-title">History</div>
        <table className="tbl"><thead><tr><th>Course</th><th>Result</th></tr></thead>
        <tbody>{history.map((h, i) => <tr key={i}><td>{h.course}</td><td style={{ fontSize: 11.5, color: '#3a6a8a' }}>{h.result}</td></tr>)}</tbody></table>
      </div>}
    </div>
  );
}

// ─ Waitlist Page
function WaitlistPage({ user, courses, waitingList, onAction }) {
  const [secId, setSecId] = useState('');
  const [msg, setMsg] = useState(null);
  const full = courses.filter(c => c.available_seats === 0);
  const mine = waitingList.filter(w => w.student_id === user.student_id);
  const doAdd = async () => {
    setMsg(null);
    if (!secId) { setMsg({ type: 'warn', text: 'Select a section.' }); return; }
    try { const res = await post('/waiting-list', { student_id: user.student_id, section_id: Number(secId) }); setMsg({ type: 'ok', text: res.message }); setSecId(''); SFX.success(); onAction(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
  };
  const doRem = async id => { try { await del('/waiting-list/' + id); SFX.notify(); onAction(); } catch (e) { alert(e.message); } };
  return (
    <div className="page-enter">
      <InfoBox>Join waitlists for full sections. When a seat opens, position #1 is auto-enrolled via trigger.</InfoBox>
      <Msg msg={msg} />
      <div className="card">
        <div className="card-title">Join Waiting List</div>
        {full.length === 0 && <div className="msg msg-info"><span>ℹ</span><span>All sections currently have available seats.</span></div>}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Full Section</label>
            <Sel value={secId} onChange={setSecId} options={full.map(c => ({ value: String(c.section_id), label: c.course_code + ' · ' + c.course_title + ' (Full)' }))} placeholder="Select section…" />
          </div>
          <button className="btn btn-primary" onClick={() => { SFX.click(); doAdd(); }}>+ Join</button>
        </div>
      </div>
      <div className="card">
        <div className="card-title">My Positions ({mine.length})</div>
        {mine.length === 0 ? <div className="empty"><span className="empty-icon">⏳</span>Not on any waitlist.</div>
          : <table className="tbl"><thead><tr><th>Pos</th><th>Course</th><th>Date</th><th></th></tr></thead>
            <tbody>{mine.map(w => {
              const sec = courses.find(c => c.section_id === w.section_id);
              return <tr key={w.waiting_id}>
                <td><span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 16, color: '#38b6ff' }}>#{w.position}</span></td>
                <td style={{ fontWeight: 500, color: '#d4e8ff' }}>{sec?.course_title || 'Section ' + w.section_id}</td>
                <td style={{ color: '#1a3a5c', fontSize: 11 }}>{String(w.request_date).slice(0, 10)}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => { SFX.click(); doRem(w.waiting_id); }}>Leave</button></td>
              </tr>;
            })}</tbody></table>}
      </div>
    </div>
  );
}

// ─ Swap Page (Student)
function SwapPage({ user, courses, onAction }) {
  const [s2, setS2] = useState(''); const [cid, setCid] = useState(''); const [msg, setMsg] = useState(null); const [swaps, setSwaps] = useState([]);
  const uniq = [...new Map(courses.map(c => [c.course_id, c])).values()];
  useEffect(() => { get('/swap-requests').then(setSwaps).catch(() => {}); }, []);
  const doSwap = async () => {
    setMsg(null);
    if (!s2 || !cid) { setMsg({ type: 'warn', text: 'Fill all fields.' }); return; }
    try { const res = await post('/swap', { student1_id: user.student_id, student2_id: Number(s2), course_id: Number(cid) }); setMsg({ type: 'ok', text: res.message }); setS2(''); setCid(''); SFX.success(); get('/swap-requests').then(setSwaps).catch(() => {}); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
  };
  const mine = swaps.filter(sw => sw.student1 === user.name || sw.student2 === user.name);
  return (
    <div className="page-enter">
      <InfoBox>Request a section swap with another student for the same course. sp_ApproveSwap performs the atomic swap.</InfoBox>
      <Msg msg={msg} />
      <div className="card"><div className="card-title">Request Swap</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Other Student ID</label><input className="form-input" type="number" placeholder="Their student ID" value={s2} onChange={e => setS2(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Course</label><Sel value={cid} onChange={setCid} options={uniq.map(c => ({ value: String(c.course_id), label: c.course_title }))} placeholder="Select course…" /></div>
          <button className="btn btn-primary" onClick={() => { SFX.click(); doSwap(); }}>Request</button>
        </div>
      </div>
      <div className="card"><div className="card-title">My Swaps</div>
        {mine.length === 0 ? <div className="empty"><span className="empty-icon">🔄</span>No swap requests.</div>
          : <table className="tbl"><thead><tr><th>With</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>{mine.map(sw => <tr key={sw.swap_id}><td>{sw.student1 === user.name ? sw.student2 : sw.student1}</td><td>{sw.course_title}</td><td style={{ color: '#1a3a5c', fontSize: 11 }}>{String(sw.request_date).slice(0, 10)}</td><td><Pill s={sw.status} /></td></tr>)}</tbody></table>}
      </div>
    </div>
  );
}

// ─ Rate Teacher
function RateTeacherPage({ user, courses }) {
  const [iid, setIid] = useState(''); const [rating, setRating] = useState(0); const [comment, setComment] = useState(''); const [msg, setMsg] = useState(null);
  const [allR, setAllR] = useState([]); const [myRated, setMyRated] = useState([]);
  useEffect(() => { get('/teacher-ratings').then(setAllR).catch(() => {}); get('/my-rated-instructors/' + user.student_id).then(setMyRated).catch(() => {}); }, []);
  const myIns = [...new Map(courses.filter(c => c.instructor_id).map(c => [c.instructor_id, c])).values()];
  const doRate = async () => {
    setMsg(null);
    if (!iid) { setMsg({ type: 'warn', text: 'Select instructor.' }); return; }
    if (rating === 0) { setMsg({ type: 'warn', text: 'Give a star rating.' }); return; }
    try { const res = await post('/rate-teacher', { student_id: user.student_id, instructor_id: Number(iid), rating, comment }); setMsg({ type: 'ok', text: res.message }); setRating(0); setComment(''); setIid(''); SFX.success(); get('/teacher-ratings').then(setAllR).catch(() => {}); get('/my-rated-instructors/' + user.student_id).then(setMyRated).catch(() => {}); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
  };
  return (
    <div className="page-enter">
      <InfoBox>Rate instructors whose courses you are currently or previously enrolled in (via sp_RateTeacher).</InfoBox>
      <Msg msg={msg} />
      <div className="card"><div className="card-title">Submit Rating</div>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div className="form-group"><label className="form-label">Instructor</label>
            <Sel value={iid} onChange={setIid} options={myIns.map(c => ({ value: String(c.instructor_id), label: c.instructor + (myRated.includes(c.instructor_id) ? ' ✓ rated' : '') }))} placeholder="Select…" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}><div className="form-label" style={{ marginBottom: 6 }}>Rating</div><Stars value={rating} onChange={setRating} /></div>
        <div className="form-group" style={{ marginBottom: 14 }}><label className="form-label">Comment</label><textarea className="form-textarea" placeholder="Share your feedback…" value={comment} onChange={e => setComment(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={() => { SFX.click(); doRate(); }}>Submit Rating</button>
      </div>
      <div className="card"><div className="card-title">All Instructor Ratings</div>
        <table className="tbl"><thead><tr><th>Instructor</th><th>Dept</th><th>Rating</th><th>Reviews</th><th>5★</th><th>4★</th><th>≤3★</th></tr></thead>
        <tbody>{allR.map(r => <tr key={r.instructor_id}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{r.name}</td><td><span className="pill pill-blue">{r.department}</span></td><td><Stars value={Math.round(r.avg_rating)} readonly size="sm" />&nbsp;<span style={{ fontSize: 10, color: '#1a3a5c' }}>{Number(r.avg_rating).toFixed(1)}</span></td><td style={{ textAlign: 'center' }}>{r.total_ratings}</td><td style={{ color: '#4ade80', textAlign: 'center' }}>{r.five_star}</td><td style={{ color: '#38b6ff', textAlign: 'center' }}>{r.four_star}</td><td style={{ color: '#f87171', textAlign: 'center' }}>{r.three_star + r.low_rated}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─ Fees Page
function FeesPage({ user, onUserRefresh }) {
  const [msg, setMsg] = useState(null); const [payments, setPayments] = useState([]); const [loading, setLoading] = useState(false);
  useEffect(() => { get('/fee-payments/' + user.student_id).then(setPayments).catch(() => {}); }, []);
  const doPay = async () => {
    setLoading(true); setMsg(null);
    try { const res = await post('/pay-fees', { student_id: user.student_id, amount: 25000, semester: 'Fall', year: 2025 }); setMsg({ type: 'ok', text: res.message }); SFX.success(); showToast('Fees paid! Enrollment unlocked.', 'ok'); get('/fee-payments/' + user.student_id).then(setPayments).catch(() => {}); onUserRefresh(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
    setLoading(false);
  };
  return (
    <div className="page-enter">
      <Msg msg={msg} />
      <div className={user.fees_paid ? 'fee-paid' : 'fee-unpaid'} style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 26 }}>{user.fees_paid ? '✅' : '❌'}</span>
        <div><div style={{ fontWeight: 600, fontSize: 13.5, color: user.fees_paid ? '#4ade80' : '#f87171' }}>{user.fees_paid ? 'Fees Paid — Enrollment Unlocked' : 'Fees Unpaid — Enrollment Blocked'}</div>
          <div style={{ fontSize: 12, color: '#3a6a8a', marginTop: 2 }}>{user.fees_paid ? 'You can register for courses.' : 'Pay to enable course registration.'}</div></div>
        {!user.fees_paid && <button className="btn btn-success" style={{ marginLeft: 'auto' }} onClick={() => { SFX.click(); doPay(); }} disabled={loading}>{loading ? <><span className="spinner" />Processing…</> : 'Pay Rs. 25,000'}</button>}
      </div>
      <div className="card"><div className="card-title">Payment History</div>
        {payments.length === 0 ? <div className="empty"><span className="empty-icon">💰</span>No records.</div>
          : <table className="tbl"><thead><tr><th>#</th><th>Amount</th><th>Semester</th><th>Date</th></tr></thead>
            <tbody>{payments.map(p => <tr key={p.payment_id}><td>#{p.payment_id}</td><td style={{ color: '#4ade80', fontWeight: 600 }}>Rs. {Number(p.amount).toLocaleString()}</td><td><span className="pill pill-blue">{p.semester} {p.year}</span></td><td style={{ color: '#1a3a5c', fontSize: 11.5 }}>{String(p.payment_date).slice(0, 10)}</td></tr>)}</tbody>
          </table>}
      </div>
    </div>
  );
}

// ─ Announcements Page
function AnnouncementsPage({ announcements }) {
  return (
    <div className="page-enter">
      <InfoBox>Announcements from instructors across all your enrolled sections.</InfoBox>
      {announcements.length === 0 ? <div className="empty"><span className="empty-icon">📢</span>None yet.</div>
        : announcements.map(a => (
          <div key={a.announcement_id} className="announcement">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
              <div className="ann-title">{a.title}</div>
              <span style={{ fontSize: 10, color: '#0f2540' }}>{String(a.posted_date).slice(0, 10)}</span>
            </div>
            <div className="ann-meta"><Avatar name={a.instructor} color="#a78bfa" /><span style={{ color: '#a78bfa', fontWeight: 600 }}>{a.instructor}</span>·<span className="pill pill-teal">{a.course_title}</span></div>
            <div className="ann-body">{a.body}</div>
          </div>
        ))}
    </div>
  );
}

// ─ Completed Courses
function CompletedCoursesPage({ user }) {
  const [courses, setCourses] = useState([]); const [cgpa, setCgpa] = useState(null);
  useEffect(() => { get('/completed-courses/' + user.student_id).then(setCourses).catch(() => {}); get('/cgpa/' + user.student_id).then(setCgpa).catch(() => {}); }, []);
  const gc = g => g === 'A' || g === 'A-' ? 'green' : g.startsWith('B') ? 'blue' : g.startsWith('C') ? 'amber' : 'red';
  return (
    <div className="page-enter">
      {cgpa && <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 18px', background: 'linear-gradient(135deg,rgba(56,182,255,.05),rgba(167,139,250,.03))', border: '1px solid rgba(56,182,255,.1)', borderRadius: 13, marginBottom: 14 }}>
        <CGPAGauge cgpa={cgpa.gpa || 0} />
        <div><div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14, color: '#e2f0ff', marginBottom: 4 }}>Academic Standing</div>
          <div style={{ fontSize: 12, color: '#3a6a8a' }}>{cgpa.courses_completed} courses · {cgpa.total_credits_earned} credit hours earned</div>
          <div style={{ marginTop: 6 }}><span className={`pill pill-${(cgpa.gpa || 0) >= 3.5 ? 'green' : (cgpa.gpa || 0) >= 2.5 ? 'blue' : 'amber'}`}>{(cgpa.gpa || 0) >= 3.5 ? 'Distinction' : (cgpa.gpa || 0) >= 3.0 ? 'Merit' : (cgpa.gpa || 0) >= 2.0 ? 'Pass' : 'Warning'}</span></div>
        </div>
      </div>}
      <div className="card"><div className="card-title">Completed Courses</div>
        {courses.length === 0 ? <div className="empty"><span className="empty-icon">🎓</span>No completed courses yet.</div>
          : <table className="tbl"><thead><tr><th>Code</th><th>Title</th><th>Dept</th><th>Credits</th><th>Grade</th><th>GPA Pts</th><th>Semester</th></tr></thead>
            <tbody>{courses.map((c, i) => <tr key={i}><td style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, color: '#38b6ff', fontSize: 11 }}>{c.course_code}</td><td>{c.course_title}</td><td><span className="pill pill-blue">{c.department}</span></td><td style={{ textAlign: 'center' }}><span className="pill pill-purple">{c.credit_hours}</span></td><td><span className={`pill pill-${gc(c.grade)}`}>{c.grade}</span></td><td style={{ textAlign: 'center', color: '#38b6ff', fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 11 }}>{c.grade_points}</td><td style={{ color: '#1a3a5c', fontSize: 11.5 }}>{c.semester_completed} {c.year_completed}</td></tr>)}</tbody>
          </table>}
      </div>
    </div>
  );
}

// ─ Transcript
function TranscriptPage({ user }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { get('/transcript/' + user.student_id).then(setData).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="empty"><span className="dot" /><span className="dot" /><span className="dot" /></div>;
  if (!data) return <div className="empty">No data.</div>;
  const { student, completed_courses, current_enrollments } = data;
  const gc = g => g === 'A' || g === 'A-' ? '#4ade80' : g.startsWith('B') ? '#38b6ff' : g.startsWith('C') ? '#fbbf24' : '#f87171';
  return (
    <div className="page-enter">
      <div style={{ background: 'linear-gradient(135deg,rgba(56,182,255,.07),rgba(167,139,250,.04))', border: '1px solid rgba(56,182,255,.12)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: '#1a3a5c', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Official Academic Transcript</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 18, color: '#e2f0ff' }}>{student?.name}</div>
            <div style={{ fontSize: 12, color: '#3a6a8a', marginTop: 4 }}><span className="pill pill-blue" style={{ marginRight: 8 }}>{student?.department}</span>Semester {student?.semester} · {student?.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {student && <CGPAGauge cgpa={student.gpa || 0} />}
            <div style={{ fontSize: 10, color: '#1a3a5c', marginTop: 4 }}>{student?.courses_completed || 0} courses · {student?.total_credits_earned || 0} credits</div>
          </div>
        </div>
      </div>
      {completed_courses?.length > 0 && <div className="card"><div className="card-title">Completed Courses</div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 55px 55px 55px', gap: 8, padding: '0 0 8px', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          {['Code', 'Title', 'Credits', 'Grade', 'GPA'].map(h => <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Orbitron',sans-serif" }}>{h}</span>)}
        </div>
        {completed_courses.map((c, i) => <div key={i} className="transcript-row">
          <span style={{ color: '#38b6ff', fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 11 }}>{c.course_code}</span>
          <span style={{ color: '#c4d8f0' }}>{c.course_title}</span>
          <span style={{ textAlign: 'center', color: '#3a6a8a' }}>{c.credit_hours}</span>
          <span style={{ textAlign: 'center', fontWeight: 700, color: gc(c.grade), fontFamily: "'Orbitron',sans-serif" }}>{c.grade}</span>
          <span style={{ textAlign: 'center', color: '#38b6ff' }}>{c.grade_points}</span>
        </div>)}
      </div>}
      {current_enrollments?.length > 0 && <div className="card"><div className="card-title">Current — Fall 2025</div>
        <table className="tbl"><thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Instructor</th><th>Status</th></tr></thead>
        <tbody>{current_enrollments.map((c, i) => <tr key={i}><td style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, color: '#38b6ff', fontSize: 11 }}>{c.course_code}</td><td>{c.course_title}</td><td><span className="pill pill-purple">{c.credit_hours} cr</span></td><td style={{ color: '#3a6a8a' }}>{c.instructor}</td><td><Pill s="Registered" /></td></tr>)}</tbody>
        </table>
      </div>}
    </div>
  );
}

// ─ Attendance (Student view)
function AttendanceStudentPage({ user }) {
  const [data, setData] = useState([]);
  useEffect(() => { get('/attendance/student/' + user.student_id).then(setData).catch(() => {}); }, []);
  return (
    <div className="page-enter">
      <InfoBox>Attendance below 80% blocks exam eligibility and grade posting (enforced in sp_PostGrade).</InfoBox>
      {data.length === 0 ? <div className="empty"><span className="empty-icon">📅</span>No attendance records yet.</div>
        : data.map(a => (
          <div key={a.section_id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div><div style={{ fontWeight: 600, fontSize: 13.5, color: '#e2f0ff', marginBottom: 2 }}>{a.course_title}</div>
                <div style={{ fontSize: 11.5, color: '#3a6a8a' }}>{a.instructor}</div></div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 900, color: a.attendance_pct >= 80 ? '#4ade80' : a.attendance_pct >= 60 ? '#fbbf24' : '#f87171' }}>{a.attendance_pct}%</div>
                <div style={{ fontSize: 10, color: '#1a3a5c', marginTop: 2 }}>{a.present + a.late}/{a.total_classes} attended</div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="pill pill-green">Present: {a.present}</span>
              <span className="pill pill-amber">Late: {a.late}</span>
              <span className="pill pill-red">Absent: {a.absent}</span>
              <span style={{ marginLeft: 'auto' }}>{a.exam_eligible ? <span className="pill pill-green">✓ Exam Eligible</span> : <span className="pill pill-red">✕ Below 80% — Cannot Sit Exam</span>}</span>
            </div>
            <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, width: a.attendance_pct + '%', background: a.attendance_pct >= 80 ? '#4ade80' : a.attendance_pct >= 60 ? '#fbbf24' : '#f87171', transition: 'width .6s ease', boxShadow: `0 0 6px ${a.attendance_pct >= 80 ? '#4ade80' : '#f87171'}` }} />
            </div>
          </div>
        ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STUDENT DASHBOARD
───────────────────────────────────────────── */
function StudentDashboard({ user, courses, enrollments, waitingList, announcements, cgpa }) {
  const active = enrollments.filter(e => e.status === 'Registered');
  const creditUsed = active.reduce((s, e) => s + (e.credit_hours || 0), 0);
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 16, padding: '14px 18px', background: 'linear-gradient(135deg,rgba(56,182,255,.06),rgba(167,139,250,.03))', border: '1px solid rgba(56,182,255,.1)', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
        <Avatar name={user.name} color="#38b6ff" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14, color: '#e2f0ff' }}>Welcome, {user.name.split(' ')[0]}! 👋</div>
          <div style={{ fontSize: 11.5, color: '#3a6a8a', marginTop: 2 }}>{user.department} · Semester {user.semester}</div>
        </div>
        {cgpa && <CGPAGauge cgpa={cgpa.gpa || 0} />}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: user.fees_paid ? '#4ade80' : '#f87171', fontWeight: 600 }}>{user.fees_paid ? '✓ Fees Paid' : '✕ Fees Unpaid'}</div>
        </div>
      </div>
      <div className="stat-grid">
        {[
          { icon: '📚', num: active.length, label: 'Enrolled', color: '#38b6ff' },
          { icon: '⏳', num: waitingList.length, label: 'Waitlisted', color: '#fbbf24' },
          { icon: '🎯', num: `${creditUsed}/${user.max_credit_limit}`, label: 'Credits', color: '#a78bfa' },
          { icon: '🎓', num: cgpa?.courses_completed || 0, label: 'Completed', color: '#4ade80' },
        ].map(s => <div key={s.label} className="stat-card"><span className="stat-icon">{s.icon}</span><div className="stat-num" style={{ color: s.color }}>{s.num}</div><div className="stat-label">{s.label}</div></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card"><div className="card-title">Active Enrollments</div>
          {active.length === 0 ? <div className="empty"><span className="empty-icon">📋</span>None yet.</div>
            : <table className="tbl"><thead><tr><th>Course</th><th>Instructor</th><th>Cr</th></tr></thead>
              <tbody>{active.map((e, i) => <tr key={i}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{e.course_title || '—'}</td><td style={{ color: '#3a6a8a', fontSize: 11 }}>{e.instructor || '—'}</td><td><span className="pill pill-purple">{e.credit_hours || 3}</span></td></tr>)}</tbody></table>}
        </div>
        <div className="card"><div className="card-title">Latest Announcements</div>
          {announcements.slice(0, 2).length === 0 ? <div className="empty"><span className="empty-icon">📢</span>None.</div>
            : announcements.slice(0, 2).map(a => <div key={a.announcement_id} className="announcement"><div className="ann-title">{a.title}</div><div className="ann-meta"><span>{a.instructor}</span>·<span className="pill pill-teal" style={{ fontSize: 9 }}>{a.course_title}</span></div><div className="ann-body">{a.body.slice(0, 90)}{a.body.length > 90 ? '…' : ''}</div></div>)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEACHER PAGES
───────────────────────────────────────────── */
function TeacherDashboard({ user, sections, announcements, ratings }) {
  const myAnn = announcements.filter(a => a.instructor === user.name);
  const myRating = ratings.find(r => r.instructor_id === user.instructor_id);
  const totalStudents = sections.reduce((s, sec) => s + (sec.total_seats - sec.available_seats), 0);
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 16, padding: '14px 18px', background: 'linear-gradient(135deg,rgba(167,139,250,.06),rgba(56,182,255,.03))', border: '1px solid rgba(167,139,250,.1)', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
        <Avatar name={user.name} color="#a78bfa" />
        <div><div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14, color: '#e2f0ff' }}>Welcome, {user.name}! 👨‍🏫</div><div style={{ fontSize: 11.5, color: '#3a6a8a', marginTop: 2 }}>{user.department} Department</div></div>
        {myRating && <div style={{ marginLeft: 'auto', textAlign: 'right' }}><Stars value={Math.round(myRating.avg_rating)} readonly size="sm" /><div style={{ fontSize: 10, color: '#1a3a5c', marginTop: 2 }}>{Number(myRating.avg_rating).toFixed(1)} avg · {myRating.total_ratings} reviews</div></div>}
      </div>
      <div className="stat-grid">
        {[{ icon: '📖', num: sections.length, label: 'Sections', color: '#a78bfa' }, { icon: '👥', num: totalStudents, label: 'Students', color: '#38b6ff' }, { icon: '💺', num: sections.reduce((s, sec) => s + sec.available_seats, 0), label: 'Open Seats', color: '#4ade80' }, { icon: '📢', num: myAnn.length, label: 'Announcements', color: '#fbbf24' }].map(s => <div key={s.label} className="stat-card"><span className="stat-icon">{s.icon}</span><div className="stat-num" style={{ color: s.color }}>{s.num}</div><div className="stat-label">{s.label}</div></div>)}
      </div>
      <div className="card"><div className="card-title">My Sections</div>
        <table className="tbl"><thead><tr><th>Course</th><th>Semester</th><th>Enrolled</th><th>Seats</th></tr></thead>
        <tbody>{sections.map(s => <tr key={s.section_id}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{s.course_title}</td><td><span className="pill pill-blue">{s.semester} {s.year}</span></td><td style={{ textAlign: 'center' }}>{s.total_seats - s.available_seats}</td><td><SeatsBar avail={s.available_seats} total={s.total_seats} /></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
function TeacherRoster({ user, sections }) {
  const [selSec, setSelSec] = useState(''); const [roster, setRoster] = useState([]);
  useEffect(() => { if (!selSec) return; get('/section-roster/' + selSec).then(setRoster).catch(() => {}); }, [selSec]);
  return (
    <div className="page-enter">
      <InfoBox>View enrolled students for each of your sections (vw_SectionRoster).</InfoBox>
      <div className="form-group" style={{ maxWidth: 320, marginBottom: 14 }}><label className="form-label">Section</label>
        <Sel value={selSec} onChange={v => { setSelSec(v); SFX.click(); }} options={sections.map(s => ({ value: String(s.section_id), label: s.course_code + ' — ' + s.course_title }))} placeholder="Pick section…" />
      </div>
      {selSec && <div className="card"><div className="card-title">Roster</div>
        {roster.length === 0 ? <div className="empty"><span className="empty-icon">👥</span>No students.</div>
          : <table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Email</th><th>Enrolled</th></tr></thead>
            <tbody>{roster.map((r, i) => <tr key={i}><td style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: '#d4e8ff' }}><Avatar name={r.student_name} color="#38b6ff" />{r.student_name}</td><td><span className="pill pill-blue">{r.department}</span></td><td style={{ color: '#1a3a5c', fontSize: 11 }}>{r.email}</td><td style={{ color: '#1a3a5c', fontSize: 11 }}>{String(r.enrollment_date || '').slice(0, 10)}</td></tr>)}</tbody>
          </table>}
      </div>}
    </div>
  );
}
function MarkAttendancePage({ user, sections }) {
  const [selSec, setSelSec] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState([]); const [attendance, setAttendance] = useState({}); const [msg, setMsg] = useState(null);
  useEffect(() => { if (!selSec) return; get('/section-roster/' + selSec).then(r => { setRoster(r); const a = {}; r.forEach(s => { a[s.student_id] = 'Present'; }); setAttendance(a); }).catch(() => {}); }, [selSec]);
  const toggle = sid => { const cycle = { Present: 'Absent', Absent: 'Late', Late: 'Present' }; SFX.click(); setAttendance(a => ({ ...a, [sid]: cycle[a[sid]] || 'Present' })); };
  const doMark = async () => {
    setMsg(null);
    if (!selSec || !date || roster.length === 0) { setMsg({ type: 'warn', text: 'Select section and date.' }); return; }
    const records = roster.map(s => ({ student_id: s.student_id, status: attendance[s.student_id] || 'Present' }));
    try { const res = await post('/attendance', { section_id: Number(selSec), instructor_id: user.instructor_id, class_date: date, records }); setMsg({ type: 'ok', text: res.message }); SFX.success(); showToast('Attendance saved!', 'ok'); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
  };
  const counts = { Present: 0, Absent: 0, Late: 0 };
  Object.values(attendance).forEach(s => { if (counts[s] !== undefined) counts[s]++; });
  return (
    <div className="page-enter">
      <InfoBox>Students below 80% attendance are blocked from exams and grade posting (sp_PostGrade enforces this).</InfoBox>
      <Msg msg={msg} />
      <div className="card"><div className="card-title">Select Class</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Section</label><Sel value={selSec} onChange={v => { setSelSec(v); SFX.click(); }} options={sections.map(s => ({ value: String(s.section_id), label: s.course_code + ' — ' + s.course_title }))} placeholder="Pick section…" /></div>
          <div className="form-group" style={{ maxWidth: 160 }}><label className="form-label">Date</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
      </div>
      {roster.length > 0 && <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Attendance — {date}</div>
          <div style={{ display: 'flex', gap: 8 }}><span className="pill pill-green">P:{counts.Present}</span><span className="pill pill-amber">L:{counts.Late}</span><span className="pill pill-red">A:{counts.Absent}</span></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 8, marginBottom: 16 }}>
          {roster.map(s => <div key={s.student_id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,.03)' }}>
            <Avatar name={s.student_name} color="#38b6ff" />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 500, color: '#d4e8ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.student_name}</div><div style={{ fontSize: 9.5, color: '#1a3a5c' }}>{s.department}</div></div>
            <button className={`att-btn ${attendance[s.student_id] || 'Present'}`} onClick={() => toggle(s.student_id)} title="Click: P→A→L→P">{(attendance[s.student_id] || 'Present').slice(0, 1)}</button>
          </div>)}
        </div>
        <button className="btn btn-primary" onClick={() => { SFX.click(); doMark(); }}>✓ Submit Attendance</button>
      </div>}
    </div>
  );
}
function GradeEntryPage({ user, sections }) {
  const [selSec, setSelSec] = useState(''); const [roster, setRoster] = useState([]); const [attSummary, setAttSummary] = useState([]);
  const [grades, setGrades] = useState({}); const [msg, setMsg] = useState(null); const [submitting, setSubmitting] = useState({});
  useEffect(() => { if (!selSec) return; get('/section-roster/' + selSec).then(setRoster).catch(() => {}); get('/attendance/section/' + selSec).then(setAttSummary).catch(() => {}); }, [selSec]);
  const getAtt = sid => attSummary.find(a => a.student_id === sid);
  const doGrade = async sid => {
    const grade = grades[sid];
    if (!grade) { setMsg({ type: 'warn', text: 'Select a grade.' }); return; }
    setSubmitting(s => ({ ...s, [sid]: true }));
    try { const res = await post('/post-grade', { student_id: sid, section_id: Number(selSec), grade, instructor_id: user.instructor_id }); setMsg({ type: 'ok', text: `Grade ${grade} posted.` }); SFX.success(); showToast(`Grade ${grade} posted!`, 'ok'); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
    setSubmitting(s => ({ ...s, [sid]: false }));
  };
  const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
  return (
    <div className="page-enter">
      <InfoBox>sp_PostGrade checks attendance ≥ 80%, validates grade, then moves record to Completed_Courses.</InfoBox>
      <Msg msg={msg} />
      <div className="form-group" style={{ maxWidth: 320, marginBottom: 14 }}><label className="form-label">Section</label>
        <Sel value={selSec} onChange={v => { setSelSec(v); SFX.click(); }} options={sections.map(s => ({ value: String(s.section_id), label: s.course_code + ' — ' + s.course_title }))} placeholder="Select…" />
      </div>
      {roster.length > 0 && <div className="card"><div className="card-title">Grade Entry</div>
        <table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Attendance</th><th>Eligible</th><th>Grade</th><th>Action</th></tr></thead>
          <tbody>{roster.map(s => {
            const att = getAtt(s.student_id);
            const eligible = !att || att.attendance_pct >= 80;
            return <tr key={s.student_id}>
              <td style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500, color: '#d4e8ff' }}><Avatar name={s.student_name} color="#38b6ff" />{s.student_name}</td>
              <td><span className="pill pill-blue">{s.department}</span></td>
              <td>{att ? <span className={`pill pill-${att.attendance_pct >= 80 ? 'green' : att.attendance_pct >= 60 ? 'amber' : 'red'}`}>{att.attendance_pct}%</span> : <span className="pill pill-gray">No data</span>}</td>
              <td>{eligible ? <span className="pill pill-green">✓</span> : <span className="pill pill-red">✕</span>}</td>
              <td><select className="form-select" style={{ width: 76, padding: '4px 8px', fontSize: 11.5 }} disabled={!eligible} value={grades[s.student_id] || ''} onChange={e => setGrades(g => ({ ...g, [s.student_id]: e.target.value }))}><option value="">—</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></td>
              <td><button className="btn btn-approve btn-sm" disabled={!eligible || submitting[s.student_id]} onClick={() => { SFX.click(); doGrade(s.student_id); }}>{submitting[s.student_id] ? <span className="spinner" /> : 'Post'}</button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </div>
  );
}
function PostAnnouncementPage({ user, sections, onAction }) {
  const [secId, setSecId] = useState(''); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [msg, setMsg] = useState(null);
  const doPost = async () => {
    setMsg(null);
    if (!secId || !title || !body) { setMsg({ type: 'warn', text: 'Fill all fields.' }); return; }
    try { const res = await post('/announcements', { instructor_id: user.instructor_id, section_id: Number(secId), title, body }); setMsg({ type: 'ok', text: res.message }); setTitle(''); setBody(''); setSecId(''); SFX.success(); showToast('Announcement posted!', 'ok'); onAction(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
  };
  return (
    <div className="page-enter"><Msg msg={msg} />
      <div className="card"><div className="card-title">Post Announcement</div>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Section</label><Sel value={secId} onChange={setSecId} options={sections.map(s => ({ value: String(s.section_id), label: s.course_code + ' — ' + s.course_title }))} placeholder="Select…" /></div>
        <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Title</label><input className="form-input" placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="form-group" style={{ marginBottom: 14 }}><label className="form-label">Message</label><textarea className="form-textarea" rows={4} placeholder="Write your message…" value={body} onChange={e => setBody(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={() => { SFX.click(); doPost(); }}>📢 Post</button>
      </div>
    </div>
  );
}
function MyRatingsPage({ user }) {
  const [ratings, setRatings] = useState([]); const [summary, setSummary] = useState(null);
  useEffect(() => { get('/teacher-ratings/' + user.instructor_id).then(setRatings).catch(() => {}); get('/teacher-ratings').then(all => { setSummary(all.find(r => r.instructor_id === user.instructor_id) || null); }).catch(() => {}); }, []);
  return (
    <div className="page-enter">
      {summary && <div className="card" style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 42, fontWeight: 900, color: '#fbbf24', lineHeight: 1, textShadow: '0 0 20px rgba(251,191,36,.4)' }}>{Number(summary.avg_rating).toFixed(1)}</div>
          <Stars value={Math.round(summary.avg_rating)} readonly />
          <div style={{ fontSize: 10, color: '#1a3a5c', marginTop: 3 }}>{summary.total_ratings} reviews</div>
        </div>
        <div style={{ flex: 1 }}><div className="card-title" style={{ marginBottom: 8 }}>Breakdown</div>
          {[5, 4, 3, 2, 1].map(star => { const count = star === 5 ? summary.five_star : star === 4 ? summary.four_star : star === 3 ? summary.three_star : summary.low_rated; const pct = summary.total_ratings > 0 ? Math.round((count / summary.total_ratings) * 100) : 0; return <div key={star} className="rating-bar-wrap"><div style={{ fontSize: 10, color: '#1a3a5c', width: 34 }}>{star} ★</div><div className="rating-bar"><div className="rating-fill" style={{ width: pct + '%' }} /></div><div style={{ fontSize: 10, color: '#1a3a5c', width: 26, textAlign: 'right' }}>{count}</div></div>; })}
        </div>
      </div>}
      <div className="card"><div className="card-title">Reviews ({ratings.length})</div>
        {ratings.length === 0 ? <div className="empty"><span className="empty-icon">⭐</span>No reviews yet.</div>
          : ratings.map(r => <div key={r.rating_id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}><Avatar name={r.student_name} color="#38b6ff" /><span style={{ fontWeight: 500, color: '#d4e8ff' }}>{r.student_name}</span><Stars value={r.rating} readonly size="sm" /><span style={{ marginLeft: 'auto', fontSize: 10, color: '#0f2540' }}>{String(r.rating_date).slice(0, 10)}</span></div>
            {r.comment && <div style={{ fontSize: 12, color: '#3a6a8a', paddingLeft: 39, lineHeight: 1.6 }}>"{r.comment}"</div>}
          </div>)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADMIN PAGES
───────────────────────────────────────────── */
function AdminDashboard({ students, courses, instructors, swapRequests }) {
  const pending = swapRequests.filter(s => s.status === 'Pending');
  return (
    <div className="page-enter">
      <div className="stat-grid">
        {[{ icon: '🎓', num: students.length, label: 'Students', color: '#38b6ff' }, { icon: '👨‍🏫', num: instructors.length, label: 'Instructors', color: '#a78bfa' }, { icon: '📚', num: [...new Set(courses.map(c => c.course_id))].length, label: 'Courses', color: '#4ade80' }, { icon: '🔄', num: pending.length, label: 'Pending Swaps', color: '#fbbf24' }].map(s => <div key={s.label} className="stat-card"><span className="stat-icon">{s.icon}</span><div className="stat-num" style={{ color: s.color }}>{s.num}</div><div className="stat-label">{s.label}</div></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card"><div className="card-title">Fee Status</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.1)', borderRadius: 9, padding: 12, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#4ade80', fontFamily: "'Orbitron',sans-serif" }}>{students.filter(s => s.fees_paid).length}</div><div style={{ fontSize: 9.5, color: '#1a3a5c', fontFamily: "'Orbitron',sans-serif", letterSpacing: '.06em' }}>PAID</div></div>
            <div style={{ flex: 1, background: 'rgba(248,113,113,.05)', border: '1px solid rgba(248,113,113,.1)', borderRadius: 9, padding: 12, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#f87171', fontFamily: "'Orbitron',sans-serif" }}>{students.filter(s => !s.fees_paid).length}</div><div style={{ fontSize: 9.5, color: '#1a3a5c', fontFamily: "'Orbitron',sans-serif", letterSpacing: '.06em' }}>UNPAID</div></div>
          </div>
          <table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Status</th></tr></thead>
          <tbody>{students.map(s => <tr key={s.student_id}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{s.name}</td><td><span className="pill pill-blue">{s.department}</span></td><td><Pill s={s.fees_paid ? 'Paid' : 'Unpaid'} /></td></tr>)}</tbody></table>
        </div>
        <div className="card"><div className="card-title">Course Load</div>
          <table className="tbl"><thead><tr><th>Course</th><th>Instructor</th><th>Fill</th></tr></thead>
          <tbody>{courses.slice(0, 6).map(c => <tr key={c.section_id}><td style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, color: '#38b6ff', fontSize: 11 }}>{c.course_code}</td><td style={{ color: '#3a6a8a', fontSize: 11.5 }}>{c.instructor}</td><td><SeatsBar avail={c.available_seats} total={c.total_seats} /></td></tr>)}</tbody></table>
        </div>
      </div>
    </div>
  );
}
function AdminSwaps({ swapRequests, onAction }) {
  const doStatus = async (id, status) => { try { SFX.click(); await patch('/swap/' + id, { status }); SFX.success(); showToast(`Swap ${status}!`, 'ok'); onAction(); } catch (e) { alert(e.message); } };
  return (
    <div className="page-enter">
      <InfoBox>Approve calls sp_ApproveSwap which atomically swaps both students' sections in a transaction.</InfoBox>
      <div className="card"><div className="card-title">Swap Requests ({swapRequests.length})</div>
        {swapRequests.length === 0 ? <div className="empty"><span className="empty-icon">🔄</span>None.</div>
          : <table className="tbl"><thead><tr><th>Student 1</th><th>Student 2</th><th>Course</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{swapRequests.map(sw => <tr key={sw.swap_id}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{sw.student1}</td><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{sw.student2}</td><td style={{ color: '#3a6a8a' }}>{sw.course_title}</td><td style={{ color: '#1a3a5c', fontSize: 11 }}>{String(sw.request_date).slice(0, 10)}</td><td><Pill s={sw.status} /></td><td>{sw.status === 'Pending' && <><button className="btn btn-approve btn-sm" onClick={() => doStatus(sw.swap_id, 'Approved')}>✓ Approve</button><button className="btn btn-danger btn-sm" onClick={() => doStatus(sw.swap_id, 'Rejected')}>✕</button></>}</td></tr>)}</tbody>
          </table>}
      </div>
    </div>
  );
}
function AuditLogPage() {
  const [logs, setLogs] = useState([]); const [filter, setFilter] = useState('');
  useEffect(() => { get('/audit-log').then(setLogs).catch(() => {}); }, []);
  const filtered = filter ? logs.filter(l => l.action_type === filter) : logs;
  const colors = { ENROLL: '#4ade80', DROP: '#f87171', AUTO_PROMOTE: '#fbbf24', WAITLIST: '#38b6ff', SWAP: '#a78bfa', ATTENDANCE: '#2dd4bf', GRADE: '#fb923c' };
  return (
    <div className="page-enter">
      <InfoBox>All changes auto-logged by SQL triggers: trg_AuditEnrollment, trg_AuditDrop, trg_AuditAttendance, trg_AuditGrade, trg_AutoPromoteWaitingStudent.</InfoBox>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['', 'ENROLL', 'DROP', 'AUTO_PROMOTE', 'WAITLIST', 'SWAP', 'ATTENDANCE', 'GRADE'].map(a => (
          <button key={a} className={`btn btn-ghost btn-sm${filter === a ? ' btn-primary' : ''}`}
            style={filter === a ? { background: `${colors[a] || '#38b6ff'}22`, color: colors[a] || '#38b6ff', border: `1px solid ${colors[a] || '#38b6ff'}44` } : {}}
            onClick={() => { setFilter(a); SFX.click(); }}>{a || 'ALL'}</button>
        ))}
      </div>
      <div className="card"><div className="card-title">Audit Trail ({filtered.length} entries)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 110px 60px 1fr 130px', gap: 6, padding: '0 0 8px', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          {['Action', 'Type', 'Student', 'Details', 'Time'].map(h => <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'Orbitron',sans-serif" }}>{h}</span>)}
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {filtered.map(l => <div key={l.log_id} className="audit-row">
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 9, color: colors[l.action_type] || '#38b6ff' }}>{l.action_type}</span>
            <span style={{ fontSize: 10, color: '#1a3a5c' }}>Section {l.section_id || '—'}</span>
            <span style={{ fontSize: 11, color: '#1a3a5c' }}>{l.student_id || '—'}</span>
            <div><div style={{ color: '#7ab8e8', fontSize: 11.5, marginBottom: 1 }}>{l.details}</div>
              {l.old_value && <div style={{ fontSize: 10, color: '#f87171' }}>← {l.old_value}</div>}
              {l.new_value && <div style={{ fontSize: 10, color: '#4ade80' }}>→ {l.new_value}</div>}
            </div>
            <span style={{ fontSize: 10, color: '#0f2540' }}>{String(l.action_time).slice(0, 19).replace('T', ' ')}</span>
          </div>)}
        </div>
      </div>
    </div>
  );
}
function AdminReports({ students, instructors, courses }) {
  const [tab, setTab] = useState('enrollment');
  const [stats, setStats] = useState([]); const [top, setTop] = useState([]); const [enrRpt, setEnrRpt] = useState([]);
  const [activity, setActivity] = useState([]); const [ratings, setRatings] = useState([]); const [cgpaAll, setCgpaAll] = useState([]);
  useEffect(() => {
    get('/course-stats').then(setStats).catch(() => {});
    get('/top-students').then(setTop).catch(() => {});
    get('/student-report').then(setEnrRpt).catch(() => {});
    get('/student-activity').then(setActivity).catch(() => {});
    get('/teacher-ratings').then(setRatings).catch(() => {});
    get('/gpa-all').then(setCgpaAll).catch(() => {});
  }, []);
  const tabs = [['enrollment', 'Enrollments'], ['gpa', 'GPA Ranking'], ['instructors', 'Instructors'], ['stats', 'Fill Rates'], ['top', 'Top Students'], ['activity', 'Activity'], ['ratings', 'Ratings']];
  return (
    <div className="page-enter">
      <div className="tab-row">{tabs.map(([k, l]) => <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => { setTab(k); SFX.nav(); }}>{l}</button>)}</div>
      {tab === 'enrollment' && <div className="card"><div className="card-title">Student Enrollment Report — vw_StudentEnrollmentReport</div><table className="tbl"><thead><tr><th>ID</th><th>Student</th><th>Dept</th><th>Course</th><th>Status</th></tr></thead><tbody>{enrRpt.map((e, i) => <tr key={i}><td style={{ color: '#1a3a5c' }}>{e.student_id}</td><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{e.student_name}</td><td><span className="pill pill-blue">{e.department}</span></td><td style={{ color: '#3a6a8a' }}>{e.course_title || '—'}</td><td><Pill s={e.status || '—'} /></td></tr>)}</tbody></table></div>}
      {tab === 'gpa' && <div className="card"><div className="card-title">GPA Rankings — vw_StudentGPA</div><table className="tbl"><thead><tr><th>Rank</th><th>Student</th><th>Dept</th><th>Courses</th><th>Credits</th><th>GPA</th></tr></thead><tbody>{cgpaAll.map((c, i) => <tr key={c.student_id}><td style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, color: '#fbbf24' }}>#{i + 1}</td><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{c.student_name}</td><td><span className="pill pill-blue">{c.department}</span></td><td style={{ textAlign: 'center' }}>{c.courses_completed}</td><td style={{ textAlign: 'center' }}>{c.total_credits_earned}</td><td><CGPAGauge cgpa={c.gpa || 0} /></td></tr>)}</tbody></table></div>}
      {tab === 'instructors' && <div className="card"><div className="card-title">Instructor Workload — vw_InstructorWorkload</div><table className="tbl"><thead><tr><th>Name</th><th>Dept</th><th>Sections</th><th>Students</th><th>Cap Left</th><th>Workload</th><th>Rating</th></tr></thead><tbody>{instructors.map(i => <tr key={i.instructor_id}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{i.name}</td><td>{i.department}</td><td style={{ textAlign: 'center' }}>{i.sections_assigned}</td><td style={{ textAlign: 'center' }}>{i.total_students || '—'}</td><td><span className={`pill pill-${i.remaining_capacity > 0 ? 'green' : 'red'}`}>{i.remaining_capacity}</span></td><td style={{ fontSize: 11 }}><div style={{ width: 60, height: 4, background: 'rgba(255,255,255,.04)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: (i.workload_percentage || 0) + '%', height: '100%', background: i.workload_percentage >= 80 ? '#f87171' : '#4ade80', borderRadius: 2 }} /></div></td><td><Stars value={Math.round(i.avg_rating || 0)} readonly size="sm" /></td></tr>)}</tbody></table></div>}
      {tab === 'stats' && <div className="card"><div className="card-title">Section Fill Rates — vw_SectionFillRate</div><table className="tbl"><thead><tr><th>Code</th><th>Title</th><th>Instructor</th><th>Total</th><th>Taken</th><th>Fill %</th><th>Status</th></tr></thead><tbody>{stats.map(r => <tr key={r.section_id}><td style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, color: '#38b6ff', fontSize: 11 }}>{r.course_code}</td><td>{r.course_title}</td><td style={{ color: '#3a6a8a' }}>{r.instructor}</td><td style={{ textAlign: 'center' }}>{r.total_seats}</td><td style={{ textAlign: 'center' }}>{r.seats_taken}</td><td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 50, height: 4, background: 'rgba(255,255,255,.04)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: r.fill_percentage + '%', height: '100%', background: r.fill_percentage >= 90 ? '#f87171' : r.fill_percentage >= 70 ? '#fbbf24' : '#4ade80' }} /></div><span style={{ fontSize: 11, color: '#3a6a8a' }}>{r.fill_percentage}%</span></div></td><td><Pill s={r.status_label === 'Full' ? 'Full' : r.status_label === 'Almost Full' ? 'Pending' : 'Open'} /></td></tr>)}</tbody></table></div>}
      {tab === 'top' && <div className="card"><div className="card-title">Top Students — Grade A</div><table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Course</th><th>Grade</th></tr></thead><tbody>{top.map((r, i) => <tr key={i}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{r.student_name}</td><td><span className="pill pill-blue">{r.department}</span></td><td style={{ color: '#3a6a8a' }}>{r.course_title}</td><td><span className="pill pill-green">A</span></td></tr>)}</tbody></table></div>}
      {tab === 'activity' && <div className="card"><div className="card-title">Student Activity — vw_StudentActivity</div><table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Active</th><th>Waitlist</th><th>Credits</th><th>Fees</th></tr></thead><tbody>{activity.map(a => <tr key={a.student_id}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{a.student_name}</td><td><span className="pill pill-blue">{a.department}</span></td><td style={{ textAlign: 'center' }}>{a.active_enrollments}</td><td style={{ textAlign: 'center' }}>{a.waitlist_positions}</td><td><span className="pill pill-purple">{a.registered_credits} cr</span></td><td><Pill s={a.fees_paid ? 'Paid' : 'Unpaid'} /></td></tr>)}</tbody></table></div>}
      {tab === 'ratings' && <div className="card"><div className="card-title">Teacher Ratings — vw_TeacherRatings</div><table className="tbl"><thead><tr><th>Instructor</th><th>Dept</th><th>Rating</th><th>Reviews</th><th>5★</th><th>4★</th><th>≤3★</th></tr></thead><tbody>{ratings.map(r => <tr key={r.instructor_id}><td style={{ fontWeight: 500, color: '#d4e8ff' }}>{r.name}</td><td><span className="pill pill-purple">{r.department}</span></td><td><Stars value={Math.round(r.avg_rating)} readonly size="sm" />&nbsp;<span style={{ fontSize: 10, color: '#1a3a5c' }}>{Number(r.avg_rating).toFixed(1)}</span></td><td style={{ textAlign: 'center' }}>{r.total_ratings}</td><td style={{ color: '#4ade80', textAlign: 'center' }}>{r.five_star}</td><td style={{ color: '#38b6ff', textAlign: 'center' }}>{r.four_star}</td><td style={{ color: '#f87171', textAlign: 'center' }}>{r.three_star + r.low_rated}</td></tr>)}</tbody></table></div>}
    </div>
  );
}
function AdminValidators({ students, courses }) {
  const [valSid, setValSid] = useState(''); const [valRes, setValRes] = useState(null);
  const [preSid, setPreSid] = useState(''); const [preCid, setPreCid] = useState(''); const [preRes, setPreRes] = useState(null);
  const [dupSid, setDupSid] = useState(''); const [dupSec, setDupSec] = useState(''); const [dupRes, setDupRes] = useState(null);
  const uniq = [...new Map(courses.map(c => [c.course_id, c])).values()];
  return (
    <div className="page-enter">
      <div className="card"><div className="card-title">Credit Validator — vw_CreditUsage</div>
        <div className="form-row"><div className="form-group"><label className="form-label">Student</label><Sel value={valSid} onChange={setValSid} options={students.map(s => ({ value: String(s.student_id), label: s.name }))} /></div>
          <button className="btn btn-primary" onClick={async () => { SFX.click(); if (!valSid) return; const r = await get('/validate-credits/' + valSid).catch(() => null); setValRes(r); }}>Check</button></div>
        {valRes && <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}><span className="pill pill-blue">{valRes.student_name}</span><span className="pill pill-green">Used: {valRes.credits_registered}</span><span className={`pill pill-${valRes.credits_remaining > 0 ? 'green' : 'red'}`}>Left: {valRes.credits_remaining}/{valRes.max_credit_limit}</span></div>}
      </div>
      <div className="card"><div className="card-title">Prerequisite Checker</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Student</label><Sel value={preSid} onChange={setPreSid} options={students.map(s => ({ value: String(s.student_id), label: s.name }))} /></div>
          <div className="form-group"><label className="form-label">Course</label><Sel value={preCid} onChange={setPreCid} options={uniq.map(c => ({ value: String(c.course_id), label: c.course_title }))} /></div>
          <button className="btn btn-primary" onClick={async () => { SFX.click(); if (!preSid || !preCid) return; const r = await get('/check-prereqs/' + preSid + '/' + preCid).catch(() => null); setPreRes(r); }}>Check</button>
        </div>
        {preRes && <div style={{ marginTop: 10 }}>{preRes.missing_prereqs === 0 ? <span className="pill pill-green">✓ All prerequisites met</span> : <span className="pill pill-red">✕ {preRes.missing_prereqs} missing</span>}</div>}
      </div>
      <div className="card"><div className="card-title">Duplicate Enrollment Check</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Student</label><Sel value={dupSid} onChange={setDupSid} options={students.map(s => ({ value: String(s.student_id), label: s.name }))} /></div>
          <div className="form-group"><label className="form-label">Section</label><Sel value={dupSec} onChange={setDupSec} options={courses.map(c => ({ value: String(c.section_id), label: c.course_code + ' · ' + c.course_title }))} /></div>
          <button className="btn btn-primary" onClick={async () => { SFX.click(); if (!dupSid || !dupSec) return; const r = await get('/check-enrollment/' + dupSid + '/' + dupSec).catch(() => null); setDupRes(r); }}>Check</button>
        </div>
        {dupRes && <div style={{ marginTop: 10 }}>{dupRes.already_enrolled > 0 ? <span className="pill pill-red">✕ Already enrolled</span> : <span className="pill pill-green">✓ Not enrolled</span>}</div>}
      </div>
    </div>
  );
}
function SemesterRolloverPage() {
  const [semesters, setSemesters] = useState([]);
  const [form, setForm] = useState({ from_semester: 'Fall', from_year: 2025, to_semester: 'Spring', to_year: 2026, enroll_start: '2026-01-15', enroll_end: '2026-02-15', drop_end: '2026-03-15', exam_start: '2026-05-01' });
  const [msg, setMsg] = useState(null);
  useEffect(() => { get('/semesters').then(setSemesters).catch(() => {}); }, []);
  const doRollover = async () => {
    setMsg(null);
    if (!window.confirm(`Archive ${form.from_semester} ${form.from_year} → ${form.to_semester} ${form.to_year}?\n\nThis resets all fees and waitlists. This cannot be undone.`)) return;
    try { const res = await post('/semester-rollover', form); setMsg({ type: 'ok', text: res.message }); SFX.success(); showToast('Semester rollover complete!', 'ok'); get('/semesters').then(setSemesters).catch(() => {}); }
    catch (e) { setMsg({ type: 'err', text: e.message }); SFX.error(); }
  };
  const F = (k, label, type = 'text') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {type === 'select-sem' ? <select className="form-select" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}>{['Fall', 'Spring', 'Summer'].map(s => <option key={s} value={s}>{s}</option>)}</select>
        : <input className="form-input" type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: type === 'number' ? +e.target.value : e.target.value }))} />}
    </div>
  );
  return (
    <div className="page-enter">
      <div className="msg msg-warn"><span>⚠</span><span>Archives current semester, resets all fees to unpaid, clears waitlists, resets instructor counts. Irreversible.</span></div>
      <Msg msg={msg} />
      <div className="card"><div className="card-title">Archive Semester</div>
        <div className="form-row" style={{ marginBottom: 14 }}>{F('from_semester', 'From Semester', 'select-sem')}{F('from_year', 'Year', 'number')}</div>
        <div className="card-title">New Semester</div>
        <div className="form-row" style={{ marginBottom: 10 }}>{F('to_semester', 'To Semester', 'select-sem')}{F('to_year', 'Year', 'number')}</div>
        <div className="form-row" style={{ marginBottom: 16 }}>{F('enroll_start', 'Enroll Start', 'date')}{F('enroll_end', 'Enroll Deadline', 'date')}{F('drop_end', 'Drop Deadline', 'date')}{F('exam_start', 'Exams Start', 'date')}</div>
        <button className="btn btn-danger" style={{ padding: '9px 20px', fontSize: 12.5, fontWeight: 700, letterSpacing: 1 }} onClick={() => { SFX.click(); doRollover(); }}>⚡ EXECUTE ROLLOVER</button>
      </div>
      <div className="card"><div className="card-title">Semester History</div>
        <table className="tbl"><thead><tr><th>Semester</th><th>Enroll Deadline</th><th>Drop Deadline</th><th>Exams</th><th>Status</th></tr></thead>
        <tbody>{semesters.map(s => <tr key={s.semester_id}><td style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700 }}>{s.semester_name} {s.year}</td><td style={{ fontSize: 11.5 }}>{String(s.enrollment_deadline).slice(0, 10)}</td><td style={{ fontSize: 11.5 }}>{String(s.drop_deadline).slice(0, 10)}</td><td style={{ fontSize: 11.5 }}>{String(s.exam_start).slice(0, 10)}</td><td>{s.is_active ? <span className="pill pill-green">Active</span> : <span className="pill pill-gray">Archived</span>}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAV CONFIG
───────────────────────────────────────────── */
const NAV = {
  student: [
    { key: 'dashboard', label: 'Dashboard', icon: '⊞', group: 'Main' },
    { key: 'courses', label: 'Browse Courses', icon: '📚', group: 'Main' },
    { key: 'prereq', label: 'Course Map', icon: '🌳', group: 'Main' },
    { key: 'enroll', label: 'Enroll', icon: '✚', group: 'Enrollment' },
    { key: 'drop', label: 'Drop Course', icon: '✖', group: 'Enrollment' },
    { key: 'waitlist', label: 'Waiting List', icon: '⏳', group: 'Enrollment' },
    { key: 'swap', label: 'Swap Request', icon: '⇄', group: 'Enrollment' },
    { key: 'completed', label: 'Completed Courses', icon: '🎓', group: 'Academic' },
    { key: 'transcript', label: 'Transcript', icon: '📄', group: 'Academic' },
    { key: 'attendance', label: 'My Attendance', icon: '📅', group: 'Academic' },
    { key: 'rate', label: 'Rate Instructor', icon: '⭐', group: 'Academic' },
    { key: 'fees', label: 'Fees', icon: '💰', group: 'Account' },
    { key: 'announcements', label: 'Announcements', icon: '📢', group: 'Account' },
  ],
  teacher: [
    { key: 'dashboard', label: 'Dashboard', icon: '⊞', group: 'Main' },
    { key: 'roster', label: 'Class Roster', icon: '👥', group: 'Teaching' },
    { key: 'attendance', label: 'Mark Attendance', icon: '📅', group: 'Teaching' },
    { key: 'grades', label: 'Post Grades', icon: '✏️', group: 'Teaching' },
    { key: 'announce', label: 'Post Announcement', icon: '📢', group: 'Teaching' },
    { key: 'myratings', label: 'My Ratings', icon: '⭐', group: 'Account' },
    { key: 'prereq', label: 'Course Map', icon: '🌳', group: 'Tools' },
  ],
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: '⊞', group: 'Main' },
    { key: 'swaps', label: 'Swap Requests', icon: '⇄', group: 'Management' },
    { key: 'rollover', label: 'Semester Rollover', icon: '⚡', group: 'Management' },
    { key: 'reports', label: 'Reports & Views', icon: '📊', group: 'Reports' },
    { key: 'audit', label: 'Audit Log', icon: '🔍', group: 'Reports' },
    { key: 'validators', label: 'Validators', icon: '✓', group: 'Reports' },
    { key: 'prereq', label: 'Course Map', icon: '🌳', group: 'Tools' },
  ],
};

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState(null);
  const [page, setPage] = useState('dashboard');

  const [students, setStudents]       = useState([]);
  const [courses, setCourses]         = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [swapRequests, setSwapReqs]   = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [mySections, setMySections]   = useState([]);
  const [ratings, setRatings]         = useState([]);
  const [cgpa, setCgpa]               = useState(null);
  const [loading, setLoading]         = useState(false);

  // Inject CSS
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'enrollix-css';
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.getElementById('enrollix-css')?.remove();
  }, []);

  const safe = (p, fb = []) => p.catch(() => fb);

  const loadAll = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { role, user } = session;
    if (role === 'student') {
      const [c, enr, ann, rat, cg] = await Promise.all([
        safe(get('/all-courses')), safe(get('/my-enrollments/' + user.student_id)),
        safe(get('/announcements')), safe(get('/teacher-ratings')), safe(get('/cgpa/' + user.student_id), null),
      ]);
      setCourses(c); setEnrollments(enr); setAnnouncements(ann); setRatings(rat); setCgpa(cg);
      const ids = [...new Set(c.map(x => x.section_id))];
      const wl = await Promise.all(ids.map(id => safe(get('/waiting-list/' + id))));
      setWaitingList(wl.flat().filter(w => w.student_id === user.student_id));
    } else if (role === 'teacher') {
      const [secs, ann, rat] = await Promise.all([
        safe(get('/instructor-sections/' + user.instructor_id)),
        safe(get('/announcements/instructor/' + user.instructor_id)),
        safe(get('/teacher-ratings')),
      ]);
      setMySections(secs); setAnnouncements(ann); setRatings(rat); setCourses(secs);
    } else if (role === 'admin') {
      const [stu, crs, ins, sw] = await Promise.all([
        safe(get('/students')), safe(get('/all-courses')),
        safe(get('/instructor-report')), safe(get('/swap-requests')),
      ]);
      setStudents(stu); setCourses(crs); setInstructors(ins); setSwapReqs(sw);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { if (session) { setPage('dashboard'); loadAll(); } }, [session, loadAll]);

  const refreshUser = useCallback(async () => {
    if (session?.role === 'student') {
      const u = await get('/students/' + session.user.student_id).catch(() => null);
      if (u) setSession(s => ({ ...s, user: { ...s.user, ...u } }));
    }
    loadAll();
  }, [session, loadAll]);

  const { role, user } = session || {};
  const navItems = NAV[role] || [];
  const groups = [...new Set(navItems.map(n => n.group))];
  const roleColor = role === 'student' ? '#38b6ff' : role === 'teacher' ? '#a78bfa' : '#fbbf24';
  const currentPage = navItems.find(p => p.key === page);

  const doNav = key => { SFX.nav(); setPage(key); };

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <ToastContainer />

      {!showSplash && !session && (
        <LoginPage onLogin={res => { setSession(res); showToast('Login successful', 'ok'); }} />
      )}

      {!showSplash && session && (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          {/* ── SIDEBAR ── */}
          <aside className="sidebar">
            <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid rgba(56,182,255,.05)' }}>
              <div className="logo-mark">ENROLLIX</div>
              <div className="logo-sub">Course Management</div>
            </div>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(56,182,255,.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={user?.name || 'A'} color={roleColor} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: '#c4d8f0', lineHeight: 1.3 }}>{user?.name}</div>
                  <span className={`role-badge role-${role}`}>{role}</span>
                </div>
              </div>
            </div>
            <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
              {groups.map(g => (
                <div key={g}>
                  <div className="nav-section-label">{g}</div>
                  {navItems.filter(n => n.group === g).map(p => (
                    <div key={p.key} className={`nav-item${page === p.key ? ' active' : ''}`} onClick={() => doNav(p.key)}>
                      <span className="nav-icon">{p.icon}</span>
                      {p.label}
                      {p.key === 'fees' && role === 'student' && !user?.fees_paid &&
                        <span className="nav-badge" style={{ background: 'rgba(248,113,113,.18)', color: '#f87171' }}>!</span>}
                    </div>
                  ))}
                </div>
              ))}
            </nav>
            <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(56,182,255,.04)' }}>
              {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}><span className="dot" /><span className="dot" /><span className="dot" /><span style={{ fontSize: 9.5, color: '#0f2540', marginLeft: 2, fontFamily: "'Orbitron',sans-serif", letterSpacing: '.04em' }}>SYNCING…</span></div>}
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11, letterSpacing: '.04em' }}
                onClick={() => { SFX.click(); setSession(null); setPage('dashboard'); }}>SIGN OUT</button>
            </div>
          </aside>

          {/* ── MAIN ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="topbar">
              <div>
                <div className="topbar-title">{currentPage?.label || 'DASHBOARD'}</div>
                <div style={{ fontSize: 9.5, color: '#0f2540', marginTop: 1, fontFamily: "'Orbitron',sans-serif", letterSpacing: '.04em' }}>FALL 2025 · ENROLLIX v2</div>
              </div>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                {loading && <span className="spinner" />}
                <button className="btn btn-ghost" style={{ fontSize: 11, letterSpacing: '.04em' }} onClick={() => { SFX.click(); refreshUser(); }}>↺ SYNC</button>
                <div className="live-pill"><span className="live-dot" />LIVE</div>
              </div>
            </div>

            <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Student pages */}
              {role === 'student' && page === 'dashboard'     && <StudentDashboard user={user} courses={courses} enrollments={enrollments} waitingList={waitingList} announcements={announcements} cgpa={cgpa} />}
              {role === 'student' && page === 'courses'       && <BrowseCoursesPage courses={courses} />}
              {role === 'student' && page === 'prereq'        && <PrereqTreePage user={user} />}
              {role === 'student' && page === 'enroll'        && <EnrollPage user={user} courses={courses} onAction={refreshUser} />}
              {role === 'student' && page === 'drop'          && <DropPage user={user} enrollments={enrollments} onAction={refreshUser} />}
              {role === 'student' && page === 'waitlist'      && <WaitlistPage user={user} courses={courses} waitingList={waitingList} onAction={refreshUser} />}
              {role === 'student' && page === 'swap'          && <SwapPage user={user} courses={courses} onAction={refreshUser} />}
              {role === 'student' && page === 'completed'     && <CompletedCoursesPage user={user} />}
              {role === 'student' && page === 'transcript'    && <TranscriptPage user={user} />}
              {role === 'student' && page === 'attendance'    && <AttendanceStudentPage user={user} />}
              {role === 'student' && page === 'rate'          && <RateTeacherPage user={user} courses={courses} />}
              {role === 'student' && page === 'fees'          && <FeesPage user={user} onUserRefresh={refreshUser} />}
              {role === 'student' && page === 'announcements' && <AnnouncementsPage announcements={announcements} />}
              {/* Teacher pages */}
              {role === 'teacher' && page === 'dashboard'     && <TeacherDashboard user={user} sections={mySections} announcements={announcements} ratings={ratings} />}
              {role === 'teacher' && page === 'roster'        && <TeacherRoster user={user} sections={mySections} />}
              {role === 'teacher' && page === 'attendance'    && <MarkAttendancePage user={user} sections={mySections} />}
              {role === 'teacher' && page === 'grades'        && <GradeEntryPage user={user} sections={mySections} />}
              {role === 'teacher' && page === 'announce'      && <PostAnnouncementPage user={user} sections={mySections} onAction={refreshUser} />}
              {role === 'teacher' && page === 'myratings'     && <MyRatingsPage user={user} />}
              {role === 'teacher' && page === 'prereq'        && <PrereqTreePage user={null} />}
              {/* Admin pages */}
              {role === 'admin' && page === 'dashboard'       && <AdminDashboard students={students} courses={courses} instructors={instructors} swapRequests={swapRequests} />}
              {role === 'admin' && page === 'swaps'           && <AdminSwaps swapRequests={swapRequests} onAction={refreshUser} />}
              {role === 'admin' && page === 'rollover'        && <SemesterRolloverPage />}
              {role === 'admin' && page === 'reports'         && <AdminReports students={students} instructors={instructors} courses={courses} />}
              {role === 'admin' && page === 'audit'           && <AuditLogPage />}
              {role === 'admin' && page === 'validators'      && <AdminValidators students={students} courses={courses} />}
              {role === 'admin' && page === 'prereq'          && <PrereqTreePage user={null} />}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
