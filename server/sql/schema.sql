-- Hospital Quota Drug Management System Database Schema

-- Create database (run this separately)
-- CREATE DATABASE hqdms;

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create drugs table
CREATE TABLE IF NOT EXISTS drugs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    quota_number INTEGER NOT NULL DEFAULT 0,
    active_patients INTEGER DEFAULT 0,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    calculation_method VARCHAR(100) DEFAULT 'monthly', -- monthly, weekly, daily, twice_yearly
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ic_number VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create enrollment table (junction table for drugs and patients)
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    drug_id INTEGER REFERENCES drugs(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    dose_per_day TEXT,
    prescription_start_date DATE NOT NULL,
    prescription_end_date DATE,
    latest_refill_date DATE,
    spub BOOLEAN DEFAULT FALSE, -- Sistem Pembekalan Ubat Bersepadu (refills at other facilities but retains quota)
    remarks TEXT,
    cost_per_year DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(drug_id, patient_id)
);

-- Create defaulter table
CREATE TABLE IF NOT EXISTS defaulters (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE CASCADE,
    drug_id INTEGER REFERENCES drugs(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    last_refill_date DATE,
    days_since_refill INTEGER,
    defaulter_date DATE DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ic_number VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for email
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_email_key UNIQUE (email);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_drug_id ON enrollments(drug_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_patient_id ON enrollments(patient_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_latest_refill ON enrollments(latest_refill_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_active ON enrollments(is_active);
CREATE INDEX IF NOT EXISTS idx_drugs_department_id ON drugs(department_id);
CREATE INDEX IF NOT EXISTS idx_patients_ic_number ON patients(ic_number);
CREATE INDEX IF NOT EXISTS idx_users_ic_number ON users(ic_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drugs_updated_at BEFORE UPDATE ON drugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample departments
INSERT INTO departments (name) VALUES 
('Cardiology'),
('Oncology'),
('Neurology'),
('Endocrinology'),
('Rheumatology')
ON CONFLICT (name) DO NOTHING;

-- Insert sample drugs
INSERT INTO drugs (name, department_id, quota_number, price, calculation_method, remarks) VALUES 
('Insulin Glargine', (SELECT id FROM departments WHERE name = 'Endocrinology'), 50, 25.50, 'daily', 'Long-acting insulin for diabetes management'),
('Metformin', (SELECT id FROM departments WHERE name = 'Endocrinology'), 100, 0.85, 'daily', 'First-line treatment for type 2 diabetes'),
('Atorvastatin', (SELECT id FROM departments WHERE name = 'Cardiology'), 75, 1.20, 'daily', 'Statin for cholesterol management'),
('Aspirin', (SELECT id FROM departments WHERE name = 'Cardiology'), 200, 0.15, 'daily', 'Antiplatelet therapy'),
('Methotrexate', (SELECT id FROM departments WHERE name = 'Rheumatology'), 30, 2.50, 'weekly', 'DMARD for rheumatoid arthritis'),
('Adalimumab', (SELECT id FROM departments WHERE name = 'Rheumatology'), 25, 1200.00, 'twice_yearly', 'Biologic therapy for autoimmune conditions'),
('Levodopa', (SELECT id FROM departments WHERE name = 'Neurology'), 40, 3.75, 'daily', 'Treatment for Parkinson disease'),
('Donepezil', (SELECT id FROM departments WHERE name = 'Neurology'), 35, 4.20, 'daily', 'Cholinesterase inhibitor for Alzheimer disease'),
('Pembrolizumab', (SELECT id FROM departments WHERE name = 'Oncology'), 15, 8500.00, 'monthly', 'Immunotherapy for various cancers'),
('Tamoxifen', (SELECT id FROM departments WHERE name = 'Oncology'), 60, 1.85, 'daily', 'Hormone therapy for breast cancer')
ON CONFLICT DO NOTHING;

-- Insert sample patients
INSERT INTO patients (name, ic_number) VALUES 
('Ahmad bin Abdullah', '850101-01-1234'),
('Siti binti Hassan', '920315-02-5678'),
('Muhammad bin Ali', '880712-03-9012'),
('Fatimah binti Omar', '950203-04-3456'),
('Hassan bin Ibrahim', '870609-05-7890'),
('Aminah binti Ahmad', '930411-06-2345'),
('Omar bin Yusuf', '890825-07-6789'),
('Khadijah binti Zain', '960117-08-0123'),
('Ibrahim bin Khalid', '910503-09-4567'),
('Zainab binti Rashid', '940228-10-8901')
ON CONFLICT (ic_number) DO NOTHING;
