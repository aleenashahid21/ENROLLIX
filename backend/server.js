const express = require('express');
const sql     = require('mssql');
const cors    = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ─────────────────────────────────────────────────────────────
//  DB CONFIG  — tries the most common SQLEXPRESS formats
//  If one fails, edit the `server` line and try the next one.
// ─────────────────────────────────────────────────────────────
const dbConfig = {
  user:     'enrollix_user',
  password: 'mak123',

  // ✅ TRY THESE ONE BY ONE if connection fails:
  server: 'localhost\\SQLEXPRESS',          // Option 1 (most common — works when Browser is running)
  // server: '127.0.0.1',       // Option 2
  // server: '.\\SQLEXPRESS',   // Option 3

  database: 'ENROLLIX',
  options: {
    instanceName:           'SQLEXPRESS',   // tells mssql which named instance
    trustServerCertificate: true,
    enableArithAbort:       true,
    connectTimeout:         30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
};

// ─── Pool stored globally so every route uses the same one ───
let pool;

// ─── Query helper ────────────────────────────────────────────
const query = async (qStr) => {
  const result = await pool.request().query(qStr);
  return result.recordset;
};

// ─── Route error wrapper ─────────────────────────────────────
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) {
    console.error('Route error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   ROUTES
══════════════════════════════════════════════════════════ */

app.get('/students', wrap(async (req, res) => {
  const rows = await query(`
    SELECT student_id,
           first_name + ' ' + last_name AS name,
           department, semester, max_credit_limit, email
    FROM Students ORDER BY student_id;
  `);
  res.json(rows);
}));

app.get('/all-courses', wrap(async (req, res) => {
  const rows = await query(`
    SELECT c.course_id, c.course_code, c.course_title,
           c.credit_hours, c.department,
           s.section_id, s.available_seats, s.total_seats,
           i.name AS instructor
    FROM   Courses c
    JOIN   Sections s    ON c.course_id     = s.course_id
    JOIN   Instructors i ON s.instructor_id = i.instructor_id
    ORDER BY c.course_code;
  `);
  res.json(rows);
}));

app.get('/available-courses', wrap(async (req, res) => {
  const rows = await query(`
    SELECT c.course_code, c.course_title, c.credit_hours,
           i.name AS instructor, s.semester, s.year,
           s.section_id, s.available_seats, s.total_seats
    FROM   Courses c
    JOIN   Sections s    ON c.course_id     = s.course_id
    JOIN   Instructors i ON s.instructor_id = i.instructor_id
    WHERE  s.available_seats > 0
    ORDER BY s.available_seats DESC;
  `);
  res.json(rows);
}));

app.post('/enroll', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;

  const [dup] = await query(`SELECT COUNT(*) AS cnt FROM Enrollments WHERE student_id=${student_id} AND section_id=${section_id} AND status='Registered';`);
  if (dup.cnt > 0) return res.status(400).json({ error: 'Already enrolled in this section.' });

  const [sec] = await query(`SELECT available_seats, course_id FROM Sections WHERE section_id=${section_id};`);
  if (!sec || sec.available_seats < 1) return res.status(400).json({ error: 'No seats available.' });
  const course_id = sec.course_id;

  const [pre] = await query(`SELECT COUNT(*) AS missing FROM Course_Prerequisites cp WHERE cp.course_id=${course_id} AND cp.prerequisite_course_id NOT IN (SELECT course_id FROM Completed_Courses WHERE student_id=${student_id});`);
  if (pre.missing > 0) return res.status(400).json({ error: 'Prerequisites not met for this course.' });

  const [used]   = await query(`SELECT ISNULL(SUM(c.credit_hours),0) AS used FROM Enrollments e JOIN Sections sec ON e.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id WHERE e.student_id=${student_id} AND e.status='Registered';`);
  const [adding] = await query(`SELECT credit_hours FROM Courses WHERE course_id=${course_id};`);
  const [lim]    = await query(`SELECT max_credit_limit FROM Students WHERE student_id=${student_id};`);
  if (used.used + adding.credit_hours > lim.max_credit_limit)
    return res.status(400).json({ error: `Credit limit exceeded (${used.used}+${adding.credit_hours} > ${lim.max_credit_limit}).` });

  await query(`INSERT INTO Enrollments (student_id, section_id, enrollment_date, status) VALUES (${student_id}, ${section_id}, GETDATE(), 'Registered');`);
  await query(`UPDATE Sections SET available_seats = available_seats - 1 WHERE section_id=${section_id};`);
  res.json({ message: 'Enrollment successful!' });
}));

app.post('/drop', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;
  await query(`UPDATE Enrollments SET status='Dropped' WHERE student_id=${student_id} AND section_id=${section_id} AND status='Registered';`);
  await query(`UPDATE Sections SET available_seats = available_seats + 1 WHERE section_id=${section_id};`);
  const next = await query(`SELECT TOP 1 waiting_id, student_id FROM Waiting_List WHERE section_id=${section_id} ORDER BY position ASC;`);
  let extra = '';
  if (next.length) {
    const { waiting_id, student_id: wid } = next[0];
    await query(`INSERT INTO Enrollments (student_id, section_id, enrollment_date, status) VALUES (${wid}, ${section_id}, GETDATE(), 'Registered');`);
    await query(`UPDATE Sections SET available_seats = available_seats - 1 WHERE section_id=${section_id};`);
    await query(`DELETE FROM Waiting_List WHERE waiting_id=${waiting_id};`);
    await query(`UPDATE Waiting_List SET position=position-1 WHERE section_id=${section_id} AND position>1;`);
    extra = ' Waitlist student auto-enrolled.';
  }
  res.json({ message: 'Course dropped.' + extra });
}));

app.get('/check-enrollment/:student_id/:section_id', wrap(async (req, res) => {
  const { student_id, section_id } = req.params;
  const [row] = await query(`SELECT COUNT(*) AS already_enrolled FROM Enrollments WHERE student_id=${student_id} AND section_id=${section_id} AND status='Registered';`);
  res.json(row);
}));

app.get('/validate-credits/:student_id', wrap(async (req, res) => {
  const { student_id } = req.params;
  const [row] = await query(`
    SELECT st.student_id, st.first_name+' '+st.last_name AS student_name, st.max_credit_limit,
           ISNULL(SUM(c.credit_hours),0) AS total_registered_credits
    FROM   Students st
    LEFT JOIN Enrollments e ON e.student_id=st.student_id AND e.status='Registered'
    LEFT JOIN Sections sec  ON e.section_id=sec.section_id
    LEFT JOIN Courses c     ON sec.course_id=c.course_id
    WHERE  st.student_id=${student_id}
    GROUP  BY st.student_id, st.first_name, st.last_name, st.max_credit_limit;
  `);
  res.json(row);
}));

app.get('/check-prereqs/:student_id/:course_id', wrap(async (req, res) => {
  const { student_id, course_id } = req.params;
  const [row] = await query(`SELECT COUNT(*) AS missing_prereqs FROM Course_Prerequisites cp WHERE cp.course_id=${course_id} AND cp.prerequisite_course_id NOT IN (SELECT course_id FROM Completed_Courses WHERE student_id=${student_id});`);
  res.json(row);
}));

app.get('/search-courses', wrap(async (req, res) => {
  const kw = (req.query.keyword || '').replace(/'/g, "''");
  const rows = await query(`SELECT c.course_id, c.course_code, c.course_title, c.credit_hours, c.department, s.section_id, s.available_seats FROM Courses c JOIN Sections s ON c.course_id=s.course_id WHERE c.course_title LIKE '%${kw}%' OR c.course_code LIKE '%${kw}%';`);
  res.json(rows);
}));

app.post('/waiting-list', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;
  const [dup] = await query(`SELECT COUNT(*) AS cnt FROM Waiting_List WHERE student_id=${student_id} AND section_id=${section_id};`);
  if (dup.cnt > 0) return res.status(400).json({ error: 'Already on waiting list.' });
  await query(`INSERT INTO Waiting_List (student_id, section_id, request_date, position) VALUES (${student_id}, ${section_id}, GETDATE(), (SELECT ISNULL(MAX(position),0)+1 FROM Waiting_List WHERE section_id=${section_id}));`);
  res.json({ message: 'Added to waiting list.' });
}));

app.get('/waiting-list/:section_id', wrap(async (req, res) => {
  const { section_id } = req.params;
  const rows = await query(`SELECT wl.waiting_id, wl.position, st.student_id, st.first_name+' '+st.last_name AS student_name, st.department, wl.request_date FROM Waiting_List wl JOIN Students st ON wl.student_id=st.student_id WHERE wl.section_id=${section_id} ORDER BY wl.position ASC;`);
  res.json(rows);
}));

app.delete('/waiting-list/:waiting_id', wrap(async (req, res) => {
  const { waiting_id } = req.params;
  const rows = await query(`SELECT section_id, position FROM Waiting_List WHERE waiting_id=${waiting_id};`);
  if (!rows.length) return res.status(404).json({ error: 'Not found.' });
  const { section_id, position } = rows[0];
  await query(`DELETE FROM Waiting_List WHERE waiting_id=${waiting_id};`);
  await query(`UPDATE Waiting_List SET position=position-1 WHERE section_id=${section_id} AND position>${position};`);
  res.json({ message: 'Removed.' });
}));

app.post('/create-section', wrap(async (req, res) => {
  const { course_id, semester, year, seats } = req.body;
  const ins = await query(`SELECT TOP 1 instructor_id FROM Instructors WHERE current_sections < max_sections ORDER BY current_sections ASC;`);
  if (!ins.length) return res.status(400).json({ error: 'No available instructors.' });
  await query(`INSERT INTO Sections (course_id, instructor_id, semester, year, total_seats, available_seats) VALUES (${course_id}, ${ins[0].instructor_id}, '${semester}', ${year}, ${seats}, ${seats});`);
  await query(`UPDATE Instructors SET current_sections=current_sections+1 WHERE instructor_id=${ins[0].instructor_id};`);
  res.json({ message: 'New section created.' });
}));

app.post('/swap', wrap(async (req, res) => {
  const { student1_id, student2_id, course_id } = req.body;
  await query(`INSERT INTO Swap_Requests (student1_id, student2_id, course_id, status, request_date) VALUES (${student1_id}, ${student2_id}, ${course_id}, 'Pending', GETDATE());`);
  res.json({ message: 'Swap request created.' });
}));

app.patch('/swap/:swap_id', wrap(async (req, res) => {
  const { swap_id } = req.params;
  const { status } = req.body;
  await query(`UPDATE Swap_Requests SET status='${status}' WHERE swap_id=${swap_id};`);
  res.json({ message: `Swap ${status}.` });
}));

app.get('/swap-requests', wrap(async (req, res) => {
  const rows = await query(`SELECT sr.swap_id, s1.first_name+' '+s1.last_name AS student1, s2.first_name+' '+s2.last_name AS student2, c.course_title, sr.status, sr.request_date FROM Swap_Requests sr JOIN Students s1 ON sr.student1_id=s1.student_id JOIN Students s2 ON sr.student2_id=s2.student_id JOIN Courses c ON sr.course_id=c.course_id ORDER BY sr.request_date DESC;`);
  res.json(rows);
}));

app.get('/instructor-report', wrap(async (req, res) => {
  const rows = await query(`SELECT i.instructor_id, i.name, i.department, COUNT(s.section_id) AS sections_assigned, i.max_sections, (i.max_sections - i.current_sections) AS remaining_capacity FROM Sections s RIGHT JOIN Instructors i ON s.instructor_id=i.instructor_id GROUP BY i.instructor_id, i.name, i.department, i.max_sections, i.current_sections ORDER BY remaining_capacity DESC;`);
  res.json(rows);
}));

app.get('/student-report', wrap(async (req, res) => {
  const rows = await query(`SELECT s.student_id, s.first_name+' '+s.last_name AS student_name, s.department, c.course_title, e.status FROM Students s LEFT JOIN Enrollments e ON s.student_id=e.student_id LEFT JOIN Sections sec ON e.section_id=sec.section_id LEFT JOIN Courses c ON sec.course_id=c.course_id ORDER BY s.student_id;`);
  res.json(rows);
}));

app.get('/course-stats', wrap(async (req, res) => {
  const rows = await query(`SELECT c.course_code, c.course_title, COUNT(s.section_id) AS total_sections, SUM(s.total_seats) AS total_seats, SUM(s.total_seats - s.available_seats) AS seats_taken, SUM(s.available_seats) AS seats_remaining, CAST(AVG(CAST(s.available_seats AS FLOAT)) AS DECIMAL(5,1)) AS avg_available FROM Courses c JOIN Sections s ON c.course_id=s.course_id GROUP BY c.course_code, c.course_title ORDER BY seats_taken DESC;`);
  res.json(rows);
}));

app.get('/top-students', wrap(async (req, res) => {
  const rows = await query(`SELECT s.first_name+' '+s.last_name AS student_name, s.department, cc.grade, c.course_title FROM Students s JOIN Completed_Courses cc ON s.student_id=cc.student_id JOIN Courses c ON cc.course_id=c.course_id WHERE cc.grade='A' ORDER BY s.last_name;`);
  res.json(rows);
}));

/* ══════════════════════════════════════════════════════════
   STARTUP — connect DB first, then start HTTP server
══════════════════════════════════════════════════════════ */
const PORT = 5000;

sql.connect(dbConfig)
  .then(p => {
    pool = p;
    console.log('✅ SQL Server connected — ENROLLIX ready');
    app.listen(PORT, () => console.log(`🚀 Backend → http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('\n❌ SQL Server connection FAILED');
    console.error('   Error:', err.message);
    console.error('\n── Checklist ──────────────────────────────────');
    console.error('  1. Open "SQL Server Configuration Manager"');
    console.error('     → SQL Server Network Configuration');
    console.error('     → Protocols for SQLEXPRESS');
    console.error('     → Enable TCP/IP  (right-click → Enable)');
    console.error('  2. SQL Server Services → Start "SQL Server Browser"');
    console.error('  3. SQL Server Services → Restart "SQL Server (SQLEXPRESS)"');
    console.error('  4. Make sure login "enrollix_user" exists in SSMS');
    console.error('     and has access to the ENROLLIX database');
    console.error('  5. In SSMS: Server Properties → Security');
    console.error('     → set to "SQL Server and Windows Authentication mode"');
    console.error('───────────────────────────────────────────────\n');
    process.exit(1);
  });
