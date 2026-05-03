import React, { useEffect, useState, useCallback, useRef } from 'react';

const API = 'http://localhost:5000';
const apiFetch = async (url, opts) => {
  const r = await fetch(API + url, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const get   = url      => apiFetch(url);
const post  = (url, b) => apiFetch(url, {method:'POST',  headers:{'Content-Type':'application/json'}, body:JSON.stringify(b)});
const patch = (url, b) => apiFetch(url, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b)});
const del   = url      => apiFetch(url, {method:'DELETE'});

/* ══ CSS ══════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#060b14;color:#e2e8f0;overflow:hidden}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:4px}
select option{background:#0d1b2e;color:#e2e8f0}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{box-shadow:0 0 6px rgba(59,130,246,.3)}50%{box-shadow:0 0 18px rgba(59,130,246,.6)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes starPop{0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)}}

.page-enter{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) forwards}
.fade-in{animation:fadeIn .3s ease}
.slide-down{animation:slideDown .25s ease forwards}

/* Sidebar */
.sidebar{width:228px;background:linear-gradient(180deg,#07101d 0%,#060b14 100%);border-right:1px solid rgba(59,130,246,.07);display:flex;flex-direction:column;flex-shrink:0}
.logo-mark{font-family:'Syne',sans-serif;font-weight:800;font-size:21px;background:linear-gradient(135deg,#60a5fa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.4px}
.logo-sub{font-size:9.5px;color:#1e3a5f;letter-spacing:.1em;text-transform:uppercase;margin-top:2px;font-weight:600}
.nav-group{font-size:9px;font-weight:700;color:#1a3050;text-transform:uppercase;letter-spacing:.12em;padding:14px 18px 5px;font-family:'Syne',sans-serif}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 18px;cursor:pointer;font-size:12.5px;color:#2d4f6e;border-left:2px solid transparent;transition:all .18s;user-select:none;position:relative}
.nav-item:hover{color:#8ab4d4;background:rgba(59,130,246,.04)}
.nav-item.active{color:#e2e8f0;border-left-color:#3b82f6;background:linear-gradient(90deg,rgba(59,130,246,.1),transparent);font-weight:500}
.nav-item.active::before{content:'';position:absolute;left:-1px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,#60a5fa,#3b82f6);box-shadow:0 0 6px rgba(59,130,246,.5)}
.nav-icon{width:13px;height:13px;flex-shrink:0;opacity:.55;transition:opacity .18s}
.nav-item:hover .nav-icon,.nav-item.active .nav-icon{opacity:1}
.nav-badge{font-size:9px;padding:1px 6px;border-radius:8px;font-weight:700;margin-left:auto}

/* Topbar */
.topbar{background:rgba(6,11,20,.92);border-bottom:1px solid rgba(59,130,246,.06);padding:0 26px;height:56px;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(12px);flex-shrink:0}
.topbar-title{font-family:'Syne',sans-serif;font-weight:700;font-size:14.5px;color:#e2e8f0}
.live-pill{font-size:10px;padding:3px 10px;border-radius:20px;background:rgba(34,197,94,.07);color:#4ade80;border:1px solid rgba(34,197,94,.18);font-family:'Syne',sans-serif;font-weight:700;letter-spacing:.06em;animation:glow 2.5s ease-in-out infinite;display:flex;align-items:center;gap:5px}
.live-dot{width:5px;height:5px;border-radius:50%;background:#4ade80;animation:pulse 1.6s ease-in-out infinite}

/* Cards */
.card{background:linear-gradient(145deg,#0c1b2e,#091423);border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:18px 20px;margin-bottom:14px;position:relative;overflow:hidden;transition:border-color .2s}
.card:hover{border-color:rgba(59,130,246,.09)}
.card::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.12),transparent)}
.card-title{font-family:'Syne',sans-serif;font-size:10.5px;font-weight:700;color:#2d4f6e;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.card-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(59,130,246,.1),transparent)}

/* Stat grid */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:18px}
.stat-card{background:linear-gradient(145deg,#0d1b2e,#0b1828);border:1px solid rgba(59,130,246,.1);border-radius:13px;padding:16px 18px;position:relative;overflow:hidden;transition:all .22s;cursor:default}
.stat-card:hover{border-color:rgba(59,130,246,.22);transform:translateY(-2px)}
.stat-card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at top left,rgba(59,130,246,.04),transparent 70%);pointer-events:none}
.stat-icon{font-size:18px;margin-bottom:8px;display:block}
.stat-num{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;line-height:1;margin-bottom:3px}
.stat-label{font-size:10.5px;color:#2d4f6e;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.stat-sub{font-size:10px;color:#1a3050;margin-top:2px}

/* Table */
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-size:10px;font-weight:700;color:#2d4f6e;padding:0 10px 9px;text-transform:uppercase;letter-spacing:.1em;font-family:'Syne',sans-serif}
.tbl td{padding:9px 10px;border-top:1px solid rgba(255,255,255,.03);font-size:12.5px;color:#8ab4d4;vertical-align:middle}
.tbl tbody tr{transition:background .13s}
.tbl tbody tr:hover td{background:rgba(59,130,246,.03);color:#bdd4ec}
.tbl td:first-child{color:#dde8f5}

/* Forms */
.form-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.form-group{display:flex;flex-direction:column;gap:4px;flex:1;min-width:130px}
.form-label{font-size:9.5px;font-weight:700;color:#2d4f6e;text-transform:uppercase;letter-spacing:.08em;font-family:'Syne',sans-serif}
.form-select,.form-input,.form-textarea{width:100%;padding:8px 13px;background:#050e1c;border:1px solid rgba(59,130,246,.14);border-radius:9px;color:#e2e8f0;font-size:12.5px;font-family:'Inter',sans-serif;transition:border-color .18s,box-shadow .18s}
.form-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%232d4f6e'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px;background-color:#050e1c}
.form-textarea{resize:vertical;min-height:72px}
.form-select:focus,.form-input:focus,.form-textarea:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.09)}

/* Buttons */
.btn{padding:8px 18px;border-radius:9px;font-size:12.5px;font-family:'Inter',sans-serif;font-weight:500;cursor:pointer;transition:all .18s;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;border:none}
.btn-primary{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 3px 12px rgba(59,130,246,.22)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(59,130,246,.36)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-success{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 3px 12px rgba(34,197,94,.18)}
.btn-success:hover{transform:translateY(-1px)}
.btn-danger{background:transparent;color:#f87171;border:1px solid rgba(248,113,113,.28);padding:7px 13px;font-size:12px}
.btn-danger:hover{background:rgba(248,113,113,.07);border-color:#f87171}
.btn-ghost{background:rgba(255,255,255,.04);color:#8ab4d4;border:1px solid rgba(255,255,255,.07);padding:6px 13px;font-size:12px}
.btn-ghost:hover{background:rgba(255,255,255,.07)}
.btn-approve{background:rgba(34,197,94,.09);color:#4ade80;border:1px solid rgba(34,197,94,.18);font-size:11.5px;padding:5px 11px;margin-right:5px}
.btn-approve:hover{background:rgba(34,197,94,.18)}
.btn-sm{padding:4px 10px;font-size:11px;border-radius:7px}

/* Pills */
.pill{display:inline-flex;align-items:center;font-size:10px;padding:2px 8px;border-radius:11px;font-weight:600;font-family:'Syne',sans-serif;letter-spacing:.02em;white-space:nowrap}
.pill-green{background:rgba(34,197,94,.09);color:#4ade80;border:1px solid rgba(34,197,94,.18)}
.pill-red{background:rgba(248,113,113,.09);color:#f87171;border:1px solid rgba(248,113,113,.18)}
.pill-amber{background:rgba(251,191,36,.09);color:#fbbf24;border:1px solid rgba(251,191,36,.18)}
.pill-blue{background:rgba(59,130,246,.09);color:#60a5fa;border:1px solid rgba(59,130,246,.18)}
.pill-purple{background:rgba(139,92,246,.09);color:#a78bfa;border:1px solid rgba(139,92,246,.18)}
.pill-teal{background:rgba(20,184,166,.09);color:#2dd4bf;border:1px solid rgba(20,184,166,.18)}
.pill-gray{background:rgba(255,255,255,.04);color:#4a6080;border:1px solid rgba(255,255,255,.07)}

/* Messages */
.msg{padding:10px 14px;border-radius:9px;font-size:12.5px;margin-bottom:12px;display:flex;align-items:flex-start;gap:8px}
.msg-ok{background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.16);color:#4ade80}
.msg-err{background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.16);color:#f87171}
.msg-warn{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.16);color:#fbbf24}
.msg-info{background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.13);color:#60a5fa}

/* Seat bar */
.seat-wrap{display:inline-flex;align-items:center;gap:7px}
.seat-bar{height:4px;border-radius:2px;background:rgba(255,255,255,.05);overflow:hidden;width:60px}
.seat-fill{height:100%;border-radius:2px;transition:width .45s ease}

/* Stars */
.star-row{display:flex;gap:2px;align-items:center}
.star{font-size:17px;cursor:pointer;transition:transform .12s;line-height:1}
.star:hover{transform:scale(1.18);animation:starPop .18s ease}
.star-sm{font-size:12px;cursor:default}

/* Avatar */
.avatar{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Syne',sans-serif;flex-shrink:0}

/* Role badges */
.role-badge{padding:3px 10px;border-radius:20px;font-size:9.5px;font-weight:700;font-family:'Syne',sans-serif;letter-spacing:.05em;text-transform:uppercase}
.role-student{background:rgba(59,130,246,.09);color:#60a5fa;border:1px solid rgba(59,130,246,.18)}
.role-teacher{background:rgba(139,92,246,.09);color:#a78bfa;border:1px solid rgba(139,92,246,.18)}
.role-admin{background:rgba(251,191,36,.09);color:#fbbf24;border:1px solid rgba(251,191,36,.18)}

/* Tabs */
.tab-row{display:flex;gap:5px;margin-bottom:16px;flex-wrap:wrap;background:rgba(255,255,255,.02);border-radius:11px;padding:3px;width:fit-content}
.tab-btn{padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;transition:all .18s;border:none;background:transparent;color:#2d4f6e;font-family:'Inter',sans-serif;font-weight:500}
.tab-btn.active{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 2px 8px rgba(59,130,246,.28)}
.tab-btn:hover:not(.active){color:#8ab4d4;background:rgba(255,255,255,.04)}

/* Announcement */
.announcement{background:linear-gradient(135deg,rgba(59,130,246,.04),rgba(139,92,246,.02));border:1px solid rgba(59,130,246,.09);border-radius:11px;padding:13px 15px;margin-bottom:9px;transition:border-color .18s}
.announcement:hover{border-color:rgba(59,130,246,.18)}
.ann-title{font-weight:600;font-size:13px;color:#e2e8f0;margin-bottom:3px}
.ann-meta{font-size:10.5px;color:#2d4f6e;margin-bottom:7px;display:flex;gap:9px;align-items:center}
.ann-body{font-size:12px;color:#5a7a94;line-height:1.6}

/* CGPA gauge */
.cgpa-ring{position:relative;display:inline-flex;align-items:center;justify-content:center}

/* Transcript */
.transcript-header{background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(139,92,246,.05));border:1px solid rgba(59,130,246,.12);border-radius:14px;padding:20px 24px;margin-bottom:16px}
.transcript-course-row{display:grid;grid-template-columns:80px 1fr 60px 60px 60px;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.03);font-size:12.5px}

/* Attendance */
.att-btn{width:36px;height:36px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.04);color:#4a6080;font-family:'Syne',sans-serif}
.att-btn.Present{background:rgba(34,197,94,.15);color:#4ade80;border-color:rgba(34,197,94,.3)}
.att-btn.Absent{background:rgba(248,113,113,.15);color:#f87171;border-color:rgba(248,113,113,.3)}
.att-btn.Late{background:rgba(251,191,36,.15);color:#fbbf24;border-color:rgba(251,191,36,.3)}

/* Prereq tree */
.prereq-tree-wrap{overflow-x:auto;padding:10px 0}

/* Misc */
.spinner{width:16px;height:16px;border:2px solid rgba(59,130,246,.2);border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}
.dot{width:5px;height:5px;border-radius:50%;background:#3b82f6;animation:pulse 1.2s infinite;display:inline-block;margin:0 2px}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
.empty{text-align:center;padding:36px 20px;color:#1a3050;font-size:12.5px}
.empty-icon{font-size:32px;margin-bottom:9px;display:block;opacity:.35}
.divider{height:1px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.1),transparent);margin:14px 0}
.fee-paid{background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.13);border-radius:11px;padding:13px 16px;display:flex;align-items:center;gap:11px}
.fee-unpaid{background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.13);border-radius:11px;padding:13px 16px;display:flex;align-items:center;gap:11px}
.rating-bar-wrap{display:flex;align-items:center;gap:7px;margin-bottom:4px}
.rating-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.04);flex:1;overflow:hidden}
.rating-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#fbbf24,#f59e0b)}

/* Audit log */
.audit-row{display:grid;grid-template-columns:100px 80px 80px 1fr 120px;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.03);font-size:11.5px;align-items:start}
.audit-action-INSERT{color:#4ade80}.audit-action-UPDATE{color:#60a5fa}.audit-action-DELETE{color:#f87171}
`;

/* ══ HELPERS ═══════════════════════════════════════════════ */
function Pill({s}) {
  const m={Registered:'green',Dropped:'red',Completed:'teal',Pending:'amber',Approved:'green',Rejected:'red',Open:'green',Full:'red',Paid:'green',Unpaid:'red',Present:'green',Absent:'red',Late:'amber'};
  return <span className={`pill pill-${m[s]||'gray'}`}>{s}</span>;
}
function SeatsBar({avail,total}) {
  const pct=total>0?Math.round((avail/total)*100):0;
  const color=avail===0?'#f87171':avail<=2?'#fbbf24':'#4ade80';
  return <span className="seat-wrap"><span className="seat-bar"><span className="seat-fill" style={{width:pct+'%',background:color}}/></span><span className={`pill pill-${avail===0?'red':avail<=2?'amber':'green'}`}>{avail}/{total}</span></span>;
}
function Msg({msg}) {
  if (!msg) return null;
  const c=msg.type==='ok'?'msg-ok':msg.type==='warn'?'msg-warn':'msg-err';
  return <div className={`msg ${c}`}><span>{msg.type==='ok'?'✓':msg.type==='warn'?'⚠':'✕'}</span><span>{msg.text}</span></div>;
}
function InfoBox({children}) { return <div className="msg msg-info" style={{marginBottom:12}}><span>ℹ</span><span>{children}</span></div>; }
function Sel({value,onChange,options,placeholder,disabled}) {
  return <select className="form-select" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>
    <option value="">{options.length===0?'⚠ No data':placeholder||'Select…'}</option>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}
function Stars({value,onChange,readonly,size='lg'}) {
  const [hover,setHover]=useState(0);
  const cls=size==='sm'?'star-sm':'star';
  return <span className="star-row">
    {[1,2,3,4,5].map(i=><span key={i} className={cls} style={{color:i<=(hover||value)?'#fbbf24':'#1e3a5f'}} onClick={()=>!readonly&&onChange&&onChange(i)} onMouseEnter={()=>!readonly&&setHover(i)} onMouseLeave={()=>!readonly&&setHover(0)}>★</span>)}
    {size!=='sm'&&value>0&&<span style={{fontSize:11,color:'#2d4f6e',marginLeft:3}}>{value}/5</span>}
  </span>;
}
function Avatar({name,color='#3b82f6'}) {
  const init=(name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return <span className="avatar" style={{background:`${color}20`,color,border:`1px solid ${color}38`}}>{init}</span>;
}
function CGPAGauge({cgpa}) {
  const pct=(cgpa/4)*100;
  const color=cgpa>=3.5?'#4ade80':cgpa>=2.5?'#fbbf24':'#f87171';
  const r=38,cx=44,cy=44,stroke=6;
  const circ=2*Math.PI*r;
  const dash=circ*0.75;
  const offset=dash-(dash*(pct/100));
  return (
    <div className="cgpa-ring">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeDashoffset={0} strokeLinecap="round" transform="rotate(135,44,44)"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(135,44,44)" style={{transition:'stroke-dashoffset .8s ease'}}/>
        <text x={cx} y={cy-2} textAnchor="middle" fill={color} fontSize="14" fontWeight="800" fontFamily="Syne,sans-serif">{Number(cgpa).toFixed(2)}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="#2d4f6e" fontSize="8" fontFamily="Syne,sans-serif">CGPA</text>
      </svg>
    </div>
  );
}

/* ══ PREREQ TREE (SVG) ════════════════════════════════════ */
function PrereqTree({nodes, edges, completedIds=[]}) {
  if (!nodes || nodes.length===0) return <div className="empty"><span className="empty-icon">🌳</span>No course data.</div>;

  // Simple layered layout
  const prereqMap={};
  edges.forEach(e=>{ if (!prereqMap[e.course_id]) prereqMap[e.course_id]=[];prereqMap[e.course_id].push(e.prerequisite_course_id); });
  const layers=[];
  const placed=new Set();
  const getRoots=()=>nodes.filter(n=>!edges.find(e=>e.course_id===n.course_id));
  let layer=getRoots();
  while(layer.length>0) {
    layers.push(layer);
    layer.forEach(n=>placed.add(n.course_id));
    layer=nodes.filter(n=>!placed.has(n.course_id)&&(prereqMap[n.course_id]||[]).every(p=>placed.has(p)));
  }
  nodes.filter(n=>!placed.has(n.course_id)).forEach(n=>{ if (!layers[layers.length-1]) layers.push([]); layers[layers.length-1].push(n); placed.add(n.course_id); });

  const W=140,H=54,GX=60,GY=30;
  const positions={};
  layers.forEach((layer,li)=>{ layer.forEach((n,ni)=>{ const y=ni*( H+GY)+(li%2===0?0:30); const x=li*(W+GX); positions[n.course_id]={x,y}; }); });
  const maxX=Math.max(...Object.values(positions).map(p=>p.x))+W+20;
  const maxY=Math.max(...Object.values(positions).map(p=>p.y))+H+20;

  const gradeColors={'A':'#4ade80','B':'#60a5fa','C':'#fbbf24','D':'#fb923c','F':'#f87171'};
  const doneSet=new Set(completedIds);

  return (
    <div className="prereq-tree-wrap">
      <svg width={maxX} height={maxY} style={{minWidth:maxX}}>
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="rgba(59,130,246,.4)"/></marker></defs>
        {edges.map((e,i)=>{
          const from=positions[e.prerequisite_course_id];
          const to=positions[e.course_id];
          if (!from||!to) return null;
          return <line key={i} x1={from.x+W} y1={from.y+H/2} x2={to.x} y2={to.y+H/2} stroke="rgba(59,130,246,.3)" strokeWidth="1.5" markerEnd="url(#arrow)"/>;
        })}
        {nodes.map(n=>{
          const p=positions[n.course_id];
          if (!p) return null;
          const done=doneSet.has(n.course_id);
          const fill=done?'rgba(34,197,94,.08)':'rgba(59,130,246,.06)';
          const stroke=done?'rgba(34,197,94,.3)':'rgba(59,130,246,.2)';
          const textColor=done?'#4ade80':'#60a5fa';
          return (
            <g key={n.course_id}>
              <rect x={p.x} y={p.y} width={W} height={H} rx="9" fill={fill} stroke={stroke} strokeWidth="1"/>
              {done&&<text x={p.x+W-12} y={p.y+14} fontSize="10" fill="#4ade80">✓</text>}
              <text x={p.x+W/2} y={p.y+20} textAnchor="middle" fontSize="11" fontWeight="700" fill={textColor} fontFamily="Syne,sans-serif">{n.course_code}</text>
              <text x={p.x+W/2} y={p.y+34} textAnchor="middle" fontSize="9" fill="#4a6080">{n.course_title.length>18?n.course_title.slice(0,17)+'…':n.course_title}</text>
              <text x={p.x+W/2} y={p.y+46} textAnchor="middle" fontSize="8" fill="#2d4f6e">{n.credit_hours} cr · {n.department}</text>
            </g>
          );
        })}
      </svg>
      <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
        <span style={{fontSize:11,color:'#4ade80'}}>✓ = Completed</span>
        <span style={{fontSize:11,color:'#60a5fa'}}>□ = Pending</span>
        <span style={{fontSize:11,color:'#2d4f6e'}}>→ = Prerequisite direction</span>
      </div>
    </div>
  );
}

/* ══ TRANSCRIPT ════════════════════════════════════════════ */
function TranscriptPage({user}) {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ get('/transcript/'+user.student_id).then(setData).catch(()=>{}).finally(()=>setLoading(false)); },[]);

  if (loading) return <div className="empty"><span className="dot"/><span className="dot"/><span className="dot"/></div>;
  if (!data) return <div className="empty"><span className="empty-icon">📄</span>No transcript data.</div>;
  const {student,completed_courses,current_enrollments}=data;

  const gradeColor=(g)=>g==='A'||g==='A+'||g==='A-'?'#4ade80':g==='B'||g==='B+'||g==='B-'?'#60a5fa':g==='C'||g==='C+'||g==='C-'?'#fbbf24':'#f87171';

  return (
    <div className="page-enter">
      <div className="transcript-header">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{fontSize:10,color:'#2d4f6e',letterSpacing:'.08em',textTransform:'uppercase',fontFamily:"'Syne',sans-serif",fontWeight:700,marginBottom:4}}>Official Academic Transcript</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:'#e2e8f0'}}>{student?.name}</div>
            <div style={{fontSize:12,color:'#4a6080',marginTop:4}}>
              <span className="pill pill-blue" style={{marginRight:8}}>{student?.department}</span>
              Semester {student?.semester} · {student?.email}
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            {student&&<CGPAGauge cgpa={student.cgpa||0}/>}
            <div style={{fontSize:10,color:'#2d4f6e',marginTop:4}}>{student?.courses_completed||0} courses · {student?.total_credits_earned||0} credits</div>
          </div>
        </div>
      </div>

      {completed_courses?.length>0&&(
        <div className="card">
          <div className="card-title">Completed Courses</div>
          <div style={{display:'grid',gridTemplateColumns:'80px 1fr 60px 60px 60px',gap:10,padding:'0 0 8px',marginBottom:8,borderBottom:'1px solid rgba(255,255,255,.05)'}}>
            {['Code','Title','Credits','Grade','GPA'].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:'#2d4f6e',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:"'Syne',sans-serif"}}>{h}</span>)}
          </div>
          {completed_courses.map((c,i)=>(
            <div key={i} className="transcript-course-row">
              <span style={{color:'#3b82f6',fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11}}>{c.course_code}</span>
              <span style={{color:'#c8d6e8'}}>{c.course_title}</span>
              <span style={{textAlign:'center',color:'#4a6080'}}>{c.credit_hours}</span>
              <span style={{textAlign:'center',fontWeight:700,color:gradeColor(c.grade),fontFamily:"'Syne',sans-serif"}}>{c.grade}</span>
              <span style={{textAlign:'center',color:'#60a5fa'}}>{c.grade_points}</span>
            </div>
          ))}
        </div>
      )}

      {current_enrollments?.length>0&&(
        <div className="card">
          <div className="card-title">Current Semester — Fall 2025</div>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Instructor</th><th>Status</th></tr></thead>
            <tbody>{current_enrollments.map((c,i)=><tr key={i}>
              <td style={{color:'#3b82f6',fontFamily:"'Syne',sans-serif",fontWeight:700}}>{c.course_code}</td>
              <td>{c.course_title}</td>
              <td><span className="pill pill-purple">{c.credit_hours} cr</span></td>
              <td style={{color:'#4a6080'}}>{c.instructor}</td>
              <td><Pill s="Registered"/></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══ ATTENDANCE PAGE (Student) ════════════════════════════ */
function AttendanceStudentPage({user}) {
  const [data,setData]=useState([]);
  useEffect(()=>{ get('/attendance/student/'+user.student_id).then(setData).catch(()=>{}); },[]);
  return (
    <div className="page-enter">
      <InfoBox>Attendance below 80% blocks exam eligibility and grade posting.</InfoBox>
      {data.length===0?<div className="empty"><span className="empty-icon">📅</span>No attendance records yet.</div>
      :data.map(a=>(
        <div key={a.section_id} className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontWeight:600,fontSize:13.5,color:'#e2e8f0',marginBottom:3}}>{a.course_title}</div>
              <div style={{fontSize:11.5,color:'#4a6080'}}>{a.instructor}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:a.attendance_pct>=80?'#4ade80':a.attendance_pct>=60?'#fbbf24':'#f87171'}}>{a.attendance_pct}%</div>
              <div style={{fontSize:10,color:'#2d4f6e',marginTop:2}}>{a.present+a.late}/{a.total_classes} classes attended</div>
            </div>
          </div>
          <div style={{marginTop:12,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
            <span className="pill pill-green">Present: {a.present}</span>
            <span className="pill pill-amber">Late: {a.late}</span>
            <span className="pill pill-red">Absent: {a.absent}</span>
            <span className="pill pill-gray">Total: {a.total_classes}</span>
            <span style={{marginLeft:'auto'}}>{a.exam_eligible?<span className="pill pill-green">✓ Exam Eligible</span>:<span className="pill pill-red">✕ Below 80% — Cannot Sit Exam</span>}</span>
          </div>
          {/* Progress bar */}
          <div style={{marginTop:10,height:5,borderRadius:3,background:'rgba(255,255,255,.04)',overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:3,width:a.attendance_pct+'%',background:a.attendance_pct>=80?'#4ade80':a.attendance_pct>=60?'#fbbf24':'#f87171',transition:'width .6s ease'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
            <span style={{fontSize:9,color:'#1a3050'}}>0%</span>
            <span style={{fontSize:9,color:'#fbbf24',position:'relative',left:'calc(-20% + 20px)'}}>80% threshold</span>
            <span style={{fontSize:9,color:'#1a3050'}}>100%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ COMPLETED COURSES (Student) ══════════════════════════ */
function CompletedCoursesPage({user}) {
  const [courses,setCourses]=useState([]);
  const [cgpa,setCgpa]=useState(null);
  useEffect(()=>{
    get('/completed-courses/'+user.student_id).then(setCourses).catch(()=>{});
    get('/cgpa/'+user.student_id).then(setCgpa).catch(()=>{});
  },[]);
  const gradeColor=g=>g==='A'||g==='A+'?'green':g==='B'||g==='B+'?'blue':g==='C'||g==='C+'?'amber':'red';
  return (
    <div className="page-enter">
      {cgpa&&<div style={{display:'flex',alignItems:'center',gap:18,padding:'14px 18px',background:'linear-gradient(135deg,rgba(59,130,246,.06),rgba(139,92,246,.04))',border:'1px solid rgba(59,130,246,.1)',borderRadius:13,marginBottom:14}}>
        <CGPAGauge cgpa={cgpa.cgpa||0}/>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:'#e2e8f0',marginBottom:4}}>Academic Standing</div>
          <div style={{fontSize:12,color:'#4a6080'}}>
            {cgpa.courses_completed} courses completed · {cgpa.total_credits_earned} credit hours earned
          </div>
          <div style={{marginTop:6}}><span className={`pill pill-${cgpa.cgpa>=3.5?'green':cgpa.cgpa>=2.5?'blue':'amber'}`}>{cgpa.cgpa>=3.5?'Distinction':cgpa.cgpa>=3.0?'Merit':cgpa.cgpa>=2.0?'Pass':'Academic Warning'}</span></div>
        </div>
      </div>}
      <div className="card">
        <div className="card-title">Completed Courses</div>
        {courses.length===0?<div className="empty"><span className="empty-icon">🎓</span>No completed courses yet.</div>
        :<table className="tbl">
          <thead><tr><th>Code</th><th>Title</th><th>Dept</th><th>Credits</th><th>Grade</th><th>GPA Pts</th><th>Semester</th></tr></thead>
          <tbody>{courses.map((c,i)=><tr key={i}>
            <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#3b82f6'}}>{c.course_code}</td>
            <td>{c.course_title}</td>
            <td><span className="pill pill-blue">{c.department}</span></td>
            <td style={{textAlign:'center'}}><span className="pill pill-purple">{c.credit_hours}</span></td>
            <td><span className={`pill pill-${gradeColor(c.grade)}`}>{c.grade}</span></td>
            <td style={{textAlign:'center',color:'#60a5fa',fontWeight:600}}>{c.grade_points}</td>
            <td style={{color:'#4a6080',fontSize:11.5}}>{c.semester_completed} {c.year_completed}</td>
          </tr>)}</tbody>
        </table>}
      </div>
    </div>
  );
}

/* ══ ATTENDANCE MARKING (Teacher) ════════════════════════ */
function MarkAttendancePage({user,sections}) {
  const [selSec,setSelSec]=useState('');
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [roster,setRoster]=useState([]);
  const [attendance,setAttendance]=useState({});
  const [msg,setMsg]=useState(null);

  useEffect(()=>{
    if (!selSec) return;
    get('/section-roster/'+selSec).then(r=>{setRoster(r);const a={};r.forEach(s=>{a[s.student_id]='Present';});setAttendance(a);}).catch(()=>{});
  },[selSec]);

  const toggle=(sid)=>{
    const cycle={Present:'Absent',Absent:'Late',Late:'Present'};
    setAttendance(a=>({...a,[sid]:cycle[a[sid]]||'Present'}));
  };

  const doMark=async()=>{
    setMsg(null);
    if (!selSec||!date||roster.length===0){setMsg({type:'warn',text:'Select section and date.'});return;}
    const records=roster.map(s=>({student_id:s.student_id,status:attendance[s.student_id]||'Present'}));
    try{
      const res=await post('/attendance',{section_id:Number(selSec),instructor_id:user.instructor_id,class_date:date,records});
      setMsg({type:'ok',text:res.message});
    }catch(e){setMsg({type:'err',text:e.message});}
  };

  const counts={Present:0,Absent:0,Late:0};
  Object.values(attendance).forEach(s=>{if(counts[s]!==undefined)counts[s]++;});

  return (
    <div className="page-enter">
      <InfoBox>Mark attendance for each class. Students below 80% are blocked from exams and grade posting.</InfoBox>
      <Msg msg={msg}/>
      <div className="card">
        <div className="card-title">Select Class</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Section</label>
            <Sel value={selSec} onChange={setSelSec} options={sections.map(s=>({value:String(s.section_id),label:s.course_code+' — '+s.course_title}))} placeholder="Pick section…"/>
          </div>
          <div className="form-group" style={{maxWidth:160}}><label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
        </div>
      </div>
      {roster.length>0&&(
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div className="card-title" style={{margin:0}}>Mark Attendance — {date}</div>
            <div style={{display:'flex',gap:8}}>
              <span className="pill pill-green">Present: {counts.Present}</span>
              <span className="pill pill-amber">Late: {counts.Late}</span>
              <span className="pill pill-red">Absent: {counts.Absent}</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8,marginBottom:16}}>
            {roster.map(s=>(
              <div key={s.student_id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 11px',background:'rgba(255,255,255,.02)',borderRadius:9,border:'1px solid rgba(255,255,255,.04)'}}>
                <Avatar name={s.student_name} color="#3b82f6"/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,color:'#e2e8f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.student_name}</div>
                  <div style={{fontSize:10,color:'#2d4f6e'}}>{s.department}</div>
                </div>
                <button className={`att-btn ${attendance[s.student_id]||'Present'}`} onClick={()=>toggle(s.student_id)} title="Click to cycle: Present → Absent → Late">
                  {(attendance[s.student_id]||'Present').slice(0,1)}
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={doMark}>✓ Submit Attendance</button>
        </div>
      )}
    </div>
  );
}

/* ══ GRADE ENTRY (Teacher) ════════════════════════════════ */
function GradeEntryPage({user,sections}) {
  const [selSec,setSelSec]=useState('');
  const [roster,setRoster]=useState([]);
  const [attSummary,setAttSummary]=useState([]);
  const [grades,setGrades]=useState({});
  const [msg,setMsg]=useState(null);
  const [submitting,setSubmitting]=useState({});

  useEffect(()=>{
    if (!selSec) return;
    get('/section-roster/'+selSec).then(setRoster).catch(()=>{});
    get('/attendance/section/'+selSec).then(setAttSummary).catch(()=>{});
  },[selSec]);

  const getAtt=sid=>attSummary.find(a=>a.student_id===sid);

  const doGrade=async(sid)=>{
    const grade=grades[sid];
    if (!grade){setMsg({type:'warn',text:'Select a grade first.'});return;}
    setSubmitting(s=>({...s,[sid]:true}));
    try{
      const res=await post('/post-grade',{student_id:sid,section_id:Number(selSec),grade,instructor_id:user.instructor_id});
      setMsg({type:'ok',text:`Grade ${grade} posted for student.`});
    }catch(e){setMsg({type:'err',text:e.message});}
    setSubmitting(s=>({...s,[sid]:false}));
  };

  const GRADES=['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','F'];

  return (
    <div className="page-enter">
      <InfoBox>Grades can only be posted if student attendance ≥ 80%. Posting a grade completes the enrollment.</InfoBox>
      <Msg msg={msg}/>
      <div className="form-group" style={{maxWidth:320,marginBottom:14}}>
        <label className="form-label">Select Section</label>
        <Sel value={selSec} onChange={setSelSec} options={sections.map(s=>({value:String(s.section_id),label:s.course_code+' — '+s.course_title}))} placeholder="Select section…"/>
      </div>
      {roster.length>0&&(
        <div className="card">
          <div className="card-title">Grade Entry — {sections.find(s=>String(s.section_id)===selSec)?.course_title}</div>
          <table className="tbl">
            <thead><tr><th>Student</th><th>Dept</th><th>Attendance</th><th>Eligible</th><th>Grade</th><th>Action</th></tr></thead>
            <tbody>{roster.map(s=>{
              const att=getAtt(s.student_id);
              const eligible=!att||(att.attendance_pct>=80);
              return (
                <tr key={s.student_id}>
                  <td style={{display:'flex',alignItems:'center',gap:8,fontWeight:500,color:'#e2e8f0'}}><Avatar name={s.student_name} color="#3b82f6"/>{s.student_name}</td>
                  <td><span className="pill pill-blue">{s.department}</span></td>
                  <td>{att?<span className={`pill pill-${att.attendance_pct>=80?'green':att.attendance_pct>=60?'amber':'red'}`}>{att.attendance_pct}%</span>:<span className="pill pill-gray">No data</span>}</td>
                  <td>{eligible?<span className="pill pill-green">✓ Yes</span>:<span className="pill pill-red">✕ No</span>}</td>
                  <td>
                    <select className="form-select" style={{width:80,padding:'5px 8px',fontSize:12}} disabled={!eligible} value={grades[s.student_id]||''} onChange={e=>setGrades(g=>({...g,[s.student_id]:e.target.value}))}>
                      <option value="">—</option>
                      {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-approve btn-sm" disabled={!eligible||submitting[s.student_id]} onClick={()=>doGrade(s.student_id)}>
                      {submitting[s.student_id]?<span className="spinner"/>:'Post'}
                    </button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══ AUDIT LOG (Admin) ════════════════════════════════════ */
function AuditLogPage() {
  const [logs,setLogs]=useState([]);
  const [filter,setFilter]=useState('');
  useEffect(()=>{ get('/audit-log').then(setLogs).catch(()=>{}); },[]);
  const filtered=filter?logs.filter(l=>l.action===filter):logs;
  return (
    <div className="page-enter">
      <InfoBox>All database changes are automatically recorded by SQL triggers — INSERT, UPDATE, DELETE.</InfoBox>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        {['','INSERT','UPDATE','DELETE'].map(a=><button key={a} className={'btn btn-ghost btn-sm'+(filter===a?' btn-primary':'')} onClick={()=>setFilter(a)}>{a||'All'}</button>)}
      </div>
      <div className="card">
        <div className="card-title">Audit Trail ({filtered.length} entries)</div>
        <div style={{display:'grid',gridTemplateColumns:'100px 70px 80px 1fr 130px',gap:8,padding:'0 0 8px',marginBottom:8,borderBottom:'1px solid rgba(255,255,255,.05)'}}>
          {['Table','Action','Student','Description','Timestamp'].map(h=><span key={h} style={{fontSize:9.5,fontWeight:700,color:'#2d4f6e',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:"'Syne',sans-serif"}}>{h}</span>)}
        </div>
        <div style={{maxHeight:500,overflowY:'auto'}}>
          {filtered.map(l=>(
            <div key={l.log_id} className="audit-row">
              <span style={{color:'#4a6080',fontSize:11}}>{l.table_name}</span>
              <span className={`audit-action-${l.action}`} style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:10}}>{l.action}</span>
              <span style={{color:'#4a6080',fontSize:11}}>{l.student_id||'—'}</span>
              <div>
                <div style={{color:'#8ab4d4',fontSize:11.5,marginBottom:2}}>{l.description}</div>
                {l.old_value&&<div style={{fontSize:10,color:'#f87171'}}>← {l.old_value}</div>}
                {l.new_value&&<div style={{fontSize:10,color:'#4ade80'}}>→ {l.new_value}</div>}
              </div>
              <span style={{fontSize:10,color:'#1a3050'}}>{String(l.changed_at).slice(0,19).replace('T',' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ SEMESTER ROLLOVER (Admin) ════════════════════════════ */
function SemesterRolloverPage() {
  const [semesters,setSemesters]=useState([]);
  const [form,setForm]=useState({from_semester:'Fall',from_year:2025,to_semester:'Spring',to_year:2026,enroll_start:'2026-01-15',enroll_end:'2026-02-15',drop_end:'2026-03-15',exam_start:'2026-05-01'});
  const [msg,setMsg]=useState(null);
  useEffect(()=>{ get('/semesters').then(setSemesters).catch(()=>{}); },[]);

  const doRollover=async()=>{
    setMsg(null);
    if (!window.confirm(`Archive ${form.from_semester} ${form.from_year} and start ${form.to_semester} ${form.to_year}? This resets all fees and waitlists.`)) return;
    try{const res=await post('/semester-rollover',form);setMsg({type:'ok',text:res.message});get('/semesters').then(setSemesters).catch(()=>{});}
    catch(e){setMsg({type:'err',text:e.message});}
  };

  const F=(k,label,type='text')=>(
    <div className="form-group">
      <label className="form-label">{label}</label>
      {type==='select-sem'
        ?<select className="form-select" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}>
           {['Fall','Spring','Summer'].map(s=><option key={s} value={s}>{s}</option>)}
         </select>
        :<input className="form-input" type={type} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:type==='number'?+e.target.value:e.target.value}))}/>
      }
    </div>
  );

  return (
    <div className="page-enter">
      <div className="msg msg-warn"><span>⚠</span><span>This operation archives the current semester, resets all student fees to unpaid, clears waitlists, and resets instructor section counts. Irreversible.</span></div>
      <Msg msg={msg}/>
      <div className="card">
        <div className="card-title">Archive Current Semester</div>
        <div className="form-row" style={{marginBottom:14}}>
          {F('from_semester','From Semester','select-sem')}
          {F('from_year','Year','number')}
        </div>
        <div className="card-title">Set Up New Semester</div>
        <div className="form-row" style={{marginBottom:10}}>
          {F('to_semester','To Semester','select-sem')}
          {F('to_year','Year','number')}
        </div>
        <div className="form-row" style={{marginBottom:16}}>
          {F('enroll_start','Enroll Start','date')}
          {F('enroll_end','Enroll Deadline','date')}
          {F('drop_end','Drop Deadline','date')}
          {F('exam_start','Exams Start','date')}
        </div>
        <button className="btn btn-danger" style={{padding:'9px 20px',fontSize:13,fontWeight:600}} onClick={doRollover}>⚡ Execute Rollover</button>
      </div>
      <div className="card">
        <div className="card-title">Semester History</div>
        <table className="tbl">
          <thead><tr><th>Semester</th><th>Enroll Deadline</th><th>Drop Deadline</th><th>Exams</th><th>Status</th></tr></thead>
          <tbody>{semesters.map(s=><tr key={s.semester_id}>
            <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{s.semester_name} {s.year}</td>
            <td style={{fontSize:11.5}}>{String(s.enrollment_deadline).slice(0,10)}</td>
            <td style={{fontSize:11.5}}>{String(s.drop_deadline).slice(0,10)}</td>
            <td style={{fontSize:11.5}}>{String(s.exam_start).slice(0,10)}</td>
            <td>{s.is_active?<span className="pill pill-green">Active</span>:<span className="pill pill-gray">Archived</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ══ SHARED PAGES ══════════════════════════════════════════ */
function PrereqTreePage({user}) {
  const [tree,setTree]=useState(null);
  const [completedIds,setCompletedIds]=useState([]);
  useEffect(()=>{
    get('/prereq-tree').then(setTree).catch(()=>{});
    if (user?.student_id) get('/completed-courses/'+user.student_id).then(cc=>setCompletedIds(cc.map(c=>c.course_id))).catch(()=>{});
  },[]);
  return (
    <div className="page-enter">
      <InfoBox>Visual map of course prerequisites. Green = completed. Follow arrows to see what unlocks next.</InfoBox>
      <div className="card">
        <div className="card-title">Course Prerequisite Map</div>
        {tree?<PrereqTree nodes={tree.nodes} edges={tree.edges} completedIds={completedIds}/>
        :<div className="empty"><span className="dot"/><span className="dot"/><span className="dot"/></div>}
      </div>
    </div>
  );
}

/* ══ LOGIN ═════════════════════════════════════════════════ */
const LoginCSS=`
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:radial-gradient(ellipse at 30% 40%,rgba(59,130,246,.07) 0%,transparent 55%),radial-gradient(ellipse at 70% 75%,rgba(139,92,246,.05) 0%,transparent 50%),#060b14}
.login-box{width:410px;background:linear-gradient(145deg,#0d1b2e,#091423);border:1px solid rgba(59,130,246,.13);border-radius:22px;padding:38px;position:relative;overflow:hidden}
.login-box::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.35),transparent)}
`;
function LoginPage({onLogin}) {
  const [role,setRole]=useState('student');
  const [id,setId]=useState('');
  const [pass,setPass]=useState('');
  const [msg,setMsg]=useState(null);
  const [loading,setLoading]=useState(false);
  const colors={student:'#3b82f6',teacher:'#8b5cf6',admin:'#f59e0b'};
  const hints={student:'ID: 1–4  ·  Password: student123',teacher:'ID: 1–3  ·  Password: teacher123',admin:'ID: 0  ·  Password: admin123'};
  const doLogin=async()=>{
    setMsg(null);
    if (!id||!pass){setMsg({type:'err',text:'Fill all fields.'});return;}
    setLoading(true);
    try{const res=await post('/login',{role,id:Number(id),password:pass});onLogin(res);}
    catch(e){setMsg({type:'err',text:e.message});}
    setLoading(false);
  };
  return (
    <div className="login-wrap fade-in">
      <div className="login-box">
        <div style={{textAlign:'center',marginBottom:28}}>
          <div className="logo-mark" style={{fontSize:30,marginBottom:3}}>ENROLLIX</div>
          <div style={{fontSize:11.5,color:'#2d4f6e',letterSpacing:'.05em'}}>University Course Management System</div>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:22,background:'rgba(255,255,255,.03)',borderRadius:11,padding:3}}>
          {['student','teacher','admin'].map(r=>(
            <button key={r} onClick={()=>setRole(r)} style={{flex:1,padding:'7px 0',border:role===r?`1px solid ${colors[r]}44`:'1px solid transparent',borderRadius:8,fontSize:11.5,fontWeight:500,cursor:'pointer',transition:'all .18s',background:role===r?`${colors[r]}18`:'transparent',color:role===r?colors[r]:'#2d4f6e',fontFamily:'Inter,sans-serif',textTransform:'capitalize'}}>
              {r==='student'?'🎓':r==='teacher'?'👨‍🏫':'⚙️'} {r}
            </button>
          ))}
        </div>
        <Msg msg={msg}/>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
          <div className="form-group">
            <label className="form-label">{role==='student'?'Student ID':role==='teacher'?'Instructor ID':'Admin ID'}</label>
            <input className="form-input" type="number" placeholder={role==='admin'?'0':'Enter your ID'} value={id} onChange={e=>setId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Enter password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
          </div>
        </div>
        <div style={{fontSize:11,color:'#1a3050',marginBottom:16,padding:'7px 11px',background:'rgba(255,255,255,.02)',borderRadius:7}}>💡 {hints[role]}</div>
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'10px'}} onClick={doLogin} disabled={loading}>
          {loading?<><span className="spinner"/>&nbsp;Signing in…</>:'Sign In →'}
        </button>
      </div>
    </div>
  );
}

/* ══ NAV CONFIG ════════════════════════════════════════════ */
const NAV={
  student:[
    {key:'dashboard',label:'Dashboard',icon:'⊞',group:'Main'},
    {key:'courses',label:'Browse Courses',icon:'📚',group:'Main'},
    {key:'prereq',label:'Prerequisite Map',icon:'🌳',group:'Main'},
    {key:'enroll',label:'Enroll',icon:'✚',group:'Enrollment'},
    {key:'drop',label:'Drop Course',icon:'✖',group:'Enrollment'},
    {key:'waitlist',label:'Waiting List',icon:'⏳',group:'Enrollment'},
    {key:'swap',label:'Swap Request',icon:'⇄',group:'Enrollment'},
    {key:'completed',label:'Completed Courses',icon:'🎓',group:'Academic'},
    {key:'transcript',label:'Transcript',icon:'📄',group:'Academic'},
    {key:'attendance',label:'My Attendance',icon:'📅',group:'Academic'},
    {key:'rate',label:'Rate Instructor',icon:'⭐',group:'Academic'},
    {key:'fees',label:'Fees',icon:'💰',group:'Account'},
    {key:'announcements',label:'Announcements',icon:'📢',group:'Account'},
  ],
  teacher:[
    {key:'dashboard',label:'Dashboard',icon:'⊞',group:'Main'},
    {key:'roster',label:'Class Roster',icon:'👥',group:'Teaching'},
    {key:'attendance',label:'Mark Attendance',icon:'📅',group:'Teaching'},
    {key:'grades',label:'Post Grades',icon:'✏️',group:'Teaching'},
    {key:'announce',label:'Announcements',icon:'📢',group:'Teaching'},
    {key:'myratings',label:'My Ratings',icon:'⭐',group:'Account'},
    {key:'prereq',label:'Course Map',icon:'🌳',group:'Tools'},
  ],
  admin:[
    {key:'dashboard',label:'Dashboard',icon:'⊞',group:'Main'},
    {key:'swaps',label:'Swap Requests',icon:'⇄',group:'Management'},
    {key:'rollover',label:'Semester Rollover',icon:'⚡',group:'Management'},
    {key:'reports',label:'Reports & Views',icon:'📊',group:'Reports'},
    {key:'audit',label:'Audit Log',icon:'🔍',group:'Reports'},
    {key:'validators',label:'Validators',icon:'✓',group:'Reports'},
    {key:'prereq',label:'Course Map',icon:'🌳',group:'Tools'},
  ],
};

/* ══ STUDENT DASHBOARD ════════════════════════════════════ */
function StudentDashboard({user,courses,enrollments,waitingList,announcements,cgpa}) {
  const active=enrollments.filter(e=>e.status==='Registered');
  const creditUsed=active.reduce((s,e)=>s+(e.credit_hours||0),0);
  return (
    <div className="page-enter">
      <div style={{marginBottom:16,padding:'14px 18px',background:'linear-gradient(135deg,rgba(59,130,246,.07),rgba(139,92,246,.04))',border:'1px solid rgba(59,130,246,.11)',borderRadius:13,display:'flex',alignItems:'center',gap:13,flexWrap:'wrap'}}>
        <Avatar name={user.name} color="#3b82f6"/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14.5,color:'#e2e8f0'}}>Welcome back, {user.name.split(' ')[0]}! 👋</div>
          <div style={{fontSize:11.5,color:'#4a6080',marginTop:2}}>{user.department} · Semester {user.semester}</div>
        </div>
        {cgpa&&<CGPAGauge cgpa={cgpa.cgpa||0}/>}
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11,color:user.fees_paid?'#4ade80':'#f87171',fontWeight:600}}>{user.fees_paid?'✓ Fees Paid':'✕ Fees Unpaid'}</div>
          <div style={{fontSize:10,color:'#1a3050',marginTop:2}}>{user.fees_paid?'Enrollment enabled':'Pay fees to enroll'}</div>
        </div>
      </div>
      <div className="stat-grid">
        {[{icon:'📚',num:active.length,label:'Enrolled',color:'#3b82f6'},{icon:'⏳',num:waitingList.length,label:'Waitlisted',color:'#f59e0b'},{icon:'🎯',num:`${creditUsed}/${user.max_credit_limit}`,label:'Credits',color:'#8b5cf6'},{icon:'🎓',num:cgpa?.courses_completed||0,label:'Completed',color:'#22c55e'}].map(s=>(
          <div key={s.label} className="stat-card"><span className="stat-icon">{s.icon}</span><div className="stat-num" style={{color:s.color}}>{s.num}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="card">
          <div className="card-title">Active Enrollments</div>
          {active.length===0?<div className="empty"><span className="empty-icon">📋</span>None yet.</div>
          :<table className="tbl"><thead><tr><th>Course</th><th>Instructor</th><th>Cr</th></tr></thead>
          <tbody>{active.map((e,i)=><tr key={i}><td style={{fontWeight:500}}>{e.course_title||'—'}</td><td style={{color:'#4a6080',fontSize:11}}>{e.instructor||'—'}</td><td><span className="pill pill-purple">{e.credit_hours||3}</span></td></tr>)}</tbody></table>}
        </div>
        <div className="card">
          <div className="card-title">Latest Announcements</div>
          {announcements.slice(0,2).length===0?<div className="empty"><span className="empty-icon">📢</span>None.</div>
          :announcements.slice(0,2).map(a=>(
            <div key={a.announcement_id} className="announcement">
              <div className="ann-title">{a.title}</div>
              <div className="ann-meta"><span>{a.instructor}</span>·<span className="pill pill-teal" style={{fontSize:9}}>{a.course_title}</span></div>
              <div className="ann-body">{a.body.slice(0,90)}{a.body.length>90?'…':''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ TEACHER DASHBOARD ════════════════════════════════════ */
function TeacherDashboard({user,sections,announcements,ratings}) {
  const myAnn=announcements.filter(a=>a.instructor===user.name);
  const myRating=ratings.find(r=>r.instructor_id===user.instructor_id);
  const totalStudents=sections.reduce((s,sec)=>s+(sec.total_seats-sec.available_seats),0);
  return (
    <div className="page-enter">
      <div style={{marginBottom:16,padding:'14px 18px',background:'linear-gradient(135deg,rgba(139,92,246,.07),rgba(59,130,246,.04))',border:'1px solid rgba(139,92,246,.11)',borderRadius:13,display:'flex',alignItems:'center',gap:13,flexWrap:'wrap'}}>
        <Avatar name={user.name} color="#8b5cf6"/>
        <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14.5,color:'#e2e8f0'}}>Welcome, {user.name}! 👨‍🏫</div><div style={{fontSize:11.5,color:'#4a6080',marginTop:2}}>{user.department} Department</div></div>
        {myRating&&<div style={{marginLeft:'auto',textAlign:'right'}}><Stars value={Math.round(myRating.avg_rating)} readonly size="sm"/><div style={{fontSize:10,color:'#2d4f6e',marginTop:2}}>{Number(myRating.avg_rating).toFixed(1)} avg · {myRating.total_ratings} reviews</div></div>}
      </div>
      <div className="stat-grid">
        {[{icon:'📖',num:sections.length,label:'Sections',color:'#8b5cf6'},{icon:'👥',num:totalStudents,label:'Students',color:'#3b82f6'},{icon:'💺',num:sections.reduce((s,sec)=>s+sec.available_seats,0),label:'Open Seats',color:'#22c55e'},{icon:'📢',num:myAnn.length,label:'Announcements',color:'#f59e0b'}].map(s=>(
          <div key={s.label} className="stat-card"><span className="stat-icon">{s.icon}</span><div className="stat-num" style={{color:s.color}}>{s.num}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">My Sections</div>
        <table className="tbl"><thead><tr><th>Course</th><th>Semester</th><th>Enrolled</th><th>Seats</th></tr></thead>
        <tbody>{sections.map(s=><tr key={s.section_id}><td style={{fontWeight:500,color:'#e2e8f0'}}>{s.course_title}</td><td><span className="pill pill-blue">{s.semester_name} {s.year}</span></td><td style={{textAlign:'center'}}>{s.total_seats-s.available_seats}</td><td><SeatsBar avail={s.available_seats} total={s.total_seats}/></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ══ ADMIN DASHBOARD ══════════════════════════════════════ */
function AdminDashboard({students,courses,instructors,swapRequests}) {
  const pending=swapRequests.filter(s=>s.status==='Pending');
  const unpaid=students.filter(s=>!s.fees_paid);
  return (
    <div className="page-enter">
      <div className="stat-grid">
        {[{icon:'🎓',num:students.length,label:'Students',color:'#3b82f6'},{icon:'👨‍🏫',num:instructors.length,label:'Instructors',color:'#8b5cf6'},{icon:'📚',num:[...new Set(courses.map(c=>c.course_id))].length,label:'Courses',color:'#22c55e'},{icon:'🔄',num:pending.length,label:'Pending Swaps',color:'#f59e0b'}].map(s=>(
          <div key={s.label} className="stat-card"><span className="stat-icon">{s.icon}</span><div className="stat-num" style={{color:s.color}}>{s.num}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="card">
          <div className="card-title">Fee Status</div>
          <div style={{display:'flex',gap:10,marginBottom:12}}>
            <div style={{flex:1,background:'rgba(34,197,94,.05)',border:'1px solid rgba(34,197,94,.1)',borderRadius:9,padding:12,textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:'#4ade80',fontFamily:"'Syne',sans-serif"}}>{students.filter(s=>s.fees_paid).length}</div><div style={{fontSize:10,color:'#2d4f6e'}}>Paid</div></div>
            <div style={{flex:1,background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.1)',borderRadius:9,padding:12,textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:'#f87171',fontFamily:"'Syne',sans-serif"}}>{unpaid.length}</div><div style={{fontSize:10,color:'#2d4f6e'}}>Unpaid</div></div>
          </div>
          <table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Status</th></tr></thead>
          <tbody>{students.map(s=><tr key={s.student_id}><td style={{fontWeight:500,color:'#e2e8f0'}}>{s.name}</td><td><span className="pill pill-blue">{s.department}</span></td><td><Pill s={s.fees_paid?'Paid':'Unpaid'}/></td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <div className="card-title">Course Load</div>
          <table className="tbl"><thead><tr><th>Course</th><th>Instructor</th><th>Seats</th></tr></thead>
          <tbody>{courses.slice(0,6).map(c=><tr key={c.section_id}><td style={{color:'#3b82f6',fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11}}>{c.course_code}</td><td style={{color:'#6b8aad',fontSize:11.5}}>{c.instructor}</td><td><SeatsBar avail={c.available_seats} total={c.total_seats}/></td></tr>)}</tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/* ══ ADMIN REPORTS ════════════════════════════════════════ */
function AdminReports({students,instructors,courses}) {
  const [tab,setTab]=useState('enrollment');
  const [stats,setStats]=useState([]);const [top,setTop]=useState([]);const [enrRpt,setEnrRpt]=useState([]);const [activity,setActivity]=useState([]);const [ratings,setRatings]=useState([]);const [cgpaAll,setCgpaAll]=useState([]);
  useEffect(()=>{
    get('/course-stats').then(setStats).catch(()=>{});
    get('/top-students').then(setTop).catch(()=>{});
    get('/student-report').then(setEnrRpt).catch(()=>{});
    get('/student-activity').then(setActivity).catch(()=>{});
    get('/teacher-ratings').then(setRatings).catch(()=>{});
    get('/cgpa-all').then(setCgpaAll).catch(()=>{});
  },[]);
  const tabs=[['enrollment','Enrollments'],['cgpa','CGPA Ranking'],['instructors','Instructors'],['stats','Course Stats'],['top','Top Students'],['activity','Activity'],['ratings','Ratings']];
  return (
    <div className="page-enter">
      <div className="tab-row">{tabs.map(([k,l])=><button key={k} className={'tab-btn'+(tab===k?' active':'')} onClick={()=>setTab(k)}>{l}</button>)}</div>
      {tab==='enrollment'&&<div className="card"><div className="card-title">Student Enrollment — via vw_EnrollmentReport</div><table className="tbl"><thead><tr><th>ID</th><th>Student</th><th>Dept</th><th>Course</th><th>Status</th></tr></thead><tbody>{enrRpt.map((e,i)=><tr key={i}><td style={{color:'#334d69'}}>{e.student_id}</td><td style={{fontWeight:500,color:'#e2e8f0'}}>{e.student_name}</td><td><span className="pill pill-blue">{e.department}</span></td><td style={{color:'#6b8aad'}}>{e.course_title||'—'}</td><td><Pill s={e.status||'—'}/></td></tr>)}</tbody></table></div>}
      {tab==='cgpa'&&<div className="card"><div className="card-title">CGPA Rankings — via vw_StudentCGPA</div><table className="tbl"><thead><tr><th>Rank</th><th>Student</th><th>Dept</th><th>Courses</th><th>Credits</th><th>CGPA</th></tr></thead><tbody>{cgpaAll.map((c,i)=><tr key={c.student_id}><td style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#fbbf24'}}>#{i+1}</td><td style={{fontWeight:500,color:'#e2e8f0'}}>{c.student_name}</td><td><span className="pill pill-blue">{c.department}</span></td><td style={{textAlign:'center'}}>{c.courses_completed}</td><td style={{textAlign:'center'}}>{c.total_credits_earned}</td><td><CGPAGauge cgpa={c.cgpa||0}/></td></tr>)}</tbody></table></div>}
      {tab==='instructors'&&<div className="card"><div className="card-title">Instructor Workload — via vw_InstructorWorkload</div><table className="tbl"><thead><tr><th>Name</th><th>Dept</th><th>Sections</th><th>Students</th><th>Cap Left</th><th>Rating</th></tr></thead><tbody>{instructors.map(i=><tr key={i.instructor_id}><td style={{fontWeight:500,color:'#e2e8f0'}}>{i.name}</td><td>{i.department}</td><td style={{textAlign:'center'}}>{i.total_sections||i.sections_assigned}</td><td style={{textAlign:'center'}}>{i.total_students||'—'}</td><td><span className={`pill pill-${(i.remaining_capacity>0?'green':'red')}`}>{i.remaining_capacity}</span></td><td><Stars value={Math.round(i.avg_rating||0)} readonly size="sm"/>&nbsp;<span style={{fontSize:10,color:'#2d4f6e'}}>{Number(i.avg_rating||0).toFixed(1)}</span></td></tr>)}</tbody></table></div>}
      {tab==='stats'&&<div className="card"><div className="card-title">Course Stats — via vw_CourseStats</div><table className="tbl"><thead><tr><th>Code</th><th>Title</th><th>Sections</th><th>Taken</th><th>Remaining</th><th>Avg</th></tr></thead><tbody>{stats.map(r=><tr key={r.course_code}><td style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#3b82f6'}}>{r.course_code}</td><td>{r.course_title}</td><td style={{textAlign:'center'}}>{r.total_sections}</td><td style={{textAlign:'center'}}>{r.seats_taken}</td><td style={{textAlign:'center'}}>{r.seats_remaining}</td><td style={{textAlign:'center',color:'#6b8aad'}}>{r.avg_available}</td></tr>)}</tbody></table></div>}
      {tab==='top'&&<div className="card"><div className="card-title">Grade A Students</div><table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Course</th><th>Grade</th></tr></thead><tbody>{top.map((r,i)=><tr key={i}><td style={{fontWeight:500,color:'#e2e8f0'}}>{r.student_name}</td><td><span className="pill pill-blue">{r.department}</span></td><td style={{color:'#6b8aad'}}>{r.course_title}</td><td><span className="pill pill-green">A</span></td></tr>)}</tbody></table></div>}
      {tab==='activity'&&<div className="card"><div className="card-title">Student Activity — via vw_StudentActivity</div><table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Active</th><th>Waitlist</th><th>Credits</th><th>Fees</th></tr></thead><tbody>{activity.map(a=><tr key={a.student_id}><td style={{fontWeight:500,color:'#e2e8f0'}}>{a.student_name}</td><td><span className="pill pill-blue">{a.department}</span></td><td style={{textAlign:'center'}}>{a.active_enrollments}</td><td style={{textAlign:'center'}}>{a.waitlist_positions}</td><td><span className="pill pill-purple">{a.registered_credits} cr</span></td><td><Pill s={a.fees_paid?'Paid':'Unpaid'}/></td></tr>)}</tbody></table></div>}
      {tab==='ratings'&&<div className="card"><div className="card-title">Ratings — via vw_TeacherRatings</div><table className="tbl"><thead><tr><th>Instructor</th><th>Dept</th><th>Avg</th><th>Reviews</th><th>5★</th><th>4★</th><th>≤3★</th></tr></thead><tbody>{ratings.map(r=><tr key={r.instructor_id}><td style={{fontWeight:500,color:'#e2e8f0'}}>{r.name}</td><td><span className="pill pill-purple">{r.department}</span></td><td><Stars value={Math.round(r.avg_rating)} readonly size="sm"/>&nbsp;<span style={{fontSize:10,color:'#2d4f6e'}}>{Number(r.avg_rating).toFixed(1)}</span></td><td style={{textAlign:'center'}}>{r.total_ratings}</td><td style={{color:'#4ade80',textAlign:'center'}}>{r.five_star}</td><td style={{color:'#60a5fa',textAlign:'center'}}>{r.four_star}</td><td style={{color:'#f87171',textAlign:'center'}}>{r.three_star+r.low_rated}</td></tr>)}</tbody></table></div>}
    </div>
  );
}

/* ══ STUB PAGES (imported from previous version) ══════════ */
// These are abbreviated — they reuse the same logic as before
function BrowseCourses({courses}){const[kw,setKw]=useState('');const f=courses.filter(c=>c.course_title?.toLowerCase().includes(kw.toLowerCase())||c.course_code?.toLowerCase().includes(kw.toLowerCase()));return(<div className="page-enter"><InfoBox>All courses with live seat counts.</InfoBox><input className="form-input" style={{maxWidth:280,marginBottom:14}} placeholder="🔍 Search…" value={kw} onChange={e=>setKw(e.target.value)}/><div className="card"><table className="tbl"><thead><tr><th>Code</th><th>Title</th><th>Cr</th><th>Dept</th><th>Instructor</th><th>Seats</th><th>Status</th></tr></thead><tbody>{f.map(c=><tr key={c.section_id}><td style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#3b82f6'}}>{c.course_code}</td><td style={{fontWeight:500,color:'#e2e8f0'}}>{c.course_title}</td><td><span className="pill pill-purple">{c.credit_hours}</span></td><td style={{color:'#4a6080'}}>{c.department}</td><td style={{color:'#6b8aad'}}>{c.instructor}</td><td><SeatsBar avail={c.available_seats} total={c.total_seats}/></td><td><Pill s={c.available_seats===0?'Full':'Open'}/></td></tr>)}</tbody></table></div></div>);}

function EnrollPage({user,courses,onAction}){const[secId,setSecId]=useState('');const[msg,setMsg]=useState(null);const[loading,setLoading]=useState(false);const avail=courses.filter(c=>c.available_seats>0);const doEnroll=async()=>{setMsg(null);if(!secId){setMsg({type:'warn',text:'Select a section.'});return;}if(!user.fees_paid){setMsg({type:'err',text:'Fees not paid.'});return;}setLoading(true);try{const res=await post('/enroll',{student_id:user.student_id,section_id:Number(secId)});setMsg({type:'ok',text:res.message});setSecId('');onAction();}catch(e){setMsg({type:'err',text:e.message});}setLoading(false);};return(<div className="page-enter"><InfoBox>Checks: fees · duplicate · seat · prerequisites · credit limit · repeat course block.</InfoBox>{!user.fees_paid&&<div className="msg msg-err"><span>✕</span><span>Fees unpaid — enrollment blocked.</span></div>}<Msg msg={msg}/><div className="card"><div className="card-title">New Enrollment</div><div className="form-row"><div className="form-group"><label className="form-label">Section ({avail.length} available)</label><Sel value={secId} onChange={setSecId} options={avail.map(c=>({value:String(c.section_id),label:c.course_code+' · '+c.course_title+' ('+c.available_seats+' seats)'}))} placeholder="Select section…" disabled={!user.fees_paid}/></div><button className="btn btn-primary" onClick={doEnroll} disabled={loading||!user.fees_paid}>{loading?<><span className="spinner"/>Enrolling…</>:'+ Enroll'}</button></div></div></div>);}

function DropPage({user,enrollments,onAction}){const[secId,setSecId]=useState('');const[msg,setMsg]=useState(null);const[history,setHistory]=useState([]);const active=enrollments.filter(e=>e.student_id===user.student_id&&e.status==='Registered');const doDrop=async()=>{setMsg(null);if(!secId){setMsg({type:'warn',text:'Select a section.'});return;}try{const res=await post('/drop',{student_id:user.student_id,section_id:Number(secId)});const c=active.find(e=>String(e.section_id)===secId)?.course_title||'Section '+secId;setHistory(h=>[{c,r:res.message},...h]);setMsg({type:'ok',text:res.message});setSecId('');onAction();}catch(e){setMsg({type:'err',text:e.message});}}; return(<div className="page-enter"><InfoBox>Dropping frees the seat. First waitlisted student is auto-enrolled.</InfoBox><Msg msg={msg}/><div className="card"><div className="card-title">Drop a Course</div><div className="form-row"><div className="form-group"><label className="form-label">Section</label><Sel value={secId} onChange={setSecId} options={active.map(e=>({value:String(e.section_id),label:e.course_title||'Sec '+e.section_id}))} placeholder="Select…"/></div><button className="btn btn-danger" style={{padding:'8px 18px',fontSize:12.5}} onClick={doDrop}>Drop</button></div></div>{history.length>0&&<div className="card"><div className="card-title">History</div><table className="tbl"><thead><tr><th>Course</th><th>Result</th></tr></thead><tbody>{history.map((h,i)=><tr key={i}><td>{h.c}</td><td style={{fontSize:11.5,color:'#4a6080'}}>{h.r}</td></tr>)}</tbody></table></div>}</div>);}

function WaitlistPage({user,courses,waitingList,onAction}){const[secId,setSecId]=useState('');const[msg,setMsg]=useState(null);const full=courses.filter(c=>c.available_seats===0);const mine=waitingList.filter(w=>w.student_id===user.student_id);const doAdd=async()=>{setMsg(null);if(!secId){setMsg({type:'warn',text:'Select a section.'});return;}try{const res=await post('/waiting-list',{student_id:user.student_id,section_id:Number(secId)});setMsg({type:'ok',text:res.message});setSecId('');onAction();}catch(e){setMsg({type:'err',text:e.message});};};const doRem=async id=>{try{await del('/waiting-list/'+id);onAction();}catch(e){alert(e.message);}};return(<div className="page-enter"><InfoBox>Join the waitlist — auto-enrolled when seat opens.</InfoBox><Msg msg={msg}/><div className="card"><div className="card-title">Join Waitlist</div><div className="form-row"><div className="form-group"><label className="form-label">Full Section</label><Sel value={secId} onChange={setSecId} options={full.map(c=>({value:String(c.section_id),label:c.course_code+' · '+c.course_title+' (Full)'}))} placeholder="Select…"/></div><button className="btn btn-primary" onClick={doAdd}>+ Join</button></div></div><div className="card"><div className="card-title">My Waitlist ({mine.length})</div>{mine.length===0?<div className="empty"><span className="empty-icon">⏳</span>Not on any waitlist.</div>:<table className="tbl"><thead><tr><th>Pos</th><th>Course</th><th>Date</th><th>Action</th></tr></thead><tbody>{mine.map(w=>{const sec=courses.find(c=>c.section_id===w.section_id);return(<tr key={w.waiting_id}><td style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:'#3b82f6'}}>#{w.position}</td><td style={{fontWeight:500,color:'#e2e8f0'}}>{sec?.course_title||'Sec '+w.section_id}</td><td style={{color:'#4a6080',fontSize:11}}>{String(w.request_date).slice(0,10)}</td><td><button className="btn btn-danger btn-sm" onClick={()=>doRem(w.waiting_id)}>Leave</button></td></tr>);})}</tbody></table>}</div></div>);}

function RateTeacherPage({user,courses}){const[iid,setIid]=useState('');const[rating,setRating]=useState(0);const[comment,setComment]=useState('');const[msg,setMsg]=useState(null);const[allR,setAllR]=useState([]);const[myRated,setMyRated]=useState([]);useEffect(()=>{get('/teacher-ratings').then(setAllR).catch(()=>{});get('/my-rated-instructors/'+user.student_id).then(setMyRated).catch(()=>{});},[]);const myIns=[...new Map(courses.filter(c=>c.instructor_id).map(c=>[c.instructor_id,c])).values()];const doRate=async()=>{setMsg(null);if(!iid){setMsg({type:'warn',text:'Select instructor.'});return;}if(rating===0){setMsg({type:'warn',text:'Give a star rating.'});return;}try{const res=await post('/rate-teacher',{student_id:user.student_id,instructor_id:Number(iid),rating,comment});setMsg({type:'ok',text:res.message});setRating(0);setComment('');setIid('');get('/teacher-ratings').then(setAllR).catch(()=>{});get('/my-rated-instructors/'+user.student_id).then(setMyRated).catch(()=>{});}catch(e){setMsg({type:'err',text:e.message});};};return(<div className="page-enter"><InfoBox>Rate instructors of courses you are enrolled in.</InfoBox><Msg msg={msg}/><div className="card"><div className="card-title">Submit Rating</div><div className="form-row" style={{marginBottom:12}}><div className="form-group"><label className="form-label">Instructor</label><Sel value={iid} onChange={setIid} options={myIns.map(c=>({value:String(c.instructor_id),label:c.instructor+(myRated.includes(c.instructor_id)?' ✓':'')}))}/></div></div><div style={{marginBottom:12}}><div className="form-label" style={{marginBottom:6}}>Rating</div><Stars value={rating} onChange={setRating}/></div><div className="form-group" style={{marginBottom:14}}><label className="form-label">Comment</label><textarea className="form-textarea" placeholder="Your feedback…" value={comment} onChange={e=>setComment(e.target.value)}/></div><button className="btn btn-primary" onClick={doRate}>Submit</button></div><div className="card"><div className="card-title">All Ratings</div><table className="tbl"><thead><tr><th>Instructor</th><th>Dept</th><th>Rating</th><th>Reviews</th></tr></thead><tbody>{allR.map(r=><tr key={r.instructor_id}><td style={{fontWeight:500,color:'#e2e8f0'}}>{r.name}</td><td><span className="pill pill-blue">{r.department}</span></td><td><Stars value={Math.round(r.avg_rating)} readonly size="sm"/>&nbsp;<span style={{fontSize:10,color:'#2d4f6e'}}>{Number(r.avg_rating).toFixed(1)}</span></td><td style={{textAlign:'center'}}>{r.total_ratings}</td></tr>)}</tbody></table></div></div>);}

function FeesPage({user,onUserRefresh}){const[msg,setMsg]=useState(null);const[payments,setPayments]=useState([]);const[loading,setLoading]=useState(false);useEffect(()=>{get('/fee-payments/'+user.student_id).then(setPayments).catch(()=>{});},[]);const doPay=async()=>{setLoading(true);setMsg(null);try{const res=await post('/pay-fees',{student_id:user.student_id,amount:25000,semester:'Fall',year:2025});setMsg({type:'ok',text:res.message});get('/fee-payments/'+user.student_id).then(setPayments).catch(()=>{});onUserRefresh();}catch(e){setMsg({type:'err',text:e.message});}setLoading(false);};return(<div className="page-enter"><Msg msg={msg}/><div className={user.fees_paid?'fee-paid':'fee-unpaid'} style={{marginBottom:14}}><span style={{fontSize:26}}>{user.fees_paid?'✅':'❌'}</span><div><div style={{fontWeight:600,fontSize:13.5,color:user.fees_paid?'#4ade80':'#f87171'}}>{user.fees_paid?'Fees Paid':'Fees Unpaid'}</div><div style={{fontSize:12,color:'#4a6080',marginTop:2}}>{user.fees_paid?'Enrollment enabled':'Pay to enable enrollment.'}</div></div>{!user.fees_paid&&<button className="btn btn-success" style={{marginLeft:'auto'}} onClick={doPay} disabled={loading}>{loading?<><span className="spinner"/>Processing…</>:'Pay Rs. 25,000'}</button>}</div><div className="card"><div className="card-title">Payment History</div>{payments.length===0?<div className="empty"><span className="empty-icon">💰</span>No records.</div>:<table className="tbl"><thead><tr><th>#</th><th>Amount</th><th>Semester</th><th>Date</th></tr></thead><tbody>{payments.map(p=><tr key={p.payment_id}><td>#{p.payment_id}</td><td style={{color:'#4ade80',fontWeight:600}}>Rs. {Number(p.amount).toLocaleString()}</td><td><span className="pill pill-blue">{p.semester} {p.year}</span></td><td style={{color:'#4a6080',fontSize:11.5}}>{String(p.payment_date).slice(0,10)}</td></tr>)}</tbody></table>}</div></div>);}

function AnnouncementsPage({announcements}){return(<div className="page-enter"><InfoBox>Announcements from all your instructors.</InfoBox>{announcements.length===0?<div className="empty"><span className="empty-icon">📢</span>None yet.</div>:announcements.map(a=><div key={a.announcement_id} className="announcement" style={{marginBottom:11}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5}}><div className="ann-title">{a.title}</div><span style={{fontSize:10,color:'#1a3050'}}>{String(a.posted_date).slice(0,10)}</span></div><div className="ann-meta"><Avatar name={a.instructor} color="#8b5cf6"/><span style={{color:'#a78bfa',fontWeight:500}}>{a.instructor}</span>·<span className="pill pill-teal">{a.course_title}</span></div><div className="ann-body">{a.body}</div></div>)}
</div>);}

function SwapPage({user,courses,onAction}){const[s2,setS2]=useState('');const[cid,setCid]=useState('');const[msg,setMsg]=useState(null);const[swaps,setSwaps]=useState([]);const uniq=[...new Map(courses.map(c=>[c.course_id,c])).values()];useEffect(()=>{get('/swap-requests').then(setSwaps).catch(()=>{});},[]);const doSwap=async()=>{setMsg(null);if(!s2||!cid){setMsg({type:'warn',text:'Fill all fields.'});return;}try{const res=await post('/swap',{student1_id:user.student_id,student2_id:Number(s2),course_id:Number(cid)});setMsg({type:'ok',text:res.message});setS2('');setCid('');get('/swap-requests').then(setSwaps).catch(()=>{});}catch(e){setMsg({type:'err',text:e.message});};};const mine=swaps.filter(sw=>sw.student1===user.name||sw.student2===user.name);return(<div className="page-enter"><InfoBox>Request section swap with another student for same course.</InfoBox><Msg msg={msg}/><div className="card"><div className="card-title">Request Swap</div><div className="form-row"><div className="form-group"><label className="form-label">Other Student ID</label><input className="form-input" type="number" placeholder="Their student ID" value={s2} onChange={e=>setS2(e.target.value)}/></div><div className="form-group"><label className="form-label">Course</label><Sel value={cid} onChange={setCid} options={uniq.map(c=>({value:String(c.course_id),label:c.course_title}))}/></div><button className="btn btn-primary" onClick={doSwap}>Request</button></div></div><div className="card"><div className="card-title">My Swaps</div>{mine.length===0?<div className="empty"><span className="empty-icon">🔄</span>None.</div>:<table className="tbl"><thead><tr><th>With</th><th>Course</th><th>Date</th><th>Status</th></tr></thead><tbody>{mine.map(sw=><tr key={sw.swap_id}><td>{sw.student1===user.name?sw.student2:sw.student1}</td><td>{sw.course_title}</td><td style={{color:'#4a6080',fontSize:11}}>{String(sw.request_date).slice(0,10)}</td><td><Pill s={sw.status}/></td></tr>)}</tbody></table>}</div></div>);}

function TeacherRoster({user,sections}){const[selSec,setSelSec]=useState('');const[roster,setRoster]=useState([]);useEffect(()=>{if(!selSec)return;get('/section-roster/'+selSec).then(setRoster).catch(()=>{});},[selSec]);return(<div className="page-enter"><InfoBox>View enrolled students for each of your sections.</InfoBox><div className="form-group" style={{maxWidth:320,marginBottom:14}}><label className="form-label">Section</label><Sel value={selSec} onChange={setSelSec} options={sections.map(s=>({value:String(s.section_id),label:s.course_code+' — '+s.course_title}))} placeholder="Pick section…"/></div>{selSec&&<div className="card"><div className="card-title">Roster</div>{roster.length===0?<div className="empty"><span className="empty-icon">👥</span>No students.</div>:<table className="tbl"><thead><tr><th>Student</th><th>Dept</th><th>Email</th><th>Enrolled</th></tr></thead><tbody>{roster.map((r,i)=><tr key={i}><td style={{display:'flex',alignItems:'center',gap:8,fontWeight:500,color:'#e2e8f0'}}><Avatar name={r.student_name} color="#3b82f6"/>{r.student_name}</td><td><span className="pill pill-blue">{r.department}</span></td><td style={{color:'#4a6080',fontSize:11}}>{r.email}</td><td style={{color:'#4a6080',fontSize:11}}>{String(r.enrollment_date||'').slice(0,10)}</td></tr>)}</tbody></table>}</div>}</div>);}

function PostAnnouncement({user,sections,onAction}){const[secId,setSecId]=useState('');const[title,setTitle]=useState('');const[body,setBody]=useState('');const[msg,setMsg]=useState(null);const doPost=async()=>{setMsg(null);if(!secId||!title||!body){setMsg({type:'warn',text:'Fill all fields.'});return;}try{const res=await post('/announcements',{instructor_id:user.instructor_id,section_id:Number(secId),title,body});setMsg({type:'ok',text:res.message});setTitle('');setBody('');setSecId('');onAction();}catch(e){setMsg({type:'err',text:e.message});};};return(<div className="page-enter"><Msg msg={msg}/><div className="card"><div className="card-title">Post Announcement</div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Section</label><Sel value={secId} onChange={setSecId} options={sections.map(s=>({value:String(s.section_id),label:s.course_code+' — '+s.course_title}))} placeholder="Select…"/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Title</label><input className="form-input" placeholder="Announcement title" value={title} onChange={e=>setTitle(e.target.value)}/></div><div className="form-group" style={{marginBottom:14}}><label className="form-label">Message</label><textarea className="form-textarea" rows={4} placeholder="Write your message…" value={body} onChange={e=>setBody(e.target.value)}/></div><button className="btn btn-primary" onClick={doPost}>📢 Post</button></div></div>);}

function MyRatingsPage({user}){const[ratings,setRatings]=useState([]);const[summary,setSummary]=useState(null);useEffect(()=>{get('/teacher-ratings/'+user.instructor_id).then(setRatings).catch(()=>{});get('/teacher-ratings').then(all=>{setSummary(all.find(r=>r.instructor_id===user.instructor_id)||null);}).catch(()=>{});},[]);return(<div className="page-enter">{summary&&<div className="card" style={{display:'flex',gap:22,alignItems:'flex-start',flexWrap:'wrap'}}><div style={{textAlign:'center',minWidth:100}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:44,fontWeight:800,color:'#fbbf24',lineHeight:1}}>{Number(summary.avg_rating).toFixed(1)}</div><Stars value={Math.round(summary.avg_rating)} readonly/><div style={{fontSize:10,color:'#2d4f6e',marginTop:3}}>{summary.total_ratings} reviews</div></div><div style={{flex:1}}><div className="card-title" style={{marginBottom:8}}>Breakdown</div>{[5,4,3,2,1].map(star=>{const count=star===5?summary.five_star:star===4?summary.four_star:star===3?summary.three_star:summary.low_rated;const pct=summary.total_ratings>0?Math.round((count/summary.total_ratings)*100):0;return(<div key={star} className="rating-bar-wrap"><div className="rating-label" style={{fontSize:10,color:'#2d4f6e',width:36}}>{star} ★</div><div className="rating-bar"><div className="rating-fill" style={{width:pct+'%'}}/></div><div style={{fontSize:10,color:'#2d4f6e',width:28,textAlign:'right'}}>{count}</div></div>);})}</div></div>}<div className="card"><div className="card-title">Reviews ({ratings.length})</div>{ratings.length===0?<div className="empty"><span className="empty-icon">⭐</span>No reviews yet.</div>:ratings.map(r=><div key={r.rating_id} style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.03)'}}><div style={{display:'flex',alignItems:'center',gap:9,marginBottom:5}}><Avatar name={r.student_name} color="#3b82f6"/><span style={{fontWeight:500,color:'#e2e8f0'}}>{r.student_name}</span><Stars value={r.rating} readonly size="sm"/><span style={{marginLeft:'auto',fontSize:10,color:'#1a3050'}}>{String(r.rating_date).slice(0,10)}</span></div>{r.comment&&<div style={{fontSize:12,color:'#5a7a94',paddingLeft:41,lineHeight:1.6}}>"{r.comment}"</div>}</div>)}</div></div>);}

function AdminSwaps({swapRequests,onAction}){const doStatus=async(id,status)=>{try{await patch('/swap/'+id,{status});onAction();}catch(e){alert(e.message);}};return(<div className="page-enter"><InfoBox>Approving a swap atomically exchanges both students' section assignments via sp_ApproveSwap.</InfoBox><div className="card"><div className="card-title">Swap Requests ({swapRequests.length})</div>{swapRequests.length===0?<div className="empty"><span className="empty-icon">🔄</span>None.</div>:<table className="tbl"><thead><tr><th>Student 1</th><th>Student 2</th><th>Course</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{swapRequests.map(sw=><tr key={sw.swap_id}><td style={{fontWeight:500,color:'#e2e8f0'}}>{sw.student1}</td><td style={{fontWeight:500,color:'#e2e8f0'}}>{sw.student2}</td><td style={{color:'#6b8aad'}}>{sw.course_title}</td><td style={{color:'#4a6080',fontSize:11}}>{String(sw.request_date).slice(0,10)}</td><td><Pill s={sw.status}/></td><td>{sw.status==='Pending'&&<><button className="btn btn-approve btn-sm" onClick={()=>doStatus(sw.swap_id,'Approved')}>✓ Approve</button><button className="btn btn-danger btn-sm" onClick={()=>doStatus(sw.swap_id,'Rejected')}>✕</button></>}</td></tr>)}</tbody></table>}</div></div>);}

function AdminValidators({students,courses}){const[valSid,setValSid]=useState('');const[valRes,setValRes]=useState(null);const[preSid,setPreSid]=useState('');const[preCid,setPreCid]=useState('');const[preRes,setPreRes]=useState(null);const[dupSid,setDupSid]=useState('');const[dupSec,setDupSec]=useState('');const[dupRes,setDupRes]=useState(null);const uniq=[...new Map(courses.map(c=>[c.course_id,c])).values()];return(<div className="page-enter"><div className="card"><div className="card-title">Credit Validator</div><div className="form-row"><div className="form-group"><label className="form-label">Student</label><Sel value={valSid} onChange={setValSid} options={students.map(s=>({value:String(s.student_id),label:s.name}))}/></div><button className="btn btn-primary" onClick={async()=>{if(!valSid)return;const r=await get('/validate-credits/'+valSid).catch(()=>null);setValRes(r);}}>Check</button></div>{valRes&&<div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}><span className="pill pill-blue">{valRes.student_name}</span><span className="pill pill-green">Used: {valRes.total_registered_credits}</span><span className={`pill pill-${valRes.total_registered_credits<valRes.max_credit_limit?'green':'red'}`}>Left: {valRes.max_credit_limit-valRes.total_registered_credits}/{valRes.max_credit_limit}</span></div>}</div><div className="card"><div className="card-title">Prerequisite Checker</div><div className="form-row"><div className="form-group"><label className="form-label">Student</label><Sel value={preSid} onChange={setPreSid} options={students.map(s=>({value:String(s.student_id),label:s.name}))}/></div><div className="form-group"><label className="form-label">Course</label><Sel value={preCid} onChange={setPreCid} options={uniq.map(c=>({value:String(c.course_id),label:c.course_title}))}/></div><button className="btn btn-primary" onClick={async()=>{if(!preSid||!preCid)return;const r=await get('/check-prereqs/'+preSid+'/'+preCid).catch(()=>null);setPreRes(r);}}>Check</button></div>{preRes&&<div style={{marginTop:10}}>{preRes.missing_prereqs===0?<span className="pill pill-green">✓ All met</span>:<span className="pill pill-red">✕ {preRes.missing_prereqs} missing</span>}</div>}</div><div className="card"><div className="card-title">Duplicate Check</div><div className="form-row"><div className="form-group"><label className="form-label">Student</label><Sel value={dupSid} onChange={setDupSid} options={students.map(s=>({value:String(s.student_id),label:s.name}))}/></div><div className="form-group"><label className="form-label">Section</label><Sel value={dupSec} onChange={setDupSec} options={courses.map(c=>({value:String(c.section_id),label:c.course_code+' · '+c.course_title}))}/></div><button className="btn btn-primary" onClick={async()=>{if(!dupSid||!dupSec)return;const r=await get('/check-enrollment/'+dupSid+'/'+dupSec).catch(()=>null);setDupRes(r);}}>Check</button></div>{dupRes&&<div style={{marginTop:10}}>{dupRes.already_enrolled>0?<span className="pill pill-red">✕ Enrolled</span>:<span className="pill pill-green">✓ Not enrolled</span>}</div>}</div></div>);}

/* ══ ROOT APP ══════════════════════════════════════════════ */
export default function App() {
  const [session,setSession]=useState(null);
  const [page,setPage]=useState('dashboard');
  const [students,setStudents]=useState([]);
  const [courses,setCourses]=useState([]);
  const [instructors,setInstructors]=useState([]);
  const [enrollments,setEnrollments]=useState([]);
  const [waitingList,setWaitingList]=useState([]);
  const [swapRequests,setSwapReqs]=useState([]);
  const [announcements,setAnnouncements]=useState([]);
  const [mySections,setMySections]=useState([]);
  const [ratings,setRatings]=useState([]);
  const [cgpa,setCgpa]=useState(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    const el=document.createElement('style');
    el.textContent=CSS+LoginCSS;
    document.head.appendChild(el);
    return()=>document.head.removeChild(el);
  },[]);

  const safe=(p,fb=[])=>p.catch(()=>fb);

  const loadAll=useCallback(async()=>{
    if (!session) return;
    setLoading(true);
    const {role,user}=session;
    if (role==='student') {
      const [c,enr,ann,rat,cg]=await Promise.all([
        safe(get('/all-courses')),
        safe(get('/my-enrollments/'+user.student_id)),
        safe(get('/announcements')),
        safe(get('/teacher-ratings')),
        safe(get('/cgpa/'+user.student_id),null),
      ]);
      setCourses(c);setEnrollments(enr);setAnnouncements(ann);setRatings(rat);setCgpa(cg);
      const ids=[...new Set(c.map(x=>x.section_id))];
      const wl=await Promise.all(ids.map(id=>safe(get('/waiting-list/'+id))));
      setWaitingList(wl.flat().filter(w=>w.student_id===user.student_id));
    } else if (role==='teacher') {
      const [secs,ann,rat]=await Promise.all([
        safe(get('/instructor-sections/'+user.instructor_id)),
        safe(get('/announcements/instructor/'+user.instructor_id)),
        safe(get('/teacher-ratings')),
      ]);
      setMySections(secs);setAnnouncements(ann);setRatings(rat);setCourses(secs);
    } else if (role==='admin') {
      const [stu,crs,ins,sw]=await Promise.all([
        safe(get('/students')),
        safe(get('/all-courses')),
        safe(get('/instructor-report')),
        safe(get('/swap-requests')),
      ]);
      setStudents(stu);setCourses(crs);setInstructors(ins);setSwapReqs(sw);
    }
    setLoading(false);
  },[session]);

  useEffect(()=>{if(session){setPage('dashboard');loadAll();}}, [session,loadAll]);

  const refreshUser=useCallback(async()=>{
    if (session?.role==='student'){
      const u=await get('/students/'+session.user.student_id).catch(()=>null);
      if (u) setSession(s=>({...s,user:{...s.user,...u}}));
    }
    loadAll();
  },[session,loadAll]);

  if (!session) return <LoginPage onLogin={setSession}/>;

  const {role,user}=session;
  const navItems=NAV[role]||[];
  const roleColor=role==='student'?'#3b82f6':role==='teacher'?'#8b5cf6':'#f59e0b';

  // Group nav items
  const groups=[...new Set(navItems.map(n=>n.group))];

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <aside className="sidebar">
        <div style={{padding:'18px 16px 12px',borderBottom:'1px solid rgba(255,255,255,.03)'}}>
          <div className="logo-mark">ENROLLIX</div>
          <div className="logo-sub">Course Management</div>
        </div>
        <div style={{padding:'10px 12px 8px',borderBottom:'1px solid rgba(255,255,255,.02)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Avatar name={user.name||'A'} color={roleColor}/>
            <div><div style={{fontSize:12,fontWeight:500,color:'#c8d6e8',lineHeight:1.3}}>{user.name}</div><span className={`role-badge role-${role}`}>{role}</span></div>
          </div>
        </div>
        <nav style={{flex:1,overflowY:'auto',paddingBottom:8}}>
          {groups.map(g=>(
            <div key={g}>
              <div className="nav-group">{g}</div>
              {navItems.filter(n=>n.group===g).map(p=>(
                <div key={p.key} className={'nav-item'+(page===p.key?' active':'')} onClick={()=>setPage(p.key)}>
                  <span style={{fontSize:13,width:15,textAlign:'center',flexShrink:0}}>{p.icon}</span>
                  {p.label}
                  {p.key==='fees'&&role==='student'&&!user.fees_paid&&<span className="nav-badge" style={{background:'rgba(248,113,113,.18)',color:'#f87171'}}>!</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,.03)'}}>
          {loading&&<div style={{display:'flex',alignItems:'center',gap:5,marginBottom:7}}><span className="dot"/><span className="dot"/><span className="dot"/><span style={{fontSize:10,color:'#1a3050',marginLeft:2}}>Loading…</span></div>}
          <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',fontSize:11.5}} onClick={()=>{setSession(null);setPage('dashboard');}}>Sign Out</button>
        </div>
      </aside>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div className="topbar">
          <div>
            <div className="topbar-title">{navItems.find(p=>p.key===page)?.label||'Dashboard'}</div>
            <div style={{fontSize:10,color:'#1a3050',marginTop:1}}>Fall 2025 · ENROLLIX v2</div>
          </div>
          <div style={{display:'flex',gap:7,alignItems:'center'}}>
            {loading&&<span className="spinner"/>}
            <button className="btn btn-ghost" style={{fontSize:11.5}} onClick={refreshUser}>↺ Refresh</button>
            <div className="live-pill"><span className="live-dot"/>LIVE</div>
          </div>
        </div>

        <main style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          {/* Student */}
          {role==='student'&&page==='dashboard'    &&<StudentDashboard user={user} courses={courses} enrollments={enrollments} waitingList={waitingList} announcements={announcements} cgpa={cgpa}/>}
          {role==='student'&&page==='courses'      &&<BrowseCourses courses={courses}/>}
          {role==='student'&&page==='prereq'       &&<PrereqTreePage user={user}/>}
          {role==='student'&&page==='enroll'       &&<EnrollPage user={user} courses={courses} onAction={refreshUser}/>}
          {role==='student'&&page==='drop'         &&<DropPage user={user} enrollments={enrollments} onAction={refreshUser}/>}
          {role==='student'&&page==='waitlist'     &&<WaitlistPage user={user} courses={courses} waitingList={waitingList} onAction={refreshUser}/>}
          {role==='student'&&page==='swap'         &&<SwapPage user={user} courses={courses} onAction={refreshUser}/>}
          {role==='student'&&page==='completed'    &&<CompletedCoursesPage user={user}/>}
          {role==='student'&&page==='transcript'   &&<TranscriptPage user={user}/>}
          {role==='student'&&page==='attendance'   &&<AttendanceStudentPage user={user}/>}
          {role==='student'&&page==='rate'         &&<RateTeacherPage user={user} courses={courses}/>}
          {role==='student'&&page==='fees'         &&<FeesPage user={user} onUserRefresh={refreshUser}/>}
          {role==='student'&&page==='announcements'&&<AnnouncementsPage announcements={announcements}/>}
          {/* Teacher */}
          {role==='teacher'&&page==='dashboard'    &&<TeacherDashboard user={user} sections={mySections} announcements={announcements} ratings={ratings}/>}
          {role==='teacher'&&page==='roster'       &&<TeacherRoster user={user} sections={mySections}/>}
          {role==='teacher'&&page==='attendance'   &&<MarkAttendancePage user={user} sections={mySections}/>}
          {role==='teacher'&&page==='grades'       &&<GradeEntryPage user={user} sections={mySections}/>}
          {role==='teacher'&&page==='announce'     &&<PostAnnouncement user={user} sections={mySections} onAction={refreshUser}/>}
          {role==='teacher'&&page==='myratings'    &&<MyRatingsPage user={user}/>}
          {role==='teacher'&&page==='prereq'       &&<PrereqTreePage user={null}/>}
          {/* Admin */}
          {role==='admin'&&page==='dashboard'      &&<AdminDashboard students={students} courses={courses} instructors={instructors} swapRequests={swapRequests}/>}
          {role==='admin'&&page==='swaps'          &&<AdminSwaps swapRequests={swapRequests} onAction={refreshUser}/>}
          {role==='admin'&&page==='rollover'       &&<SemesterRolloverPage/>}
          {role==='admin'&&page==='reports'        &&<AdminReports students={students} instructors={instructors} courses={courses}/>}
          {role==='admin'&&page==='audit'          &&<AuditLogPage/>}
          {role==='admin'&&page==='validators'     &&<AdminValidators students={students} courses={courses}/>}
          {role==='admin'&&page==='prereq'         &&<PrereqTreePage user={null}/>}
        </main>
      </div>
    </div>
  );
}
