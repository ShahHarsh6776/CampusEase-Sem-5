-- Face Recognition Database Schema for Campus Ease
-- Execute these SQL commands in your Supabase SQL Editor

-- Table for storing person data with face embeddings
CREATE TABLE IF NOT EXISTS persons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    student_id VARCHAR(50) UNIQUE,
    employee_id VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    department VARCHAR(100),
    role VARCHAR(50) DEFAULT 'student', -- student, faculty, staff
    face_embedding TEXT, -- Base64 encoded face embedding
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_person_id CHECK (student_id IS NOT NULL OR employee_id IS NOT NULL),
    CONSTRAINT chk_role CHECK (role IN ('student', 'faculty', 'staff', 'admin'))
);

-- Table for storing training images
CREATE TABLE IF NOT EXISTS training_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    image_path VARCHAR(500),
    image_data BYTEA, -- Store image binary data if needed
    image_url VARCHAR(500), -- URL if storing in cloud storage
    image_hash VARCHAR(64), -- SHA256 hash for duplicate detection
    face_confidence FLOAT DEFAULT 0.0,
    is_primary BOOLEAN DEFAULT false, -- Mark primary training image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_image_source CHECK (image_path IS NOT NULL OR image_data IS NOT NULL OR image_url IS NOT NULL)
);

-- Table for storing face recognition attendance records
CREATE TABLE IF NOT EXISTS face_recognition_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attendance_id UUID, -- Reference to main attendance table if exists
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    student_id VARCHAR(50),
    class_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    subject VARCHAR(100),
    class_type VARCHAR(50), -- lecture, lab, tutorial
    status VARCHAR(20) DEFAULT 'present', -- present, absent, late
    confidence_score FLOAT DEFAULT 0.0,
    recognition_method VARCHAR(50) DEFAULT 'face_recognition', -- face_recognition, manual
    marked_by VARCHAR(50), -- faculty ID who marked attendance
    faculty_name VARCHAR(255),
    class_photo_url VARCHAR(500), -- URL of the class photo used
    bbox_coordinates JSONB, -- Bounding box of detected face in image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_status CHECK (status IN ('present', 'absent', 'late')),
    CONSTRAINT chk_recognition_method CHECK (recognition_method IN ('face_recognition', 'manual', 'hybrid')),
    
    -- Unique constraint to prevent duplicate attendance
    UNIQUE(student_id, date, subject, marked_by)
);

-- Table for storing recognition logs
CREATE TABLE IF NOT EXISTS recognition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID DEFAULT gen_random_uuid(),
    image_path VARCHAR(500),
    total_faces_detected INTEGER DEFAULT 0,
    recognized_faces INTEGER DEFAULT 0,
    unrecognized_faces INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    confidence_threshold FLOAT,
    class_id VARCHAR(100),
    marked_by VARCHAR(50),
    recognition_results JSONB, -- Detailed results
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for system configuration
CREATE TABLE IF NOT EXISTS face_recognition_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO face_recognition_config (config_key, config_value, description) VALUES
('similarity_threshold', '0.4', 'Minimum similarity score for face recognition (0.0-1.0)'),
('max_training_images', '10', 'Maximum number of training images per person'),
('cache_duration_minutes', '5', 'Duration to cache face embeddings in memory'),
('recognition_timeout_seconds', '30', 'Maximum time for face recognition processing'),
('max_faces_per_image', '100', 'Maximum number of faces to detect in a single image')
ON CONFLICT (config_key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_persons_student_id ON persons(student_id);
CREATE INDEX IF NOT EXISTS idx_persons_employee_id ON persons(employee_id);
CREATE INDEX IF NOT EXISTS idx_persons_role ON persons(role);
CREATE INDEX IF NOT EXISTS idx_persons_active ON persons(is_active);

CREATE INDEX IF NOT EXISTS idx_training_images_person_id ON training_images(person_id);
CREATE INDEX IF NOT EXISTS idx_training_images_primary ON training_images(is_primary);

CREATE INDEX IF NOT EXISTS idx_fr_attendance_student_id ON face_recognition_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_fr_attendance_class_date ON face_recognition_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_fr_attendance_marked_by ON face_recognition_attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_fr_attendance_date ON face_recognition_attendance(date);

CREATE INDEX IF NOT EXISTS idx_recognition_logs_session ON recognition_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_class ON recognition_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_date ON recognition_logs(created_at);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_persons_updated_at 
    BEFORE UPDATE ON persons 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fr_attendance_updated_at 
    BEFORE UPDATE ON face_recognition_attendance 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add face recognition columns to existing attendance table (if needed)
-- Note: Run this only if you want to extend the existing attendance table
-- ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_recognition_confidence FLOAT;
-- ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_via VARCHAR(50) DEFAULT 'manual';
-- ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_bbox JSONB;

-- Create view for student face training status
CREATE OR REPLACE VIEW student_face_training_status AS
SELECT 
    sr.user_id as student_id,
    sr.fname,
    sr.lname,
    sr.department,
    sr.class_id,
    p.id as person_id,
    p.face_embedding IS NOT NULL as has_face_training,
    p.created_at as training_date,
    (SELECT COUNT(*) FROM training_images ti WHERE ti.person_id = p.id) as training_images_count,
    p.is_active as face_recognition_active
FROM student_records sr
LEFT JOIN persons p ON sr.user_id = p.student_id;

-- Create view for attendance with face recognition details
CREATE OR REPLACE VIEW attendance_with_face_recognition AS
SELECT 
    a.*,
    fra.confidence_score,
    fra.recognition_method,
    fra.bbox_coordinates,
    fra.class_photo_url,
    p.name as person_name,
    p.face_embedding IS NOT NULL as has_face_training
FROM attendance a
LEFT JOIN face_recognition_attendance fra ON 
    fra.student_id = a.user_id AND 
    fra.date = a.date AND 
    fra.subject = a.subject AND
    fra.marked_by = a.marked_by
LEFT JOIN persons p ON p.student_id = a.user_id;

-- Grant necessary permissions (adjust based on your RLS policies)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE persons IS 'Stores person data with face embeddings for recognition';
COMMENT ON TABLE training_images IS 'Stores training images used for face recognition';
COMMENT ON TABLE face_recognition_attendance IS 'Face recognition attendance records with confidence scores';
COMMENT ON TABLE recognition_logs IS 'Logs of face recognition processing sessions';
COMMENT ON TABLE face_recognition_config IS 'System configuration for face recognition parameters';