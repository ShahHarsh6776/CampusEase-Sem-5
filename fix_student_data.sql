-- Fix student record data for attendance system and add default password login support
-- Run this in Supabase SQL Editor

-- Add account tracking fields for default password login
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_records' AND column_name = 'account_activated') THEN
        ALTER TABLE public.student_records ADD COLUMN account_activated boolean DEFAULT false;
        RAISE NOTICE 'Added account_activated column to student_records table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_records' AND column_name = 'email_verified') THEN
        ALTER TABLE public.student_records ADD COLUMN email_verified boolean DEFAULT false;
        RAISE NOTICE 'Added email_verified column to student_records table';
    END IF;
END $$;

-- Update existing students to have account_activated = false (they will use default passwords)
UPDATE public.student_records 
SET account_activated = false, email_verified = true
WHERE account_activated IS NULL;

-- Update existing students who already have auth_id to be activated
UPDATE public.student_records 
SET account_activated = true, email_verified = true
WHERE auth_id IS NOT NULL;

-- Update the student record with proper data
UPDATE public.student_records 
SET 
  student_id = user_id,                    -- Set student_id = user_id
  department = 'DIT',                      -- Extract department from user_id
  academic_year = '2023-24',               -- Set correct academic year for 23DIT student
  semester = 7                             -- Set appropriate semester
WHERE user_id = '23DIT004';

-- Also fix any other students with similar issues
UPDATE public.student_records 
SET 
  student_id = user_id
WHERE student_id IS NULL;

-- Fix department for all students based on user_id pattern
UPDATE public.student_records 
SET department = CASE
  WHEN user_id LIKE '%DIT%' THEN 'DIT'
  WHEN user_id LIKE '%IT%' THEN 'IT' 
  WHEN user_id LIKE '%CE%' THEN 'CE'
  WHEN user_id LIKE '%CS%' THEN 'CS'
  ELSE 'DIT'
END
WHERE department IS NULL OR department = '';

-- Fix academic year based on user_id year pattern
UPDATE public.student_records 
SET academic_year = CASE
  WHEN user_id LIKE '23%' THEN '2023-24'
  WHEN user_id LIKE '24%' THEN '2024-25'
  WHEN user_id LIKE '22%' THEN '2022-23'
  WHEN user_id LIKE '21%' THEN '2021-22'
  ELSE '2024-25'
END
WHERE academic_year IS NULL OR academic_year = '';

-- Create a proper class for 23DIT students if it doesn't exist
INSERT INTO public.class_details (class_name, class_id, department, institute, semester, academic_year, course_taken)
VALUES ('DIT Sem 7', '23DIT1658', 'DIT', 'DEPSTAR', 7, '2023-24', 'B.Tech DIT - DEPSTAR')
ON CONFLICT (class_id) DO NOTHING;

-- Update 23DIT students to use the correct class_id
UPDATE public.student_records 
SET class_id = '23DIT1658'
WHERE user_id LIKE '23DIT%' AND class_id = '24DIT1658';

-- Verify the changes
SELECT 
  user_id,
  fname,
  lname,
  roll_no,
  student_id,
  class_id,
  department,
  academic_year,
  semester
FROM public.student_records 
WHERE user_id = '23DIT004';

-- Show all classes and their student counts
SELECT 
  cd.class_name,
  cd.class_id,
  cd.department,
  cd.academic_year,
  COUNT(sr.user_id) as student_count
FROM public.class_details cd
LEFT JOIN public.student_records sr ON cd.class_id = sr.class_id
GROUP BY cd.class_name, cd.class_id, cd.department, cd.academic_year
ORDER BY cd.academic_year, cd.department;