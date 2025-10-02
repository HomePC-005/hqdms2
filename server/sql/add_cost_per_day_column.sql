-- Add cost_per_day column to enrollments table
-- This allows manual input of cost per day for each enrollment

ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS cost_per_day DECIMAL(10,2) DEFAULT 0.00;

-- Add comment to explain the column
COMMENT ON COLUMN enrollments.cost_per_day IS 'Manual cost per day input for this enrollment (optional)';

-- Update existing enrollments to have cost_per_day = 0 if NULL
UPDATE enrollments 
SET cost_per_day = 0.00 
WHERE cost_per_day IS NULL;

-- Make the column NOT NULL with default value
ALTER TABLE enrollments 
ALTER COLUMN cost_per_day SET NOT NULL,
ALTER COLUMN cost_per_day SET DEFAULT 0.00;



