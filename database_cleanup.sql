-- Database Cleanup and Optimization Commands
-- Execute in Supabase SQL Editor

-- 1. Drop redundant tables and views
DROP VIEW IF EXISTS attendance_with_face_recognition;
DROP TABLE IF EXISTS student_face_training_status;

-- 2. Ensure all face recognition tables have proper structure
-- Check if persons table has all required columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='recognition_enabled') THEN
        ALTER TABLE persons ADD COLUMN recognition_enabled BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='last_trained') THEN
        ALTER TABLE persons ADD COLUMN last_trained TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='training_images_count') THEN
        ALTER TABLE persons ADD COLUMN training_images_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='phone') THEN
        ALTER TABLE persons ADD COLUMN phone VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='is_active') THEN
        ALTER TABLE persons ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_persons_student_id ON persons(student_id);
CREATE INDEX IF NOT EXISTS idx_persons_recognition_enabled ON persons(recognition_enabled);
CREATE INDEX IF NOT EXISTS idx_training_images_person_id ON training_images(person_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_attendance_class_date ON face_recognition_attendance(class_id, date);

-- 4. Set up triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to persons table
DROP TRIGGER IF EXISTS update_persons_updated_at ON persons;
CREATE TRIGGER update_persons_updated_at 
    BEFORE UPDATE ON persons 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Update existing records
UPDATE persons 
SET recognition_enabled = true 
WHERE recognition_enabled IS NULL;

UPDATE persons 
SET is_active = true 
WHERE is_active IS NULL;

-- 6. Show final table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('persons', 'training_images', 'face_recognition_attendance')
ORDER BY table_name, ordinal_position;