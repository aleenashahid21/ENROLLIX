import React, { useEffect, useState, useCallback } from 'react';

const API = 'http://localhost:5000';

// ─── tiny fetch helpers ───────────────────────────────────────
const get  = url => fetch(API + url).then(r => r.json());
const post = (url, body) =>
  fetch(API + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const patch  = (url, body) =>
  fetch(API + url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const del  = url => fetch(API + url, { method: 'DELETE' }).then(r => r.json());

// ─── style tokens (no external CSS needed) ───────────────────
const S = {
  shell:   { display:'flex', height:'100vh', fontFamily:"'Segoe UI',sans-serif", fontSize:13, color:'#1a1a1a', background:'#f5f5f5' },
  sidebar: { width:200, background:'#0f1923', display:'flex', flexDirection:'column', flexShrink:0 },
  logoBar: { padding:'18px 16px 12px', borderBottom:'1px solid #1e2d3d' },
  logoT:   { color:'#fff', fontWeight:700, fontSize:16, letterSpacing:'-0.3px' },
  logoS:   { color:'#5a7a94', fontSize:11, marginTop:2 },
  navItem: (active) => ({
    display:'flex', alignItems:'center', gap:9, padding:'9px 16px',
    cursor:'pointer', fontSize:13, color: active ? '#fff' : '#8aa5be',
    background: active ? '#1e2d3d' : 'transparent',
    borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
    transition:'all .15s'
  }),
  main:    { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar:  { background:'#fff', padding:'12px 24px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' },
  pageT:   { fontWeight:600, fontSize:15 },
  badge:   { background:'#eff6ff', color:'#1d4ed8', fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500 },
  content: { flex:1, overflowY:'auto', padding:24 },
  card:    { background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'16px 20px', marginBottom:16 },
  sH:      { fontWeight:600, fontSize:13, marginBottom:12, color:'#111' },
  statsGrid:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 },
  stat:    { background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'14px 16px', textAlign:'center' },
  statN:   { fontSize:26, fontWeight:700, color:'#111' },
  statL:   { fontSize:11, color:'#6b7280', marginTop:3 },
  table:   { width:'100%', borderCollapse:'collapse' },
  th:      { textAlign:'left', fontSize:11, fontWeight:600, color:'#6b7280', padding:'0 10px 8px', textTransform:'uppercase', letterSpacing:.5 },
  td:      { padding:'9px 10px', borderTop:'1px solid #f3f4f6', verticalAlign:'middle' },
  pill:    (c) => { const map={green:{bg:'#dcfce7',fg:'#15803d'},amber:{bg:'#fef3c7',fg:'#92400e'},blue:{bg:'#dbeafe',fg:'#1e40af'},red:{bg:'#fee2e2',fg:'#991b1b'},gray:{bg:'#f3f4f6',fg:'#374151'}}; const t=map[c]||map.gray; return { display:'inline-block', fontSize:10.5, padding:'2px 9px', borderRadius:20, fontWeight:600, background:t.bg, color:t.fg }; },
  btn:     (v='default') => { const map={primary:{background:'#2563eb',color:'#fff',border:'none'},danger:{background:'#fff',color:'#dc2626',border:'1px solid #dc2626'},default:{background:'#fff',color:'#374151',border:'1px solid #d1d5db'}}; return { ...map[v], padding:'6px 14px', borderRadius:7, fontSize:12.5, cursor:'pointer', fontWeight:500 }; },
  formRow: { display:'flex', gap:10, marginBottom:14, alignItems:'flex-end', flexWrap:'wrap' },
  fGroup:  { display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:140 },
  fLabel:  { fontSize:11, color:'#6b7280', fontWeight:600, textTransform:'uppercase', letterSpacing:.4 },
  input:   { padding:'7px 10px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, width:'100%', boxSizing:'border-box' },
  infoBox: { background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'9px 14px', fontSize:12.5, color:'#1e40af', marginBottom:14 },
  warnBox: { background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'9px 14px', fontSize:12.5, color:'#92400e', marginBottom:14 },
  errBox:  { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'9px 14px', fontSize:12.5, color:'#991b1b', marginBottom:14 },
  okBox:   { background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'9px 14px', fontSize:12.5, color:'#166534', marginBottom:14 },
  tabRow:  { display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' },
  tab:     (active) => ({ padding:'6px 14px', borderRadius:7, fontSize:12.5, cursor:'pointer', fontWeight:500, background: active?'#2563eb':'#fff', color: active?'#fff':'#374151', border: active?'none':'1px solid #d1d5db' }),
  seatsBar:{ height:6, borderRadius:3, background:'#e5e7eb', overflow:'hidden', width:80, display:'inline-block', verticalAlign:'middle', marginRight:6 },
  seatsFill:(pct)=>({ height:'100%', borderRadius:3, background: pct>66?'#22c55e':pct>33?'#f59e0b':'#ef4444', width:pct+'%' }),
};

// ─── Toast ───────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [msg]);
  if (!msg) return null;
  const bg = type==='success'?'#166534':type==='error'?'#991b1b':'#1e40af';
  return (
    <div style={{ position:'fixed', bottom:24, right:24, background:bg, color:'#fff', padding:'10px 18px', borderRadius:9, fontSize:13, fontWeight:500, zIndex:9999, boxShadow:'0 4px 12px rgba(0,0,0,.2)', maxWidth:360 }}>
      {msg}
    </div>
  );
}

// ─── Pill ────────────────────────────────────────────────────
function Pill({ status }) {
  const map = { Registered:'green', Dropped:'red', Pending:'amber', Approved:'green', Rejected:'red', Open:'green', Full:'red' };
  return <span style={S.pill(map[status]||'gray')}>{status}</span>;
}

// ─── SeatsBar ────────────────────────────────────────────────
function SeatsBar({ avail, total }) {
  const pct = total > 0 ? Math.round((avail/total)*100) : 0;
  const col = avail===0?'red':avail===1?'amber':'green';
  return (
    <span>
      <span style={S.seatsBar}><span style={S.seatsFill(pct)} /></span>
      <span style={S.pill(col)}>{avail}/{total}</span>
    </span>
  );
}

// ─── Select ──────────────────────────────────────────────────
function Sel({ id, value, onChange, options, placeholder }) {
  return (
    <select id={id} value={value} onChange={e=>onChange(e.target.value)} style={S.input}>
      <option value="">{placeholder||'Select...'}</option>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PAGES
// ═══════════════════════════════════════════════════════════════

function Dashboard({ students, courses, enrollments, waitingList }) {
  const active = enrollments.filter(e=>e.status==='Registered');
  return (
    <>
      <div style={S.statsGrid}>
        {[['Students',students.length],['Courses',courses.length],['Enrolled',active.length],['On Waitlist',waitingList.length]].map(([l,n])=>(
          <div key={l} style={S.stat}><div style={S.statN}>{n}</div><div style={S.statL}>{l}</div></div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.sH}>Course Seat Overview</div>
        <table style={S.table}>
          <thead><tr>{['Code','Title','Instructor','Occupancy','Seats','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {courses.map(c=>{
              const pct=c.total_seats>0?Math.round(((c.total_seats-c.available_seats)/c.total_seats)*100):0;
              return (
                <tr key={c.section_id}>
                  <td style={S.td}>{c.course_code}</td>
                  <td style={S.td}>{c.course_title}</td>
                  <td style={S.td}>{c.instructor}</td>
                  <td style={S.td}><span style={S.seatsBar}><span style={S.seatsFill(pct)}/></span>{pct}%</td>
                  <td style={S.td}><SeatsBar avail={c.available_seats} total={c.total_seats}/></td>
                  <td style={S.td}><Pill status={c.available_seats===0?'Full':'Open'}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={S.sH}>Active Enrollments</div>
        <table style={S.table}>
          <thead><tr>{['Student','Dept','Course','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {enrollments.map((e,i)=>(
              <tr key={i}>
                <td style={S.td}>{e.student_name}</td>
                <td style={S.td}>{e.department}</td>
                <td style={S.td}>{e.course_title||'—'}</td>
                <td style={S.td}><Pill status={e.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CoursePage({ courses }) {
  const [kw, setKw] = useState('');
  const filtered = courses.filter(c =>
    c.course_title.toLowerCase().includes(kw.toLowerCase()) ||
    c.course_code.toLowerCase().includes(kw.toLowerCase())
  );
  return (
    <>
      <div style={S.infoBox}>All courses and their current seat availability.</div>
      <input style={{...S.input, maxWidth:280, marginBottom:14}} placeholder="Search by name or code..." value={kw} onChange={e=>setKw(e.target.value)}/>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>{['Code','Title','Credits','Dept','Instructor','Seats'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.section_id}>
                <td style={S.td}>{c.course_code}</td>
                <td style={S.td}>{c.course_title}</td>
                <td style={S.td}>{c.credit_hours}</td>
                <td style={S.td}>{c.department}</td>
                <td style={S.td}>{c.instructor}</td>
                <td style={S.td}><SeatsBar avail={c.available_seats} total={c.total_seats}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EnrollPage({ students, courses, onAction, toast }) {
  const [sid, setSid] = useState('');
  const [secId, setSecId] = useState('');
  const [msg, setMsg] = useState(null);
  const availSecs = courses.filter(c=>c.available_seats>0);

  const doEnroll = async () => {
    setMsg(null);
    if (!sid||!secId) { setMsg({type:'warn',text:'Select both student and section.'}); return; }
    const res = await post('/enroll', { student_id:+sid, section_id:+secId });
    if (res.error) { setMsg({type:'error',text:res.error}); return; }
    setMsg({type:'ok',text:res.message});
    onAction();
  };

  return (
    <>
      <div style={S.infoBox}>Enrolls with full validation: duplicate check, seat check, prerequisite check, and credit limit check.</div>
      {msg && <div style={msg.type==='ok'?S.okBox:msg.type==='warn'?S.warnBox:S.errBox}>{msg.text}</div>}
      <div style={S.card}>
        <div style={S.formRow}>
          <div style={S.fGroup}><span style={S.fLabel}>Student</span>
            <Sel value={sid} onChange={setSid} options={students.map(s=>({value:s.student_id,label:s.name+' ('+s.department+')'}))} placeholder="Select student..."/>
          </div>
          <div style={S.fGroup}><span style={S.fLabel}>Available Section</span>
            <Sel value={secId} onChange={setSecId} options={availSecs.map(c=>({value:c.section_id,label:c.course_code+' - '+c.course_title+' ('+c.available_seats+' left)'}))} placeholder="Select section..."/>
          </div>
          <button style={S.btn('primary')} onClick={doEnroll}>Enroll</button>
        </div>
      </div>
    </>
  );
}

function DropPage({ students, enrollments, onAction }) {
  const [sid, setSid] = useState('');
  const [secId, setSecId] = useState('');
  const [msg, setMsg] = useState(null);
  const [history, setHistory] = useState([]);

  const myEnrs = enrollments.filter(e=>e.student_id===+sid && e.status==='Registered');

  const doDrop = async () => {
    setMsg(null);
    if (!sid||!secId) { setMsg({type:'warn',text:'Select both.'}); return; }
    const res = await post('/drop', { student_id:+sid, section_id:+secId });
    if (res.error) { setMsg({type:'error',text:res.error}); return; }
    setHistory(h=>[{student:students.find(s=>s.student_id===+sid)?.name, course:myEnrs.find(e=>e.section_id===+secId)?.course_title, msg:res.message},...h]);
    setMsg({type:'ok',text:res.message});
    setSid(''); setSecId('');
    onAction();
  };

  return (
    <>
      <div style={S.infoBox}>Dropping a course frees the seat. If students are on the waitlist, the first in line is auto-enrolled.</div>
      {msg && <div style={msg.type==='ok'?S.okBox:msg.type==='warn'?S.warnBox:S.errBox}>{msg.text}</div>}
      <div style={S.card}>
        <div style={S.formRow}>
          <div style={S.fGroup}><span style={S.fLabel}>Student</span>
            <Sel value={sid} onChange={v=>{setSid(v);setSecId('');}} options={[...new Set(enrollments.filter(e=>e.status==='Registered').map(e=>e.student_id))].map(id=>{const s=students.find(x=>x.student_id===id);return{value:id,label:s?.name||id}})} placeholder="Select student..."/>
          </div>
          <div style={S.fGroup}><span style={S.fLabel}>Enrolled Section</span>
            <Sel value={secId} onChange={setSecId} options={myEnrs.map(e=>({value:e.section_id,label:(e.course_title||'Section '+e.section_id)}))} placeholder="Select section..."/>
          </div>
          <button style={S.btn('danger')} onClick={doDrop}>Drop</button>
        </div>
      </div>
      {history.length>0 && (
        <div style={S.card}>
          <div style={S.sH}>Drop History (this session)</div>
          <table style={S.table}>
            <thead><tr>{['Student','Course','Result'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{history.map((h,i)=><tr key={i}><td style={S.td}>{h.student}</td><td style={S.td}>{h.course}</td><td style={S.td}><Pill status="Dropped"/>&nbsp;{h.msg}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function WaitlistPage({ students, courses, waitingList, onAction }) {
  const [sid, setSid] = useState('');
  const [secId, setSecId] = useState('');
  const [msg, setMsg] = useState(null);
  const fullSecs = courses.filter(c=>c.available_seats===0);

  const doAdd = async () => {
    setMsg(null);
    if (!sid||!secId) { setMsg({type:'warn',text:'Select both.'}); return; }
    const res = await post('/waiting-list', { student_id:+sid, section_id:+secId });
    if (res.error) { setMsg({type:'error',text:res.error}); return; }
    setMsg({type:'ok',text:res.message});
    onAction();
  };

  const doRemove = async (waiting_id) => {
    const res = await del('/waiting-list/'+waiting_id);
    if (res.error) alert(res.error);
    else onAction();
  };

  return (
    <>
      <div style={S.infoBox}>Students can join the waitlist for full sections. When a seat opens, position 1 is auto-enrolled.</div>
      {msg && <div style={msg.type==='ok'?S.okBox:msg.type==='warn'?S.warnBox:S.errBox}>{msg.text}</div>}
      <div style={S.card}>
        <div style={S.formRow}>
          <div style={S.fGroup}><span style={S.fLabel}>Student</span>
            <Sel value={sid} onChange={setSid} options={students.map(s=>({value:s.student_id,label:s.name}))} placeholder="Select student..."/>
          </div>
          <div style={S.fGroup}><span style={S.fLabel}>Full Section</span>
            <Sel value={secId} onChange={setSecId} options={fullSecs.map(c=>({value:c.section_id,label:c.course_code+' - '+c.course_title+' (Full)'}))} placeholder="Select section..."/>
          </div>
          <button style={S.btn('primary')} onClick={doAdd}>Add to Waitlist</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sH}>Current Waiting List</div>
        <table style={S.table}>
          <thead><tr>{['Pos','Student','Dept','Course','Date','Action'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {waitingList.length===0 && <tr><td colSpan={6} style={{...S.td,textAlign:'center',color:'#9ca3af',fontStyle:'italic',padding:20}}>Waiting list is empty</td></tr>}
            {waitingList.map(w=>{
              const sec=courses.find(c=>c.section_id===w.section_id);
              return (
                <tr key={w.waiting_id}>
                  <td style={S.td}><strong>{w.position}</strong></td>
                  <td style={S.td}>{w.student_name}</td>
                  <td style={S.td}>{w.department}</td>
                  <td style={S.td}>{sec?.course_title||'—'}</td>
                  <td style={S.td}>{String(w.request_date).slice(0,10)}</td>
                  <td style={S.td}><button style={S.btn('danger')} onClick={()=>doRemove(w.waiting_id)}>Remove</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SwapPage({ students, courses, swapRequests, onAction }) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [cid, setCid] = useState('');
  const [msg, setMsg] = useState(null);

  const doSwap = async () => {
    setMsg(null);
    if (!s1||!s2||!cid) { setMsg({type:'warn',text:'Fill all fields.'}); return; }
    if (s1===s2) { setMsg({type:'warn',text:'Students must be different.'}); return; }
    const res = await post('/swap', { student1_id:+s1, student2_id:+s2, course_id:+cid });
    if (res.error) { setMsg({type:'error',text:res.error}); return; }
    setMsg({type:'ok',text:res.message});
    setS1('');setS2('');setCid('');
    onAction();
  };

  const doStatus = async (swap_id, status) => {
    const res = await patch('/swap/'+swap_id, { status });
    if (res.error) alert(res.error);
    else onAction();
  };

  return (
    <>
      <div style={S.infoBox}>Two students request to swap sections of the same course. Admin can approve or reject.</div>
      {msg && <div style={msg.type==='ok'?S.okBox:msg.type==='warn'?S.warnBox:S.errBox}>{msg.text}</div>}
      <div style={S.card}>
        <div style={S.formRow}>
          <div style={S.fGroup}><span style={S.fLabel}>Student 1</span><Sel value={s1} onChange={setS1} options={students.map(s=>({value:s.student_id,label:s.name}))} placeholder="Student 1..."/></div>
          <div style={S.fGroup}><span style={S.fLabel}>Student 2</span><Sel value={s2} onChange={setS2} options={students.map(s=>({value:s.student_id,label:s.name}))} placeholder="Student 2..."/></div>
          <div style={S.fGroup}><span style={S.fLabel}>Course</span><Sel value={cid} onChange={setCid} options={[...new Map(courses.map(c=>[c.course_code,c])).values()].map(c=>({value:c.course_id,label:c.course_title}))} placeholder="Course..."/></div>
          <button style={S.btn('primary')} onClick={doSwap}>Request Swap</button>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sH}>Swap Requests</div>
        <table style={S.table}>
          <thead><tr>{['Student 1','Student 2','Course','Date','Status','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {swapRequests.length===0&&<tr><td colSpan={6} style={{...S.td,textAlign:'center',color:'#9ca3af',fontStyle:'italic',padding:20}}>No swap requests</td></tr>}
            {swapRequests.map(sw=>(
              <tr key={sw.swap_id}>
                <td style={S.td}>{sw.student1}</td>
                <td style={S.td}>{sw.student2}</td>
                <td style={S.td}>{sw.course_title}</td>
                <td style={S.td}>{String(sw.request_date).slice(0,10)}</td>
                <td style={S.td}><Pill status={sw.status}/></td>
                <td style={S.td}>
                  {sw.status==='Pending'&&<>
                    <button style={{...S.btn('primary'),marginRight:6}} onClick={()=>doStatus(sw.swap_id,'Approved')}>Approve</button>
                    <button style={S.btn('danger')} onClick={()=>doStatus(sw.swap_id,'Rejected')}>Reject</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReportsPage({ students, instructors, courses }) {
  const [tab, setTab] = useState('enrollment');
  const [stats, setStats] = useState([]);
  const [topStudents, setTopStudents] = useState([]);

  useEffect(() => {
    get('/course-stats').then(setStats).catch(()=>{});
    get('/top-students').then(setTopStudents).catch(()=>{});
  }, []);

  const tabs = [['enrollment','Student Enrollment'],['instructors','Instructor Workload'],['stats','Course Stats'],['top','Top Students']];

  return (
    <>
      <div style={S.tabRow}>
        {tabs.map(([k,l])=><button key={k} style={S.tab(tab===k)} onClick={()=>setTab(k)}>{l}</button>)}
      </div>
      {tab==='enrollment' && (
        <div style={S.card}>
          <div style={S.sH}>Student Enrollment Report</div>
          <table style={S.table}>
            <thead><tr>{['ID','Student','Dept','Course','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {students.map((s,i)=>(
                <tr key={i}><td style={S.td}>{s.student_id}</td><td style={S.td}>{s.name}</td><td style={S.td}>{s.department}</td><td style={S.td}>—</td><td style={S.td}><Pill status="Registered"/></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==='instructors' && (
        <div style={S.card}>
          <div style={S.sH}>Instructor Workload Report</div>
          <table style={S.table}>
            <thead><tr>{['ID','Name','Dept','Sections','Max','Remaining'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {instructors.map(i=>(
                <tr key={i.instructor_id}>
                  <td style={S.td}>{i.instructor_id}</td>
                  <td style={S.td}>{i.name}</td>
                  <td style={S.td}>{i.department}</td>
                  <td style={S.td}>{i.sections_assigned}</td>
                  <td style={S.td}>{i.max_sections}</td>
                  <td style={S.td}><Pill status={i.remaining_capacity>0?'Open':'Full'}/>&nbsp;{i.remaining_capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==='stats' && (
        <div style={S.card}>
          <div style={S.sH}>Course Statistics</div>
          <table style={S.table}>
            <thead><tr>{['Code','Title','Sections','Taken','Remaining','Avg Avail'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {stats.map(r=>(
                <tr key={r.course_code}>
                  <td style={S.td}>{r.course_code}</td>
                  <td style={S.td}>{r.course_title}</td>
                  <td style={S.td}>{r.total_sections}</td>
                  <td style={S.td}>{r.seats_taken}</td>
                  <td style={S.td}>{r.seats_remaining}</td>
                  <td style={S.td}>{r.avg_available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==='top' && (
        <div style={S.card}>
          <div style={S.sH}>Top Students (Grade A)</div>
          <table style={S.table}>
            <thead><tr>{['Student','Dept','Course','Grade'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {topStudents.map((r,i)=>(
                <tr key={i}><td style={S.td}>{r.student_name}</td><td style={S.td}>{r.department}</td><td style={S.td}>{r.course_title}</td><td style={S.td}><Pill status="Approved"/>&nbsp;{r.grade}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ValidatorsPage({ students, courses }) {
  const [valSid, setValSid]   = useState('');
  const [valRes, setValRes]   = useState(null);
  const [preSid, setPreSid]   = useState('');
  const [preCid, setPreCid]   = useState('');
  const [preRes, setPreRes]   = useState(null);
  const [dupSid, setDupSid]   = useState('');
  const [dupSec, setDupSec]   = useState('');
  const [dupRes, setDupRes]   = useState(null);

  const checkCredits = async () => {
    if (!valSid) return;
    const r = await get('/validate-credits/'+valSid);
    setValRes(r);
  };

  const checkPrereqs = async () => {
    if (!preSid||!preCid) return;
    const r = await get('/check-prereqs/'+preSid+'/'+preCid);
    setPreRes(r);
  };

  const checkDup = async () => {
    if (!dupSid||!dupSec) return;
    const r = await get('/check-enrollment/'+dupSid+'/'+dupSec);
    setDupRes(r);
  };

  const uniqCourses = [...new Map(courses.map(c=>[c.course_id,c])).values()];

  return (
    <>
      <div style={S.card}>
        <div style={S.sH}>Credit Hour Validator</div>
        <div style={S.infoBox}>Check how many credits a student has registered and whether they are within their limit.</div>
        <div style={S.formRow}>
          <div style={S.fGroup}><span style={S.fLabel}>Student</span><Sel value={valSid} onChange={setValSid} options={students.map(s=>({value:s.student_id,label:s.name}))}/></div>
          <button style={S.btn('primary')} onClick={checkCredits}>Check</button>
        </div>
        {valRes && (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8 }}>
            <span style={S.pill('blue')}>Student: {valRes.student_name}</span>
            <span style={S.pill('green')}>Used: {valRes.total_registered_credits} credits</span>
            <span style={S.pill(valRes.total_registered_credits < valRes.max_credit_limit?'green':'red')}>
              Limit: {valRes.max_credit_limit} | Remaining: {valRes.max_credit_limit - valRes.total_registered_credits}
            </span>
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.sH}>Prerequisite Checker</div>
        <div style={S.infoBox}>Check if a student has completed the required prerequisites before enrolling.</div>
        <div style={S.formRow}>
          <div style={S.fGroup}><span style={S.fLabel}>Student</span><Sel value={preSid} onChange={setPreSid} options={students.map(s=>({value:s.student_id,label:s.name}))}/></div>
          <div style={S.fGroup}><span style={S.fLabel}>Course</span><Sel value={preCid} onChange={setPreCid} options={uniqCourses.map(c=>({value:c.course_id,label:c.course_title}))}/></div>
          <button style={S.btn('primary')} onClick={checkPrereqs}>Check</button>
        </div>
        {preRes && (
          <div style={{ marginTop:8 }}>
            {preRes.missing_prereqs === 0
              ? <span style={S.pill('green')}>All prerequisites met</span>
              : <span style={S.pill('red')}>{preRes.missing_prereqs} prerequisite(s) missing</span>}
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.sH}>Duplicate Enrollment Check</div>
        <div style={S.infoBox}>Check whether a student is already registered in a particular section.</div>
        <div style={S.formRow}>
          <div style={S.fGroup}><span style={S.fLabel}>Student</span><Sel value={dupSid} onChange={setDupSid} options={students.map(s=>({value:s.student_id,label:s.name}))}/></div>
          <div style={S.fGroup}><span style={S.fLabel}>Section</span><Sel value={dupSec} onChange={setDupSec} options={courses.map(c=>({value:c.section_id,label:c.course_code+' - '+c.course_title+' (Sec '+c.section_id+')'}))}/></div>
          <button style={S.btn('primary')} onClick={checkDup}>Check</button>
        </div>
        {dupRes && (
          <div style={{ marginTop:8 }}>
            {dupRes.already_enrolled > 0
              ? <span style={S.pill('red')}>Already enrolled in this section</span>
              : <span style={S.pill('green')}>Not enrolled — can register</span>}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════
const PAGES = [
  ['dashboard','Dashboard'],
  ['courses','Courses'],
  ['enroll','Enroll Student'],
  ['drop','Drop Course'],
  ['waitlist','Waiting List'],
  ['swap','Swap Requests'],
  ['reports','Reports'],
  ['validators','Validators'],
];

export default function App() {
  const [page, setPage]         = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [courses, setCourses]   = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [waitingList, setWaitingList] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [toast, setToast]       = useState({ msg:'', type:'' });

  const loadAll = useCallback(async () => {
    try {
      const [s, c, e, i, w, sw] = await Promise.all([
        get('/students'),
        get('/all-courses'),
        get('/student-report'),
        get('/instructor-report'),
        get('/waiting-list/0').catch(()=>[]),   // fetching by student below
        get('/swap-requests'),
      ]);
      setStudents(s);
      setCourses(c);
      setEnrollments(e);
      setInstructors(i);
      // flatten all waitlists
      const allW = await Promise.all(c.map(sec=>get('/waiting-list/'+sec.section_id).catch(()=>[])));
      setWaitingList(allW.flat());
      setSwapRequests(sw);
    } catch(err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const titles = Object.fromEntries(PAGES);

  return (
    <div style={S.shell}>
      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.logoBar}>
          <div style={S.logoT}>ENROLLIX</div>
          <div style={S.logoS}>Enrollment System</div>
        </div>
        <div style={{ padding:'8px 0', flex:1 }}>
          {PAGES.map(([k,l])=>(
            <div key={k} style={S.navItem(page===k)} onClick={()=>setPage(k)}>{l}</div>
          ))}
        </div>
        <div style={{ padding:'12px 16px', borderTop:'1px solid #1e2d3d' }}>
          <div style={{ color:'#5a7a94', fontSize:11 }}>Fall 2025</div>
          <div style={{ color:'#3a5a74', fontSize:11, marginTop:2 }}>{students.length} students · {[...new Set(courses.map(c=>c.course_id))].length} courses</div>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        <div style={S.topbar}>
          <span style={S.pageT}>{titles[page]}</span>
          <span style={S.badge}>ENROLLIX Dashboard</span>
        </div>
        <div style={S.content}>
          {page==='dashboard'  && <Dashboard students={students} courses={courses} enrollments={enrollments} waitingList={waitingList}/>}
          {page==='courses'    && <CoursePage courses={courses}/>}
          {page==='enroll'     && <EnrollPage students={students} courses={courses} onAction={loadAll}/>}
          {page==='drop'       && <DropPage students={students} enrollments={enrollments} onAction={loadAll}/>}
          {page==='waitlist'   && <WaitlistPage students={students} courses={courses} waitingList={waitingList} onAction={loadAll}/>}
          {page==='swap'       && <SwapPage students={students} courses={courses} swapRequests={swapRequests} onAction={loadAll}/>}
          {page==='reports'    && <ReportsPage students={students} instructors={instructors} courses={courses}/>}
          {page==='validators' && <ValidatorsPage students={students} courses={courses}/>}
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({msg:'',type:''})}/>
    </div>
  );
}