"""
Campus Management System Integration Example
Shows how to integrate the face recognition module with your existing system
"""

from face_recognition_module import FaceRecognizer, PersonModel, ImageProcessor, GPUMonitor
import asyncio
import logging
from typing import List, Dict
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CampusAttendanceSystem:
    """
    Example integration with campus management system
    """
    
    def __init__(self, similarity_threshold: float = 0.5):
        """Initialize campus attendance system"""
        self.face_recognizer = FaceRecognizer(similarity_threshold)
        self.gpu_monitor = GPUMonitor()
        self.image_processor = ImageProcessor()
        
        # Check GPU status
        gpu_status = self.gpu_monitor.get_gpu_status()
        logger.info(f"🚀 GPU Status: {gpu_status}")
        
        logger.info("🏫 Campus Attendance System initialized")
    
    async def enroll_student(self, student_data: Dict, image_files: List[bytes]) -> Dict:
        """
        Enroll a new student in the face recognition system
        
        Args:
            student_data: Student information (id, name, department, etc.)
            image_files: List of face images for training
            
        Returns:
            Enrollment result
        """
        try:
            # Create person model
            person = PersonModel(
                id=student_data['id'],
                name=student_data['name'],
                student_id=student_data.get('student_id'),
                department=student_data.get('department'),
                role='student',
                email=student_data.get('email')
            )
            
            # Process and validate images
            processed_images = []
            for img_bytes in image_files:
                if self.image_processor.validate_image(img_bytes):
                    # Convert to numpy array and enhance
                    img = self.image_processor.bytes_to_image(img_bytes)
                    if img is not None:
                        enhanced_img = self.image_processor.enhance_image(img)
                        processed_images.append(enhanced_img)
            
            if not processed_images:
                return {
                    'success': False,
                    'message': 'No valid images provided for enrollment'
                }
            
            # Train face recognition
            training_result = self.face_recognizer.train_person(
                person_id=person.id,
                name=person.name,
                image_data_list=processed_images
            )
            
            if training_result['success']:
                # Here you would save person data to your campus database
                # await self.save_student_to_database(person)
                logger.info(f"✅ Student enrolled: {person.name}")
            
            return training_result
            
        except Exception as e:
            logger.error(f"❌ Enrollment error: {e}")
            return {
                'success': False,
                'message': f'Enrollment failed: {str(e)}'
            }
    
    async def enroll_faculty(self, faculty_data: Dict, image_files: List[bytes]) -> Dict:
        """
        Enroll faculty member
        """
        try:
            person = PersonModel(
                id=faculty_data['id'],
                name=faculty_data['name'],
                employee_id=faculty_data.get('employee_id'),
                department=faculty_data.get('department'),
                role='faculty',
                email=faculty_data.get('email')
            )
            
            # Process images and train
            processed_images = []
            for img_bytes in image_files:
                img = self.image_processor.bytes_to_image(img_bytes)
                if img is not None:
                    enhanced_img = self.image_processor.enhance_image(img)
                    processed_images.append(enhanced_img)
            
            training_result = self.face_recognizer.train_person(
                person_id=person.id,
                name=person.name,
                image_data_list=processed_images
            )
            
            return training_result
            
        except Exception as e:
            logger.error(f"❌ Faculty enrollment error: {e}")
            return {'success': False, 'message': str(e)}
    
    async def mark_attendance(self, camera_image: bytes, location: str = "Main Gate") -> Dict:
        """
        Process camera image for attendance marking
        
        Args:
            camera_image: Image from camera/upload
            location: Location where photo was taken
            
        Returns:
            Attendance marking result
        """
        try:
            # Enhance image for better recognition
            img = self.image_processor.bytes_to_image(camera_image)
            if img is None:
                return {
                    'success': False,
                    'message': 'Invalid image data'
                }
            
            enhanced_img = self.image_processor.enhance_image(img)
            
            # Perform face recognition
            recognition_result = self.face_recognizer.recognize_faces(
                enhanced_img, 
                return_annotated_image=True
            )
            
            if not recognition_result['success']:
                return recognition_result
            
            # Process recognition results
            attendance_records = []
            for face_result in recognition_result['recognition_results']:
                if face_result['person_id'] is not None:
                    # Create attendance record
                    record = {
                        'person_id': face_result['person_id'],
                        'person_name': face_result['person_name'],
                        'timestamp': None,  # Add current timestamp
                        'location': location,
                        'confidence': face_result['confidence'],
                        'image_path': recognition_result.get('annotated_image_path'),
                        'verified': face_result['confidence'] > 0.7
                    }
                    attendance_records.append(record)
                    
                    # Here you would save to your attendance database
                    # await self.save_attendance_record(record)
            
            result = {
                'success': True,
                'message': f'Attendance marked for {len(attendance_records)} person(s)',
                'attendance_records': attendance_records,
                'total_faces_detected': recognition_result['faces_detected'],
                'annotated_image': recognition_result.get('annotated_image_path'),
                'processing_time_ms': recognition_result['recognition_time_ms']
            }
            
            logger.info(f"📍 Attendance marked: {len(attendance_records)} records at {location}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Attendance marking error: {e}")
            return {
                'success': False,
                'message': f'Attendance marking failed: {str(e)}'
            }
    
    async def get_attendance_report(self, date: str = None) -> Dict:
        """
        Generate attendance report for a specific date
        
        Args:
            date: Date for report (YYYY-MM-DD format)
            
        Returns:
            Attendance report
        """
        # Here you would query your attendance database
        # This is a placeholder implementation
        
        known_persons = self.face_recognizer.get_known_persons()
        
        return {
            'success': True,
            'date': date or 'today',
            'total_enrolled': len(known_persons),
            'enrolled_persons': known_persons,
            'attendance_summary': {
                'present': 0,
                'absent': len(known_persons),
                'late': 0
            }
        }
    
    def get_system_status(self) -> Dict:
        """Get current system status"""
        gpu_status = self.gpu_monitor.get_gpu_status()
        known_persons = self.face_recognizer.get_known_persons()
        
        return {
            'gpu_status': gpu_status,
            'enrolled_persons': len(known_persons),
            'system_ready': gpu_status.get('gpu_available', False),
            'memory_usage': gpu_status.get('memory_used_mb', 0),
            'temperature': gpu_status.get('temperature_c', 0)
        }

# Example usage functions
async def example_student_enrollment():
    """Example: How to enroll a student"""
    system = CampusAttendanceSystem()
    
    # Sample student data
    student_data = {
        'id': 1001,
        'name': 'John Doe',
        'student_id': 'CS21001',
        'department': 'Computer Science',
        'email': 'john.doe@university.edu'
    }
    
    # In real implementation, these would be actual image files
    image_files = []  # List of image bytes
    
    result = await system.enroll_student(student_data, image_files)
    print(f"Enrollment result: {result}")

async def example_attendance_marking():
    """Example: How to mark attendance"""
    system = CampusAttendanceSystem()
    
    # In real implementation, this would be from camera
    camera_image = b''  # Image bytes from camera
    
    result = await system.mark_attendance(camera_image, location="Classroom A")
    print(f"Attendance result: {result}")

if __name__ == "__main__":
    # Test the system
    system = CampusAttendanceSystem()
    status = system.get_system_status()
    print(f"System Status: {status}")