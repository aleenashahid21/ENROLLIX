import React, { useEffect, useState, useCallback } from 'react';

/* ─── Global styles injected once ─────────────────────────── */
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #080c14; color: #e2e8f0; }
  ::-webkit-scrollbar { width: 4px; } 
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a3a5c; border-radius: 4px; }
  select option { background: #0f1c2e; color: #e2e8f0; }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pulse-dot {
    0%,100% { opacity:1; } 50% { opacity:.3; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .page-enter { animation: fadeUp .35s ease forwards; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px; cursor: pointer; font-size: 13px;
    color: #4a6080; border-left: 2px solid transparent;
    transition: all .2s; font-family: 'DM Sans', sans-serif;
    font-weight: 400; letter-spacing: .01em;
    text-decoration: none; user-select: none;
  }
  .nav-item:hover { color: #94b4d4; background: rgba(99,179,237,.05); }
  .nav-item.active {
    color: #e2e8f0; border-left-color: #3b82f6;
    background: linear-gradient(90deg, rgba(59,130,246,.12) 0%, transparent 100%);
    font-weight: 500;
  }
  .nav-icon { width: 15px; height: 15px; flex-shrink: 0; opacity: .7; transition: opacity .2s; }
  .nav-item.active .nav-icon, .nav-item:hover .nav-icon { opacity: 1; }

  .stat-card {
    background: linear-gradient(135deg, #0f1c2e 0%, #0d1825 100%);
    border: 1px solid rgba(59,130,246,.15);
    border-radius: 14px; padding: 20px;
    transition: border-color .2s, transform .2s;
    position: relative; overflow: hidden;
  }
  .stat-card::before {
    content:''; position:absolute; inset:0;
    background: radial-gradient(ellipse at top left, rgba(59,130,246,.06) 0%, transparent 70%);
    pointer-events:none;
  }
  .stat-card:hover { border-color: rgba(59,130,246,.35); transform: translateY(-2px); }

  .data-table { width:100%; border-collapse:collapse; }
  .data-table thead th {
    text-align:left; font-size:10.5px; font-weight:600;
    color:#4a6080; padding:0 12px 10px;
    text-transform:uppercase; letter-spacing:.08em;
    font-family:'Syne',sans-serif;
  }
  .data-table tbody tr { transition: background .15s; }
  .data-table tbody tr:hover td { background: rgba(59,130,246,.04); }
  .data-table td {
    padding:11px 12px; border-top:1px solid rgba(255,255,255,.04);
    font-size:13px; color:#c8d6e8; vertical-align:middle;
  }

  .form-select, .form-input {
    width:100%; padding:10px 14px;
    background:#0a1422; border:1px solid rgba(59,130,246,.2);
    border-radius:10px; color:#e2e8f0; font-size:13px;
    font-family:'DM Sans',sans-serif;
    transition:border-color .2s, box-shadow .2s;
    appearance:none; -webkit-appearance:none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234a6080' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
  }
  .form-select:focus, .form-input:focus {
    outline:none; border-color:#3b82f6;
    box-shadow:0 0 0 3px rgba(59,130,246,.12);
  }
  .form-input { background-image:none; }

  .btn-primary {
    padding:10px 20px; background:linear-gradient(135deg,#3b82f6,#2563eb);
    color:#fff; border:none; border-radius:10px; font-size:13px;
    font-family:'DM Sans',sans-serif; font-weight:500;
    cursor:pointer; transition:all .2s; white-space:nowrap;
    box-shadow:0 4px 14px rgba(59,130,246,.3);
  }
  .btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(59,130,246,.4); }
  .btn-danger {
    padding:8px 16px; background:transparent; color:#f87171;
    border:1px solid rgba(248,113,113,.35); border-radius:10px;
    font-size:12px; font-family:'DM Sans',sans-serif; font-weight:500;
    cursor:pointer; transition:all .2s;
  }
  .btn-danger:hover { background:rgba(248,113,113,.08); border-color:#f87171; }
  .btn-ghost {
    padding:8px 16px; background:rgba(255,255,255,.04);
    color:#94b4d4; border:1px solid rgba(255,255,255,.08);
    border-radius:10px; font-size:12px; font-family:'DM Sans',sans-serif;
    cursor:pointer; transition:all .2s;
  }
  .btn-ghost:hover { background:rgba(255,255,255,.08); }
  .btn-approve {
    padding:7px 14px; background:rgba(34,197,94,.1);
    color:#4ade80; border:1px solid rgba(34,197,94,.25);
    border-radius:8px; font-size:12px; font-family:'DM Sans',sans-serif;
    cursor:pointer; transition:all .2s; margin-right:6px;
  }
  .btn-approve:hover { background:rgba(34,197,94,.2); }

  .tab-btn {
    padding:8px 18px; border-radius:8px; font-size:12.5px;
    font-family:'DM Sans',sans-serif; font-weight:500;
    cursor:pointer; transition:all .2s; border:1px solid rgba(255,255,255,.08);
    background:transparent; color:#4a6080;
  }
  .tab-btn.active {
    background:linear-gradient(135deg,#3b82f6,#2563eb);
    color:#fff; border-color:transparent;
    box-shadow:0 4px 12px rgba(59,130,246,.3);
  }
  .tab-btn:hover:not(.active) { color:#94b4d4; border-color:rgba(255,255,255,.15); }

  .msg-ok   { padding:11px 16px; border-radius:10px; font-size:13px; margin-bottom:14px; background:rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.2); color:#4ade80; }
  .msg-err  { padding:11px 16px; border-radius:10px; font-size:13px; margin-bottom:14px; background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.2); color:#f87171; }
  .msg-warn { padding:11px 16px; border-radius:10px; font-size:13px; margin-bottom:14px; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.2); color:#fbbf24; }
  .msg-info { padding:11px 16px; border-radius:10px; font-size:13px; margin-bottom:14px; background:rgba(59,130,246,.08); border:1px solid rgba(59,130,246,.15); color:#60a5fa; }

  .card {
    background: linear-gradient(135deg, #0f1c2e 0%, #0b1520 100%);
    border: 1px solid rgba(255,255,255,.06); border-radius:16px;
    padding:20px 22px; margin-bottom:16px;
    position:relative; overflow:hidden;
  }
  .card::after {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(59,130,246,.2),transparent);
  }

  .seat-bar-wrap { display:inline-flex; align-items:center; gap:8px; }
  .seat-bar { height:5px; border-radius:3px; background:rgba(255,255,255,.06); overflow:hidden; width:70px; }
  .seat-fill { height:100%; border-radius:3px; transition:width .4s ease; }

  .pill {
    display:inline-flex; align-items:center; gap:4px;
    font-size:11px; padding:3px 10px; border-radius:20px; font-weight:600;
    font-family:'Syne',sans-serif; letter-spacing:.02em;
  }
  .pill-green { background:rgba(34,197,94,.12); color:#4ade80; border:1px solid rgba(34,197,94,.2); }
  .pill-red   { background:rgba(248,113,113,.12); color:#f87171; border:1px solid rgba(248,113,113,.2); }
  .pill-amber { background:rgba(251,191,36,.12); color:#fbbf24; border:1px solid rgba(251,191,36,.2); }
  .pill-blue  { background:rgba(59,130,246,.12); color:#60a5fa; border:1px solid rgba(59,130,246,.2); }
  .pill-gray  { background:rgba(255,255,255,.06); color:#94a3b8; border:1px solid rgba(255,255,255,.1); }

  .section-title {
    font-family:'Syne',sans-serif; font-size:13px; font-weight:700;
    color:#94b4d4; text-transform:uppercase; letter-spacing:.08em;
    margin-bottom:14px;
  }
  .empty-state {
    text-align:center; padding:32px 20px; color:#2a3a5c; font-size:13px; font-style:italic;
  }
  .loading-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#3b82f6; animation:pulse-dot 1.2s infinite; margin:0 2px; }
  .loading-dot:nth-child(2) { animation-delay:.2s; }
  .loading-dot:nth-child(3) { animation-delay:.4s; }
`;

/* ─── API helpers ─────────────────────────────────────────── */
const API = 'http://localhost:5000';
const apiFetch = async (url, opts) => {
  const r = await fetch(API + url, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const get   = url       => apiFetch(url);
const post  = (url, b)  => apiFetch(url, { method:'POST',  headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) });
const patch = (url, b)  => apiFetch(url, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) });
const del   = url       => apiFetch(url, { method:'DELETE' });

/* ─── Tiny components ─────────────────────────────────────── */
function Pill({ status }) {
  const m = { Registered:'green', Dropped:'red', Pending:'amber', Approved:'green', Rejected:'red', Open:'green', Full:'red' };
  const c = m[status] || 'gray';
  return <span className={`pill pill-${c}`}>{status}</span>;
}

function SeatsBar({ avail, total }) {
  const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
  const color = avail === 0 ? '#f87171' : avail === 1 ? '#fbbf24' : '#4ade80';
  const pillC = avail === 0 ? 'red' : avail === 1 ? 'amber' : 'green';
  return (
    <span className="seat-bar-wrap">
      <span className="seat-bar"><span className="seat-fill" style={{ width: pct + '%', background: color }} /></span>
      <span className={`pill pill-${pillC}`}>{avail}/{total}</span>
    </span>
  );
}

/* Smart dropdown — shows count in label, warns if empty */
function Sel({ value, onChange, options, placeholder }) {
  const isEmpty = options.length === 0;
  return (
    <select
      className="form-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">
        {isEmpty ? '⚠ No data — check backend' : (placeholder || 'Select...')}
      </option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  const cls = msg.type === 'ok' ? 'msg-ok' : msg.type === 'warn' ? 'msg-warn' : 'msg-err';
  return <div className={cls}>{msg.type === 'ok' ? '✓ ' : msg.type === 'warn' ? '⚠ ' : '✕ '}{msg.text}</div>;
}

/* ════════════════════════════════════════════════════════════
   PAGE COMPONENTS
════════════════════════════════════════════════════════════ */

function Dashboard({ students, courses, enrollments, waitingList, errors }) {
  const active = enrollments.filter(e => e.status === 'Registered');
  const stats = [
    { label:'Students', value:students.length, color:'#3b82f6', icon:'👤' },
    { label:'Courses',  value:[...new Set(courses.map(c=>c.course_id))].length, color:'#8b5cf6', icon:'📚' },
    { label:'Enrolled', value:active.length, color:'#22c55e', icon:'✅' },
    { label:'Waitlisted', value:waitingList.length, color:'#f59e0b', icon:'⏳' },
  ];
  return (
    <div className="page-enter">
      {errors.length > 0 && (
        <div className="msg-err" style={{marginBottom:16}}>
          ⚠ Backend errors: {errors.join(' · ')}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {stats.map(s=>(
          <div key={s.label} className="stat-card">
            <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:12,color:'#4a6080',marginTop:6,fontWeight:500,letterSpacing:'.04em',textTransform:'uppercase'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">Course Seat Overview</div>
        {courses.length === 0
          ? <div className="empty-state">No courses loaded — is the backend running?</div>
          : <table className="data-table">
              <thead><tr>{['Code','Title','Instructor','Occupancy','Status'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {courses.map(c=>(
                  <tr key={c.section_id}>
                    <td><span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#3b82f6'}}>{c.course_code}</span></td>
                    <td>{c.course_title}</td>
                    <td style={{color:'#4a6080'}}>{c.instructor}</td>
                    <td><SeatsBar avail={c.available_seats} total={c.total_seats}/></td>
                    <td><Pill status={c.available_seats===0?'Full':'Open'}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <div className="card">
        <div className="section-title">Enrollment Records</div>
        {enrollments.length === 0
          ? <div className="empty-state">No enrollment records.</div>
          : <table className="data-table">
              <thead><tr>{['Student','Department','Course','Status'].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {enrollments.map((e,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{e.student_name}</td>
                    <td><span className="pill pill-blue">{e.department}</span></td>
                    <td style={{color:'#94b4d4'}}>{e.course_title||'—'}</td>
                    <td><Pill status={e.status||'—'}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}

function CoursesPage({ courses }) {
  const [kw, setKw] = useState('');
  const filtered = courses.filter(c =>
    c.course_title?.toLowerCase().includes(kw.toLowerCase()) ||
    c.course_code?.toLowerCase().includes(kw.toLowerCase())
  );
  return (
    <div className="page-enter">
      <div className="msg-info">Showing all {courses.length} course sections with real-time seat data.</div>
      <div style={{marginBottom:16}}>
        <input className="form-input" style={{maxWidth:300}} placeholder="🔍  Search by name or code…" value={kw} onChange={e=>setKw(e.target.value)}/>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr>{['Code','Title','Credits','Department','Instructor','Seats'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={6}><div className="empty-state">No courses match your search.</div></td></tr>
              : filtered.map(c=>(
                <tr key={c.section_id}>
                  <td><span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#3b82f6'}}>{c.course_code}</span></td>
                  <td style={{fontWeight:500}}>{c.course_title}</td>
                  <td style={{textAlign:'center'}}><span className="pill pill-gray">{c.credit_hours} cr</span></td>
                  <td style={{color:'#4a6080'}}>{c.department}</td>
                  <td style={{color:'#94b4d4'}}>{c.instructor}</td>
                  <td><SeatsBar avail={c.available_seats} total={c.total_seats}/></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnrollPage({ students, courses, onAction }) {
  const [sid,   setSid]   = useState('');
  const [secId, setSecId] = useState('');
  const [msg,   setMsg]   = useState(null);
  const [loading, setLoading] = useState(false);
  const availSecs = courses.filter(c => c.available_seats > 0);

  const doEnroll = async () => {
    setMsg(null);
    if (!sid)   { setMsg({type:'warn', text:'Please select a student.'}); return; }
    if (!secId) { setMsg({type:'warn', text:'Please select a section.'}); return; }
    setLoading(true);
    try {
      const res = await post('/enroll', { student_id: Number(sid), section_id: Number(secId) });
      setMsg({type:'ok', text:res.message});
      setSid(''); setSecId('');
      onAction();
    } catch(e) { setMsg({type:'err', text:e.message}); }
    setLoading(false);
  };

  return (
    <div className="page-enter">
      <div className="msg-info">
        Enrollment is validated against: duplicate registration · seat availability · prerequisites · credit hour limit.
      </div>
      {students.length===0 && <div className="msg-warn">⚠ No students loaded ({students.length}). Backend may be down.</div>}
      {courses.length===0  && <div className="msg-warn">⚠ No courses loaded ({courses.length}). Backend may be down.</div>}
      <Msg msg={msg}/>
      <div className="card">
        <div className="section-title">New Enrollment</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>
              Student <span style={{color:'#2a3a5c',fontWeight:400}}>({students.length} loaded)</span>
            </div>
            <Sel value={sid} onChange={setSid}
              options={students.map(s=>({ value:String(s.student_id), label:s.name+' — '+s.department }))}
              placeholder="Select student…"/>
          </div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>
              Section <span style={{color:'#2a3a5c',fontWeight:400}}>({availSecs.length} available)</span>
            </div>
            <Sel value={secId} onChange={setSecId}
              options={availSecs.map(c=>({ value:String(c.section_id), label:c.course_code+' · '+c.course_title+' ('+c.available_seats+' seats left)' }))}
              placeholder="Select section…"/>
          </div>
          <button className="btn-primary" onClick={doEnroll} disabled={loading}>
            {loading ? 'Enrolling…' : '+ Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DropPage({ students, enrollments, onAction }) {
  const [sid,   setSid]   = useState('');
  const [secId, setSecId] = useState('');
  const [msg,   setMsg]   = useState(null);
  const [history, setHistory] = useState([]);

  const activeEnrs = enrollments.filter(e => e.status === 'Registered');
  const enrolledIds = [...new Set(activeEnrs.map(e => String(e.student_id)))];
  const myEnrs = activeEnrs.filter(e => String(e.student_id) === sid);

  const doDrop = async () => {
    setMsg(null);
    if (!sid||!secId) { setMsg({type:'warn',text:'Select both fields.'}); return; }
    try {
      const res = await post('/drop', { student_id:Number(sid), section_id:Number(secId) });
      const stName = students.find(s=>String(s.student_id)===sid)?.name||sid;
      const course = myEnrs.find(e=>String(e.section_id)===secId)?.course_title||'Section '+secId;
      setHistory(h=>[{student:stName,course,result:res.message},...h]);
      setMsg({type:'ok',text:res.message});
      setSid(''); setSecId('');
      onAction();
    } catch(e) { setMsg({type:'err',text:e.message}); }
  };

  return (
    <div className="page-enter">
      <div className="msg-info">When a student drops, the first person on the waitlist is automatically enrolled.</div>
      <Msg msg={msg}/>
      <div className="card">
        <div className="section-title">Drop a Course</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Student</div>
            <Sel value={sid} onChange={v=>{setSid(v);setSecId('');}}
              options={enrolledIds.map(id=>{const s=students.find(x=>String(x.student_id)===id);return{value:id,label:s?.name||'Student '+id};})}
              placeholder="Select student…"/>
          </div>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>
              {sid ? 'Enrolled Section' : 'Section (pick student first)'}
            </div>
            <Sel value={secId} onChange={setSecId}
              options={myEnrs.map(e=>({value:String(e.section_id),label:e.course_title||'Section '+e.section_id}))}
              placeholder={sid?'Select section…':'Pick student first'}/>
          </div>
          <button className="btn-danger" style={{padding:'10px 20px',fontSize:13}} onClick={doDrop}>Drop Course</button>
        </div>
      </div>
      {history.length>0&&(
        <div className="card">
          <div className="section-title">Drop History</div>
          <table className="data-table">
            <thead><tr>{['Student','Course','Result'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{history.map((h,i)=><tr key={i}><td style={{fontWeight:500}}>{h.student}</td><td>{h.course}</td><td style={{color:'#94b4d4',fontSize:12}}>{h.result}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WaitlistPage({ students, courses, waitingList, onAction }) {
  const [sid,   setSid]   = useState('');
  const [secId, setSecId] = useState('');
  const [msg,   setMsg]   = useState(null);
  const fullSecs = courses.filter(c => c.available_seats === 0);

  const doAdd = async () => {
    setMsg(null);
    if (!sid||!secId) { setMsg({type:'warn',text:'Select both fields.'}); return; }
    try {
      const res = await post('/waiting-list', { student_id:Number(sid), section_id:Number(secId) });
      setMsg({type:'ok',text:res.message});
      setSid(''); setSecId('');
      onAction();
    } catch(e) { setMsg({type:'err',text:e.message}); }
  };

  const doRemove = async (wid) => {
    try { await del('/waiting-list/'+wid); onAction(); }
    catch(e) { alert(e.message); }
  };

  return (
    <div className="page-enter">
      <div className="msg-info">Position 1 is automatically enrolled when any seat opens in that section.</div>
      {fullSecs.length===0&&<div className="msg-warn">All sections currently have available seats — no waitlist needed.</div>}
      <Msg msg={msg}/>
      <div className="card">
        <div className="section-title">Add to Waiting List</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Student</div>
            <Sel value={sid} onChange={setSid} options={students.map(s=>({value:String(s.student_id),label:s.name}))} placeholder="Select student…"/>
          </div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Full Section</div>
            <Sel value={secId} onChange={setSecId} options={fullSecs.map(c=>({value:String(c.section_id),label:c.course_code+' · '+c.course_title+' (Full)'}))} placeholder="Select section…"/>
          </div>
          <button className="btn-primary" onClick={doAdd}>+ Add to Waitlist</button>
        </div>
      </div>
      <div className="card">
        <div className="section-title">Current Queue ({waitingList.length})</div>
        <table className="data-table">
          <thead><tr>{['Position','Student','Dept','Course','Requested','Action'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {waitingList.length===0
              ? <tr><td colSpan={6}><div className="empty-state">Waiting list is empty.</div></td></tr>
              : waitingList.map(w=>{
                  const sec=courses.find(c=>c.section_id===w.section_id);
                  return (
                    <tr key={w.waiting_id}>
                      <td><span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:'#3b82f6'}}>#{w.position}</span></td>
                      <td style={{fontWeight:500}}>{w.student_name}</td>
                      <td><span className="pill pill-blue">{w.department}</span></td>
                      <td style={{color:'#94b4d4'}}>{sec?.course_title||'Section '+w.section_id}</td>
                      <td style={{color:'#4a6080',fontSize:12}}>{String(w.request_date).slice(0,10)}</td>
                      <td><button className="btn-danger" onClick={()=>doRemove(w.waiting_id)}>Remove</button></td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SwapPage({ students, courses, swapRequests, onAction }) {
  const [s1,setS1]=useState(''); const [s2,setS2]=useState(''); const [cid,setCid]=useState('');
  const [msg,setMsg]=useState(null);
  const uniqCourses=[...new Map(courses.map(c=>[c.course_id,c])).values()];

  const doSwap=async()=>{
    setMsg(null);
    if(!s1||!s2||!cid){setMsg({type:'warn',text:'Fill all fields.'});return;}
    if(s1===s2){setMsg({type:'warn',text:'Students must be different.'});return;}
    try{const res=await post('/swap',{student1_id:Number(s1),student2_id:Number(s2),course_id:Number(cid)});setMsg({type:'ok',text:res.message});setS1('');setS2('');setCid('');onAction();}
    catch(e){setMsg({type:'err',text:e.message});}
  };

  const doStatus=async(swap_id,status)=>{
    try{await patch('/swap/'+swap_id,{status});onAction();}catch(e){alert(e.message);}
  };

  return (
    <div className="page-enter">
      <div className="msg-info">Students can request to swap sections of the same course. Requests need admin approval.</div>
      <Msg msg={msg}/>
      <div className="card">
        <div className="section-title">Create Swap Request</div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:1,minWidth:160}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Student 1</div><Sel value={s1} onChange={setS1} options={students.map(s=>({value:String(s.student_id),label:s.name}))} placeholder="Student 1…"/></div>
          <div style={{flex:1,minWidth:160}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Student 2</div><Sel value={s2} onChange={setS2} options={students.map(s=>({value:String(s.student_id),label:s.name}))} placeholder="Student 2…"/></div>
          <div style={{flex:1,minWidth:160}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Course</div><Sel value={cid} onChange={setCid} options={uniqCourses.map(c=>({value:String(c.course_id),label:c.course_title}))} placeholder="Course…"/></div>
          <button className="btn-primary" onClick={doSwap}>Request Swap</button>
        </div>
      </div>
      <div className="card">
        <div className="section-title">All Swap Requests</div>
        <table className="data-table">
          <thead><tr>{['Student 1','Student 2','Course','Date','Status','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {swapRequests.length===0
              ? <tr><td colSpan={6}><div className="empty-state">No swap requests.</div></td></tr>
              : swapRequests.map(sw=>(
                <tr key={sw.swap_id}>
                  <td style={{fontWeight:500}}>{sw.student1}</td>
                  <td style={{fontWeight:500}}>{sw.student2}</td>
                  <td style={{color:'#94b4d4'}}>{sw.course_title}</td>
                  <td style={{color:'#4a6080',fontSize:12}}>{String(sw.request_date).slice(0,10)}</td>
                  <td><Pill status={sw.status}/></td>
                  <td>
                    {sw.status==='Pending'&&<>
                      <button className="btn-approve" onClick={()=>doStatus(sw.swap_id,'Approved')}>✓ Approve</button>
                      <button className="btn-danger" onClick={()=>doStatus(sw.swap_id,'Rejected')}>✕ Reject</button>
                    </>}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPage({ instructors, courses }) {
  const [tab,setTab]=useState('enrollment');
  const [stats,setStats]=useState([]);
  const [top,setTop]=useState([]);
  const [enrReport,setEnrReport]=useState([]);
  useEffect(()=>{
    get('/course-stats').then(setStats).catch(()=>{});
    get('/top-students').then(setTop).catch(()=>{});
    get('/student-report').then(setEnrReport).catch(()=>{});
  },[]);

  const tabs=[['enrollment','Student Enrollment'],['instructors','Instructor Workload'],['stats','Course Stats'],['top','Top Students']];
  return (
    <div className="page-enter">
      <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
        {tabs.map(([k,l])=><button key={k} className={'tab-btn'+(tab===k?' active':'')} onClick={()=>setTab(k)}>{l}</button>)}
      </div>
      {tab==='enrollment'&&(
        <div className="card">
          <div className="section-title">Student Enrollment Report</div>
          <table className="data-table">
            <thead><tr>{['ID','Student','Department','Course','Status'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{enrReport.map((e,i)=><tr key={i}><td style={{color:'#4a6080'}}>{e.student_id}</td><td style={{fontWeight:500}}>{e.student_name}</td><td><span className="pill pill-blue">{e.department}</span></td><td style={{color:'#94b4d4'}}>{e.course_title||'—'}</td><td><Pill status={e.status||'—'}/></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab==='instructors'&&(
        <div className="card">
          <div className="section-title">Instructor Workload</div>
          <table className="data-table">
            <thead><tr>{['ID','Name','Dept','Sections','Max Sections','Remaining'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{instructors.map(i=><tr key={i.instructor_id}><td style={{color:'#4a6080'}}>{i.instructor_id}</td><td style={{fontWeight:500}}>{i.name}</td><td>{i.department}</td><td style={{textAlign:'center'}}>{i.sections_assigned}</td><td style={{textAlign:'center'}}>{i.max_sections}</td><td><span className={`pill pill-${i.remaining_capacity>0?'green':'red'}`}>{i.remaining_capacity} left</span></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab==='stats'&&(
        <div className="card">
          <div className="section-title">Course Statistics</div>
          <table className="data-table">
            <thead><tr>{['Code','Title','Sections','Seats Taken','Remaining','Avg Avail'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{stats.map(r=><tr key={r.course_code}><td><span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#3b82f6'}}>{r.course_code}</span></td><td>{r.course_title}</td><td style={{textAlign:'center'}}>{r.total_sections}</td><td style={{textAlign:'center'}}>{r.seats_taken}</td><td style={{textAlign:'center'}}>{r.seats_remaining}</td><td style={{textAlign:'center',color:'#94b4d4'}}>{r.avg_available}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab==='top'&&(
        <div className="card">
          <div className="section-title">Top Students — Grade A</div>
          <table className="data-table">
            <thead><tr>{['Student','Department','Course','Grade'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>{top.map((r,i)=><tr key={i}><td style={{fontWeight:500}}>{r.student_name}</td><td><span className="pill pill-blue">{r.department}</span></td><td style={{color:'#94b4d4'}}>{r.course_title}</td><td><span className="pill pill-green">A</span></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ValidatorsPage({ students, courses }) {
  const [valSid,setValSid]=useState(''); const [valRes,setValRes]=useState(null);
  const [preSid,setPreSid]=useState(''); const [preCid,setPreCid]=useState(''); const [preRes,setPreRes]=useState(null);
  const [dupSid,setDupSid]=useState(''); const [dupSec,setDupSec]=useState(''); const [dupRes,setDupRes]=useState(null);
  const uniqCourses=[...new Map(courses.map(c=>[c.course_id,c])).values()];

  return (
    <div className="page-enter">
      <div className="card">
        <div className="section-title">Credit Hour Validator</div>
        <div className="msg-info" style={{marginBottom:14}}>Check a student's registered credits against their allowed limit.</div>
        <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:180}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Student</div><Sel value={valSid} onChange={setValSid} options={students.map(s=>({value:String(s.student_id),label:s.name}))}/></div>
          <button className="btn-primary" onClick={async()=>{if(!valSid)return;const r=await get('/validate-credits/'+valSid).catch(()=>null);setValRes(r);}}>Check</button>
        </div>
        {valRes&&<div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}>
          <span className="pill pill-blue">{valRes.student_name}</span>
          <span className="pill pill-green">Used: {valRes.total_registered_credits} cr</span>
          <span className={`pill pill-${valRes.total_registered_credits<valRes.max_credit_limit?'green':'red'}`}>Limit: {valRes.max_credit_limit} · Remaining: {valRes.max_credit_limit-valRes.total_registered_credits}</span>
        </div>}
      </div>

      <div className="card">
        <div className="section-title">Prerequisite Checker</div>
        <div className="msg-info" style={{marginBottom:14}}>Verify if a student has completed all required prerequisites.</div>
        <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:160}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Student</div><Sel value={preSid} onChange={setPreSid} options={students.map(s=>({value:String(s.student_id),label:s.name}))}/></div>
          <div style={{flex:1,minWidth:180}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Course</div><Sel value={preCid} onChange={setPreCid} options={uniqCourses.map(c=>({value:String(c.course_id),label:c.course_title}))}/></div>
          <button className="btn-primary" onClick={async()=>{if(!preSid||!preCid)return;const r=await get('/check-prereqs/'+preSid+'/'+preCid).catch(()=>null);setPreRes(r);}}>Check</button>
        </div>
        {preRes&&<div style={{marginTop:14}}>{preRes.missing_prereqs===0?<span className="pill pill-green">✓ All prerequisites met</span>:<span className="pill pill-red">✕ {preRes.missing_prereqs} prerequisite(s) missing</span>}</div>}
      </div>

      <div className="card">
        <div className="section-title">Duplicate Enrollment Check</div>
        <div className="msg-info" style={{marginBottom:14}}>Check if a student is already registered in a specific section.</div>
        <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:160}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Student</div><Sel value={dupSid} onChange={setDupSid} options={students.map(s=>({value:String(s.student_id),label:s.name}))}/></div>
          <div style={{flex:1,minWidth:200}}><div style={{fontSize:11,color:'#4a6080',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Section</div><Sel value={dupSec} onChange={setDupSec} options={courses.map(c=>({value:String(c.section_id),label:c.course_code+' · '+c.course_title+' (Sec '+c.section_id+')'}))}/></div>
          <button className="btn-primary" onClick={async()=>{if(!dupSid||!dupSec)return;const r=await get('/check-enrollment/'+dupSid+'/'+dupSec).catch(()=>null);setDupRes(r);}}>Check</button>
        </div>
        {dupRes&&<div style={{marginTop:14}}>{dupRes.already_enrolled>0?<span className="pill pill-red">✕ Already enrolled in this section</span>:<span className="pill pill-green">✓ Not enrolled — can register</span>}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   NAV CONFIG
════════════════════════════════════════════════════════════ */
const PAGES = [
  { key:'dashboard', label:'Dashboard',      icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
  { key:'courses',   label:'Courses',        icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><path d="M8 1L1 4.5v1h14v-1L8 1zM2 7v5h2V7H2zm4 0v5h2V7H6zm4 0v5h2V7h-2zm4 0v5h-1v2H3v-2H2V7h12z"/></svg> },
  { key:'enroll',    label:'Enroll Student', icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><circle cx="6" cy="4" r="3"/><path d="M1 13c0-2.5 2.2-4 5-4"/><line x1="11" y1="7" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { key:'drop',      label:'Drop Course',    icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><circle cx="6" cy="4" r="3"/><path d="M1 13c0-2.5 2.2-4 5-4"/><line x1="8" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { key:'waitlist',  label:'Waiting List',   icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><path d="M1 3h14v2H1zM1 7h10v2H1zM1 11h7v2H1z"/></svg> },
  { key:'swap',      label:'Swap Requests',  icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><path d="M4 3L1 6h3v4h2V6h3L7 3H4zM12 13l3-3h-3V6h-2v4H7l3 3h2z"/></svg> },
  { key:'reports',   label:'Reports',        icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><path d="M2 14V6l4-4h8v12H2z"/><path d="M6 2v4H2" fill="none" stroke="currentColor" strokeWidth="1"/><path d="M5 9h6M5 11h4" stroke="currentColor" fill="none" strokeLinecap="round"/></svg> },
  { key:'validators',label:'Validators',     icon:<svg viewBox="0 0 16 16" fill="currentColor" className="nav-icon"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.5 4h1v4.5l3 1.8-.5.9-3.5-2V5z"/></svg> },
];

/* ════════════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage]               = useState('dashboard');
  const [students, setStudents]       = useState([]);
  const [courses, setCourses]         = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [swapRequests, setSwapReqs]   = useState([]);
  const [errors, setErrors]           = useState([]);
  const [loading, setLoading]         = useState(true);

  // Inject global CSS once
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = globalCSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const errs = [];

    // Each endpoint loads independently — one failure won't block others
    const tryGet = async (url, setter, name) => {
      try {
        const d = await get(url);
        if (Array.isArray(d)) setter(d);
        else errs.push(name + ': unexpected response');
      } catch(e) {
        errs.push(name + ': ' + e.message);
      }
    };

    await tryGet('/students',          setStudents,    'students');
    await tryGet('/all-courses',       setCourses,     'courses');
    await tryGet('/student-report',    setEnrollments, 'enrollments');
    await tryGet('/instructor-report', setInstructors, 'instructors');
    await tryGet('/swap-requests',     setSwapReqs,    'swaps');

    // Waiting list: load per section
    try {
      const secs = await get('/all-courses');
      const ids  = [...new Set(secs.map(c => c.section_id))];
      const all  = await Promise.all(ids.map(id => get('/waiting-list/'+id).catch(()=>[])));
      setWaitingList(all.flat());
    } catch(e) { errs.push('waitlist: '+e.message); }

    setErrors(errs);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const currentPage = PAGES.find(p => p.key === page);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width:220, background:'#080c14',
        borderRight:'1px solid rgba(59,130,246,.08)',
        display:'flex', flexDirection:'column', flexShrink:0
      }}>
        {/* Logo */}
        <div style={{padding:'22px 18px 16px', borderBottom:'1px solid rgba(255,255,255,.04)'}}>
          <div style={{
            fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20,
            background:'linear-gradient(135deg,#60a5fa,#3b82f6)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            letterSpacing:'-0.5px'
          }}>ENROLLIX</div>
          <div style={{fontSize:11,color:'#2a3a5c',marginTop:3,letterSpacing:'.06em',textTransform:'uppercase'}}>Course Management</div>
        </div>

        {/* Nav */}
        <nav style={{flex:1, padding:'10px 0', overflowY:'auto'}}>
          {PAGES.map(p=>(
            <div key={p.key} className={'nav-item'+(page===p.key?' active':'')} onClick={()=>setPage(p.key)}>
              {p.icon}
              {p.label}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,.04)'}}>
          {loading
            ? <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/>
                <span style={{fontSize:11,color:'#2a3a5c',marginLeft:4}}>Loading…</span>
              </div>
            : <>
                <div style={{fontSize:11,color:'#4a6080',fontWeight:600,letterSpacing:'.04em'}}>FALL 2025</div>
                <div style={{fontSize:11,color:'#2a3a5c',marginTop:3}}>
                  {students.length} students · {[...new Set(courses.map(c=>c.course_id))].length} courses
                </div>
                {errors.length>0&&<div style={{fontSize:10,color:'#f87171',marginTop:4}}>⚠ {errors.length} API error(s)</div>}
              </>
          }
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#080c14'}}>
        {/* Topbar */}
        <header style={{
          padding:'14px 28px', background:'rgba(8,12,20,.95)',
          borderBottom:'1px solid rgba(59,130,246,.08)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          backdropFilter:'blur(10px)'
        }}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:'#e2e8f0'}}>{currentPage?.label}</div>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button className="btn-ghost" onClick={loadAll} style={{fontSize:12}}>↺ Refresh</button>
            <div style={{
              fontSize:11, padding:'5px 14px', borderRadius:20,
              background:'rgba(59,130,246,.08)', color:'#3b82f6',
              border:'1px solid rgba(59,130,246,.15)',
              fontFamily:"'Syne',sans-serif", fontWeight:600, letterSpacing:'.04em'
            }}>LIVE</div>
          </div>
        </header>

        {/* Content */}
        <main style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
          {page==='dashboard'  && <Dashboard   students={students} courses={courses} enrollments={enrollments} waitingList={waitingList} errors={errors}/>}
          {page==='courses'    && <CoursesPage courses={courses}/>}
          {page==='enroll'     && <EnrollPage  students={students} courses={courses} onAction={loadAll}/>}
          {page==='drop'       && <DropPage    students={students} enrollments={enrollments} onAction={loadAll}/>}
          {page==='waitlist'   && <WaitlistPage students={students} courses={courses} waitingList={waitingList} onAction={loadAll}/>}
          {page==='swap'       && <SwapPage    students={students} courses={courses} swapRequests={swapRequests} onAction={loadAll}/>}
          {page==='reports'    && <ReportsPage instructors={instructors} courses={courses}/>}
          {page==='validators' && <ValidatorsPage students={students} courses={courses}/>}
        </main>
      </div>
    </div>
  );
}
