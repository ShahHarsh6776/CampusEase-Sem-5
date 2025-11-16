"""
Campus Management System Integration Example with Supabase
Shows how to use the face recognition module with Supabase database
"""

import asyncio
import logging
import os
from typing import List, Dict
from face_recognition_module import (
    FaceRecognizerWithSupabase, 
    ImageProcessor, 
    GPUMonitor,
    DatabaseManager
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CampusAttendanceSystemWithSupabase:
    """
    Example integration with campus management system using Supabase
    """
    
    def __init__(self, similarity_threshold: float = 0.5):
        """Initialize campus attendance system with Supabase"""
        self.face_recognizer = FaceRecognizerWithSupabase(similarity_threshold)
        self.gpu_monitor = GPUMonitor()
        self.image_processor = ImageProcessor()
        
        logger.info("🏫 Campus Attendance System with Supabase initialized")
    
    async def initialize_system(self) -> bool:
        """
        Initialize the system and database connection
        
        Returns:
            bool: True if initialization successful
        """
        try:
            # Check GPU status
            gpu_status = self.gpu_monitor.get_gpu_status()
            logger.info(f"🚀 GPU Status: {gpu_status}")
            
            # Initialize database connection
            db_initialized = await self.face_recognizer.initialize_database()
            if not db_initialized:
                logger.error("❌ Failed to initialize database connection")
                return False
            
            logger.info("✅ System initialization completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ System initialization failed: {str(e)}")
            return False
    
    async def enroll_student(self, student_data: Dict, image_files: List[bytes]) -> Dict:
        """
        Enroll a new student in the face recognition system
        
        Args:
            student_data: Student information
            image_files: List of face images for training
            
        Returns:
            Enrollment result
        """
        try:
            logger.info(f"📝 Enrolling student: {student_data['name']}")
            
            # Process and enhance images
            processed_images = []
            for i, image_bytes in enumerate(image_files):
                enhanced_image = self.image_processor.enhance_image(image_bytes)
                if enhanced_image is not None:
                    processed_images.append(enhanced_image)
                    logger.debug(f"✅ Processed image {i+1}/{len(image_files)}")
                else:
                    logger.warning(f"⚠️ Failed to process image {i+1}")
            
            if not processed_images:
                return {
                    'success': False,
                    'message': 'No valid images provided for training'
                }
            
            # Train the face recognition system
            result = await self.face_recognizer.train_person(student_data, processed_images)
            
            if result['success']:
                logger.info(f"✅ Student enrolled successfully: {student_data['name']}")
                
                # Get system statistics
                stats = await self.face_recognizer.get_system_stats()
                result['system_stats'] = stats
                
            return result
            
        except Exception as e:
            logger.error(f"❌ Error enrolling student {student_data.get('name', 'Unknown')}: {str(e)}")
            return {
                'success': False,
                'message': f'Enrollment failed: {str(e)}'
            }
    
    async def mark_attendance(self, image_data: bytes, location: str) -> Dict:
        """
        Mark attendance by recognizing faces in an image
        
        Args:
            image_data: Image containing faces
            location: Location where attendance is being marked
            
        Returns:
            Attendance marking result
        """
        try:
            logger.info(f"📸 Marking attendance at: {location}")
            
            # Process and enhance the image
            enhanced_image = self.image_processor.enhance_image(image_data)
            if enhanced_image is None:
                return {
                    'success': False,
                    'message': 'Failed to process input image'
                }
            
            # Recognize faces and save attendance
            result = await self.face_recognizer.recognize_faces(
                enhanced_image,
                location=location,
                save_attendance=True,  # Automatically save attendance records
                return_annotated_image=True
            )
            
            if result['success']:
                # Add detailed information about recognized persons
                for recognition in result.get('recognition_results', []):
                    if recognition['person_id']:
                        # Get full person details
                        person_details = await self.face_recognizer.get_person_by_id(recognition['person_id'])
                        if person_details:
                            recognition['person_details'] = person_details
                
                logger.info(f"✅ Attendance marked: {result['successful_recognitions']} recognitions")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error marking attendance at {location}: {str(e)}")
            return {
                'success': False,
                'message': f'Attendance marking failed: {str(e)}'
            }
    
    async def get_attendance_report(self, person_id: int, days: int = 30) -> Dict:
        """
        Generate attendance report for a person
        
        Args:
            person_id: Person ID
            days: Number of days to include in report
            
        Returns:
            Attendance report
        """
        try:
            # Get person details
            person = await self.face_recognizer.get_person_by_id(person_id)
            if not person:
                return {
                    'success': False,
                    'message': f'Person not found: {person_id}'
                }
            
            # Get attendance history
            attendance_records = await self.face_recognizer.get_attendance_history(
                person_id, 
                limit=days * 10  # Approximate limit
            )
            
            # Process attendance data
            total_days_present = len(set(
                record['timestamp'].split('T')[0] 
                for record in attendance_records
            ))
            
            report = {
                'success': True,
                'person': person,
                'attendance_summary': {
                    'total_records': len(attendance_records),
                    'days_present': total_days_present,
                    'attendance_percentage': round((total_days_present / days) * 100, 2) if days > 0 else 0
                },
                'recent_attendance': attendance_records[:20],  # Last 20 records
                'locations_visited': list(set(
                    record['location'] 
                    for record in attendance_records 
                    if record['location']
                ))
            }
            
            logger.info(f"📊 Generated attendance report for {person['name']}")
            return report
            
        except Exception as e:
            logger.error(f"❌ Error generating attendance report: {str(e)}")
            return {
                'success': False,
                'message': f'Report generation failed: {str(e)}'
            }
    
    async def search_students(self, query: str) -> List[Dict]:
        """
        Search for students by name, ID, or department
        
        Args:
            query: Search query
            
        Returns:
            List of matching students
        """
        try:
            persons = await self.face_recognizer.search_persons(query)
            logger.info(f"🔍 Found {len(persons)} matches for '{query}'")
            return persons
            
        except Exception as e:
            logger.error(f"❌ Error searching students: {str(e)}")
            return []
    
    async def get_system_dashboard(self) -> Dict:
        """
        Get system dashboard data
        
        Returns:
            Dashboard data
        """
        try:
            # Get system statistics
            stats = await self.face_recognizer.get_system_stats()
            
            # Get GPU status
            gpu_status = self.gpu_monitor.get_gpu_status()
            
            dashboard = {
                'system_stats': stats,
                'gpu_status': gpu_status,
                'module_version': '1.1.0',
                'database_type': 'Supabase'
            }
            
            logger.info("📊 Generated system dashboard")
            return dashboard
            
        except Exception as e:
            logger.error(f"❌ Error generating dashboard: {str(e)}")
            return {}
    
    async def cleanup_old_records(self, days_to_keep: int = 90) -> Dict:
        """
        Cleanup old attendance records (if needed)
        Note: This is just an example - implement based on your retention policy
        
        Args:
            days_to_keep: Number of days of records to keep
            
        Returns:
            Cleanup result
        """
        try:
            # This would require implementing cleanup in DatabaseManager
            logger.info(f"🧹 Cleanup operation would remove records older than {days_to_keep} days")
            
            # For now, just return stats
            stats = await self.face_recognizer.get_system_stats()
            
            return {
                'success': True,
                'message': f'Cleanup policy: Keep {days_to_keep} days',
                'current_stats': stats
            }
            
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {str(e)}")
            return {
                'success': False,
                'message': f'Cleanup failed: {str(e)}'
            }

# Example usage
async def main():
    """
    Example usage of the Campus Attendance System with Supabase
    """
    try:
        # Create the system
        campus_system = CampusAttendanceSystemWithSupabase(similarity_threshold=0.4)
        
        # Initialize the system
        initialized = await campus_system.initialize_system()
        if not initialized:
            print("❌ Failed to initialize system")
            return
        
        print("✅ System initialized successfully!")
        
        # Example: Get system dashboard
        dashboard = await campus_system.get_system_dashboard()
        print(f"📊 Dashboard: {dashboard}")
        
        # Example: Search for students
        students = await campus_system.search_students("john")
        print(f"🔍 Search results: {len(students)} students found")
        
        print("\n🎉 Example completed successfully!")
        print("\n📋 Next steps:")
        print("1. Set up your Supabase project and copy credentials to .env file")
        print("2. Run the SQL commands to create database tables")
        print("3. Start enrolling students and marking attendance")
        
    except Exception as e:
        logger.error(f"❌ Example failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())