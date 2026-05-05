USE ENROLLIX;
GO

-- ============================================================
--  SECTION 1: TABLES
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

-- Semester table for deadlines
CREATE TABLE Semesters (
    semester_id         INT IDENTITY(1,1) PRIMARY KEY,
    semester_name       VARCHAR(20) NOT NULL CHECK (semester_name IN ('Fall','Spring','Summer')),
    year                INT         NOT NULL CHECK (year >= 2000 AND year <= 2100),
    enrollment_start    DATE        NOT NULL,
    enrollment_deadline DATE        NOT NULL,
    drop_deadline       DATE        NOT NULL,
    exam_start          DATE        NOT NULL,
    is_active           BIT         NOT NULL DEFAULT 0,
    UNIQUE (semester_name, year)
);

CREATE TABLE Sections (
    section_id      INT          PRIMARY KEY,
    course_id       INT,
    instructor_id   INT,
    semester        VARCHAR(20)  NOT NULL CHECK (semester IN ('Fall','Spring','Summer')),
    year            INT          NOT NULL CHECK (year >= 2000 AND year <= 2100),
    total_seats     INT          NOT NULL CHECK (total_seats > 0),
    available_seats INT          NOT NULL CHECK (available_seats >= 0),
    CONSTRAINT chk_seats CHECK (available_seats <= total_seats),
    FOREIGN KEY (course_id)     REFERENCES Courses(course_id)     ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id)
);

CREATE TABLE Completed_Courses (
    student_id         INT,
    course_id          INT,
    grade              VARCHAR(2)   NOT NULL
                       CHECK (grade IN ('A','A-','B+','B','B-','C+','C','C-','D','F')),
    grade_points       DECIMAL(3,1) NOT NULL,
    credit_hours       INT          NOT NULL,
    semester_completed VARCHAR(20)  NOT NULL,
    year_completed     INT          NOT NULL,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES Courses(course_id)
);

CREATE TABLE Enrollments (
    enrollment_id   INT          PRIMARY KEY,
    student_id      INT,
    section_id      INT,
    enrollment_date DATE         NOT NULL,
    status          VARCHAR(20)  CHECK (status IN ('Registered','Dropped','Completed')),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES Sections(section_id)
);

-- Unique filtered index: no duplicate active enrollments
CREATE UNIQUE INDEX UQ_active_enrollment
    ON Enrollments(student_id, section_id)
    WHERE status = 'Registered';

CREATE TABLE Waiting_List (
    waiting_id   INT  PRIMARY KEY,
    student_id   INT,
    section_id   INT,
    request_date DATE NOT NULL,
    position     INT  NOT NULL,
    CONSTRAINT UQ_waiting UNIQUE (student_id, section_id),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES Sections(section_id)
);

CREATE TABLE Swap_Requests (
    swap_id      INT PRIMARY KEY,
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
    rating_id     INT IDENTITY(1,1) PRIMARY KEY,
    student_id    INT          NOT NULL,
    instructor_id INT          NOT NULL,
    rating        INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       VARCHAR(500) NULL,
    rating_date   DATE         NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (student_id)    REFERENCES Students(student_id)    ON DELETE CASCADE,
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

CREATE TABLE Attendance (
    attendance_id INT IDENTITY(1,1) PRIMARY KEY,
    student_id    INT         NOT NULL,
    section_id    INT         NOT NULL,
    class_date    DATE        NOT NULL,
    status        VARCHAR(10) NOT NULL CHECK (status IN ('Present','Absent','Late')),
    marked_by     INT         NOT NULL,
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES Sections(section_id),
    FOREIGN KEY (marked_by)  REFERENCES Instructors(instructor_id),
    UNIQUE (student_id, section_id, class_date)
);

-- Audit log: auto-filled by triggers
CREATE TABLE Audit_Log (
    log_id      INT IDENTITY(1,1) PRIMARY KEY,
    action_type VARCHAR(50)  NOT NULL,
    student_id  INT          NULL,
    section_id  INT          NULL,
    details     VARCHAR(500) NOT NULL,
    old_value   VARCHAR(200) NULL,
    new_value   VARCHAR(200) NULL,
    action_time DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
--  SECTION 2: SAMPLE DATA
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
(102,101),(105,102),(106,105);

INSERT INTO Semesters (semester_name,year,enrollment_start,enrollment_deadline,drop_deadline,exam_start,is_active) VALUES
('Fall',2025,'2025-08-01','2025-09-15','2025-10-15','2025-12-01',1);

INSERT INTO Sections VALUES
(1,101,1,'Fall',2025,3,1),
(2,102,2,'Fall',2025,2,2),
(3,103,3,'Fall',2025,2,0),
(4,104,2,'Fall',2025,3,3),
(5,105,1,'Fall',2025,2,2),
(6,106,2,'Fall',2025,2,2);

INSERT INTO Completed_Courses VALUES
(1,101,'A',4.0,3,'Spring',2025),
(2,101,'B',3.0,3,'Spring',2025),
(3,101,'C',2.0,3,'Spring',2025),
(4,101,'A',4.0,3,'Spring',2024);

INSERT INTO Enrollments VALUES
(1,1,2,'2025-09-01','Registered'),
(2,2,1,'2025-09-01','Registered');

INSERT INTO Waiting_List VALUES
(1,3,3,'2025-09-02',1),
(2,4,3,'2025-09-02',2);

INSERT INTO Swap_Requests VALUES
(1,1,2,102,'Pending','2025-09-03');

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

INSERT INTO Attendance (student_id,section_id,class_date,status,marked_by) VALUES
(1,2,'2025-09-03','Present',2),(1,2,'2025-09-05','Present',2),(1,2,'2025-09-08','Present',2),
(1,2,'2025-09-10','Absent',2),(1,2,'2025-09-12','Present',2),(1,2,'2025-09-15','Present',2),
(1,2,'2025-09-17','Present',2),(1,2,'2025-09-19','Present',2),(1,2,'2025-09-22','Late',2),
(1,2,'2025-09-24','Present',2),
(2,1,'2025-09-03','Present',1),(2,1,'2025-09-05','Present',1),(2,1,'2025-09-08','Absent',1),
(2,1,'2025-09-10','Absent',1),(2,1,'2025-09-12','Present',1),(2,1,'2025-09-15','Present',1),
(2,1,'2025-09-17','Present',1),(2,1,'2025-09-19','Present',1),(2,1,'2025-09-22','Present',1),
(2,1,'2025-09-24','Present',1);
GO

-- ============================================================
--  SECTION 3: VIEWS
-- ============================================================

-- VIEW 1: Available courses with fill percentage
CREATE VIEW vw_AvailableCourses AS
SELECT
    c.course_id, c.course_code, c.course_title, c.credit_hours, c.department,
    i.instructor_id, i.name AS instructor, i.department AS instructor_dept,
    s.section_id, s.semester, s.year, s.total_seats, s.available_seats,
    CAST((s.total_seats - s.available_seats) * 100.0 / s.total_seats AS DECIMAL(5,2)) AS fill_percentage
FROM Courses c
JOIN Sections    s ON c.course_id     = s.course_id
JOIN Instructors i ON s.instructor_id = i.instructor_id
WHERE s.available_seats > 0;
GO

-- VIEW 2: All courses (available + full)
CREATE VIEW vw_AllCourses AS
SELECT
    c.course_id, c.course_code, c.course_title, c.credit_hours, c.department,
    i.instructor_id, i.name AS instructor,
    s.section_id, s.semester, s.year, s.total_seats, s.available_seats,
    CAST((s.total_seats - s.available_seats) * 100.0 / s.total_seats AS DECIMAL(5,2)) AS fill_percentage
FROM Courses c
JOIN Sections    s ON c.course_id     = s.course_id
JOIN Instructors i ON s.instructor_id = i.instructor_id;
GO

-- VIEW 3: Full student enrollment report
CREATE VIEW vw_StudentEnrollmentReport AS
SELECT
    st.student_id, st.first_name+' '+st.last_name AS student_name,
    st.department, st.fees_paid,
    c.course_id, c.course_code, c.course_title, c.credit_hours,
    sec.section_id, sec.semester, sec.year,
    i.name AS instructor, e.status, e.enrollment_date, e.enrollment_id
FROM Students st
LEFT JOIN Enrollments e  ON st.student_id   = e.student_id
LEFT JOIN Sections sec   ON e.section_id    = sec.section_id
LEFT JOIN Courses c      ON sec.course_id   = c.course_id
LEFT JOIN Instructors i  ON sec.instructor_id = i.instructor_id;
GO

-- VIEW 4: Student GPA (weighted average from completed courses)
CREATE VIEW vw_StudentGPA AS
SELECT
    st.student_id, st.first_name+' '+st.last_name AS student_name,
    st.department,
    COUNT(cc.course_id) AS courses_completed,
    ISNULL(SUM(cc.credit_hours), 0) AS total_credits_earned,
    CAST(
        ISNULL(SUM(cc.grade_points * cc.credit_hours), 0.0)
        / NULLIF(SUM(cc.credit_hours), 0)
    AS DECIMAL(4,2)) AS gpa
FROM Students st
LEFT JOIN Completed_Courses cc ON st.student_id = cc.student_id
GROUP BY st.student_id, st.first_name, st.last_name, st.department;
GO

-- VIEW 5: Instructor workload with ratings
CREATE VIEW vw_InstructorWorkload AS
SELECT
    i.instructor_id, i.name, i.department,
    COUNT(DISTINCT s.section_id)                              AS sections_assigned,
    i.max_sections,
    (i.max_sections - i.current_sections)                    AS remaining_capacity,
    CAST(i.current_sections * 100.0 / i.max_sections AS DECIMAL(5,2)) AS workload_percentage,
    COALESCE(SUM(s.total_seats - s.available_seats), 0)      AS total_students,
    COALESCE(AVG(CAST(r.rating AS FLOAT)), 0)                AS avg_rating,
    COUNT(DISTINCT r.rating_id)                              AS total_ratings
FROM Instructors i
LEFT JOIN Sections       s ON i.instructor_id = s.instructor_id
LEFT JOIN Teacher_Ratings r ON i.instructor_id = r.instructor_id
GROUP BY i.instructor_id, i.name, i.department, i.max_sections, i.current_sections;
GO

-- VIEW 6: Section fill rate
CREATE VIEW vw_SectionFillRate AS
SELECT
    sec.section_id, c.course_code, c.course_title,
    i.name AS instructor, sec.semester, sec.year,
    sec.total_seats, sec.available_seats,
    (sec.total_seats - sec.available_seats) AS seats_taken,
    CAST((sec.total_seats - sec.available_seats) * 100.0 / sec.total_seats AS DECIMAL(5,2)) AS fill_percentage,
    CASE
        WHEN sec.available_seats = 0 THEN 'Full'
        WHEN (sec.total_seats - sec.available_seats) * 100.0 / sec.total_seats >= 75 THEN 'Almost Full'
        ELSE 'Available'
    END AS status_label
FROM Sections sec
JOIN Courses     c ON sec.course_id     = c.course_id
JOIN Instructors i ON sec.instructor_id = i.instructor_id;
GO

-- VIEW 7: Credit usage per student
CREATE VIEW vw_CreditUsage AS
SELECT
    st.student_id, st.first_name+' '+st.last_name AS student_name,
    st.max_credit_limit,
    ISNULL(SUM(c.credit_hours), 0)                          AS credits_registered,
    st.max_credit_limit - ISNULL(SUM(c.credit_hours), 0)   AS credits_remaining
FROM Students st
LEFT JOIN Enrollments e  ON e.student_id = st.student_id AND e.status = 'Registered'
LEFT JOIN Sections sec   ON e.section_id = sec.section_id
LEFT JOIN Courses c      ON sec.course_id = c.course_id
GROUP BY st.student_id, st.first_name, st.last_name, st.max_credit_limit;
GO

-- VIEW 8: Waiting list overview
CREATE VIEW vw_WaitingList AS
SELECT
    wl.waiting_id, wl.section_id, wl.position, wl.request_date,
    c.course_title, sec.semester, sec.year,
    st.student_id, st.first_name+' '+st.last_name AS student_name, st.department
FROM Waiting_List wl
JOIN Students  st  ON wl.student_id  = st.student_id
JOIN Sections  sec ON wl.section_id  = sec.section_id
JOIN Courses   c   ON sec.course_id  = c.course_id;
GO

-- VIEW 9: Attendance summary per student per section
CREATE VIEW vw_AttendanceSummary AS
SELECT
    a.student_id, a.section_id,
    st.first_name+' '+st.last_name AS student_name,
    c.course_title, i.name AS instructor,
    COUNT(*)                                                AS total_classes,
    SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END)    AS present,
    SUM(CASE WHEN a.status='Absent'  THEN 1 ELSE 0 END)    AS absent,
    SUM(CASE WHEN a.status='Late'    THEN 1 ELSE 0 END)    AS late,
    CASE WHEN COUNT(*) > 0
         THEN CAST((SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS DECIMAL(5,1))
         ELSE 0 END                                         AS attendance_pct,
    CASE WHEN COUNT(*) > 0 AND
              (SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) >= 80
         THEN 1 ELSE 0 END                                  AS exam_eligible
FROM Attendance a
JOIN Students    st  ON a.student_id    = st.student_id
JOIN Sections    sec ON a.section_id    = sec.section_id
JOIN Courses     c   ON sec.course_id   = c.course_id
JOIN Instructors i   ON sec.instructor_id = i.instructor_id
GROUP BY a.student_id, a.section_id, st.first_name, st.last_name, c.course_title, i.name;
GO

-- VIEW 10: Teacher ratings summary
CREATE VIEW vw_TeacherRatings AS
SELECT
    i.instructor_id, i.name, i.department,
    COUNT(r.rating_id)                        AS total_ratings,
    COALESCE(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
    COUNT(CASE WHEN r.rating=5 THEN 1 END)    AS five_star,
    COUNT(CASE WHEN r.rating=4 THEN 1 END)    AS four_star,
    COUNT(CASE WHEN r.rating=3 THEN 1 END)    AS three_star,
    COUNT(CASE WHEN r.rating<=2 THEN 1 END)   AS low_rated
FROM Instructors i
LEFT JOIN Teacher_Ratings r ON i.instructor_id = r.instructor_id
GROUP BY i.instructor_id, i.name, i.department;
GO

-- VIEW 11: Section roster (teacher portal)
CREATE VIEW vw_SectionRoster AS
SELECT
    sec.section_id, c.course_id, c.course_code, c.course_title, c.credit_hours,
    sec.semester, sec.year, sec.total_seats, sec.available_seats,
    i.instructor_id, i.name AS instructor,
    st.student_id, st.first_name+' '+st.last_name AS student_name,
    st.department, st.email, e.status, e.enrollment_date, e.enrollment_id
FROM Sections sec
JOIN Courses     c   ON sec.course_id     = c.course_id
JOIN Instructors i   ON sec.instructor_id = i.instructor_id
LEFT JOIN Enrollments e ON sec.section_id = e.section_id AND e.status = 'Registered'
LEFT JOIN Students    st ON e.student_id  = st.student_id;
GO

-- VIEW 12: Student activity summary (UNION based)
CREATE VIEW vw_StudentActivity AS
SELECT
    st.student_id, st.first_name+' '+st.last_name AS student_name,
    st.department, st.fees_paid,
    COUNT(DISTINCT e.enrollment_id) AS active_enrollments,
    COUNT(DISTINCT w.waiting_id)    AS waitlist_positions,
    ISNULL(SUM(DISTINCT c.credit_hours), 0) AS registered_credits
FROM Students st
LEFT JOIN Enrollments  e  ON st.student_id = e.student_id AND e.status='Registered'
LEFT JOIN Sections     sec ON e.section_id = sec.section_id
LEFT JOIN Courses      c  ON sec.course_id = c.course_id
LEFT JOIN Waiting_List w  ON st.student_id = w.student_id
GROUP BY st.student_id, st.first_name, st.last_name, st.department, st.fees_paid;
GO
GO

-- ============================================================
--  SECTION 4: TRIGGERS
-- ============================================================

-- TRIGGER 1: Auto-promote waiting student when enrollment is dropped
CREATE TRIGGER trg_AutoPromoteWaitingStudent
ON Enrollments AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (
        SELECT 1 FROM inserted i JOIN deleted d ON i.enrollment_id=d.enrollment_id
        WHERE i.status='Dropped' AND d.status='Registered'
    ) RETURN;

    DECLARE @section_id INT, @waiting_student INT, @waiting_id INT, @new_enroll_id INT;
    SELECT @section_id = section_id FROM inserted WHERE status='Dropped';

    SELECT TOP 1 @waiting_student=student_id, @waiting_id=waiting_id
    FROM Waiting_List WHERE section_id=@section_id ORDER BY position ASC;

    IF @waiting_student IS NOT NULL
    BEGIN
        SELECT @new_enroll_id = ISNULL(MAX(enrollment_id),0)+1 FROM Enrollments;
        INSERT INTO Enrollments (enrollment_id,student_id,section_id,enrollment_date,status)
        VALUES (@new_enroll_id,@waiting_student,@section_id,GETDATE(),'Registered');
        UPDATE Sections SET available_seats=available_seats-1 WHERE section_id=@section_id;
        DELETE FROM Waiting_List WHERE waiting_id=@waiting_id;
        UPDATE Waiting_List SET position=position-1 WHERE section_id=@section_id AND position>1;
        INSERT INTO Audit_Log (action_type,student_id,section_id,details)
        VALUES ('AUTO_PROMOTE',@waiting_student,@section_id,'Auto-promoted from waiting list after a drop');
    END
    ELSE
    BEGIN
        UPDATE Sections SET available_seats=available_seats+1 WHERE section_id=@section_id;
    END
END;
GO

-- TRIGGER 2: Audit every new enrollment
CREATE TRIGGER trg_AuditEnrollment
ON Enrollments AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Audit_Log (action_type,student_id,section_id,details)
    SELECT 'ENROLL', student_id, section_id, 'New enrollment inserted'
    FROM inserted;
END;
GO

-- TRIGGER 3: Audit every drop
CREATE TRIGGER trg_AuditDrop
ON Enrollments AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Audit_Log (action_type,student_id,section_id,details,old_value,new_value)
    SELECT 'DROP', i.student_id, i.section_id, 'Enrollment status changed',
           d.status, i.status
    FROM inserted i JOIN deleted d ON i.enrollment_id=d.enrollment_id
    WHERE i.status='Dropped' AND d.status='Registered';
END;
GO

-- TRIGGER 4: Prevent available_seats going below 0
CREATE TRIGGER trg_PreventNegativeSeats
ON Sections AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted WHERE available_seats < 0)
    BEGIN
        RAISERROR('Available seats cannot go below zero.',16,1);
        ROLLBACK TRANSACTION;
    END
END;
GO

-- TRIGGER 5: Auto-increment instructor current_sections on section insert
CREATE TRIGGER trg_IncrementInstructorSections
ON Sections AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Instructors SET current_sections=current_sections+1
    WHERE instructor_id IN (SELECT instructor_id FROM inserted);
END;
GO

-- TRIGGER 6: Auto-decrement instructor current_sections on section delete
CREATE TRIGGER trg_DecrementInstructorSections
ON Sections AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Instructors SET current_sections=current_sections-1
    WHERE instructor_id IN (SELECT instructor_id FROM deleted);
END;
GO

-- TRIGGER 7: Audit attendance marking
CREATE TRIGGER trg_AuditAttendance
ON Attendance AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Audit_Log (action_type,student_id,section_id,details,new_value)
    SELECT 'ATTENDANCE', student_id, section_id,
           'Attendance marked for '+CAST(class_date AS VARCHAR), status
    FROM inserted;
END;
GO

-- TRIGGER 8: Audit grade posting
CREATE TRIGGER trg_AuditGrade
ON Completed_Courses AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Audit_Log (action_type,student_id,section_id,details,new_value)
    SELECT 'GRADE', student_id, NULL,
           'Grade posted for course_id '+CAST(course_id AS VARCHAR),
           'Grade: '+grade+' ('+CAST(grade_points AS VARCHAR)+' pts)'
    FROM inserted;
END;
GO
GO

-- ============================================================
--  SECTION 5: STORED PROCEDURES
-- ============================================================

-- SP 1: Enroll student — full validation + fees + deadline + repeat block
CREATE PROCEDURE sp_EnrollStudent
    @student_id INT,
    @section_id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @course_id INT, @new_credits INT, @used_credits INT,
                @max_credits INT, @missing_prereqs INT, @new_enroll_id INT,
                @fees_paid BIT, @sem VARCHAR(20), @yr INT, @enroll_dl DATE;

        SELECT @course_id=course_id, @sem=semester, @yr=year
        FROM Sections WHERE section_id=@section_id;

        -- Fee check
        SELECT @fees_paid=fees_paid FROM Students WHERE student_id=@student_id;
        IF @fees_paid=0
        BEGIN RAISERROR('Fees not paid. Clear dues before enrolling.',16,1); ROLLBACK; RETURN; END

        -- Enrollment deadline
        SELECT @enroll_dl=enrollment_deadline FROM Semesters WHERE semester_name=@sem AND year=@yr;
        IF @enroll_dl IS NOT NULL AND GETDATE() > @enroll_dl
        BEGIN RAISERROR('Enrollment deadline has passed.',16,1); ROLLBACK; RETURN; END

        -- Duplicate check
        IF EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
        BEGIN RAISERROR('Already enrolled in this section.',16,1); ROLLBACK; RETURN; END

        -- Seat availability
        IF NOT EXISTS (SELECT 1 FROM Sections WHERE section_id=@section_id AND available_seats>0)
        BEGIN RAISERROR('No seats available.',16,1); ROLLBACK; RETURN; END

        -- Repeating course block
        IF EXISTS (SELECT 1 FROM Completed_Courses WHERE student_id=@student_id AND course_id=@course_id AND grade NOT IN ('D','F'))
        BEGIN RAISERROR('You have already passed this course and cannot repeat it.',16,1); ROLLBACK; RETURN; END

        -- Prerequisite check
        SELECT @missing_prereqs=COUNT(*) FROM Course_Prerequisites cp
        WHERE cp.course_id=@course_id
        AND cp.prerequisite_course_id NOT IN (SELECT course_id FROM Completed_Courses WHERE student_id=@student_id);
        IF @missing_prereqs > 0
        BEGIN RAISERROR('Prerequisites not completed for this course.',16,1); ROLLBACK; RETURN; END

        -- Credit limit check
        SELECT @new_credits=credit_hours FROM Courses WHERE course_id=@course_id;
        SELECT @used_credits=ISNULL(SUM(c.credit_hours),0) FROM Enrollments e
        JOIN Sections sec ON e.section_id=sec.section_id
        JOIN Courses c ON sec.course_id=c.course_id
        WHERE e.student_id=@student_id AND e.status='Registered';
        SELECT @max_credits=max_credit_limit FROM Students WHERE student_id=@student_id;
        IF (@used_credits+@new_credits) > @max_credits
        BEGIN RAISERROR('Credit limit would be exceeded.',16,1); ROLLBACK; RETURN; END

        -- Insert enrollment
        SELECT @new_enroll_id=ISNULL(MAX(enrollment_id),0)+1 FROM Enrollments;
        INSERT INTO Enrollments (enrollment_id,student_id,section_id,enrollment_date,status)
        VALUES (@new_enroll_id,@student_id,@section_id,GETDATE(),'Registered');
        UPDATE Sections SET available_seats=available_seats-1 WHERE section_id=@section_id;

        COMMIT;
        PRINT 'Enrollment successful.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 2: Drop course (trigger handles waitlist promotion + seat restore)
CREATE PROCEDURE sp_DropCourse
    @student_id INT,
    @section_id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Drop deadline check
        DECLARE @sem VARCHAR(20), @yr INT, @drop_dl DATE;
        SELECT @sem=semester, @yr=year FROM Sections WHERE section_id=@section_id;
        SELECT @drop_dl=drop_deadline FROM Semesters WHERE semester_name=@sem AND year=@yr;
        IF @drop_dl IS NOT NULL AND GETDATE() > @drop_dl
        BEGIN RAISERROR('Drop deadline has passed.',16,1); ROLLBACK; RETURN; END

        IF NOT EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
        BEGIN RAISERROR('No active enrollment found.',16,1); ROLLBACK; RETURN; END

        -- Setting Dropped triggers trg_AutoPromoteWaitingStudent
        UPDATE Enrollments SET status='Dropped'
        WHERE student_id=@student_id AND section_id=@section_id AND status='Registered';

        COMMIT;
        PRINT 'Course dropped successfully.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 3: Add to waiting list
CREATE PROCEDURE sp_AddToWaitingList
    @student_id INT,
    @section_id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF EXISTS (SELECT 1 FROM Waiting_List WHERE student_id=@student_id AND section_id=@section_id)
        BEGIN RAISERROR('Already on waiting list.',16,1); ROLLBACK; RETURN; END
        IF EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
        BEGIN RAISERROR('Already enrolled.',16,1); ROLLBACK; RETURN; END

        DECLARE @wid INT, @pos INT;
        SELECT @wid=ISNULL(MAX(waiting_id),0)+1 FROM Waiting_List;
        SELECT @pos=ISNULL(MAX(position),0)+1 FROM Waiting_List WHERE section_id=@section_id;
        INSERT INTO Waiting_List (waiting_id,student_id,section_id,request_date,position)
        VALUES (@wid,@student_id,@section_id,GETDATE(),@pos);
        INSERT INTO Audit_Log (action_type,student_id,section_id,details)
        VALUES ('WAITLIST',@student_id,@section_id,CONCAT('Added at position ',@pos));
        COMMIT;
        PRINT CONCAT('Added to waiting list at position ',@pos);
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 4: Approve swap (atomic section exchange)
CREATE PROCEDURE sp_ApproveSwap
    @swap_id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @s1 INT, @s2 INT, @cid INT, @sec1 INT, @sec2 INT;
        SELECT @s1=student1_id,@s2=student2_id,@cid=course_id
        FROM Swap_Requests WHERE swap_id=@swap_id AND status='Pending';
        IF @s1 IS NULL BEGIN RAISERROR('Swap not found or not pending.',16,1); ROLLBACK; RETURN; END

        SELECT @sec1=e.section_id FROM Enrollments e JOIN Sections s ON e.section_id=s.section_id
        WHERE e.student_id=@s1 AND s.course_id=@cid AND e.status='Registered';
        SELECT @sec2=e.section_id FROM Enrollments e JOIN Sections s ON e.section_id=s.section_id
        WHERE e.student_id=@s2 AND s.course_id=@cid AND e.status='Registered';

        IF @sec1 IS NULL OR @sec2 IS NULL
        BEGIN RAISERROR('Both students must be enrolled in the same course.',16,1); ROLLBACK; RETURN; END
        IF @sec1=@sec2
        BEGIN RAISERROR('Both students are already in the same section.',16,1); ROLLBACK; RETURN; END

        UPDATE Enrollments SET section_id=@sec2 WHERE student_id=@s1 AND section_id=@sec1 AND status='Registered';
        UPDATE Enrollments SET section_id=@sec1 WHERE student_id=@s2 AND section_id=@sec2 AND status='Registered';
        UPDATE Swap_Requests SET status='Approved' WHERE swap_id=@swap_id;
        INSERT INTO Audit_Log (action_type,student_id,section_id,details)
        VALUES ('SWAP',@s1,@sec2,CONCAT('Swapped into section ',@sec2)),
               ('SWAP',@s2,@sec1,CONCAT('Swapped into section ',@sec1));
        COMMIT;
        PRINT 'Swap approved.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 5: Create dynamic section (auto-assigns least-loaded instructor)
CREATE PROCEDURE sp_CreateDynamicSection
    @course_id   INT,
    @semester    VARCHAR(20),
    @year        INT,
    @total_seats INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @instructor_id INT, @new_section_id INT;
        SELECT TOP 1 @instructor_id=instructor_id FROM Instructors
        WHERE current_sections<max_sections ORDER BY current_sections ASC;
        IF @instructor_id IS NULL
        BEGIN RAISERROR('No instructor available.',16,1); ROLLBACK; RETURN; END

        SELECT @new_section_id=ISNULL(MAX(section_id),0)+1 FROM Sections;
        INSERT INTO Sections (section_id,course_id,instructor_id,semester,year,total_seats,available_seats)
        VALUES (@new_section_id,@course_id,@instructor_id,@semester,@year,@total_seats,@total_seats);
        COMMIT;
        PRINT CONCAT('Section ',@new_section_id,' created for instructor ',@instructor_id);
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 6: Post grade — checks attendance >= 80%, moves to Completed_Courses
CREATE PROCEDURE sp_PostGrade
    @student_id    INT,
    @section_id    INT,
    @grade         VARCHAR(2),
    @instructor_id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Sections WHERE section_id=@section_id AND instructor_id=@instructor_id)
        BEGIN RAISERROR('Not your section.',16,1); ROLLBACK; RETURN; END

        DECLARE @att_pct DECIMAL(5,1)=0;
        SELECT @att_pct=COALESCE(attendance_pct,0) FROM vw_AttendanceSummary
        WHERE student_id=@student_id AND section_id=@section_id;
        IF @att_pct>0 AND @att_pct<80
        BEGIN RAISERROR('Attendance below 80%%. Cannot post grade.',16,1); ROLLBACK; RETURN; END

        IF NOT EXISTS (SELECT 1 FROM Enrollments WHERE student_id=@student_id AND section_id=@section_id AND status='Registered')
        BEGIN RAISERROR('Student not enrolled.',16,1); ROLLBACK; RETURN; END

        DECLARE @gp DECIMAL(3,1);
        SET @gp = CASE @grade
            WHEN 'A'  THEN 4.0 WHEN 'A-' THEN 3.7
            WHEN 'B+' THEN 3.3 WHEN 'B'  THEN 3.0 WHEN 'B-' THEN 2.7
            WHEN 'C+' THEN 2.3 WHEN 'C'  THEN 2.0 WHEN 'C-' THEN 1.7
            WHEN 'D'  THEN 1.0 WHEN 'F'  THEN 0.0 ELSE NULL END;
        IF @gp IS NULL BEGIN RAISERROR('Invalid grade.',16,1); ROLLBACK; RETURN; END

        DECLARE @course_id INT, @credit_hours INT, @sem VARCHAR(20), @yr INT;
        SELECT @course_id=c.course_id, @credit_hours=c.credit_hours,
               @sem=sec.semester, @yr=sec.year
        FROM Sections sec JOIN Courses c ON sec.course_id=c.course_id
        WHERE sec.section_id=@section_id;

        IF EXISTS (SELECT 1 FROM Completed_Courses WHERE student_id=@student_id AND course_id=@course_id)
            UPDATE Completed_Courses SET grade=@grade,grade_points=@gp,semester_completed=@sem,year_completed=@yr
            WHERE student_id=@student_id AND course_id=@course_id;
        ELSE
            INSERT INTO Completed_Courses (student_id,course_id,grade,grade_points,credit_hours,semester_completed,year_completed)
            VALUES (@student_id,@course_id,@grade,@gp,@credit_hours,@sem,@yr);

        UPDATE Enrollments SET status='Completed'
        WHERE student_id=@student_id AND section_id=@section_id;
        COMMIT;
        PRINT CONCAT('Grade ',@grade,' posted.');
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 7: Mark attendance for a section
CREATE PROCEDURE sp_MarkAttendance
    @section_id    INT,
    @instructor_id INT,
    @class_date    DATE,
    @attendance_json VARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Sections WHERE section_id=@section_id AND instructor_id=@instructor_id)
        BEGIN RAISERROR('Not your section.',16,1); ROLLBACK; RETURN; END

        DELETE FROM Attendance WHERE section_id=@section_id AND class_date=@class_date;
        INSERT INTO Attendance (student_id,section_id,class_date,status,marked_by)
        SELECT j.student_id,@section_id,@class_date,j.status,@instructor_id
        FROM OPENJSON(@attendance_json)
        WITH (student_id INT '$.student_id', status VARCHAR(10) '$.status') j;
        COMMIT;
        PRINT CONCAT('Attendance marked for ',CAST(@class_date AS VARCHAR));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 8: Pay fees
CREATE PROCEDURE sp_PayFees
    @student_id INT,
    @amount     DECIMAL(10,2),
    @semester   VARCHAR(20),
    @year       INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Students WHERE student_id=@student_id)
        BEGIN RAISERROR('Student not found.',16,1); ROLLBACK; RETURN; END
        UPDATE Students SET fees_paid=1 WHERE student_id=@student_id;
        INSERT INTO Fee_Payments (student_id,amount,payment_date,semester,year)
        VALUES (@student_id,@amount,GETDATE(),@semester,@year);
        COMMIT;
        PRINT 'Fees paid. Enrollment unlocked.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 9: Rate teacher
CREATE PROCEDURE sp_RateTeacher
    @student_id   INT,
    @instructor_id INT,
    @rating       INT,
    @comment      VARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF @rating<1 OR @rating>5 BEGIN RAISERROR('Rating must be 1-5.',16,1); ROLLBACK; RETURN; END
        IF NOT EXISTS (SELECT 1 FROM Enrollments e JOIN Sections s ON e.section_id=s.section_id
                       WHERE e.student_id=@student_id AND s.instructor_id=@instructor_id AND e.status IN ('Registered','Completed'))
        BEGIN RAISERROR('Can only rate instructors of enrolled courses.',16,1); ROLLBACK; RETURN; END

        IF EXISTS (SELECT 1 FROM Teacher_Ratings WHERE student_id=@student_id AND instructor_id=@instructor_id)
            UPDATE Teacher_Ratings SET rating=@rating,comment=@comment,rating_date=GETDATE()
            WHERE student_id=@student_id AND instructor_id=@instructor_id;
        ELSE
            INSERT INTO Teacher_Ratings (student_id,instructor_id,rating,comment,rating_date)
            VALUES (@student_id,@instructor_id,@rating,@comment,GETDATE());
        COMMIT;
        PRINT 'Rating submitted.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- SP 10: Post announcement
CREATE PROCEDURE sp_PostAnnouncement
    @instructor_id INT,
    @section_id    INT,
    @title         VARCHAR(200),
    @body          VARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Sections WHERE section_id=@section_id AND instructor_id=@instructor_id)
    BEGIN RAISERROR('Not your section.',16,1); RETURN; END
    INSERT INTO Announcements (instructor_id,section_id,title,body,posted_date)
    VALUES (@instructor_id,@section_id,@title,@body,GETDATE());
    PRINT 'Announcement posted.';
END;
GO

-- SP 11: Get full student profile
CREATE PROCEDURE sp_GetStudentProfile
    @student_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM vw_CreditUsage WHERE student_id=@student_id;
    SELECT * FROM vw_StudentGPA WHERE student_id=@student_id;
    SELECT course_code,course_title,credit_hours,semester,year,status
    FROM vw_StudentEnrollmentReport WHERE student_id=@student_id AND status='Registered';
    SELECT course_title,semester,year,position,request_date
    FROM vw_WaitingList WHERE student_id=@student_id;
END;
GO

-- SP 12: Semester rollover
CREATE PROCEDURE sp_SemesterRollover
    @from_semester VARCHAR(20), @from_year INT,
    @to_semester   VARCHAR(20), @to_year   INT,
    @enroll_start  DATE, @enroll_end DATE,
    @drop_end      DATE, @exam_start DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        UPDATE Enrollments SET status='Completed'
        WHERE section_id IN (SELECT section_id FROM Sections WHERE semester=@from_semester AND year=@from_year)
        AND status='Registered';
        DELETE FROM Waiting_List WHERE section_id IN
        (SELECT section_id FROM Sections WHERE semester=@from_semester AND year=@from_year);
        UPDATE Instructors SET current_sections=0;
        IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_name=@to_semester AND year=@to_year)
            INSERT INTO Semesters (semester_name,year,enrollment_start,enrollment_deadline,drop_deadline,exam_start,is_active)
            VALUES (@to_semester,@to_year,@enroll_start,@enroll_end,@drop_end,@exam_start,1);
        UPDATE Semesters SET is_active=0 WHERE semester_name=@from_semester AND year=@from_year;
        UPDATE Semesters SET is_active=1 WHERE semester_name=@to_semester AND year=@to_year;
        UPDATE Students SET fees_paid=0;
        COMMIT;
        PRINT CONCAT('Rollover complete: ',@from_semester,' ',@from_year,' → ',@to_semester,' ',@to_year);
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        RAISERROR('%s',16,1,ERROR_MESSAGE());
    END CATCH
END;
GO

-- ============================================================
--  SECTION 6: SAMPLE QUERIES (as in original)
-- ============================================================

-- Available courses
SELECT * FROM vw_AvailableCourses ORDER BY available_seats DESC;

-- Enroll
EXEC sp_EnrollStudent @student_id=1, @section_id=1;

-- Drop (triggers auto-promote)
EXEC sp_DropCourse @student_id=1, @section_id=1;

-- Credit usage
SELECT * FROM vw_CreditUsage WHERE student_id=1;

-- Add to waitlist
EXEC sp_AddToWaitingList @student_id=2, @section_id=3;

-- View waitlist
SELECT * FROM vw_WaitingList WHERE section_id=3 ORDER BY position;

-- Approve swap
EXEC sp_ApproveSwap @swap_id=1;

-- Create dynamic section
EXEC sp_CreateDynamicSection @course_id=101, @semester='Spring', @year=2026, @total_seats=30;

-- Instructor workload
SELECT * FROM vw_InstructorWorkload ORDER BY remaining_capacity DESC;

-- Enrollment report
SELECT * FROM vw_StudentEnrollmentReport ORDER BY student_id;

-- Section fill rate
SELECT * FROM vw_SectionFillRate ORDER BY fill_percentage DESC;

-- UNION / EXCEPT / INTERSECT
SELECT student_id,'Enrolled' AS activity FROM Enrollments WHERE status='Registered'
UNION
SELECT student_id,'Waiting List' AS activity FROM Waiting_List;

SELECT student_id FROM Waiting_List
EXCEPT
SELECT student_id FROM Enrollments WHERE status='Registered';

SELECT student_id FROM Enrollments WHERE status='Registered'
INTERSECT
SELECT student_id FROM Waiting_List;

-- GPA report
SELECT * FROM vw_StudentGPA ORDER BY gpa DESC;

-- Top students
SELECT first_name+' '+last_name AS student_name, department
FROM Students WHERE student_id IN (SELECT student_id FROM Completed_Courses WHERE grade='A');

-- Student profile
EXEC sp_GetStudentProfile @student_id=1;

-- Audit log
SELECT * FROM Audit_Log ORDER BY action_time DESC;

-- Attendance summary
SELECT * FROM vw_AttendanceSummary;

-- Pay fees
EXEC sp_PayFees @student_id=3, @amount=25000, @semester='Fall', @year=2025;
GO

USE ENROLLIX;
GO

IF OBJECT_ID('trg_AutoPromoteWaitingStudent', 'TR') IS NOT NULL DROP TRIGGER trg_AutoPromoteWaitingStudent;
IF OBJECT_ID('trg_AuditEnrollment', 'TR') IS NOT NULL DROP TRIGGER trg_AuditEnrollment;
IF OBJECT_ID('trg_AuditDrop', 'TR') IS NOT NULL DROP TRIGGER trg_AuditDrop;
IF OBJECT_ID('trg_PreventNegativeSeats', 'TR') IS NOT NULL DROP TRIGGER trg_PreventNegativeSeats;
IF OBJECT_ID('trg_IncrementInstructorSections', 'TR') IS NOT NULL DROP TRIGGER trg_IncrementInstructorSections;
IF OBJECT_ID('trg_DecrementInstructorSections', 'TR') IS NOT NULL DROP TRIGGER trg_DecrementInstructorSections;
IF OBJECT_ID('trg_AuditAttendance', 'TR') IS NOT NULL DROP TRIGGER trg_AuditAttendance;
IF OBJECT_ID('trg_AuditGrade', 'TR') IS NOT NULL DROP TRIGGER trg_AuditGrade;
GO
USE ENROLLIX;
GO

DROP VIEW IF EXISTS vw_AvailableCourses;
DROP VIEW IF EXISTS vw_AllCourses;
DROP VIEW IF EXISTS vw_StudentEnrollmentReport;
DROP VIEW IF EXISTS vw_StudentGPA;
DROP VIEW IF EXISTS vw_InstructorWorkload;
DROP VIEW IF EXISTS vw_SectionFillRate;
DROP VIEW IF EXISTS vw_CreditUsage;
DROP VIEW IF EXISTS vw_WaitingList;
DROP VIEW IF EXISTS vw_AttendanceSummary;
DROP VIEW IF EXISTS vw_TeacherRatings;
DROP VIEW IF EXISTS vw_SectionRoster;
DROP VIEW IF EXISTS vw_StudentActivity;
GO

USE ENROLLIX;
GO

DROP PROCEDURE IF EXISTS sp_EnrollStudent;
DROP PROCEDURE IF EXISTS sp_DropCourse;
DROP PROCEDURE IF EXISTS sp_AddToWaitingList;
DROP PROCEDURE IF EXISTS sp_ApproveSwap;
DROP PROCEDURE IF EXISTS sp_CreateDynamicSection;
DROP PROCEDURE IF EXISTS sp_PostGrade;
DROP PROCEDURE IF EXISTS sp_MarkAttendance;
DROP PROCEDURE IF EXISTS sp_PayFees;
DROP PROCEDURE IF EXISTS sp_RateTeacher;
DROP PROCEDURE IF EXISTS sp_PostAnnouncement;
DROP PROCEDURE IF EXISTS sp_GetStudentProfile;
DROP PROCEDURE IF EXISTS sp_SemesterRollover;
GO

USE ENROLLIX;
GO

-- Drop child tables first
DROP TABLE IF EXISTS Audit_Log;
DROP TABLE IF EXISTS Attendance;
DROP TABLE IF EXISTS Announcements;
DROP TABLE IF EXISTS Fee_Payments;
DROP TABLE IF EXISTS Teacher_Ratings;
DROP TABLE IF EXISTS Swap_Requests;
DROP TABLE IF EXISTS Waiting_List;
DROP TABLE IF EXISTS Completed_Courses;
DROP TABLE IF EXISTS Enrollments;
DROP TABLE IF EXISTS Sections;
DROP TABLE IF EXISTS Course_Prerequisites;
DROP TABLE IF EXISTS Semesters;

-- Drop parent tables last
DROP TABLE IF EXISTS Courses;
DROP TABLE IF EXISTS Instructors;
DROP TABLE IF EXISTS Students;
GO

