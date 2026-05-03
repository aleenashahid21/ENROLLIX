const express = require('express');
const sql     = require('mssql');
const cors    = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const dbConfig = {
  user: 'enrollix_user', password: 'mak123', server: 'localhost',
  database: 'ENROLLIX',
  options: { instanceName:'SQLEXPRESS', trustServerCertificate:true, enableArithAbort:true, connectTimeout:30000 },
  pool: { max:10, min:0, idleTimeoutMillis:30000 }
};

let pool;
const q  = async (str) => (await pool.request().query(str)).recordset;
const sp = async (name, inputs, outputs) => {
  const r = pool.request();
  (inputs||[]).forEach(p => r.input(p.name, p.type, p.value));
  (outputs||[]).forEach(p => r.output(p.name, p.type));
  return r.execute(name);
};
const wrap = fn => async (req, res) => {
  try { await fn(req, res); } catch(e) { console.error(e.message); res.status(500).json({error:e.message}); }
};
const spRoute = (proc, buildInputs, buildOutputs) => wrap(async (req,res) => {
  const inputs  = buildInputs(req);
  const outputs = buildOutputs ? buildOutputs(req) : [{name:'message',type:sql.VarChar(500)}];
  const result  = await sp(proc, inputs, outputs);
  const msg     = result.output.message || '';
  if (msg.startsWith('ERROR')) return res.status(400).json({error:msg.replace('ERROR: ','')});
  res.json({message: msg.replace('SUCCESS: ','')});
});

/* ══ AUTH ══════════════════════════════════════════════════ */
app.post('/login', wrap(async (req,res) => {
  const {role, id, password} = req.body;
  if (role==='student') {
    const rows = await q(`SELECT student_id, first_name+' '+last_name AS name, department, semester, max_credit_limit, fees_paid, email FROM Students WHERE student_id=${+id} AND password_hash='${password}'`);
    if (!rows.length) return res.status(401).json({error:'Invalid credentials.'});
    res.json({role:'student', user:rows[0]});
  } else if (role==='teacher') {
    const rows = await q(`SELECT instructor_id, name, department, email, max_sections, current_sections FROM Instructors WHERE instructor_id=${+id} AND password_hash='${password}'`);
    if (!rows.length) return res.status(401).json({error:'Invalid credentials.'});
    res.json({role:'teacher', user:rows[0]});
  } else if (role==='admin') {
    if (+id===0 && password==='admin123') res.json({role:'admin', user:{name:'Administrator', department:'Admin Office', admin_id:0}});
    else return res.status(401).json({error:'Invalid admin credentials.'});
  } else res.status(400).json({error:'Unknown role.'});
}));

/* ══ STUDENTS ══════════════════════════════════════════════ */
app.get('/students', wrap(async (req,res) => {
  res.json(await q(`SELECT student_id, first_name+' '+last_name AS name, department, semester, max_credit_limit, fees_paid, email FROM Students ORDER BY student_id`));
}));
app.get('/students/:id', wrap(async (req,res) => {
  const rows = await q(`SELECT student_id, first_name+' '+last_name AS name, department, semester, max_credit_limit, fees_paid, email FROM Students WHERE student_id=${+req.params.id}`);
  res.json(rows[0]||null);
}));

/* ══ COURSES ═══════════════════════════════════════════════ */
app.get('/all-courses', wrap(async (req,res) => {
  const rows = await q(`
    SELECT c.course_id,c.course_code,c.course_title,c.credit_hours,c.department,
           s.section_id,s.semester_name,s.year,s.total_seats,s.available_seats,
           i.instructor_id,i.name AS instructor
    FROM Courses c JOIN Sections s ON c.course_id=s.course_id JOIN Instructors i ON s.instructor_id=i.instructor_id
    ORDER BY c.course_code`);
  res.json(rows);
}));
app.get('/available-courses', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM vw_AvailableCourses ORDER BY course_code`));
}));
app.get('/courses-list', wrap(async (req,res) => {
  res.json(await q(`SELECT course_id, course_code, course_title, credit_hours, department FROM Courses ORDER BY course_code`));
}));

/* Prerequisite tree — all edges */
app.get('/prereq-tree', wrap(async (req,res) => {
  const nodes = await q(`SELECT course_id, course_code, course_title, credit_hours, department FROM Courses`);
  const edges = await q(`SELECT cp.course_id, cp.prerequisite_course_id, c.course_code AS from_code, c2.course_code AS to_code FROM Course_Prerequisites cp JOIN Courses c ON cp.prerequisite_course_id=c.course_id JOIN Courses c2 ON cp.course_id=c2.course_id`);
  res.json({nodes, edges});
}));

/* Add/drop deadlines for active semester */
app.get('/semester-info', wrap(async (req,res) => {
  const rows = await q(`SELECT * FROM Semesters WHERE is_active=1`);
  res.json(rows[0]||null);
}));
app.get('/semesters', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM Semesters ORDER BY year DESC, semester_name`));
}));

/* ══ ENROLLMENT ════════════════════════════════════════════ */
app.post('/enroll', spRoute('sp_EnrollStudent',
  req => [{name:'student_id',type:sql.Int,value:req.body.student_id},{name:'section_id',type:sql.Int,value:req.body.section_id}]
));
app.post('/drop', spRoute('sp_DropCourse',
  req => [{name:'student_id',type:sql.Int,value:req.body.student_id},{name:'section_id',type:sql.Int,value:req.body.section_id}]
));
app.get('/my-enrollments/:student_id', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM vw_EnrollmentReport WHERE student_id=${+req.params.student_id} AND status='Registered'`));
}));
app.get('/check-enrollment/:student_id/:section_id', wrap(async (req,res) => {
  const [row] = await q(`SELECT COUNT(*) AS already_enrolled FROM Enrollments WHERE student_id=${+req.params.student_id} AND section_id=${+req.params.section_id} AND status='Registered'`);
  res.json(row);
}));
app.get('/validate-credits/:student_id', wrap(async (req,res) => {
  const [row] = await q(`SELECT st.student_id, st.first_name+' '+st.last_name AS student_name, st.max_credit_limit, ISNULL(SUM(c.credit_hours),0) AS total_registered_credits FROM Students st LEFT JOIN Enrollments e ON e.student_id=st.student_id AND e.status='Registered' LEFT JOIN Sections sec ON e.section_id=sec.section_id LEFT JOIN Courses c ON sec.course_id=c.course_id WHERE st.student_id=${+req.params.student_id} GROUP BY st.student_id, st.first_name, st.last_name, st.max_credit_limit`);
  res.json(row);
}));
app.get('/check-prereqs/:student_id/:course_id', wrap(async (req,res) => {
  const [row] = await q(`SELECT COUNT(*) AS missing_prereqs FROM Course_Prerequisites cp WHERE cp.course_id=${+req.params.course_id} AND cp.prerequisite_course_id NOT IN (SELECT course_id FROM Completed_Courses WHERE student_id=${+req.params.student_id})`);
  res.json(row);
}));

/* ══ WAITLIST ══════════════════════════════════════════════ */
app.post('/waiting-list', spRoute('sp_AddToWaitlist',
  req => [{name:'student_id',type:sql.Int,value:req.body.student_id},{name:'section_id',type:sql.Int,value:req.body.section_id}]
));
app.get('/waiting-list/:section_id', wrap(async (req,res) => {
  res.json(await q(`SELECT wl.waiting_id,wl.position,st.student_id,st.first_name+' '+st.last_name AS student_name,st.department,wl.request_date FROM Waiting_List wl JOIN Students st ON wl.student_id=st.student_id WHERE wl.section_id=${+req.params.section_id} ORDER BY wl.position`));
}));
app.delete('/waiting-list/:waiting_id', wrap(async (req,res) => {
  const rows = await q(`SELECT section_id, position FROM Waiting_List WHERE waiting_id=${+req.params.waiting_id}`);
  if (!rows.length) return res.status(404).json({error:'Not found.'});
  await q(`DELETE FROM Waiting_List WHERE waiting_id=${+req.params.waiting_id}`);
  await q(`UPDATE Waiting_List SET position=position-1 WHERE section_id=${rows[0].section_id} AND position>${rows[0].position}`);
  res.json({message:'Removed.'});
}));

/* ══ GRADES ════════════════════════════════════════════════ */
app.post('/post-grade', spRoute('sp_PostGrade',
  req => [
    {name:'student_id',   type:sql.Int,       value:req.body.student_id},
    {name:'section_id',   type:sql.Int,       value:req.body.section_id},
    {name:'grade',        type:sql.VarChar(2),value:req.body.grade},
    {name:'instructor_id',type:sql.Int,       value:req.body.instructor_id},
  ]
));

/* ══ ATTENDANCE ════════════════════════════════════════════ */
app.post('/attendance', wrap(async (req,res) => {
  const { section_id, instructor_id, class_date, records } = req.body;
  const r = pool.request();
  r.input('section_id',    sql.Int,          section_id);
  r.input('instructor_id', sql.Int,          instructor_id);
  r.input('class_date',    sql.Date,         new Date(class_date));
  r.input('attendance_json', sql.NVarChar(sql.MAX), JSON.stringify(records));
  r.output('message', sql.VarChar(500));
  const result = await r.execute('sp_MarkAttendance');
  const msg = result.output.message||'';
  if (msg.startsWith('ERROR')) return res.status(400).json({error:msg.replace('ERROR: ','')});
  res.json({message: msg.replace('SUCCESS: ','')});
}));

app.get('/attendance/section/:section_id', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM vw_AttendanceSummary WHERE section_id=${+req.params.section_id}`));
}));
app.get('/attendance/student/:student_id', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM vw_AttendanceSummary WHERE student_id=${+req.params.student_id}`));
}));
app.get('/attendance/dates/:section_id', wrap(async (req,res) => {
  res.json(await q(`SELECT DISTINCT class_date FROM Attendance WHERE section_id=${+req.params.section_id} ORDER BY class_date DESC`));
}));
app.get('/attendance/detail/:section_id/:date', wrap(async (req,res) => {
  res.json(await q(`SELECT a.attendance_id, a.student_id, s.first_name+' '+s.last_name AS student_name, a.status FROM Attendance a JOIN Students s ON a.student_id=s.student_id WHERE a.section_id=${+req.params.section_id} AND a.class_date='${req.params.date}'`));
}));

/* ══ CGPA & TRANSCRIPT ═════════════════════════════════════ */
app.get('/cgpa/:student_id', wrap(async (req,res) => {
  const [row] = await q(`SELECT * FROM vw_StudentCGPA WHERE student_id=${+req.params.student_id}`);
  res.json(row||null);
}));
app.get('/cgpa-all', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM vw_StudentCGPA ORDER BY cgpa DESC`));
}));
app.get('/transcript/:student_id', wrap(async (req,res) => {
  const [student] = await q(`SELECT s.student_id, s.first_name+' '+s.last_name AS name, s.department, s.semester, s.email, cgpa.cgpa, cgpa.courses_completed, cgpa.total_credits_earned FROM Students s JOIN vw_StudentCGPA cgpa ON s.student_id=cgpa.student_id WHERE s.student_id=${+req.params.student_id}`);
  const courses = await q(`SELECT cc.course_id, c.course_code, c.course_title, cc.credit_hours, cc.grade, cc.grade_points, cc.semester_completed, cc.year_completed FROM Completed_Courses cc JOIN Courses c ON cc.course_id=c.course_id WHERE cc.student_id=${+req.params.student_id} ORDER BY cc.year_completed, cc.semester_completed`);
  const current = await q(`SELECT c.course_code, c.course_title, c.credit_hours, sec.semester_name, sec.year, i.name AS instructor, e.status FROM Enrollments e JOIN Sections sec ON e.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id JOIN Instructors i ON sec.instructor_id=i.instructor_id WHERE e.student_id=${+req.params.student_id} AND e.status='Registered'`);
  res.json({student, completed_courses:courses, current_enrollments:current});
}));
app.get('/completed-courses/:student_id', wrap(async (req,res) => {
  res.json(await q(`SELECT cc.*, c.course_code, c.course_title, c.department FROM Completed_Courses cc JOIN Courses c ON cc.course_id=c.course_id WHERE cc.student_id=${+req.params.student_id} ORDER BY cc.year_completed DESC`));
}));

/* ══ SWAP ══════════════════════════════════════════════════ */
app.post('/swap', wrap(async (req,res) => {
  const {student1_id, student2_id, course_id} = req.body;
  await q(`INSERT INTO Swap_Requests (student1_id,student2_id,course_id,status,request_date) VALUES (${student1_id},${student2_id},${course_id},'Pending',GETDATE())`);
  res.json({message:'Swap request created.'});
}));
app.get('/swap-requests', wrap(async (req,res) => {
  res.json(await q(`SELECT sr.swap_id, s1.first_name+' '+s1.last_name AS student1, s2.first_name+' '+s2.last_name AS student2, c.course_title, sr.status, sr.request_date FROM Swap_Requests sr JOIN Students s1 ON sr.student1_id=s1.student_id JOIN Students s2 ON sr.student2_id=s2.student_id JOIN Courses c ON sr.course_id=c.course_id ORDER BY sr.request_date DESC`));
}));
app.patch('/swap/:swap_id', wrap(async (req,res) => {
  const {status} = req.body;
  if (status==='Approved') {
    const r = pool.request();
    r.input('swap_id', sql.Int, +req.params.swap_id);
    r.output('message', sql.VarChar(500));
    const result = await r.execute('sp_ApproveSwap');
    const msg = result.output.message||'';
    if (msg.startsWith('ERROR')) return res.status(400).json({error:msg.replace('ERROR: ','')});
    return res.json({message: msg.replace('SUCCESS: ','')});
  }
  await q(`UPDATE Swap_Requests SET status='${status}' WHERE swap_id=${+req.params.swap_id}`);
  res.json({message:`Swap ${status}.`});
}));

/* ══ FEES ══════════════════════════════════════════════════ */
app.post('/pay-fees', spRoute('sp_PayFees',
  req => [{name:'student_id',type:sql.Int,value:req.body.student_id},{name:'amount',type:sql.Decimal(10,2),value:req.body.amount},{name:'semester',type:sql.VarChar(20),value:req.body.semester},{name:'year',type:sql.Int,value:req.body.year}]
));
app.get('/fee-payments/:student_id', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM Fee_Payments WHERE student_id=${+req.params.student_id} ORDER BY payment_date DESC`));
}));

/* ══ RATINGS ═══════════════════════════════════════════════ */
app.post('/rate-teacher', spRoute('sp_RateTeacher',
  req => [{name:'student_id',type:sql.Int,value:req.body.student_id},{name:'instructor_id',type:sql.Int,value:req.body.instructor_id},{name:'rating',type:sql.Int,value:req.body.rating},{name:'comment',type:sql.VarChar(500),value:req.body.comment||''}]
));
app.get('/teacher-ratings', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM vw_TeacherRatings ORDER BY avg_rating DESC`));
}));
app.get('/teacher-ratings/:instructor_id', wrap(async (req,res) => {
  res.json(await q(`SELECT tr.rating_id, s.first_name+' '+s.last_name AS student_name, tr.rating, tr.comment, tr.rating_date FROM Teacher_Ratings tr JOIN Students s ON tr.student_id=s.student_id WHERE tr.instructor_id=${+req.params.instructor_id} ORDER BY tr.rating_date DESC`));
}));
app.get('/my-rated-instructors/:student_id', wrap(async (req,res) => {
  const rows = await q(`SELECT instructor_id FROM Teacher_Ratings WHERE student_id=${+req.params.student_id}`);
  res.json(rows.map(r=>r.instructor_id));
}));

/* ══ ANNOUNCEMENTS ═════════════════════════════════════════ */
app.post('/announcements', spRoute('sp_PostAnnouncement',
  req => [{name:'instructor_id',type:sql.Int,value:req.body.instructor_id},{name:'section_id',type:sql.Int,value:req.body.section_id},{name:'title',type:sql.VarChar(200),value:req.body.title},{name:'body',type:sql.VarChar(1000),value:req.body.body}]
));
app.get('/announcements', wrap(async (req,res) => {
  res.json(await q(`SELECT a.announcement_id, i.name AS instructor, c.course_title, sec.section_id, a.title, a.body, a.posted_date FROM Announcements a JOIN Instructors i ON a.instructor_id=i.instructor_id JOIN Sections sec ON a.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id ORDER BY a.posted_date DESC`));
}));
app.get('/announcements/instructor/:instructor_id', wrap(async (req,res) => {
  res.json(await q(`SELECT a.*, c.course_title, sec.semester_name, sec.year FROM Announcements a JOIN Sections sec ON a.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id WHERE a.instructor_id=${+req.params.instructor_id} ORDER BY a.posted_date DESC`));
}));

/* ══ INSTRUCTOR ════════════════════════════════════════════ */
app.get('/instructor-sections/:instructor_id', wrap(async (req,res) => {
  res.json(await q(`SELECT s.section_id, c.course_id, c.course_code, c.course_title, s.semester_name, s.year, s.total_seats, s.available_seats, (s.total_seats-s.available_seats) AS enrolled FROM Sections s JOIN Courses c ON s.course_id=c.course_id WHERE s.instructor_id=${+req.params.instructor_id}`));
}));
app.get('/section-roster/:section_id', wrap(async (req,res) => {
  res.json(await q(`SELECT * FROM vw_SectionRoster WHERE section_id=${+req.params.section_id} AND student_id IS NOT NULL`));
}));
app.post('/create-section', wrap(async (req,res) => {
  const {course_id,semester,year,seats,instructor_id} = req.body;
  let iid = instructor_id;
  if (!iid) {
    const ins = await q(`SELECT TOP 1 instructor_id FROM Instructors WHERE current_sections<max_sections ORDER BY current_sections ASC`);
    if (!ins.length) return res.status(400).json({error:'No available instructors.'});
    iid = ins[0].instructor_id;
  }
  await q(`INSERT INTO Sections (course_id,instructor_id,semester_name,year,total_seats,available_seats) VALUES (${course_id},${iid},'${semester}',${year},${seats},${seats})`);
  await q(`UPDATE Instructors SET current_sections=current_sections+1 WHERE instructor_id=${iid}`);
  res.json({message:'Section created.'});
}));

/* ══ REPORTS ═══════════════════════════════════════════════ */
app.get('/student-report',    wrap(async (req,res) => res.json(await q(`SELECT * FROM vw_EnrollmentReport ORDER BY student_id`))));
app.get('/instructor-report', wrap(async (req,res) => res.json(await q(`SELECT * FROM vw_InstructorWorkload ORDER BY remaining_capacity DESC`))));
app.get('/course-stats',      wrap(async (req,res) => res.json(await q(`SELECT * FROM vw_CourseStats ORDER BY seats_taken DESC`))));
app.get('/top-students',      wrap(async (req,res) => res.json(await q(`SELECT s.first_name+' '+s.last_name AS student_name, s.department, cc.grade, c.course_title FROM Students s JOIN Completed_Courses cc ON s.student_id=cc.student_id JOIN Courses c ON cc.course_id=c.course_id WHERE cc.grade='A' ORDER BY s.last_name`))));
app.get('/student-activity',  wrap(async (req,res) => res.json(await q(`SELECT * FROM vw_StudentActivity ORDER BY active_enrollments DESC`))));
app.get('/audit-log',         wrap(async (req,res) => res.json(await q(`SELECT TOP 100 * FROM Audit_Log ORDER BY changed_at DESC`))));

/* ══ ADMIN — Semester Rollover ═════════════════════════════ */
app.post('/semester-rollover', wrap(async (req,res) => {
  const {from_semester,from_year,to_semester,to_year,enroll_start,enroll_end,drop_end,exam_start} = req.body;
  const r = pool.request();
  r.input('from_semester', sql.VarChar(20), from_semester);
  r.input('from_year',     sql.Int,         from_year);
  r.input('to_semester',   sql.VarChar(20), to_semester);
  r.input('to_year',       sql.Int,         to_year);
  r.input('enroll_start',  sql.Date,        new Date(enroll_start));
  r.input('enroll_end',    sql.Date,        new Date(enroll_end));
  r.input('drop_end',      sql.Date,        new Date(drop_end));
  r.input('exam_start',    sql.Date,        new Date(exam_start));
  r.output('message', sql.VarChar(500));
  const result = await r.execute('sp_SemesterRollover');
  const msg = result.output.message||'';
  if (msg.startsWith('ERROR')) return res.status(400).json({error:msg.replace('ERROR: ','')});
  res.json({message: msg.replace('SUCCESS: ','')});
}));

/* ══ STARTUP ═══════════════════════════════════════════════ */
const PORT = 5000;
sql.connect(dbConfig)
  .then(p => { pool=p; console.log('✅ ENROLLIX backend ready'); app.listen(PORT, ()=>console.log(`🚀 http://localhost:${PORT}`)); })
  .catch(err => { console.error('❌ DB connection failed:', err.message); process.exit(1); });
