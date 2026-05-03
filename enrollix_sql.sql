USE ENROLLIX;
GO

-- ============================================================
--  TABLES
-- ============================================================

CREATE TABLE Students (
  student_id        INT          PRIMARY KEY,
  first_name        VARCHAR(50)  NOT NULL,
  last_name         VARCHAR(50)  NOT NULL,
  email             VARCHAR(100) UNIQUE NOT NULL,
  department        VARCHAR(50)  NOT NULL,
  semester          INT          NOT NULL,
  max_credit_limit  INT          NOT NULL CHECK (max_credit_limit > 0),
  fees_paid         BIT          NOT NULL DEFAULT 0,
  password_hash     VARCHAR(100) NOT NULL DEFAULT 'student123'
);

CREATE TABLE Instructors (
  instructor_id     INT          PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  department        VARCHAR(50)  NOT NULL,
  email             VARCHAR(100) UNIQUE,
  max_sections      INT          NOT NULL CHECK (max_sections > 0),
  current_sections  INT          DEFAULT 0 CHECK (current_sections >= 0),
  password_hash     VARCHAR(100) NOT NULL DEFAULT 'teacher123'
);

CREATE TABLE Courses (
  course_id    INT          PRIMARY KEY,
  course_code  VARCHAR(20)  UNIQUE NOT NULL,
  course_title VARCHAR(100) NOT NULL,
  credit_hours INT          NOT NULL CHECK (credit_hours > 0),
  department   VARCHAR(50)  NOT NULL
);

CREATE TABLE Course_Prerequisites (
  course_id              INT,
  prerequisite_course_id INT,
  PRIMARY KEY (course_id, prerequisite_course_id),
  FOREIGN KEY (course_id)               REFERENCES Courses(course_id),
  FOREIGN KEY (prerequisite_course_id)  REFERENCES Courses(course_id)
);

-- Semesters table — controls enrollment and drop deadlines
CREATE TABLE Semesters (
  semester_id          INT IDENTITY(1,1) PRIMARY KEY,
  semester_name        VARCHAR(20) NOT NULL,  -- 'Fall','Spring','Summer'
  year                 INT         NOT NULL,
  enrollment_start     DATE        NOT NULL,
  enrollment_deadline  DATE        NOT NULL,
  drop_deadline        DATE        NOT NULL,
  exam_start           DATE        NOT NULL,
  is_active            BIT         NOT NULL DEFAULT 0,
  UNIQUE (semester_name, year)
);

CREATE TABLE Sections (
  section_id      INT IDENTITY(1,1) PRIMARY KEY,
  course_id       INT,
  instructor_id   INT,
  semester_name   VARCHAR(20) NOT NULL,
  year            INT         NOT NULL,
  total_seats     INT         NOT NULL CHECK (total_seats > 0),
  available_seats INT         NOT NULL CHECK (available_seats >= 0),
  FOREIGN KEY (course_id)     REFERENCES Courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id)
);

CREATE TABLE Enrollments (
  enrollment_id   INT IDENTITY(1,1) PRIMARY KEY,
  student_id      INT,
  section_id      INT,
  enrollment_date DATE        NOT NULL,
  status          VARCHAR(20) CHECK (status IN ('Registered','Dropped','Completed')),
  FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES Sections(section_id)
);

CREATE TABLE Completed_Courses (
  student_id         INT,
  course_id          INT,
  grade              VARCHAR(2)  NOT NULL,
  grade_points       DECIMAL(3,1) NOT NULL,  -- 4.0, 3.0 etc.
  credit_hours       INT         NOT NULL,
  semester_completed VARCHAR(20) NOT NULL,
  year_completed     INT         NOT NULL,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES Courses(course_id)
);

CREATE TABLE Waiting_List (
  waiting_id   INT IDENTITY(1,1) PRIMARY KEY,
  student_id   INT,
  section_id   INT,
  request_date DATE NOT NULL,
  position     INT  NOT NULL,
  FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES Sections(section_id)
);

CREATE TABLE Swap_Requests (
  swap_id      INT IDENTITY(1,1) PRIMARY KEY,
  student1_id  INT,
  student2_id  INT,
  course_id    INT,
  status       VARCHAR(20) CHECK (status IN ('Pending','Approved','Rejected')),
  request_date DATE NOT NULL,
  FOREIGN KEY (student1_id) REFERENCES Students(student_id),
  FOREIGN KEY (student2_id) REFERENCES Students(student_id),
  FOREIGN KEY (course_id)   REFERENCES Courses(course_id)
);

CREATE TABLE Teacher_Ratings (
  rating_id      INT IDENTITY(1,1) PRIMARY KEY,
  student_id     INT          NOT NULL,
  instructor_id  INT          NOT NULL,
  rating         INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        VARCHAR(500) NULL,
  rating_date    DATE         NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (student_id)    REFERENCES Students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id),
  UNIQUE (student_id, instructor_id)
);

CREATE TABLE Fee_Payments (
  payment_id   INT IDENTITY(1,1) PRIMARY KEY,
  student_id   INT           NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  payment_date DATE          NOT NULL DEFAULT GETDATE(),
  semester     VARCHAR(20)   NOT NULL,
  year         INT           NOT NULL,
  FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
);

CREATE TABLE Announcements (
  announcement_id INT IDENTITY(1,1) PRIMARY KEY,
  instructor_id   INT           NOT NULL,
  section_id      INT           NOT NULL,
  title           VARCHAR(200)  NOT NULL,
  body            VARCHAR(1000) NOT NULL,
  posted_date     DATE          NOT NULL DEFAULT GETDATE(),
  FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id),
  FOREIGN KEY (section_id)    REFERENCES Sections(section_id)
);

-- Attendance table — per student per section per date
CREATE TABLE Attendance (
  attendance_id INT IDENTITY(1,1) PRIMARY KEY,
  student_id    INT         NOT NULL,
  section_id    INT         NOT NULL,
  class_date    DATE        NOT NULL,
  status        VARCHAR(10) NOT NULL CHECK (status IN ('Present','Absent','Late')),
  marked_by     INT         NOT NULL,  -- instructor_id
  FOREIGN KEY (student_id)  REFERENCES Students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (section_id)  REFERENCES Sections(section_id),
  FOREIGN KEY (marked_by)   REFERENCES Instructors(instructor_id),
  UNIQUE (student_id, section_id, class_date)
);

-- Audit log — automatically filled by triggers
CREATE TABLE Audit_Log (
  log_id       INT IDENTITY(1,1) PRIMARY KEY,
  table_name   VARCHAR(50)  NOT NULL,
  action       VARCHAR(10)  NOT NULL,  -- INSERT, UPDATE, DELETE
  student_id   INT          NULL,
  description  VARCHAR(500) NOT NULL,
  old_value    VARCHAR(200) NULL,
  new_value    VARCHAR(200) NULL,
  changed_at   DATETIME     NOT NULL DEFAULT GETDATE(),
  changed_by   VARCHAR(100) NULL
);

GO

-- ============================================================
--  TRIGGERS  (Audit Log)
-- ============================================================

-- Trigger 1: Log new enrollments
CREATE TRIGGER tr_Enrollment_Insert
ON Enrollments AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Audit_Log (table_name, action, student_id, description, new_value, changed_at)
  SELECT 'Enrollments', 'INSERT', i.student_id,
         'Student enrolled in section ' + CAST(i.section_id AS VARCHAR),
         'Status: ' + i.status,
         GETDATE()
  FROM inserted i;
END;
GO

-- Trigger 2: Log enrollment status changes (drop, complete)
CREATE TRIGGER tr_Enrollment_Update
ON Enrollments AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Audit_Log (table_name, action, student_id, description, old_value, new_value, changed_at)
  SELECT 'Enrollments', 'UPDATE', i.student_id,
         'Enrollment status changed for section ' + CAST(i.section_id AS VARCHAR),
         'Was: ' + d.status,
         'Now: ' + i.status,
         GETDATE()
  FROM inserted i
  JOIN deleted d ON i.enrollment_id = d.enrollment_id
  WHERE i.status <> d.status;
END;
GO

-- Trigger 3: Log seat count changes in Sections
CREATE TRIGGER tr_Sections_SeatUpdate
ON Sections AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Audit_Log (table_name, action, student_id, description, old_value, new_value, changed_at)
  SELECT 'Sections', 'UPDATE', NULL,
         'Seats updated for section ' + CAST(i.section_id AS VARCHAR),
         'Was: ' + CAST(d.available_seats AS VARCHAR) + ' seats',
         'Now: ' + CAST(i.available_seats AS VARCHAR) + ' seats',
         GETDATE()
  FROM inserted i
  JOIN deleted d ON i.section_id = d.section_id
  WHERE i.available_seats <> d.available_seats;
END;
GO

-- Trigger 4: Log attendance marking
CREATE TRIGGER tr_Attendance_Insert
ON Attendance AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Audit_Log (table_name, action, student_id, description, new_value, changed_at)
  SELECT 'Attendance', 'INSERT', i.student_id,
         'Attendance marked for section ' + CAST(i.section_id AS VARCHAR) + ' on ' + CAST(i.class_date AS VARCHAR),
         i.status,
         GETDATE()
  FROM inserted i;
END;
GO

-- Trigger 5: Log grade entry into Completed_Courses
CREATE TRIGGER tr_CompletedCourses_Insert
ON Completed_Courses AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Audit_Log (table_name, action, student_id, description, new_value, changed_at)
  SELECT 'Completed_Courses', 'INSERT', i.student_id,
         'Grade posted for course_id ' + CAST(i.course_id AS VARCHAR),
         'Grade: ' + i.grade + ' (' + CAST(i.grade_points AS VARCHAR) + ' GPA)',
         GETDATE()
  FROM inserted i;
END;
GO

-- ============================================================
--  VIEWS
-- ============================================================

-- View 1: Available courses
CREATE VIEW vw_AvailableCourses AS
  SELECT c.course_id, c.course_code, c.course_title, c.credit_hours, c.department,
         s.section_id, s.semester_name, s.year, s.total_seats, s.available_seats,
         i.instructor_id, i.name AS instructor, i.department AS instructor_dept
  FROM   Courses c
  JOIN   Sections s    ON c.course_id     = s.course_id
  JOIN   Instructors i ON s.instructor_id = i.instructor_id
  WHERE  s.available_seats > 0;
GO

-- View 2: Full enrollment report
CREATE VIEW vw_EnrollmentReport AS
  SELECT s.student_id, s.first_name+' '+s.last_name AS student_name,
         s.department, s.semester AS student_semester, s.fees_paid,
         c.course_id, c.course_code, c.course_title, c.credit_hours,
         sec.section_id, sec.semester_name, sec.year,
         i.name AS instructor, e.status, e.enrollment_date, e.enrollment_id
  FROM   Students s
  LEFT JOIN Enrollments e  ON s.student_id    = e.student_id
  LEFT JOIN Sections sec   ON e.section_id    = sec.section_id
  LEFT JOIN Courses c      ON sec.course_id   = c.course_id
  LEFT JOIN Instructors i  ON sec.instructor_id = i.instructor_id;
GO

-- View 3: Instructor workload
CREATE VIEW vw_InstructorWorkload AS
  SELECT i.instructor_id, i.name, i.department,
         COUNT(DISTINCT s.section_id)                                   AS total_sections,
         COALESCE(SUM(s.total_seats - s.available_seats), 0)            AS total_students,
         i.max_sections,
         (i.max_sections - i.current_sections)                          AS remaining_capacity,
         COALESCE(AVG(CAST(r.rating AS FLOAT)), 0)                      AS avg_rating,
         COUNT(DISTINCT r.rating_id)                                    AS total_ratings
  FROM   Instructors i
  LEFT JOIN Sections s        ON i.instructor_id = s.instructor_id
  LEFT JOIN Teacher_Ratings r ON i.instructor_id = r.instructor_id
  GROUP BY i.instructor_id, i.name, i.department, i.max_sections, i.current_sections;
GO

-- View 4: Course statistics
CREATE VIEW vw_CourseStats AS
  SELECT c.course_id, c.course_code, c.course_title, c.credit_hours, c.department,
         COUNT(s.section_id)                                            AS total_sections,
         COALESCE(SUM(s.total_seats), 0)                               AS total_seats,
         COALESCE(SUM(s.total_seats - s.available_seats), 0)           AS seats_taken,
         COALESCE(SUM(s.available_seats), 0)                           AS seats_remaining,
         CAST(COALESCE(AVG(CAST(s.available_seats AS FLOAT)), 0) AS DECIMAL(5,1)) AS avg_available
  FROM   Courses c
  LEFT JOIN Sections s ON c.course_id = s.course_id
  GROUP BY c.course_id, c.course_code, c.course_title, c.credit_hours, c.department;
GO

-- View 5: CGPA per student (from Completed_Courses)
CREATE VIEW vw_StudentCGPA AS
  SELECT s.student_id,
         s.first_name+' '+s.last_name AS student_name,
         s.department,
         COUNT(cc.course_id)          AS courses_completed,
         SUM(cc.credit_hours)         AS total_credits_earned,
         CASE WHEN SUM(cc.credit_hours) > 0
              THEN CAST(SUM(cc.grade_points * cc.credit_hours) / SUM(cc.credit_hours) AS DECIMAL(4,2))
              ELSE 0.00 END           AS cgpa
  FROM   Students s
  LEFT JOIN Completed_Courses cc ON s.student_id = cc.student_id
  GROUP BY s.student_id, s.first_name, s.last_name, s.department;
GO

-- View 6: Attendance summary per student per section
CREATE VIEW vw_AttendanceSummary AS
  SELECT a.student_id, a.section_id,
         s.first_name+' '+s.last_name AS student_name,
         c.course_title,
         i.name AS instructor,
         COUNT(*)                                              AS total_classes,
         SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END)  AS present,
         SUM(CASE WHEN a.status='Absent'  THEN 1 ELSE 0 END)  AS absent,
         SUM(CASE WHEN a.status='Late'    THEN 1 ELSE 0 END)  AS late,
         CASE WHEN COUNT(*) > 0
              THEN CAST(
                (SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
              AS DECIMAL(5,1))
              ELSE 0 END                                       AS attendance_pct,
         CASE WHEN COUNT(*) > 0 AND
                   (SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) >= 80
              THEN 1 ELSE 0 END                               AS exam_eligible
  FROM   Attendance a
  JOIN   Students s    ON a.student_id    = s.student_id
  JOIN   Sections sec  ON a.section_id    = sec.section_id
  JOIN   Courses c     ON sec.course_id   = c.course_id
  JOIN   Instructors i ON sec.instructor_id = i.instructor_id
  GROUP BY a.student_id, a.section_id, s.first_name, s.last_name, c.course_title, i.name;
GO

-- View 7: Teacher ratings summary
CREATE VIEW vw_TeacherRatings AS
  SELECT i.instructor_id, i.name, i.department,
         COUNT(r.rating_id)                        AS total_ratings,
         COALESCE(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
         COUNT(CASE WHEN r.rating=5 THEN 1 END)    AS five_star,
         COUNT(CASE WHEN r.rating=4 THEN 1 END)    AS four_star,
         COUNT(CASE WHEN r.rating=3 THEN 1 END)    AS three_star,
         COUNT(CASE WHEN r.rating<=2 THEN 1 END)   AS low_rated
  FROM   Instructors i
  LEFT JOIN Teacher_Ratings r ON i.instructor_id = r.instructor_id
  GROUP BY i.instructor_id, i.name, i.department;
GO

-- View 8: Section roster (for teacher portal)
CREATE VIEW vw_SectionRoster AS
  SELECT sec.section_id, c.course_id, c.course_code, c.course_title, c.credit_hours,
         sec.semester_name, sec.year, sec.total_seats, sec.available_seats,
         i.instructor_id, i.name AS instructor,
         s.student_id, s.first_name+' '+s.last_name AS student_name,
         s.department, s.email, e.status, e.enrollment_date, e.enrollment_id
  FROM   Sections sec
  JOIN   Courses c     ON sec.course_id     = c.course_id
  JOIN   Instructors i ON sec.instructor_id = i.instructor_id
  LEFT JOIN Enrollments e ON sec.section_id = e.section_id AND e.status='Registered'
  LEFT JOIN Students s    ON e.student_id   = s.student_id;
GO

-- View 9: Student activity summary
CREATE VIEW vw_StudentActivity AS
  SELECT s.student_id, s.first_name+' '+s.last_name AS student_name,
         s.department, s.fees_paid,
         COUNT(DISTINCT e.enrollment_id)  AS active_enrollments,
         COUNT(DISTINCT w.waiting_id)     AS waitlist_positions,
         COALESCE(SUM(DISTINCT c.credit_hours), 0) AS registered_credits
  FROM   Students s
  LEFT JOIN Enrollments e  ON s.student_id = e.student_id AND e.status='Registered'
  LEFT JOIN Sections sec   ON e.section_id = sec.section_id
  LEFT JOIN Courses c      ON sec.course_id = c.course_id
  LEFT JOIN Waiting_List w ON s.student_id = w.student_id
  GROUP BY s.student_id, s.first_name, s.last_name, s.department, s.fees_paid;
GO

GO

-- ============================================================
--  STORED PROCEDURES
-- ============================================================

-- SP 1: Full enrollment with all validations + deadline check
CREATE PROCEDURE sp_EnrollStudent
  @student_id  INT,
  @section_id  INT,
  @message     VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    -- Fee check
    IF (SELECT fees_paid FROM Students WHERE student_id=@student_id) = 0
    BEGIN ROLLBACK; SET @message='ERROR: Fees not paid. Clear dues before enrolling.'; RETURN; END

    -- Enrollment deadline check
    DECLARE @sec_sem VARCHAR(20), @sec_yr INT;
    SELECT @sec_sem=semester_name, @sec_yr=year FROM Sections WHERE section_id=@section_id;
    DECLARE @enroll_deadline DATE;
    SELECT @enroll_deadline=enrollment_deadline FROM Semesters WHERE semester_name=@sec_sem AND year=@sec_yr;
    IF @enroll_deadline IS NOT NULL AND GETDATE() > @enroll_deadline
    BEGIN ROLLBACK; SET @message='ERROR: Enrollment deadline has passed for this semester.'; RETURN; END

    -- Duplicate check
    IF EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
    BEGIN ROLLBACK; SET @message='ERROR: Already enrolled in this section.'; RETURN; END

    -- Seat check
    DECLARE @avail INT, @course_id INT;
    SELECT @avail=available_seats, @course_id=course_id FROM Sections WHERE section_id=@section_id;
    IF @avail < 1 BEGIN ROLLBACK; SET @message='ERROR: No seats available.'; RETURN; END

    -- Repeating course block: already passed this course?
    IF EXISTS (SELECT 1 FROM Completed_Courses WHERE student_id=@student_id AND course_id=@course_id AND grade NOT IN ('D','F'))
    BEGIN ROLLBACK; SET @message='ERROR: You have already passed this course and cannot repeat it.'; RETURN; END

    -- Prerequisite check
    IF EXISTS (
      SELECT 1 FROM Course_Prerequisites cp
      WHERE cp.course_id=@course_id
      AND cp.prerequisite_course_id NOT IN (SELECT course_id FROM Completed_Courses WHERE student_id=@student_id)
    )
    BEGIN ROLLBACK; SET @message='ERROR: Prerequisites not completed for this course.'; RETURN; END

    -- Credit limit check
    DECLARE @used INT, @adding INT, @limit INT;
    SELECT @used=ISNULL(SUM(c.credit_hours),0) FROM Enrollments e JOIN Sections sec ON e.section_id=sec.section_id JOIN Courses c ON sec.course_id=c.course_id WHERE e.student_id=@student_id AND e.status='Registered';
    SELECT @adding=credit_hours FROM Courses WHERE course_id=@course_id;
    SELECT @limit=max_credit_limit FROM Students WHERE student_id=@student_id;
    IF (@used+@adding) > @limit BEGIN ROLLBACK; SET @message='ERROR: Credit limit exceeded ('+CAST(@used AS VARCHAR)+'+'+CAST(@adding AS VARCHAR)+' > '+CAST(@limit AS VARCHAR)+').'; RETURN; END

    -- Enroll
    INSERT INTO Enrollments (student_id, section_id, enrollment_date, status) VALUES (@student_id, @section_id, GETDATE(), 'Registered');
    UPDATE Sections SET available_seats=available_seats-1 WHERE section_id=@section_id;

    COMMIT;
    SET @message='SUCCESS: Enrolled successfully!';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 2: Drop course with deadline check + auto-waitlist dequeue
CREATE PROCEDURE sp_DropCourse
  @student_id INT,
  @section_id INT,
  @message    VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    -- Drop deadline check
    DECLARE @sec_sem VARCHAR(20), @sec_yr INT;
    SELECT @sec_sem=semester_name, @sec_yr=year FROM Sections WHERE section_id=@section_id;
    DECLARE @drop_deadline DATE;
    SELECT @drop_deadline=drop_deadline FROM Semesters WHERE semester_name=@sec_sem AND year=@sec_yr;
    IF @drop_deadline IS NOT NULL AND GETDATE() > @drop_deadline
    BEGIN ROLLBACK; SET @message='ERROR: Drop deadline has passed for this semester.'; RETURN; END

    IF NOT EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
    BEGIN ROLLBACK; SET @message='ERROR: No active enrollment found.'; RETURN; END

    UPDATE Enrollments SET status='Dropped' WHERE student_id=@student_id AND section_id=@section_id AND status='Registered';
    UPDATE Sections SET available_seats=available_seats+1 WHERE section_id=@section_id;

    -- Auto-enroll first waitlisted student
    DECLARE @next_student INT, @next_waiting INT;
    SELECT TOP 1 @next_waiting=waiting_id, @next_student=student_id FROM Waiting_List WHERE section_id=@section_id ORDER BY position ASC;
    IF @next_student IS NOT NULL
    BEGIN
      INSERT INTO Enrollments (student_id, section_id, enrollment_date, status) VALUES (@next_student, @section_id, GETDATE(), 'Registered');
      UPDATE Sections SET available_seats=available_seats-1 WHERE section_id=@section_id;
      DELETE FROM Waiting_List WHERE waiting_id=@next_waiting;
      UPDATE Waiting_List SET position=position-1 WHERE section_id=@section_id AND position>1;
      SET @message='SUCCESS: Course dropped. Waitlisted student auto-enrolled.';
    END
    ELSE SET @message='SUCCESS: Course dropped successfully.';

    COMMIT;
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 3: Add to waiting list
CREATE PROCEDURE sp_AddToWaitlist
  @student_id INT, @section_id INT, @message VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    IF EXISTS (SELECT 1 FROM Waiting_List WHERE student_id=@student_id AND section_id=@section_id)
    BEGIN ROLLBACK; SET @message='ERROR: Already on waiting list.'; RETURN; END
    IF EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
    BEGIN ROLLBACK; SET @message='ERROR: Already enrolled in this section.'; RETURN; END
    DECLARE @pos INT;
    SELECT @pos=ISNULL(MAX(position),0)+1 FROM Waiting_List WHERE section_id=@section_id;
    INSERT INTO Waiting_List (student_id, section_id, request_date, position) VALUES (@student_id, @section_id, GETDATE(), @pos);
    COMMIT;
    SET @message='SUCCESS: Added to waiting list at position '+CAST(@pos AS VARCHAR)+'.';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 4: Post grade for a student (teacher) — checks attendance first
CREATE PROCEDURE sp_PostGrade
  @student_id    INT,
  @section_id    INT,
  @grade         VARCHAR(2),
  @instructor_id INT,
  @message       VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    -- Verify instructor owns this section
    IF NOT EXISTS (SELECT 1 FROM Sections WHERE section_id=@section_id AND instructor_id=@instructor_id)
    BEGIN ROLLBACK; SET @message='ERROR: You are not assigned to this section.'; RETURN; END

    -- Attendance check (must be >= 80% to be graded)
    DECLARE @att_pct DECIMAL(5,1) = 0;
    SELECT @att_pct = COALESCE(attendance_pct, 0) FROM vw_AttendanceSummary WHERE student_id=@student_id AND section_id=@section_id;
    -- Only block if attendance records exist AND percentage is too low
    IF @att_pct > 0 AND @att_pct < 80
    BEGIN ROLLBACK; SET @message='ERROR: Student attendance is '+CAST(@att_pct AS VARCHAR)+'% — below 80% minimum. Cannot post grade.'; RETURN; END

    -- Verify student is enrolled
    IF NOT EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
    BEGIN ROLLBACK; SET @message='ERROR: Student not enrolled in this section.'; RETURN; END

    -- Grade → grade points map
    DECLARE @gp DECIMAL(3,1);
    SET @gp = CASE @grade
      WHEN 'A+' THEN 4.0 WHEN 'A' THEN 4.0 WHEN 'A-' THEN 3.7
      WHEN 'B+' THEN 3.3 WHEN 'B' THEN 3.0 WHEN 'B-' THEN 2.7
      WHEN 'C+' THEN 2.3 WHEN 'C' THEN 2.0 WHEN 'C-' THEN 1.7
      WHEN 'D+' THEN 1.3 WHEN 'D' THEN 1.0
      WHEN 'F'  THEN 0.0 ELSE NULL END;
    IF @gp IS NULL BEGIN ROLLBACK; SET @message='ERROR: Invalid grade value.'; RETURN; END

    DECLARE @course_id INT, @credit_hours INT, @sem VARCHAR(20), @yr INT;
    SELECT @course_id=c.course_id, @credit_hours=c.credit_hours, @sem=sec.semester_name, @yr=sec.year
    FROM Sections sec JOIN Courses c ON sec.course_id=c.course_id WHERE sec.section_id=@section_id;

    -- Upsert completed course
    IF EXISTS (SELECT 1 FROM Completed_Courses WHERE student_id=@student_id AND course_id=@course_id)
      UPDATE Completed_Courses SET grade=@grade, grade_points=@gp, semester_completed=@sem, year_completed=@yr WHERE student_id=@student_id AND course_id=@course_id;
    ELSE
      INSERT INTO Completed_Courses (student_id, course_id, grade, grade_points, credit_hours, semester_completed, year_completed)
      VALUES (@student_id, @course_id, @grade, @gp, @credit_hours, @sem, @yr);

    -- Mark enrollment as Completed
    UPDATE Enrollments SET status='Completed' WHERE student_id=@student_id AND section_id=@section_id;

    COMMIT;
    SET @message='SUCCESS: Grade '+@grade+' posted successfully.';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 5: Mark attendance for a whole section
CREATE PROCEDURE sp_MarkAttendance
  @section_id    INT,
  @instructor_id INT,
  @class_date    DATE,
  @attendance_json VARCHAR(MAX),  -- JSON: [{"student_id":1,"status":"Present"},...]
  @message       VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM Sections WHERE section_id=@section_id AND instructor_id=@instructor_id)
    BEGIN ROLLBACK; SET @message='ERROR: Not your section.'; RETURN; END

    -- Parse JSON and insert/update each record
    DELETE FROM Attendance WHERE section_id=@section_id AND class_date=@class_date;
    INSERT INTO Attendance (student_id, section_id, class_date, status, marked_by)
    SELECT j.student_id, @section_id, @class_date, j.status, @instructor_id
    FROM OPENJSON(@attendance_json) WITH (student_id INT '$.student_id', status VARCHAR(10) '$.status') j;

    COMMIT;
    SET @message='SUCCESS: Attendance marked for '+CAST(@class_date AS VARCHAR)+'.';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 6: Pay fees
CREATE PROCEDURE sp_PayFees
  @student_id INT, @amount DECIMAL(10,2), @semester VARCHAR(20), @year INT, @message VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM Students WHERE student_id=@student_id)
    BEGIN ROLLBACK; SET @message='ERROR: Student not found.'; RETURN; END
    UPDATE Students SET fees_paid=1 WHERE student_id=@student_id;
    INSERT INTO Fee_Payments (student_id, amount, payment_date, semester, year) VALUES (@student_id, @amount, GETDATE(), @semester, @year);
    COMMIT;
    SET @message='SUCCESS: Fees paid. Enrollment is now unlocked.';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 7: Rate teacher
CREATE PROCEDURE sp_RateTeacher
  @student_id INT, @instructor_id INT, @rating INT, @comment VARCHAR(500), @message VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    IF @rating < 1 OR @rating > 5 BEGIN ROLLBACK; SET @message='ERROR: Rating must be 1-5.'; RETURN; END
    IF NOT EXISTS (SELECT 1 FROM Enrollments e JOIN Sections s ON e.section_id=s.section_id WHERE e.student_id=@student_id AND s.instructor_id=@instructor_id AND e.status IN ('Registered','Completed'))
    BEGIN ROLLBACK; SET @message='ERROR: You can only rate instructors of courses you are/were enrolled in.'; RETURN; END
    IF EXISTS (SELECT 1 FROM Teacher_Ratings WHERE student_id=@student_id AND instructor_id=@instructor_id)
      UPDATE Teacher_Ratings SET rating=@rating, comment=@comment, rating_date=GETDATE() WHERE student_id=@student_id AND instructor_id=@instructor_id;
    ELSE
      INSERT INTO Teacher_Ratings (student_id, instructor_id, rating, comment, rating_date) VALUES (@student_id, @instructor_id, @rating, @comment, GETDATE());
    COMMIT;
    SET @message='SUCCESS: Rating submitted!';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 8: Approve swap
CREATE PROCEDURE sp_ApproveSwap
  @swap_id INT, @message VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    DECLARE @s1 INT, @s2 INT, @cid INT;
    SELECT @s1=student1_id, @s2=student2_id, @cid=course_id FROM Swap_Requests WHERE swap_id=@swap_id AND status='Pending';
    IF @s1 IS NULL BEGIN ROLLBACK; SET @message='ERROR: Swap not found or already processed.'; RETURN; END
    DECLARE @sec1 INT, @sec2 INT;
    SELECT @sec1=sec.section_id FROM Enrollments e JOIN Sections sec ON e.section_id=sec.section_id WHERE e.student_id=@s1 AND sec.course_id=@cid AND e.status='Registered';
    SELECT @sec2=sec.section_id FROM Enrollments e JOIN Sections sec ON e.section_id=sec.section_id WHERE e.student_id=@s2 AND sec.course_id=@cid AND e.status='Registered';
    IF @sec1 IS NULL OR @sec2 IS NULL BEGIN ROLLBACK; SET @message='ERROR: One or both students not enrolled.'; RETURN; END
    UPDATE Enrollments SET section_id=@sec2 WHERE student_id=@s1 AND section_id=@sec1 AND status='Registered';
    UPDATE Enrollments SET section_id=@sec1 WHERE student_id=@s2 AND section_id=@sec2 AND status='Registered';
    UPDATE Swap_Requests SET status='Approved' WHERE swap_id=@swap_id;
    COMMIT;
    SET @message='SUCCESS: Sections swapped.';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 9: Post announcement
CREATE PROCEDURE sp_PostAnnouncement
  @instructor_id INT, @section_id INT, @title VARCHAR(200), @body VARCHAR(1000), @message VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM Sections WHERE section_id=@section_id AND instructor_id=@instructor_id)
    BEGIN SET @message='ERROR: Not your section.'; RETURN; END
    INSERT INTO Announcements (instructor_id, section_id, title, body, posted_date) VALUES (@instructor_id, @section_id, @title, @body, GETDATE());
    SET @message='SUCCESS: Announcement posted.';
  END TRY
  BEGIN CATCH SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- SP 10: Semester rollover (archive current, reset for next)
CREATE PROCEDURE sp_SemesterRollover
  @from_semester VARCHAR(20),
  @from_year     INT,
  @to_semester   VARCHAR(20),
  @to_year       INT,
  @enroll_start  DATE,
  @enroll_end    DATE,
  @drop_end      DATE,
  @exam_start    DATE,
  @message       VARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;
  BEGIN TRY
    -- Mark all currently registered enrollments as Completed (grade pending)
    -- (they become records in Completed_Courses only when teacher posts a grade)
    UPDATE Enrollments SET status='Completed'
    WHERE section_id IN (SELECT section_id FROM Sections WHERE semester_name=@from_semester AND year=@from_year)
    AND status='Registered';

    -- Clear waitlists for old semester sections
    DELETE FROM Waiting_List WHERE section_id IN (SELECT section_id FROM Sections WHERE semester_name=@from_semester AND year=@from_year);

    -- Reset instructor section counts
    UPDATE Instructors SET current_sections=0;

    -- Create new semester record
    IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_name=@to_semester AND year=@to_year)
      INSERT INTO Semesters (semester_name, year, enrollment_start, enrollment_deadline, drop_deadline, exam_start, is_active)
      VALUES (@to_semester, @to_year, @enroll_start, @enroll_end, @drop_end, @exam_start, 1);

    -- Deactivate old semester, activate new
    UPDATE Semesters SET is_active=0 WHERE semester_name=@from_semester AND year=@from_year;
    UPDATE Semesters SET is_active=1 WHERE semester_name=@to_semester   AND year=@to_year;

    -- Reset all student fees_paid to 0 for new semester
    UPDATE Students SET fees_paid=0;

    COMMIT;
    SET @message='SUCCESS: Rollover complete. '+@from_semester+' '+CAST(@from_year AS VARCHAR)+' → '+@to_semester+' '+CAST(@to_year AS VARCHAR)+'.';
  END TRY
  BEGIN CATCH ROLLBACK; SET @message='ERROR: '+ERROR_MESSAGE(); END CATCH
END;
GO

-- ============================================================
--  SAMPLE DATA
-- ============================================================

INSERT INTO Students VALUES
(1,'Aqsa','Khan','aqsa@uni.com','CS',3,18,1,'student123'),
(2,'Sara','Ahmed','sara@uni.com','CS',4,18,1,'student123'),
(3,'Usman','Raza','usman@uni.com','SE',2,15,0,'student123'),
(4,'Hina','Malik','hina@uni.com','IT',5,21,1,'student123');

INSERT INTO Instructors VALUES
(1,'Dr. Aslam','CS','aslam@uni.com',2,1,'teacher123'),
(2,'Dr. Nida','CS','nida@uni.com',3,2,'teacher123'),
(3,'Dr. Ahmer','SE','ahmer@uni.com',2,1,'teacher123');

INSERT INTO Courses VALUES
(101,'CS101','Programming Fundamentals',3,'CS'),
(102,'CS201','Data Structures',3,'CS'),
(103,'SE101','Software Engineering',3,'SE'),
(104,'IT101','Database Systems',3,'IT'),
(105,'CS301','Algorithms',3,'CS'),
(106,'CS401','Machine Learning',3,'CS');

INSERT INTO Course_Prerequisites VALUES
(102,101),   -- Data Structures requires Programming Fundamentals
(105,102),   -- Algorithms requires Data Structures
(106,105);   -- ML requires Algorithms

INSERT INTO Semesters (semester_name,year,enrollment_start,enrollment_deadline,drop_deadline,exam_start,is_active) VALUES
('Fall',2025,'2025-08-01','2025-09-15','2025-10-15','2025-12-01',1);

INSERT INTO Sections (course_id,instructor_id,semester_name,year,total_seats,available_seats) VALUES
(101,1,'Fall',2025,3,1),
(102,2,'Fall',2025,2,2),
(103,3,'Fall',2025,2,0),
(104,2,'Fall',2025,3,3),
(105,1,'Fall',2025,2,2),
(106,2,'Fall',2025,2,2);

-- Completed courses (with grade points for CGPA)
INSERT INTO Completed_Courses VALUES
(1,101,'A',4.0,3,'Spring',2025),
(2,101,'B',3.0,3,'Spring',2025),
(3,101,'C',2.0,3,'Spring',2025),
(4,101,'A',4.0,3,'Spring',2024);

INSERT INTO Enrollments (student_id,section_id,enrollment_date,status) VALUES
(1,2,'2025-09-01','Registered'),
(2,1,'2025-09-01','Registered');

INSERT INTO Waiting_List (student_id,section_id,request_date,position) VALUES
(3,3,'2025-09-02',1),
(4,3,'2025-09-02',2);

INSERT INTO Swap_Requests (student1_id,student2_id,course_id,status,request_date) VALUES
(1,2,102,'Pending','2025-09-03');

INSERT INTO Teacher_Ratings (student_id,instructor_id,rating,comment,rating_date) VALUES
(1,2,5,'Excellent! Very clear explanations.','2025-09-10'),
(2,1,4,'Good lectures, could improve pacing.','2025-09-11');

INSERT INTO Fee_Payments (student_id,amount,payment_date,semester,year) VALUES
(1,25000,'2025-08-15','Fall',2025),
(2,25000,'2025-08-16','Fall',2025),
(4,25000,'2025-08-20','Fall',2025);

INSERT INTO Announcements (instructor_id,section_id,title,body,posted_date) VALUES
(2,2,'Midterm Schedule','Midterm exam on October 15. Chapters 1-5 are in scope.','2025-09-05'),
(1,1,'Assignment 1 Due','First assignment due September 20. Submit via portal.','2025-09-06');

-- Sample attendance records (so CGPA and attendance views work)
INSERT INTO Attendance (student_id,section_id,class_date,status,marked_by) VALUES
(1,2,'2025-09-03','Present',2),(1,2,'2025-09-05','Present',2),(1,2,'2025-09-08','Present',2),
(1,2,'2025-09-10','Absent', 2),(1,2,'2025-09-12','Present',2),(1,2,'2025-09-15','Present',2),
(1,2,'2025-09-17','Present',2),(1,2,'2025-09-19','Present',2),(1,2,'2025-09-22','Late',  2),
(1,2,'2025-09-24','Present',2),
(2,1,'2025-09-03','Present',1),(2,1,'2025-09-05','Present',1),(2,1,'2025-09-08','Absent', 1),
(2,1,'2025-09-10','Absent', 1),(2,1,'2025-09-12','Present',1),(2,1,'2025-09-15','Present',1),
(2,1,'2025-09-17','Present',1),(2,1,'2025-09-19','Present',1),(2,1,'2025-09-22','Present',1),
(2,1,'2025-09-24','Present',1);

GO

-- ============================================================
--  VERIFY
-- ============================================================
SELECT * FROM Students;
SELECT * FROM Sections;
SELECT * FROM Enrollments;
SELECT * FROM Attendance;
SELECT * FROM vw_StudentCGPA;
SELECT * FROM vw_AttendanceSummary;
SELECT * FROM vw_CourseStats;
SELECT * FROM Audit_Log;
GO

DROP VIEW IF EXISTS vw_AvailableCourses;
DROP VIEW IF EXISTS vw_EnrollmentReport;
DROP VIEW IF EXISTS vw_InstructorWorkload;
DROP VIEW IF EXISTS vw_CourseStats;
DROP VIEW IF EXISTS vw_TeacherRatings;
DROP VIEW IF EXISTS vw_SectionRoster;
DROP VIEW IF EXISTS vw_StudentActivity;

DROP PROCEDURE IF EXISTS sp_EnrollStudent;
DROP PROCEDURE IF EXISTS sp_DropCourse;
DROP PROCEDURE IF EXISTS sp_AddToWaitlist;
DROP PROCEDURE IF EXISTS sp_PayFees;
DROP PROCEDURE IF EXISTS sp_RateTeacher;
DROP PROCEDURE IF EXISTS sp_ApproveSwap;
DROP PROCEDURE IF EXISTS sp_PostAnnouncement;

