-- Fix Face Recognition Schema - Add missing columns
-- Execute this in your Supabase SQL Editor

-- Add missing columns to persons table
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS recognition_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_trained TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS training_images_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Update existing records to have recognition enabled by default
UPDATE persons 
SET recognition_enabled = true 
WHERE recognition_enabled IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_persons_recognition_enabled ON persons(recognition_enabled);
CREATE INDEX IF NOT EXISTS idx_persons_student_id ON persons(student_id);
CREATE INDEX IF NOT EXISTS idx_persons_employee_id ON persons(employee_id);

-- Update the updated_at timestamp trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for persons table
DROP TRIGGER IF EXISTS update_persons_updated_at ON persons;
CREATE TRIGGER update_persons_updated_at 
    BEFORE UPDATE ON persons 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for training_images table
DROP TRIGGER IF EXISTS update_training_images_updated_at ON training_images;
CREATE TRIGGER update_training_images_updated_at 
    BEFORE UPDATE ON training_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();