-- Delete Exam Results Data
-- This script will clear all exam results so candidates can retake exams

-- Delete coding exam results
DELETE FROM coding_problem_scores;
DELETE FROM coding_exam_results;

-- Delete MCQ exam results  
DELETE FROM candidate_answers;
DELETE FROM exam_results;

-- Reset any auto-increment counters (optional)
-- ALTER TABLE coding_exam_results AUTO_INCREMENT = 1;
-- ALTER TABLE exam_results AUTO_INCREMENT = 1;
-- ALTER TABLE candidate_answers AUTO_INCREMENT = 1;
-- ALTER TABLE coding_problem_scores AUTO_INCREMENT = 1;

-- Verify deletion
SELECT 'Coding Exam Results' as table_name, COUNT(*) as remaining_records FROM coding_exam_results
UNION ALL
SELECT 'MCQ Exam Results' as table_name, COUNT(*) as remaining_records FROM exam_results
UNION ALL
SELECT 'Candidate Answers' as table_name, COUNT(*) as remaining_records FROM candidate_answers
UNION ALL
SELECT 'Coding Problem Scores' as table_name, COUNT(*) as remaining_records FROM coding_problem_scores;
