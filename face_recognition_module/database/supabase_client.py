"""
Supabase client configuration for face recognition module
"""

import os
import logging
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseClient:
    """
    Supabase database client for face recognition system
    """
    
    def __init__(self):
        """Initialize Supabase client"""
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY") 
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.key:
            raise ValueError(
                "❌ Supabase URL and ANON_KEY must be set in environment variables.\n"
                "Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file"
            )
        
        # Create client with service role key for full access if available
        api_key = self.service_key if self.service_key else self.key
        self.supabase: Client = create_client(self.url, api_key)
        
        logger.info("🚀 Supabase client initialized successfully")
    
    def get_client(self) -> Client:
        """Get Supabase client instance"""
        return self.supabase
    
    async def test_connection(self) -> bool:
        """
        Test database connection
        
        Returns:
            bool: True if connection successful
        """
        try:
            # Try to read from persons table (should exist)
            result = self.supabase.table('persons').select("id").limit(1).execute()
            logger.info("✅ Database connection successful")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {str(e)}")
            return False
    
    async def create_tables(self) -> bool:
        """
        Create required tables for face recognition system
        This would typically be done via Supabase SQL editor or migrations
        
        Returns:
            bool: True if tables created successfully
        """
        try:
            # Note: In production, use Supabase SQL editor or migration files
            # This is just for reference
            
            persons_table_sql = """
            CREATE TABLE IF NOT EXISTS persons (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                student_id VARCHAR(100) UNIQUE,
                employee_id VARCHAR(100) UNIQUE,
                department VARCHAR(255),
                role VARCHAR(50) CHECK (role IN ('student', 'faculty', 'staff', 'visitor')),
                email VARCHAR(255),
                phone VARCHAR(20),
                face_embedding TEXT, -- Base64 encoded numpy array
                training_images_count INTEGER DEFAULT 0,
                last_trained TIMESTAMP WITH TIME ZONE,
                recognition_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            attendance_table_sql = """
            CREATE TABLE IF NOT EXISTS attendance_records (
                id SERIAL PRIMARY KEY,
                person_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                location VARCHAR(255),
                confidence FLOAT NOT NULL,
                image_path VARCHAR(500),
                verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            training_images_sql = """
            CREATE TABLE IF NOT EXISTS training_images (
                id SERIAL PRIMARY KEY,
                person_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
                image_path VARCHAR(500),
                image_data TEXT, -- Base64 encoded image (optional)
                quality_score FLOAT,
                face_bbox TEXT, -- JSON string for bounding box coordinates
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            recognition_logs_sql = """
            CREATE TABLE IF NOT EXISTS recognition_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                total_faces_detected INTEGER DEFAULT 0,
                successful_recognitions INTEGER DEFAULT 0,
                failed_recognitions INTEGER DEFAULT 0,
                processing_time_ms FLOAT,
                location VARCHAR(255),
                session_id VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            system_config_sql = """
            CREATE TABLE IF NOT EXISTS system_config (
                id SERIAL PRIMARY KEY,
                config_key VARCHAR(255) UNIQUE NOT NULL,
                config_value TEXT,
                description TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """
            
            logger.info("📋 Table creation SQL prepared. Execute these in Supabase SQL editor:")
            print("\n🔧 Execute these SQL commands in your Supabase SQL editor:\n")
            print("1. Persons Table:")
            print(persons_table_sql)
            print("\n2. Attendance Records Table:")
            print(attendance_table_sql)
            print("\n3. Training Images Table:")
            print(training_images_sql)
            print("\n4. Recognition Logs Table:")
            print(recognition_logs_sql)
            print("\n5. System Config Table:")
            print(system_config_sql)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error preparing table creation: {str(e)}")
            return False