-- Sample enrollments for testing
-- This script creates some sample enrollments between patients and drugs

-- First, let's check what we have
SELECT 'Patients:' as info, COUNT(*) as count FROM patients
UNION ALL
SELECT 'Drugs:', COUNT(*) FROM drugs
UNION ALL
SELECT 'Enrollments:', COUNT(*) FROM enrollments;

-- Create some sample enrollments
INSERT INTO enrollments (drug_id, patient_id, dose_per_day, prescription_start_date, prescription_end_date, spub, remarks, cost_per_year, is_active) VALUES 
-- Ahmad bin Abdullah enrollments
((SELECT id FROM drugs WHERE name = 'Insulin Glargine'), (SELECT id FROM patients WHERE name = 'Ahmad bin Abdullah'), 2.0, '2024-01-01', '2024-12-31', false, 'Type 2 diabetes management', 18615.00, true),
((SELECT id FROM drugs WHERE name = 'Metformin'), (SELECT id FROM patients WHERE name = 'Ahmad bin Abdullah'), 1.0, '2024-01-01', '2024-12-31', false, 'First-line diabetes treatment', 310.25, true),

-- Siti binti Hassan enrollments
((SELECT id FROM drugs WHERE name = 'Atorvastatin'), (SELECT id FROM patients WHERE name = 'Siti binti Hassan'), 1.0, '2024-02-01', '2024-12-31', false, 'Cholesterol management', 438.00, true),
((SELECT id FROM drugs WHERE name = 'Aspirin'), (SELECT id FROM patients WHERE name = 'Siti binti Hassan'), 1.0, '2024-02-01', '2024-12-31', false, 'Cardiovascular protection', 54.75, true),

-- Muhammad bin Ali enrollments
((SELECT id FROM drugs WHERE name = 'Methotrexate'), (SELECT id FROM patients WHERE name = 'Muhammad bin Ali'), 1.0, '2024-01-15', '2024-12-31', false, 'Rheumatoid arthritis treatment', 130.00, true),

-- Fatimah binti Omar enrollments
((SELECT id FROM drugs WHERE name = 'Levodopa'), (SELECT id FROM patients WHERE name = 'Fatimah binti Omar'), 3.0, '2024-03-01', '2024-12-31', false, 'Parkinson disease management', 4106.25, true),

-- Hassan bin Ibrahim enrollments
((SELECT id FROM drugs WHERE name = 'Donepezil'), (SELECT id FROM patients WHERE name = 'Hassan bin Ibrahim'), 1.0, '2024-02-15', '2024-12-31', false, 'Alzheimer disease treatment', 1533.00, true),

-- Aminah binti Ahmad enrollments (SPUB patient)
((SELECT id FROM drugs WHERE name = 'Pembrolizumab'), (SELECT id FROM patients WHERE name = 'Aminah binti Ahmad'), 1.0, '2024-01-01', '2024-12-31', true, 'Cancer immunotherapy - SPUB patient', 102000.00, true),

-- Omar bin Yusuf enrollments
((SELECT id FROM drugs WHERE name = 'Tamoxifen'), (SELECT id FROM patients WHERE name = 'Omar bin Yusuf'), 1.0, '2024-02-01', '2024-12-31', false, 'Breast cancer hormone therapy', 676.25, true),

-- Khadijah binti Zain enrollments
((SELECT id FROM drugs WHERE name = 'Adalimumab'), (SELECT id FROM patients WHERE name = 'Khadijah binti Zain'), 1.0, '2024-01-01', '2024-12-31', false, 'Autoimmune condition treatment', 2400.00, true),

-- Ibrahim bin Khalid enrollments
((SELECT id FROM drugs WHERE name = 'Insulin Glargine'), (SELECT id FROM patients WHERE name = 'Ibrahim bin Khalid'), 1.5, '2024-03-01', '2024-12-31', false, 'Type 1 diabetes management', 13961.25, true),

-- Zainab binti Rashid enrollments
((SELECT id FROM drugs WHERE name = 'Atorvastatin'), (SELECT id FROM patients WHERE name = 'Zainab binti Rashid'), 2.0, '2024-02-15', '2024-12-31', false, 'High cholesterol management', 876.00, true)
ON CONFLICT DO NOTHING;

-- Show the results
SELECT 'After insert - Enrollments:' as info, COUNT(*) as count FROM enrollments WHERE is_active = true;
