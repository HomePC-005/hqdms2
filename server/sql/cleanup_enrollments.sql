-- Complete cleanup of all enrollment data
-- This script will remove all enrollments and reset counters

-- Show current state before cleanup
SELECT 'Before cleanup:' as info;
SELECT 'Enrollments:' as type, COUNT(*) as count FROM enrollments
UNION ALL
SELECT 'Defaulters:', COUNT(*) FROM defaulters
UNION ALL
SELECT 'Active Enrollments:', COUNT(*) FROM enrollments WHERE is_active = true;

-- Delete all enrollments
DELETE FROM enrollments;

-- Delete all defaulters
DELETE FROM defaulters;

-- Reset any sequences if they exist (optional)
-- ALTER SEQUENCE enrollments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE defaulters_id_seq RESTART WITH 1;

-- Show state after cleanup
SELECT 'After cleanup:' as info;
SELECT 'Enrollments:' as type, COUNT(*) as count FROM enrollments
UNION ALL
SELECT 'Defaulters:', COUNT(*) FROM defaulters
UNION ALL
SELECT 'Active Enrollments:', COUNT(*) FROM enrollments WHERE is_active = true;

-- Show remaining patients and drugs for reference
SELECT 'Remaining data:' as info;
SELECT 'Patients:' as type, COUNT(*) as count FROM patients
UNION ALL
SELECT 'Drugs:', COUNT(*) FROM drugs
UNION ALL
SELECT 'Departments:', COUNT(*) FROM departments;
