const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ─── DB CONFIG ───────────────────────────────────────────────
const sqlConfig = {
  server: 'localhost\\SQLEXPRESS',
  database: 'ENROLLIX',
  user: 'enrollix_user',          // or your SQL login
  password: 'mak123',
  options: { trustServerCertificate: true }
};


// Connect once at startup
sql.connect(dbConfig)
  .then(() => console.log('Connected to SQL Server'))
  .catch(err => console.error('DB Connection failed:', err.message));

// ─── HELPER ──────────────────────────────────────────────────
// Wraps every route so unhandled errors return JSON, not a crash
const wrap = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════ */

// 1. Available courses (seats > 0)
app.get('/available-courses', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT c.course_code, c.course_title, c.credit_hours,
           i.name AS instructor, s.semester, s.year,
           s.section_id, s.available_seats, s.total_seats
    FROM Courses c
    JOIN Sections s ON c.course_id = s.course_id
    JOIN Instructors i ON s.instructor_id = i.instructor_id
    WHERE s.available_seats > 0
    ORDER BY s.available_seats DESC;
  `);
  res.json(result.recordset);
}));

// 2. ALL courses (for dropdowns)
app.get('/all-courses', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT c.course_id, c.course_code, c.course_title, c.credit_hours, c.department,
           s.section_id, s.available_seats, s.total_seats,
           i.name AS instructor
    FROM Courses c
    JOIN Sections s ON c.course_id = s.course_id
    JOIN Instructors i ON s.instructor_id = i.instructor_id
    ORDER BY c.course_code;
  `);
  res.json(result.recordset);
}));

// 3. All students
app.get('/students', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT student_id, first_name + ' ' + last_name AS name,
           department, semester, max_credit_limit, email
    FROM Students ORDER BY student_id;
  `);
  res.json(result.recordset);
}));

// 4. Enroll a student  (enrollment_id is IDENTITY — don't include it)
app.post('/enroll', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;

  // Duplicate check
  const dup = await sql.query(`
    SELECT COUNT(*) AS cnt FROM Enrollments
    WHERE student_id=${student_id} AND section_id=${section_id} AND status='Registered';
  `);
  if (dup.recordset[0].cnt > 0)
    return res.status(400).json({ error: 'Already enrolled in this section.' });

  // Seat check
  const seat = await sql.query(`
    SELECT available_seats, course_id FROM Sections WHERE section_id=${section_id};
  `);
  if (!seat.recordset.length || seat.recordset[0].available_seats < 1)
    return res.status(400).json({ error: 'No seats available.' });

  const course_id = seat.recordset[0].course_id;

  // Prerequisite check
  const prereq = await sql.query(`
    SELECT COUNT(*) AS missing FROM Course_Prerequisites cp
    WHERE cp.course_id=${course_id}
    AND cp.prerequisite_course_id NOT IN (
      SELECT course_id FROM Completed_Courses WHERE student_id=${student_id}
    );
  `);
  if (prereq.recordset[0].missing > 0)
    return res.status(400).json({ error: 'Prerequisites not met for this course.' });

  // Credit limit check
  const credits = await sql.query(`
    SELECT ISNULL(SUM(c.credit_hours),0) AS used
    FROM Enrollments e
    JOIN Sections sec ON e.section_id=sec.section_id
    JOIN Courses c ON sec.course_id=c.course_id
    WHERE e.student_id=${student_id} AND e.status='Registered';
  `);
  const courseCredits = await sql.query(`
    SELECT credit_hours FROM Courses WHERE course_id=${course_id};
  `);
  const limit = await sql.query(`
    SELECT max_credit_limit FROM Students WHERE student_id=${student_id};
  `);
  const used = credits.recordset[0].used;
  const adding = courseCredits.recordset[0].credit_hours;
  const max = limit.recordset[0].max_credit_limit;
  if (used + adding > max)
    return res.status(400).json({ error: `Credit limit exceeded (${used}+${adding} > ${max}).` });

  // All good — insert
  await sql.query(`
    INSERT INTO Enrollments (student_id, section_id, enrollment_date, status)
    VALUES (${student_id}, ${section_id}, GETDATE(), 'Registered');
  `);
  await sql.query(`
    UPDATE Sections SET available_seats = available_seats - 1
    WHERE section_id = ${section_id};
  `);
  res.json({ message: 'Enrollment successful' });
}));

// 5. Drop a course + auto-dequeue waitlist
app.post('/drop', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;

  await sql.query(`
    UPDATE Enrollments SET status='Dropped'
    WHERE student_id=${student_id} AND section_id=${section_id} AND status='Registered';
  `);
  await sql.query(`
    UPDATE Sections SET available_seats = available_seats + 1
    WHERE section_id=${section_id};
  `);

  // Auto-enroll first person on waitlist
  const next = await sql.query(`
    SELECT TOP 1 waiting_id, student_id FROM Waiting_List
    WHERE section_id=${section_id} ORDER BY position ASC;
  `);
  let autoMsg = '';
  if (next.recordset.length) {
    const { waiting_id, student_id: wid } = next.recordset[0];
    await sql.query(`
      INSERT INTO Enrollments (student_id, section_id, enrollment_date, status)
      VALUES (${wid}, ${section_id}, GETDATE(), 'Registered');
    `);
    await sql.query(`UPDATE Sections SET available_seats = available_seats - 1 WHERE section_id=${section_id};`);
    await sql.query(`DELETE FROM Waiting_List WHERE waiting_id=${waiting_id};`);
    await sql.query(`UPDATE Waiting_List SET position=position-1 WHERE section_id=${section_id} AND position>1;`);
    autoMsg = ' Waitlist student auto-enrolled.';
  }

  res.json({ message: 'Course dropped.' + autoMsg });
}));

// 6. Check duplicate enrollment
app.get('/check-enrollment/:student_id/:section_id', wrap(async (req, res) => {
  const { student_id, section_id } = req.params;
  const result = await sql.query(`
    SELECT COUNT(*) AS already_enrolled FROM Enrollments
    WHERE student_id=${student_id} AND section_id=${section_id} AND status='Registered';
  `);
  res.json(result.recordset[0]);
}));

// 7. Credit hour validation
app.get('/validate-credits/:student_id', wrap(async (req, res) => {
  const { student_id } = req.params;
  const result = await sql.query(`
    SELECT st.student_id,
           st.first_name + ' ' + st.last_name AS student_name,
           st.max_credit_limit,
           ISNULL(SUM(c.credit_hours),0) AS total_registered_credits
    FROM Students st
    LEFT JOIN Enrollments e   ON e.student_id=st.student_id AND e.status='Registered'
    LEFT JOIN Sections sec    ON e.section_id=sec.section_id
    LEFT JOIN Courses c       ON sec.course_id=c.course_id
    WHERE st.student_id=${student_id}
    GROUP BY st.student_id, st.first_name, st.last_name, st.max_credit_limit;
  `);
  res.json(result.recordset[0]);
}));

// 8. Prerequisite validation
app.get('/check-prereqs/:student_id/:course_id', wrap(async (req, res) => {
  const { student_id, course_id } = req.params;
  const result = await sql.query(`
    SELECT COUNT(*) AS missing_prereqs
    FROM Course_Prerequisites cp
    WHERE cp.course_id=${course_id}
    AND cp.prerequisite_course_id NOT IN (
      SELECT course_id FROM Completed_Courses WHERE student_id=${student_id}
    );
  `);
  res.json(result.recordset[0]);
}));

// 9. Search courses
app.get('/search-courses', wrap(async (req, res) => {
  const keyword = (req.query.keyword || '').replace(/'/g, "''");
  const result = await sql.query(`
    SELECT c.course_id, c.course_code, c.course_title, c.credit_hours, c.department,
           s.section_id, s.available_seats
    FROM Courses c
    JOIN Sections s ON c.course_id=s.course_id
    WHERE c.course_title LIKE '%${keyword}%' OR c.course_code LIKE '%${keyword}%';
  `);
  res.json(result.recordset);
}));

// 10. Add to waiting list
app.post('/waiting-list', wrap(async (req, res) => {
  const { student_id, section_id } = req.body;
  // Check already on list
  const dup = await sql.query(`
    SELECT COUNT(*) AS cnt FROM Waiting_List
    WHERE student_id=${student_id} AND section_id=${section_id};
  `);
  if (dup.recordset[0].cnt > 0)
    return res.status(400).json({ error: 'Already on waiting list.' });

  await sql.query(`
    INSERT INTO Waiting_List (student_id, section_id, request_date, position)
    VALUES (${student_id}, ${section_id}, GETDATE(),
      (SELECT ISNULL(MAX(position),0)+1 FROM Waiting_List WHERE section_id=${section_id}));
  `);
  res.json({ message: 'Added to waiting list' });
}));

// 11. View waiting list for a section
app.get('/waiting-list/:section_id', wrap(async (req, res) => {
  const { section_id } = req.params;
  const result = await sql.query(`
    SELECT wl.waiting_id, wl.position,
           st.student_id, st.first_name + ' ' + st.last_name AS student_name,
           st.department, wl.request_date
    FROM Waiting_List wl
    JOIN Students st ON wl.student_id=st.student_id
    WHERE wl.section_id=${section_id}
    ORDER BY wl.position ASC;
  `);
  res.json(result.recordset);
}));

// 12. Remove from waiting list
app.delete('/waiting-list/:waiting_id', wrap(async (req, res) => {
  const { waiting_id } = req.params;
  const row = await sql.query(`SELECT section_id, position FROM Waiting_List WHERE waiting_id=${waiting_id};`);
  if (!row.recordset.length) return res.status(404).json({ error: 'Not found' });
  const { section_id, position } = row.recordset[0];
  await sql.query(`DELETE FROM Waiting_List WHERE waiting_id=${waiting_id};`);
  await sql.query(`UPDATE Waiting_List SET position=position-1 WHERE section_id=${section_id} AND position>${position};`);
  res.json({ message: 'Removed from waiting list' });
}));

// 13. Create new section (auto-assign least-busy instructor)
app.post('/create-section', wrap(async (req, res) => {
  const { course_id, semester, year, seats } = req.body;
  const ins = await sql.query(`
    SELECT TOP 1 instructor_id FROM Instructors
    WHERE current_sections < max_sections ORDER BY current_sections ASC;
  `);
  if (!ins.recordset.length)
    return res.status(400).json({ error: 'No available instructors.' });

  const instructor_id = ins.recordset[0].instructor_id;
  await sql.query(`
    INSERT INTO Sections (course_id, instructor_id, semester, year, total_seats, available_seats)
    VALUES (${course_id}, ${instructor_id}, '${semester}', ${year}, ${seats}, ${seats});
  `);
  await sql.query(`UPDATE Instructors SET current_sections=current_sections+1 WHERE instructor_id=${instructor_id};`);
  res.json({ message: 'New section created' });
}));

// 14. Swap request
app.post('/swap', wrap(async (req, res) => {
  const { student1_id, student2_id, course_id } = req.body;
  await sql.query(`
    INSERT INTO Swap_Requests (student1_id, student2_id, course_id, status, request_date)
    VALUES (${student1_id}, ${student2_id}, ${course_id}, 'Pending', GETDATE());
  `);
  res.json({ message: 'Swap request created' });
}));

// 15. Approve/Reject swap
app.patch('/swap/:swap_id', wrap(async (req, res) => {
  const { swap_id } = req.params;
  const { status } = req.body;  // 'Approved' or 'Rejected'
  await sql.query(`UPDATE Swap_Requests SET status='${status}' WHERE swap_id=${swap_id};`);
  res.json({ message: `Swap ${status}` });
}));

// 16. Get all swap requests
app.get('/swap-requests', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT sr.swap_id,
           s1.first_name+' '+s1.last_name AS student1,
           s2.first_name+' '+s2.last_name AS student2,
           c.course_title, sr.status, sr.request_date
    FROM Swap_Requests sr
    JOIN Students s1 ON sr.student1_id=s1.student_id
    JOIN Students s2 ON sr.student2_id=s2.student_id
    JOIN Courses c   ON sr.course_id=c.course_id
    ORDER BY sr.request_date DESC;
  `);
  res.json(result.recordset);
}));

// 17. Instructor workload report
app.get('/instructor-report', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT i.instructor_id, i.name, i.department,
           COUNT(s.section_id) AS sections_assigned,
           i.max_sections,
           (i.max_sections - i.current_sections) AS remaining_capacity
    FROM Sections s
    RIGHT JOIN Instructors i ON s.instructor_id=i.instructor_id
    GROUP BY i.instructor_id, i.name, i.department, i.max_sections, i.current_sections
    ORDER BY remaining_capacity DESC;
  `);
  res.json(result.recordset);
}));

// 18. Student enrollment report
app.get('/student-report', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT s.student_id,
           s.first_name+' '+s.last_name AS student_name,
           s.department, c.course_title, e.status
    FROM Students s
    LEFT JOIN Enrollments e  ON s.student_id=e.student_id
    LEFT JOIN Sections sec   ON e.section_id=sec.section_id
    LEFT JOIN Courses c      ON sec.course_id=c.course_id
    ORDER BY s.student_id;
  `);
  res.json(result.recordset);
}));

// 19. Course statistics
app.get('/course-stats', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT c.course_code, c.course_title,
           COUNT(s.section_id)                              AS total_sections,
           SUM(s.total_seats)                               AS total_seats,
           SUM(s.total_seats - s.available_seats)           AS seats_taken,
           SUM(s.available_seats)                           AS seats_remaining,
           CAST(AVG(CAST(s.available_seats AS FLOAT)) AS DECIMAL(5,1)) AS avg_available
    FROM Courses c
    JOIN Sections s ON c.course_id=s.course_id
    GROUP BY c.course_code, c.course_title
    ORDER BY seats_taken DESC;
  `);
  res.json(result.recordset);
}));

// 20. Top students (grade A)
app.get('/top-students', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT s.first_name+' '+s.last_name AS student_name,
           s.department, cc.grade, c.course_title
    FROM Students s
    JOIN Completed_Courses cc ON s.student_id=cc.student_id
    JOIN Courses c            ON cc.course_id=c.course_id
    WHERE cc.grade='A'
    ORDER BY s.last_name;
  `);
  res.json(result.recordset);
}));

// 21. Active enrollments per student
app.get('/active-enrollments', wrap(async (req, res) => {
  const result = await sql.query(`
    SELECT s.student_id,
           s.first_name+' '+s.last_name AS student_name,
           COUNT(e.enrollment_id) AS total_active_enrollments
    FROM Students s
    LEFT JOIN Enrollments e ON s.student_id=e.student_id AND e.status='Registered'
    GROUP BY s.student_id, s.first_name, s.last_name
    ORDER BY total_active_enrollments DESC;
  `);
  res.json(result.recordset);
}));

// 22. Delete student (cascade)
app.delete('/remove-student/:student_id', wrap(async (req, res) => {
  const { student_id } = req.params;
  await sql.query(`DELETE FROM Students WHERE student_id=${student_id};`);
  res.json({ message: 'Student removed' });
}));

// ─── START ───────────────────────────────────────────────────
const PORT = 5000;
app.listen(PORT, () => console.log(`ENROLLIX backend running on http://localhost:${PORT}`));
