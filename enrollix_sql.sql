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
(4,'Hina','Malik','hina@uni.com','IT',5,21,1,'student123'),
(5,'Bilal','Hussain','bilal@uni.com','CS',2,18,0,'student123'),
(6,'Ayesha','Siddiqui','ayesha@uni.com','SE',6,21,1,'student123'),
(7,'Hamza','Ali','hamza@uni.com','IT',1,15,0,'student123'),
(8,'Fatima','Zafar','fatima@uni.com','CS',7,21,1,'student123');

INSERT INTO Instructors VALUES
(1,'Dr. Aslam','CS','aslam@uni.com',2,1,'teacher123'),
(2,'Dr. Nida','CS','nida@uni.com',3,2,'teacher123'),
(3,'Dr. Ahmer','SE','ahmer@uni.com',2,1,'teacher123'),
(4,'Dr. Saeed','IT','saeed@uni.com',2,1,'teacher123'),
(5,'Dr. Mariam','SE','mariam@uni.com',3,2,'teacher123');

-- Semester 1
INSERT INTO Courses VALUES
(101, 'NS1001', 'Applied Physics',                                   3, 'NS'),
(102, 'MT1003', 'Calculus and Analytical Geometry',                  3, 'Math'),
(103, 'SS1012', 'Functional English',                                2, 'SS'),
(104, 'SL1012', 'Functional English - Lab',                          1, 'SS'),
(105, 'SS1013', 'Ideology and Constitution of Pakistan',             2, 'SS'),
(106, 'CL1000', 'Introduction to ICT',                              1, 'CS'),
(107, 'CS1002', 'Programming Fundamentals',                          3, 'CS'),
(108, 'CL1002', 'Programming Fundamentals - Lab',                    1, 'CS'),
(109, 'SS1019', 'Understanding Sirat-Un-Nabi (PBUH)',                1, 'SS'),
-- Semester 2
(201, 'SS2043', 'Civics and Community Engagement',                   2, 'SS'),
(202, 'EE1005', 'Digital Logic Design',                              3, 'EE'),
(203, 'EL1005', 'Digital Logic Design - Lab',                        1, 'EE'),
(204, 'SS1014', 'Expository Writing',                                2, 'SS'),
(205, 'SL1014', 'Expository Writing - Lab',                          1, 'SS'),
(206, 'SS1007', 'Islamic Studies/Ethics',                            2, 'SS'),
(207, 'MT1008', 'Multivariable Calculus',                            3, 'Math'),
(208, 'CS1004', 'Object Oriented Programming',                       3, 'CS'),
(209, 'CL1004', 'Object Oriented Programming - Lab',                 1, 'CS'),
(210, 'SS1018', 'Understanding Holy Quran',                          1, 'SS'),
-- Semester 3
(301, 'EE2003', 'Computer Organization and Assembly Language',       3, 'EE'),
(302, 'EL2003', 'Computer Organization and Assembly Language - Lab', 1, 'EE'),
(303, 'CS2001', 'Data Structures',                                   3, 'CS'),
(304, 'CL2001', 'Data Structures - Lab',                             1, 'CS'),
(305, 'CS1005', 'Discrete Structures',                               3, 'CS'),
(306, 'MT1004', 'Linear Algebra',                                    3, 'Math'),
(307, 'MG1009', 'Fundamentals of Management',                        2, 'Mgmt'),
(308, 'CS3005', 'Theory of Automata',                                3, 'CS'),
-- Semester 4 (current — Spring 2026)
(401, 'AI2002', 'Artificial Intelligence',                           3, 'CS'),
(402, 'AL2002', 'Artificial Intelligence - Lab',                     1, 'CS'),
(403, 'CS2005', 'Database Systems',                                  3, 'CS'),
(404, 'CL2005', 'Database Systems - Lab',                            1, 'CS'),
(405, 'CS2006', 'Operating Systems',                                 3, 'CS'),
(406, 'CL2006', 'Operating Systems - Lab',                           1, 'CS'),
(407, 'SS1015', 'Pakistan Studies',                                  2, 'SS'),
(408, 'MT2005', 'Probability and Statistics',                        3, 'Math'),
(409, 'CS3004', 'Software Design and Analysis',                      3, 'CS'),
-- Semester 5+
(501, 'CS3014', 'Applied Human Computer Interaction',                3, 'CS'),
(502, 'EE3009', 'Computer Architecture',                             3, 'EE'),
(503, 'CS3001', 'Computer Networks',                                 3, 'CS'),
(504, 'CL3001', 'Computer Networks - Lab',                           1, 'CS'),
(505, 'CS2009', 'Design and Analysis of Algorithms',                 3, 'CS'),
(601, 'CS4087', 'Advanced DBMS',                                     3, 'CS'),
(602, 'CS4031', 'Compiler Construction',                             3, 'CS');
GO

INSERT INTO Course_Prerequisites VALUES
(108, 107),  -- PF Lab needs PF
(208, 107),  -- OOP needs PF
(209, 208),  -- OOP Lab needs OOP
(303, 208),  -- DS needs OOP
(304, 303),  -- DS Lab needs DS
(403, 303),  -- DB Systems needs DS
(401, 208),  -- AI needs OOP
(305, 107),  -- Discrete needs PF
(308, 305),  -- Automata needs Discrete
(207, 102),  -- Multivariable needs Calculus
(306, 207),  -- Linear Algebra needs Multivariable
(408, 306),  -- Prob & Stats needs Linear Algebra
(301, 202),  -- COAL needs DLD
(302, 301),  -- COAL Lab needs COAL
(502, 301),  -- Computer Arch needs COAL
(203, 202),  -- DLD Lab needs DLD
(404, 403),  -- DB Lab needs DB Systems
(406, 405),  -- OS Lab needs OS
(402, 401),  -- AI Lab needs AI
(409, 303),  -- SDA needs DS
(601, 403),  -- Advanced DBMS needs DB
(602, 308);  -- Compiler needs Automata
GO

INSERT INTO Semesters (semester_name,year,enrollment_start,enrollment_deadline,drop_deadline,exam_start,is_active) VALUES
('Fall',   2024, '2024-08-01', '2024-09-10', '2024-10-10', '2024-12-01', 0),
('Spring', 2025, '2025-01-15', '2025-02-15', '2025-03-20', '2025-05-15', 0),
('Fall',   2025, '2025-08-01', '2025-09-15', '2025-10-15', '2025-12-01', 0),
('Spring', 2026, '2026-01-20', '2026-02-28', '2026-03-25', '2026-05-20', 1);
GO

-- Fall 2024 (Semester 1)
INSERT INTO Sections VALUES
(11, 101, 1, 'Fall', 2024, 35, 30),
(12, 102, 4, 'Fall', 2024, 35, 28),
(13, 103, 5, 'Fall', 2024, 40, 36),
(14, 104, 5, 'Fall', 2024, 40, 36),
(15, 105, 5, 'Fall', 2024, 40, 35),
(16, 106, 1, 'Fall', 2024, 40, 35),
(17, 107, 1, 'Fall', 2024, 35, 28),
(18, 108, 1, 'Fall', 2024, 35, 28),
(19, 109, 5, 'Fall', 2024, 40, 38),
-- Spring 2025 (Semester 2)
(21, 201, 5, 'Spring', 2025, 35, 30),
(22, 202, 3, 'Spring', 2025, 35, 28),
(23, 203, 3, 'Spring', 2025, 35, 28),
(24, 204, 5, 'Spring', 2025, 40, 35),
(25, 205, 5, 'Spring', 2025, 40, 35),
(26, 206, 5, 'Spring', 2025, 40, 36),
(27, 207, 4, 'Spring', 2025, 35, 28),
(28, 208, 2, 'Spring', 2025, 35, 26),
(29, 209, 2, 'Spring', 2025, 35, 26),

-- Fall 2025 (Semester 3)
(31, 301, 3, 'Fall', 2025, 35, 27),
(32, 302, 3, 'Fall', 2025, 35, 27),
(33, 303, 2, 'Fall', 2025, 35, 25),
(34, 304, 2, 'Fall', 2025, 35, 25),
(35, 305, 1, 'Fall', 2025, 35, 28),
(36, 306, 4, 'Fall', 2025, 35, 27),
(37, 307, 5, 'Fall', 2025, 40, 35),
(38, 308, 1, 'Fall', 2025, 35, 26),
-- Spring 2026 (Semester 4 — CURRENT)
(41, 401, 2, 'Spring', 2026, 35, 22),
(42, 402, 2, 'Spring', 2026, 35, 22),
(43, 403, 1, 'Spring', 2026, 35, 18),
(44, 404, 1, 'Spring', 2026, 35, 18),
(45, 405, 3, 'Spring', 2026, 35, 20),
(46, 406, 3, 'Spring', 2026, 35, 20),
(47, 407, 5, 'Spring', 2026, 40, 34),
(48, 408, 4, 'Spring', 2026, 35, 22),
(49, 409, 2, 'Spring', 2026, 35, 20);
GO

INSERT INTO Completed_Courses VALUES
(1, 106, 'A', 3.7, 1, 'Fall', 2024),   -- CL1000 ICT
(1, 108, 'C',  2.0, 1, 'Fall', 2024),   -- CL1002 PF Lab
(1, 107, 'B', 2.7, 3, 'Fall', 2024),   -- CS1002 PF
(1, 102, 'B', 2.7, 3, 'Fall', 2024),   -- MT1003 Calculus
(1, 101, 'B', 3.3, 3, 'Fall', 2024),   -- NS1001 Applied Physics
(1, 104, 'A', 3.7, 1, 'Fall', 2024),   -- SL1012 FE Lab
(1, 103, 'A',  4.0, 2, 'Fall', 2024),   -- SS1012 Functional English
(1, 105, 'B',  3.0, 2, 'Fall', 2024);  -- SS1013 Ideology

 INSERT INTO Completed_Courses VALUES
-- SPRING 2025 (Semester 2)
(1, 209, 'D', 1.3, 1, 'Spring', 2025), -- CL1004 OOP Lab  (NOTE: D+ not in check constraint, use 'D' for safety)
(1, 208, 'C', 1.7, 3, 'Spring', 2025), -- CS1004 OOP
(1, 202, 'B', 3.3, 3, 'Spring', 2025), -- EE1005 DLD
(1, 203, 'B',  3.0, 1, 'Spring', 2025), -- EL1005 DLD Lab
(1, 207, 'C',  2.0, 3, 'Spring', 2025), -- MT1008 Multivariable Calc
(1, 205, 'A', 3.7, 1, 'Spring', 2025), -- SL1014 EW Lab
(1, 206, 'B',  3.0, 2, 'Spring', 2025), -- SS1007 Islamic Studies
(1, 204, 'A',  4.0, 2, 'Spring', 2025), -- SS1014 Expository Writing
(1, 201, 'A', 3.7, 2, 'Spring', 2025); -- SS2043 Civics
 INSERT INTO Completed_Courses VALUES
-- FALL 2025 (Semester 3)
(1, 304, 'A', 3.7, 1, 'Fall', 2025),   -- CL2001 DS Lab
(1, 305, 'B', 3.3, 3, 'Fall', 2025),   -- CS1005 Discrete Structures
(1, 303, 'B', 2.7, 3, 'Fall', 2025),   -- CS2001 Data Structures
(1, 308, 'A',  4.0, 3, 'Fall', 2025),   -- CS3005 Theory of Automata
(1, 301, 'C', 2.3, 3, 'Fall', 2025),   -- EE2003 COAL
(1, 302, 'C', 1.7, 1, 'Fall', 2025),   -- EL2003 COAL Lab
(1, 307, 'B',  3.0, 2, 'Fall', 2025),   -- MG1009 Fund. Management
(1, 306, 'A',  4.0, 3, 'Fall', 2025);   -- MT1004 Linear Algebra
GO
INSERT INTO Completed_Courses VALUES
-- Fall 2024
(2, 106, 'B', 3.3, 1, 'Fall', 2024),
(2, 108, 'B',  3.0, 1, 'Fall', 2024),
(2, 107, 'A', 3.7, 3, 'Fall', 2024),
(2, 102, 'B',  3.0, 3, 'Fall', 2024),
(2, 101, 'A',  4.0, 3, 'Fall', 2024),
(2, 104, 'B', 3.3, 1, 'Fall', 2024),
(2, 103, 'A', 3.7, 2, 'Fall', 2024),
(2, 105, 'B',  3.0, 2, 'Fall', 2024),
-- Spring 2025
(2, 209, 'C', 2.3, 1, 'Spring', 2025),
(2, 208, 'B', 2.7, 3, 'Spring', 2025),
(2, 202, 'A', 3.7, 3, 'Spring', 2025),
(2, 203, 'A', 3.7, 1, 'Spring', 2025),
(2, 207, 'B',  3.0, 3, 'Spring', 2025),
(2, 205, 'B', 3.3, 1, 'Spring', 2025),
(2, 206, 'A',  4.0, 2, 'Spring', 2025),
(2, 204, 'B', 3.3, 2, 'Spring', 2025),
(2, 201, 'A',  4.0, 2, 'Spring', 2025);
GO

INSERT INTO Completed_Courses VALUES
(3, 106, 'C',  2.0, 1, 'Fall', 2024),
(3, 108, 'C-', 1.7, 1, 'Fall', 2024),
(3, 107, 'C+', 2.3, 3, 'Fall', 2024),
(3, 102, 'B-', 2.7, 3, 'Fall', 2024),
(3, 101, 'C+', 2.3, 3, 'Fall', 2024),
(3, 104, 'B',  3.0, 1, 'Fall', 2024),
(3, 103, 'B+', 3.3, 2, 'Fall', 2024),
(3, 105, 'C',  2.0, 2, 'Fall', 2024),
(3, 209, 'B',  3.0, 1, 'Spring', 2025),
(3, 208, 'B-', 2.7, 3, 'Spring', 2025),
(3, 202, 'B',  3.0, 3, 'Spring', 2025),
(3, 203, 'B+', 3.3, 1, 'Spring', 2025),
(3, 207, 'B-', 2.7, 3, 'Spring', 2025),
(3, 205, 'A-', 3.7, 1, 'Spring', 2025),
(3, 206, 'B+', 3.3, 2, 'Spring', 2025),
(3, 204, 'B',  3.0, 2, 'Spring', 2025),
(3, 201, 'B-', 2.7, 2, 'Spring', 2025);
GO
DELETE FROM Enrollments;
DELETE FROM Waiting_List;
DELETE FROM Swap_Requests;
INSERT INTO Enrollments VALUES
(1,1,2,'2025-09-01','Registered'),
(2,2,1,'2025-09-01','Registered'),
(3,5,7,'2026-01-20','Registered'),
(4,6,8,'2026-01-22','Registered'),
(5,7,9,'2026-01-25','Registered');
-- ─────────────────────────────────────────────────────────────
--  ENROLLMENTS (Spring 2026 — current semester)
-- ─────────────────────────────────────────────────────────────
-- Aqsa (student 1) — Semester 4 courses
INSERT INTO Enrollments VALUES
(1,  1, 41, '2026-01-25', 'Registered'),  -- AI
(2,  1, 42, '2026-01-25', 'Registered'),  -- AI Lab
(3,  1, 43, '2026-01-25', 'Registered'),  -- Database Systems
(4,  1, 44, '2026-01-25', 'Registered'),  -- DB Lab
(5,  1, 45, '2026-01-25', 'Registered'),  -- Operating Systems
(6,  1, 46, '2026-01-25', 'Registered'),  -- OS Lab
(7,  1, 47, '2026-01-25', 'Registered'),  -- Pakistan Studies
(8,  1, 48, '2026-01-25', 'Registered'),  -- Prob & Stats
(9,  1, 49, '2026-01-25', 'Registered'),  -- SDA
 
-- Sara (student 2) — still in Semester 3
(10, 2, 31, '2025-09-01', 'Registered'),
(11, 2, 32, '2025-09-01', 'Registered'),
(12, 2, 33, '2025-09-01', 'Registered'),
(13, 2, 34, '2025-09-01', 'Registered'),
(14, 2, 35, '2025-09-01', 'Registered'),
(15, 2, 36, '2025-09-01', 'Registered'),
(16, 2, 38, '2025-09-01', 'Registered'),
 
-- Usman (student 3) — Semester 4
(20, 3, 41, '2026-01-25', 'Registered'),
(21, 3, 42, '2026-01-25', 'Registered'),
(22, 3, 43, '2026-01-25', 'Registered'),
(23, 3, 45, '2026-01-25', 'Registered'),
(24, 3, 47, '2026-01-25', 'Registered'),
(25, 3, 48, '2026-01-25', 'Registered');
GO

INSERT INTO Waiting_List VALUES
(1, 4, 43, '2026-01-26', 1),  -- Hina waiting for DB Systems
(2, 4, 41, '2026-01-26', 1);  -- Hina waiting for AI
GO


-- Sample Swap Requests
INSERT INTO Swap_Requests VALUES
(1, 1, 2, 102, 'Pending',  '2025-09-03'),  -- Aqsa and Sara want to swap Data Structures
(2, 3, 4, 103, 'Approved', '2025-09-10'),  -- Usman and Hina swapped Software Engineering
(3, 5, 6, 105, 'Rejected', '2026-02-01'),  -- Bilal and Ayesha requested Algorithms swap, rejected
(4, 7, 8, 106, 'Pending',  '2026-02-05'),  -- Hamza and Fatima want to swap Machine Learning
(5, 2, 5, 101, 'Approved', '2026-02-10');  -- Sara and Bilal swapped Programming Fundamentals

INSERT INTO Teacher_Ratings (student_id,instructor_id,rating,comment,rating_date) VALUES
(1,2,5,'Excellent! Very clear explanations.','2025-09-10'),
(2,1,4,'Good lectures, could improve pacing.','2025-09-11'),
(5,5,5,'Very engaging lectures.','2026-02-10'),
(6,4,3,'Good but needs more examples.','2026-02-11'),
(7,2,4,'Clear explanations.','2026-02-12'),
(1, 4, 4, 'Great at explaining complex calculus. More practice problems would help.', '2025-05-22'),
(1, 3, 3, 'Good content knowledge but lecture pace is sometimes too fast.', '2025-05-21'),
(2, 5, 5, 'Dr. Aslam makes programming so fun and approachable!', '2025-05-20'),
(2, 2, 4, 'Very organized and structured. Tests are always fair.', '2025-05-21'),
(3, 1, 4, 'Clear explanations, helpful with assignments.', '2026-01-12');
GO

INSERT INTO Fee_Payments (student_id, amount, payment_date, semester, year) VALUES
(1, 25000, '2024-08-10', 'Fall',   2024),
(1, 25000, '2025-01-12', 'Spring', 2025),
(1, 25000, '2025-08-08', 'Fall',   2025),
(1, 25000, '2026-01-15', 'Spring', 2026),
(2, 25000, '2024-08-12', 'Fall',   2024),
(2, 25000, '2025-01-14', 'Spring', 2025),
(2, 25000, '2025-08-09', 'Fall',   2025),
(3, 25000, '2024-08-15', 'Fall',   2024),
(3, 25000, '2025-01-18', 'Spring', 2025),
(3, 25000, '2026-01-20', 'Spring', 2026),
(4, 25000, '2024-08-11', 'Fall',   2024);
GO

-- Announcements for Fall 2025
INSERT INTO Announcements (instructor_id, section_id, title, body, posted_date) VALUES
(1, 41, 'Assignment 2 Released', 'Please complete Assignment 2 by October 5. Submit via LMS.', '2025-09-20'),
(2, 23, 'Quiz Reminder', 'Quiz 1 will be held on September 25. Topics: Arrays and Linked Lists.', '2025-09-18'),
(3, 42, 'Project Kickoff', 'Group project on Software Engineering starts October 1. Teams will be assigned.', '2025-09-22'),
(4, 22, 'Lab Cancelled', 'Database Systems lab on September 28 is cancelled due to maintenance.', '2025-09-25'),
(1, 44, 'Extra Class', 'Algorithms extra class scheduled for October 3 at 2 PM.', '2025-09-27');

-- Announcements for Spring 2026
INSERT INTO Announcements (instructor_id, section_id, title, body, posted_date) VALUES
(5, 7, 'Design Patterns Workshop', 'Attend workshop on Singleton and Factory patterns on March 5.', '2026-02-20'),
(4, 8, 'OS Midterm', 'Midterm exam scheduled for March 15. Covers Chapters 1–6.', '2026-02-25'),
(2, 9, 'Deep Learning Seminar', 'Guest lecture on CNNs scheduled for April 10 in Auditorium.', '2026-03-01');



INSERT INTO Attendance (student_id, section_id, class_date, status, marked_by) VALUES
-- Aqsa in Database Systems (section 4003)
(1, 43, '2026-02-03', 'Present', 1),
(1, 43, '2026-02-05', 'Present', 1),
(1, 43, '2026-02-10', 'Present', 1),
(1, 43, '2026-02-12', 'Late',    1),
(1, 43, '2026-02-17', 'Present', 1),
(1, 43, '2026-02-19', 'Present', 1),
(1, 43, '2026-02-24', 'Present', 1),
(1, 43, '2026-02-26', 'Absent',  1),
(1, 43, '2026-03-03', 'Present', 1),
(1, 43, '2026-03-05', 'Present', 1),
-- Aqsa in AI (section 4001)
(1, 41, '2026-02-02', 'Present', 2),
(1, 41, '2026-02-04', 'Present', 2),
(1, 41, '2026-02-09', 'Present', 2),
(1, 41, '2026-02-11', 'Present', 2),
(1, 41, '2026-02-16', 'Absent',  2),
(1, 41, '2026-02-18', 'Present', 2),
(1, 41, '2026-02-23', 'Present', 2),
(1, 41, '2026-02-25', 'Present', 2),
(1, 41, '2026-03-02', 'Present', 2),
(1, 41, '2026-03-04', 'Late',    2),
-- Sara in Data Structures (section 3003)
(2, 33, '2025-09-03', 'Present', 2),
(2, 33, '2025-09-05', 'Present', 2),
(2, 33, '2025-09-08', 'Present', 2),
(2, 33, '2025-09-10', 'Absent',  2),
(2, 33, '2025-09-12', 'Present', 2),
(2, 33, '2025-09-15', 'Present', 2),
(2, 33, '2025-09-17', 'Present', 2),
(2, 33, '2025-09-19', 'Late',    2),
(2, 33, '2025-09-22', 'Present', 2),
(2, 33, '2025-09-24', 'Present', 2),
-- Usman in AI (section 4001)
(3, 41, '2026-02-02', 'Present', 2),
(3, 41, '2026-02-04', 'Absent',  2),
(3, 41, '2026-02-09', 'Present', 2),
(3, 41, '2026-02-11', 'Present', 2),
(3, 41, '2026-02-16', 'Present', 2),
(3, 41, '2026-02-18', 'Late',    2),
(3, 41, '2026-02-23', 'Present', 2),
(3, 41, '2026-02-25', 'Present', 2);
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
        THROW;
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
        THROW;
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
        THROW;
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
        THROW;
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
        THROW;
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
        THROW;
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
        THROW;
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
        THROW;
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
        THROW;
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
        THROW;
    END CATCH
END;
GO

CREATE TRIGGER trg_AutoCreateSection
ON Waiting_List AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Work through every distinct section that just got a new waiter
    DECLARE @section_id   INT;
    DECLARE @course_id    INT;
    DECLARE @semester     VARCHAR(20);
    DECLARE @year         INT;
    DECLARE @waiters      INT;
    DECLARE @new_sec_id   INT;
    DECLARE @enroll_id    INT;
    DECLARE @student_id   INT;
    DECLARE @waiting_id   INT;

    -- Cursor over the distinct sections touched by this INSERT batch
    DECLARE sec_cur CURSOR LOCAL FAST_FORWARD FOR
        SELECT DISTINCT i.section_id
        FROM inserted i;

    OPEN sec_cur;
    FETCH NEXT FROM sec_cur INTO @section_id;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Count how many students are now waiting for this section
        SELECT @waiters = COUNT(*)
        FROM Waiting_List
        WHERE section_id = @section_id;

        IF @waiters >= 10
        BEGIN
            -- Identify the course and semester from the section
            SELECT @course_id = course_id,
                   @semester  = semester,
                   @year      = year
            FROM Sections
            WHERE section_id = @section_id;

            -- Guard: only create one new section per course+semester per trigger fire.
            -- Check whether a section for this course+semester was already created
            -- AFTER the section that is now full (i.e. section_id > @section_id).
            -- If one already exists we skip creation; waiters will be enrolled next time
            -- a drop opens a seat or an admin intervenes.
            IF NOT EXISTS (
                SELECT 1
                FROM Sections
                WHERE course_id = @course_id
                  AND semester  = @semester
                  AND year      = @year
                  AND section_id > @section_id   -- a newer section created for overflow
            )
            BEGIN
                -- ── Step 1: Create the new section (least-loaded instructor auto-assigned) ──
                -- sp_CreateDynamicSection uses MAX(section_id)+1 internally, so capture
                -- the id it will produce BEFORE calling it.
                SELECT @new_sec_id = ISNULL(MAX(section_id), 0) + 1
                FROM Sections;

                EXEC sp_CreateDynamicSection
                    @course_id   = @course_id,
                    @semester    = @semester,
                    @year        = @year,
                    @total_seats = 35;   -- default seat count; adjust as needed

                -- ── Step 2: Enroll every waiter into the new section ──
                DECLARE student_cur CURSOR LOCAL FAST_FORWARD FOR
                    SELECT waiting_id, student_id
                    FROM Waiting_List
                    WHERE section_id = @section_id
                    ORDER BY position;   -- respect queue order

                OPEN student_cur;
                FETCH NEXT FROM student_cur INTO @waiting_id, @student_id;

                WHILE @@FETCH_STATUS = 0
                BEGIN
                    SELECT @enroll_id = ISNULL(MAX(enrollment_id), 0) + 1
                    FROM Enrollments;

                    INSERT INTO Enrollments
                        (enrollment_id, student_id, section_id, enrollment_date, status)
                    VALUES
                        (@enroll_id, @student_id, @new_sec_id, GETDATE(), 'Registered');

                    -- Decrement the new section's available seats
                    UPDATE Sections
                    SET available_seats = available_seats - 1
                    WHERE section_id = @new_sec_id;

                    -- Audit each promotion
                    INSERT INTO Audit_Log
                        (action_type, student_id, section_id, details)
                    VALUES
                        ('AUTO_SECTION_ENROLL', @student_id, @new_sec_id,
                         CONCAT('Auto-enrolled from waiting list of section ',
                                @section_id, ' into new section ', @new_sec_id));

                    DELETE FROM Waiting_List WHERE waiting_id = @waiting_id;

                    FETCH NEXT FROM student_cur INTO @waiting_id, @student_id;
                END;

                CLOSE student_cur;
                DEALLOCATE student_cur;
            END;
        END;

        FETCH NEXT FROM sec_cur INTO @section_id;
    END;

    CLOSE sec_cur;
    DEALLOCATE sec_cur;


END;
GO
GO

-- Use your actual column names: enrollment_deadline and is_active
UPDATE Semesters
SET enrollment_deadline = DATEADD(month, 1, GETDATE())
WHERE is_active = 1;

