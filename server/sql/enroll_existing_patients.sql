-- Enroll existing patients to drugs
-- This script enrolls the 3 existing patients to some of the 3 existing drugs

-- First, let's see what we have
SELECT 'Before enrollment:' as info;
SELECT 'Patients:' as type, COUNT(*) as count FROM patients
UNION ALL
SELECT 'Drugs:', COUNT(*) FROM drugs
UNION ALL
SELECT 'Enrollments:', COUNT(*) FROM enrollments;

-- Show existing patients and drugs
SELECT 'Existing patients:' as info;
SELECT id, name, ic_number FROM patients ORDER BY name;

SELECT 'Existing drugs:' as info;
SELECT id, name, price FROM drugs ORDER BY name;

-- Create enrollments for existing patients
-- Note: We'll need to check what drugs actually exist first
INSERT INTO enrollments (drug_id, patient_id, dose_per_day, prescription_start_date, prescription_end_date, spub, remarks, cost_per_year, is_active) 
SELECT 
  d.id as drug_id,
  p.id as patient_id,
  CASE 
    WHEN d.name ILIKE '%insulin%' THEN 2.0
    WHEN d.name ILIKE '%metformin%' THEN 1.0
    ELSE 1.0
  END as dose_per_day,
  '2024-01-01' as prescription_start_date,
  '2024-12-31' as prescription_end_date,
  false as spub,
  'Sample enrollment for testing' as remarks,
  CASE 
    WHEN d.name ILIKE '%insulin%' THEN 18615.00
    WHEN d.name ILIKE '%metformin%' THEN 310.25
    ELSE 1000.00
  END as cost_per_year,
  true as is_active
FROM patients p
CROSS JOIN drugs d
WHERE p.name IN ('Rosnah Hj Karim', 'Aziz Malik', 'Ruslan bin Bustamam')
  AND d.name IN (SELECT name FROM drugs LIMIT 2) -- Enroll to first 2 drugs
ON CONFLICT DO NOTHING;

-- Show results
SELECT 'After enrollment:' as info;
SELECT 'Enrollments created:' as type, COUNT(*) as count FROM enrollments;

-- Show the enrollments
SELECT 'Sample enrollments:' as info;
SELECT 
  e.id,
  p.name as patient_name,
  p.ic_number,
  d.name as drug_name,
  e.dose_per_day,
  e.prescription_start_date,
  e.is_active
FROM enrollments e
JOIN patients p ON e.patient_id = p.id
JOIN drugs d ON e.drug_id = d.id
ORDER BY p.name, d.name;
