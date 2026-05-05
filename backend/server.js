const express = require('express');
const sql     = require('mssql');
const cors    = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ── DB CONFIG ─────────────────────────────────────────────
const dbConfig = {
  user: 'enrollix_user', password: 'mak123', server: 'localhost',
  database: 'ENROLLIX',
  options: { instanceName:'SQLEXPRESS', trustServerCertificate:true, enableArithAbort:true, connectTimeout:30000 },
  pool: { max:10, min:0, idleTimeoutMillis:30000 }
};

let pool;
const q  = async str => (await pool.request().query(str)).recordset;
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { console.error(e.message); res.status(500).json({ error: e.message }); }
};

// Execute stored procedure, return OUTPUT message
const execSP = async (name, inputs=[], outputName='message') => {
  const r = pool.request();
  inputs.forEach(p => {
    if (p.out) r.output(p.name, p.type);
    else r.input(p.name, p.type, p.value);
  });
  const result = await r.execute(name);
  // mssql returns PRINT statements in recordsets[0] sometimes; output params in result.output
  return result;
};

// Helper: call SP, parse RAISERROR as error, PRINT as success
const callSP = async (res, name, inputs) => {
  try {
    await execSP(name, inputs);
    res.json({ message: 'Operation completed successfully.' });
  } catch (e) {
    // RAISERROR propagates as thrown error
    res.status(400).json({ error: e.message });
  }
};

/* ══ AUTH ══════════════════════════════════════════════════ */
app.post('/login', wrap(async (req, res) => {
  const { role, id, password } = req.body;
  if (role === 'student') {
    const rows = await q(`SELECT student_id, first_name+' '+last_name AS name, department, semester, max_credit_limit, fees_paid, email FROM Students WHERE student_id=${+id} AND password_hash='${password}'`);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
    res.json({ role: 'student', user: rows[0] });
  } else if (role === 'teacher') {
    const rows = await q(`SELECT instructor_id, name, department, email, max_sections, current_sections FROM Instructors WHERE instructor_id=${+id} AND password_hash='${password}'`);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
    res.json({ role: 'teacher', user: rows[0] });
  } else if (role === 'admin') {
    if (+id === 0 && password === 'admin123') res.json({ role: 'admin', user: { name: 'Administrator', department: 'Admin Office', admin_id: 0 } });
    else return res.status(401).json({ error: 'Invalid admin credentials.' });
  } else res.status(400).json({ error: 'Unknown role.' });
}));

/* ══ STUDENTS ══════════════════════════════════════════════ */
app.get('/students', wrap(async (req, res) => {
  res.json(await q(`SELECT student_id, first_name+' '+last_name AS name, department, semester, max_credit_limit, fees_paid, email FROM Students ORDER BY student_id`));
}));
app.get('/students/:id', wrap(async (req, res) => {
  const rows = await q(`SELECT student_id, first_name+' '+last_name AS name, department, semester, max_credit_limit, fees_paid, email FROM Students WHERE student_id=${+req.params.id}`);
  res.json(rows[0] || null);
}));

/* ══ COURSES & SECTIONS ════════════════════════════════════ */
app.get('/all-courses', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_AllCourses ORDER BY course_code`));
}));
app.get('/available-courses', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_AvailableCourses ORDER BY course_code`));
}));
app.get('/courses-list', wrap(async (req, res) => {
  res.json(await q(`SELECT course_id, course_code, course_title, credit_hours, department FROM Courses ORDER BY course_code`));
}));
app.get('/search-courses', wrap(async (req, res) => {
  const kw = (req.query.keyword || '').replace(/'/g, "''");
  res.json(await q(`SELECT course_id,course_code,course_title,credit_hours,department FROM Courses WHERE course_title LIKE '%${kw}%' OR course_code LIKE '%${kw}%'`));
}));
app.get('/prereq-tree', wrap(async (req, res) => {
  const nodes = await q(`SELECT course_id, course_code, course_title, credit_hours, department FROM Courses`);
  const edges = await q(`SELECT cp.course_id, cp.prerequisite_course_id, c.course_code AS from_code, c2.course_code AS to_code FROM Course_Prerequisites cp JOIN Courses c ON cp.prerequisite_course_id=c.course_id JOIN Courses c2 ON cp.course_id=c2.course_id`);
  res.json({ nodes, edges });
}));
app.get('/section-fill-rate', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_SectionFillRate ORDER BY fill_percentage DESC`));
}));
app.get('/semester-info', wrap(async (req, res) => {
  const rows = await q(`SELECT * FROM Semesters WHERE is_active=1`);
  res.json(rows[0] || null);
}));
app.get('/semesters', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM Semesters ORDER BY year DESC, semester_name`));
}));

/* ══ ENROLLMENT — uses sp_EnrollStudent ═══════════════════ */
app.post('/enroll', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;
  await callSP(res, 'sp_EnrollStudent', [
    { name: 'student_id', type: sql.Int, value: student_id },
    { name: 'section_id', type: sql.Int, value: section_id },
  ]);
}));

/* ══ DROP — uses sp_DropCourse ════════════════════════════ */
app.post('/drop', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;
  await callSP(res, 'sp_DropCourse', [
    { name: 'student_id', type: sql.Int, value: student_id },
    { name: 'section_id', type: sql.Int, value: section_id },
  ]);
}));

app.get('/my-enrollments/:student_id', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_StudentEnrollmentReport WHERE student_id=${+req.params.student_id} AND status='Registered'`));
}));
app.get('/check-enrollment/:student_id/:section_id', wrap(async (req, res) => {
  const [row] = await q(`SELECT COUNT(*) AS already_enrolled FROM Enrollments WHERE student_id=${+req.params.student_id} AND section_id=${+req.params.section_id} AND status='Registered'`);
  res.json(row);
}));
app.get('/validate-credits/:student_id', wrap(async (req, res) => {
  const [row] = await q(`SELECT * FROM vw_CreditUsage WHERE student_id=${+req.params.student_id}`);
  res.json(row || null);
}));
app.get('/check-prereqs/:student_id/:course_id', wrap(async (req, res) => {
  const [row] = await q(`SELECT COUNT(*) AS missing_prereqs FROM Course_Prerequisites cp WHERE cp.course_id=${+req.params.course_id} AND cp.prerequisite_course_id NOT IN (SELECT course_id FROM Completed_Courses WHERE student_id=${+req.params.student_id})`);
  res.json(row);
}));

/* ══ WAITLIST — uses sp_AddToWaitingList ══════════════════ */
app.post('/waiting-list', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;
  await callSP(res, 'sp_AddToWaitingList', [
    { name: 'student_id', type: sql.Int, value: student_id },
    { name: 'section_id', type: sql.Int, value: section_id },
  ]);
}));
app.get('/waiting-list/:section_id', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_WaitingList WHERE section_id=${+req.params.section_id} ORDER BY position`));
}));
app.delete('/waiting-list/:waiting_id', wrap(async (req, res) => {
  const rows = await q(`SELECT section_id, position FROM Waiting_List WHERE waiting_id=${+req.params.waiting_id}`);
  if (!rows.length) return res.status(404).json({ error: 'Not found.' });
  await q(`DELETE FROM Waiting_List WHERE waiting_id=${+req.params.waiting_id}`);
  await q(`UPDATE Waiting_List SET position=position-1 WHERE section_id=${rows[0].section_id} AND position>${rows[0].position}`);
  res.json({ message: 'Removed.' });
}));

/* ══ SWAP — uses sp_ApproveSwap ═══════════════════════════ */
app.post('/swap', wrap(async (req, res) => {
  const { student1_id, student2_id, course_id } = req.body;
  const rows = await q(`SELECT ISNULL(MAX(swap_id),0)+1 AS next_id FROM Swap_Requests`);
  const next = rows[0].next_id;
  await q(`INSERT INTO Swap_Requests (swap_id,student1_id,student2_id,course_id,status,request_date) VALUES (${next},${student1_id},${student2_id},${course_id},'Pending',GETDATE())`);
  res.json({ message: 'Swap request created.' });
}));
app.get('/swap-requests', wrap(async (req, res) => {
  res.json(await q(`SELECT sr.swap_id, s1.first_name+' '+s1.last_name AS student1, s2.first_name+' '+s2.last_name AS student2, c.course_title, sr.status, sr.request_date FROM Swap_Requests sr JOIN Students s1 ON sr.student1_id=s1.student_id JOIN Students s2 ON sr.student2_id=s2.student_id JOIN Courses c ON sr.course_id=c.course_id ORDER BY sr.request_date DESC`));
}));
app.patch('/swap/:swap_id', wrap(async (req, res) => {
  const { status } = req.body;
  if (status === 'Approved') {
    await callSP(res, 'sp_ApproveSwap', [{ name: 'swap_id', type: sql.Int, value: +req.params.swap_id }]);
  } else {
    await q(`UPDATE Swap_Requests SET status='${status}' WHERE swap_id=${+req.params.swap_id}`);
    res.json({ message: `Swap ${status}.` });
  }
}));

/* ══ GRADES — uses sp_PostGrade ═══════════════════════════ */
app.post('/post-grade', wrap(async (req, res) => {
  const { student_id, section_id, grade, instructor_id } = req.body;
  await callSP(res, 'sp_PostGrade', [
    { name: 'student_id',    type: sql.Int,       value: student_id },
    { name: 'section_id',   type: sql.Int,       value: section_id },
    { name: 'grade',        type: sql.VarChar(2), value: grade },
    { name: 'instructor_id',type: sql.Int,       value: instructor_id },
  ]);
}));

/* ══ ATTENDANCE — uses sp_MarkAttendance ══════════════════ */
app.post('/attendance', wrap(async (req, res) => {
  const { section_id, instructor_id, class_date, records } = req.body;
  const r = pool.request();
  r.input('section_id',       sql.Int,                section_id);
  r.input('instructor_id',    sql.Int,                instructor_id);
  r.input('class_date',       sql.Date,               new Date(class_date));
  r.input('attendance_json',  sql.NVarChar(sql.MAX),  JSON.stringify(records));
  try {
    await r.execute('sp_MarkAttendance');
    res.json({ message: `Attendance marked for ${class_date}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
}));
app.get('/attendance/section/:section_id', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_AttendanceSummary WHERE section_id=${+req.params.section_id}`));
}));
app.get('/attendance/student/:student_id', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_AttendanceSummary WHERE student_id=${+req.params.student_id}`));
}));
app.get('/attendance/detail/:section_id/:date', wrap(async (req, res) => {
  res.json(await q(`SELECT a.attendance_id, a.student_id, s.first_name+' '+s.last_name AS student_name, a.status FROM Attendance a JOIN Students s ON a.student_id=s.student_id WHERE a.section_id=${+req.params.section_id} AND a.class_date='${req.params.date}'`));
}));

/* ══ FEES — uses sp_PayFees ═══════════════════════════════ */
app.post('/pay-fees', wrap(async (req, res) => {
  const { student_id, amount, semester, year } = req.body;
  await callSP(res, 'sp_PayFees', [
    { name: 'student_id', type: sql.Int,         value: student_id },
    { name: 'amount',     type: sql.Decimal(10,2),value: amount },
    { name: 'semester',   type: sql.VarChar(20), value: semester },
    { name: 'year',       type: sql.Int,         value: year },
  ]);
}));
app.get('/fee-payments/:student_id', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM Fee_Payments WHERE student_id=${+req.params.student_id} ORDER BY payment_date DESC`));
}));

/* ══ RATINGS — uses sp_RateTeacher ════════════════════════ */
app.post('/rate-teacher', wrap(async (req, res) => {
  const { student_id, instructor_id, rating, comment } = req.body;
  await callSP(res, 'sp_RateTeacher', [
    { name: 'student_id',    type: sql.Int,        value: student_id },
    { name: 'instructor_id', type: sql.Int,        value: instructor_id },
    { name: 'rating',        type: sql.Int,        value: rating },
    { name: 'comment',       type: sql.VarChar(500),value: comment || '' },
  ]);
}));
app.get('/teacher-ratings', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_TeacherRatings ORDER BY avg_rating DESC`));
}));
app.get('/teacher-ratings/:instructor_id', wrap(async (req, res) => {
  res.json(await q(`SELECT tr.rating_id, s.first_name+' '+s.last_name AS student_name, tr.rating, tr.comment, tr.rating_date FROM Teacher_Ratings tr JOIN Students s ON tr.student_id=s.student_id WHERE tr.instructor_id=${+req.params.instructor_id} ORDER BY tr.rating_date DESC`));
}));
app.get('/my-rated-instructors/:student_id', wrap(async (req, res) => {
  const rows = await q(`SELECT instructor_id FROM Teacher_Ratings WHERE student_id=${+req.params.student_id}`);
  res.json(rows.map(r => r.instructor_id));
}));

/* ══ ANNOUNCEMENTS — uses sp_PostAnnouncement ═════════════ */
app.post('/announcements', wrap(async (req, res) => {
  const { instructor_id, section_id, title, body } = req.body;
  await callSP(res, 'sp_PostAnnouncement', [
    { name: 'instructor_id', type: sql.Int,          value: instructor_id },
    { name: 'section_id',    type: sql.Int,          value: section_id },
    { name: 'title',         type: sql.VarChar(200), value: title },
    { name: 'body',          type: sql.VarChar(1000),value: body },
  ]);
}));
app.get('/announcements', wrap(async (req, res) => {
  res.json(await q(`SELECT a.announcement_id, i.name AS instructor, c.course_title, sec.section_id, a.title, a.body, a.posted_date FROM Announcements a JOIN Instructors i ON a.instructor_id=i.instructor_id JOIN Sections sec ON a.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id ORDER BY a.posted_date DESC`));
}));
app.get('/announcements/instructor/:instructor_id', wrap(async (req, res) => {
  res.json(await q(`SELECT a.*, c.course_title, sec.semester, sec.year FROM Announcements a JOIN Sections sec ON a.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id WHERE a.instructor_id=${+req.params.instructor_id} ORDER BY a.posted_date DESC`));
}));

/* ══ INSTRUCTOR ════════════════════════════════════════════ */
app.get('/instructor-sections/:instructor_id', wrap(async (req, res) => {
  res.json(await q(`SELECT s.section_id, c.course_id, c.course_code, c.course_title, s.semester, s.year, s.total_seats, s.available_seats, (s.total_seats-s.available_seats) AS enrolled FROM Sections s JOIN Courses c ON s.course_id=c.course_id WHERE s.instructor_id=${+req.params.instructor_id}`));
}));
app.get('/section-roster/:section_id', wrap(async (req, res) => {
  res.json(await q(`SELECT * FROM vw_SectionRoster WHERE section_id=${+req.params.section_id} AND student_id IS NOT NULL`));
}));
app.post('/create-section', wrap(async (req, res) => {
  const { course_id, semester, year, seats } = req.body;
  await callSP(res, 'sp_CreateDynamicSection', [
    { name: 'course_id',   type: sql.Int,        value: course_id },
    { name: 'semester',    type: sql.VarChar(20), value: semester },
    { name: 'year',        type: sql.Int,        value: year },
    { name: 'total_seats', type: sql.Int,        value: seats },
  ]);
}));

/* ══ REPORTS (all use views) ═══════════════════════════════ */
app.get('/student-report',    wrap(async (req, res) => res.json(await q(`SELECT * FROM vw_StudentEnrollmentReport ORDER BY student_id`))));
app.get('/instructor-report', wrap(async (req, res) => res.json(await q(`SELECT * FROM vw_InstructorWorkload ORDER BY remaining_capacity DESC`))));
app.get('/course-stats',      wrap(async (req, res) => res.json(await q(`SELECT * FROM vw_SectionFillRate ORDER BY fill_percentage DESC`))));
app.get('/top-students',      wrap(async (req, res) => res.json(await q(`SELECT s.first_name+' '+s.last_name AS student_name, s.department, cc.grade, c.course_title FROM Students s JOIN Completed_Courses cc ON s.student_id=cc.student_id JOIN Courses c ON cc.course_id=c.course_id WHERE cc.grade='A' ORDER BY s.last_name`))));
app.get('/student-activity',  wrap(async (req, res) => res.json(await q(`SELECT * FROM vw_StudentActivity ORDER BY active_enrollments DESC`))));
app.get('/audit-log',         wrap(async (req, res) => res.json(await q(`SELECT TOP 200 * FROM Audit_Log ORDER BY action_time DESC`))));
app.get('/gpa-all',           wrap(async (req, res) => res.json(await q(`SELECT * FROM vw_StudentGPA ORDER BY gpa DESC`))));

/* ══ GPA & TRANSCRIPT ══════════════════════════════════════ */
app.get('/cgpa/:student_id', wrap(async (req, res) => {
  const [row] = await q(`SELECT * FROM vw_StudentGPA WHERE student_id=${+req.params.student_id}`);
  res.json(row || null);
}));
app.get('/transcript/:student_id', wrap(async (req, res) => {
  const [student] = await q(`SELECT s.student_id, s.first_name+' '+s.last_name AS name, s.department, s.semester, s.email, g.gpa, g.courses_completed, g.total_credits_earned FROM Students s JOIN vw_StudentGPA g ON s.student_id=g.student_id WHERE s.student_id=${+req.params.student_id}`);
  const courses   = await q(`SELECT cc.course_id, c.course_code, c.course_title, cc.credit_hours, cc.grade, cc.grade_points, cc.semester_completed, cc.year_completed FROM Completed_Courses cc JOIN Courses c ON cc.course_id=c.course_id WHERE cc.student_id=${+req.params.student_id} ORDER BY cc.year_completed, cc.semester_completed`);
  const current   = await q(`SELECT c.course_code, c.course_title, c.credit_hours, sec.semester, sec.year, i.name AS instructor, e.status FROM Enrollments e JOIN Sections sec ON e.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id JOIN Instructors i ON sec.instructor_id=i.instructor_id WHERE e.student_id=${+req.params.student_id} AND e.status='Registered'`);
  res.json({ student: student || null, completed_courses: courses, current_enrollments: current });
}));
app.get('/completed-courses/:student_id', wrap(async (req, res) => {
  res.json(await q(`SELECT cc.*, c.course_code, c.course_title, c.department FROM Completed_Courses cc JOIN Courses c ON cc.course_id=c.course_id WHERE cc.student_id=${+req.params.student_id} ORDER BY cc.year_completed DESC`));
}));

/* ══ STUDENT PROFILE (uses SP) ═════════════════════════════ */
app.get('/student-profile/:student_id', wrap(async (req, res) => {
  const r = pool.request();
  r.input('student_id', sql.Int, +req.params.student_id);
  const result = await r.execute('sp_GetStudentProfile');
  res.json({
    credit_usage:  result.recordsets[0] || [],
    gpa:           result.recordsets[1] || [],
    enrollments:   result.recordsets[2] || [],
    waitlist:      result.recordsets[3] || [],
  });
}));

/* ══ ADMIN — SEMESTER ROLLOVER ═════════════════════════════ */
app.post('/semester-rollover', wrap(async (req, res) => {
  const { from_semester, from_year, to_semester, to_year, enroll_start, enroll_end, drop_end, exam_start } = req.body;
  await callSP(res, 'sp_SemesterRollover', [
    { name: 'from_semester', type: sql.VarChar(20), value: from_semester },
    { name: 'from_year',     type: sql.Int,         value: from_year },
    { name: 'to_semester',   type: sql.VarChar(20), value: to_semester },
    { name: 'to_year',       type: sql.Int,         value: to_year },
    { name: 'enroll_start',  type: sql.Date,        value: new Date(enroll_start) },
    { name: 'enroll_end',    type: sql.Date,        value: new Date(enroll_end) },
    { name: 'drop_end',      type: sql.Date,        value: new Date(drop_end) },
    { name: 'exam_start',    type: sql.Date,        value: new Date(exam_start) },
  ]);
}));

/* ══ STARTUP ═══════════════════════════════════════════════ */
const PORT = 5000;
sql.connect(dbConfig)
  .then(p => {
    pool = p;
    console.log('✅ Connected to ENROLLIX database');
    app.listen(PORT, () => console.log(`🚀 Server → http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.error('→ Check: SQL Server Browser running, TCP/IP enabled, correct credentials');
    process.exit(1);
  });
