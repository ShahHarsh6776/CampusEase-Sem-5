"""
Database manager for Supabase operations
Handles all database operations for face recognition system
"""

import logging
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from .supabase_client import SupabaseClient
from .models import PersonTable, AttendanceTable, TrainingImageTable, RecognitionLogTable, SystemConfigTable

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Database manager for face recognition system using Supabase
    """
    
    def __init__(self):
        """Initialize database manager"""
        self.client = SupabaseClient()
        self.supabase = self.client.get_client()
        logger.info("🗄️ Database Manager initialized")
    
    # ==================== PERSON OPERATIONS ====================
    
    async def create_person(self, person: PersonTable) -> Optional[PersonTable]:
        """
        Create a new person in database
        
        Args:
            person: PersonTable object
            
        Returns:
            Created person with ID or None if failed
        """
        try:
            data = person.to_dict()
            # Remove None values and id for creation
            data = {k: v for k, v in data.items() if v is not None and k != 'id'}
            
            result = self.supabase.table('persons').insert(data).execute()
            
            if result.data:
                created_person = PersonTable.from_dict(result.data[0])
                logger.info(f"✅ Person created: {created_person.name} (ID: {created_person.id})")
                return created_person
            else:
                logger.error(f"❌ Failed to create person: {person.name}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating person {person.name}: {str(e)}")
            return None
    
    async def get_person_by_id(self, person_id: int) -> Optional[PersonTable]:
        """
        Get person by ID
        
        Args:
            person_id: Person ID
            
        Returns:
            PersonTable object or None if not found
        """
        try:
            result = self.supabase.table('persons').select("*").eq('id', person_id).execute()
            
            if result.data:
                person = PersonTable.from_dict(result.data[0])
                logger.debug(f"✅ Person retrieved: {person.name} (ID: {person_id})")
                return person
            else:
                logger.warning(f"⚠️ Person not found: ID {person_id}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error retrieving person ID {person_id}: {str(e)}")
            return None
    
    async def get_person_by_student_id(self, student_id: str) -> Optional[PersonTable]:
        """
        Get person by student ID
        
        Args:
            student_id: Student ID
            
        Returns:
            PersonTable object or None if not found
        """
        try:
            result = self.supabase.table('persons').select("*").eq('student_id', student_id).execute()
            
            if result.data:
                person = PersonTable.from_dict(result.data[0])
                logger.debug(f"✅ Student retrieved: {person.name} (Student ID: {student_id})")
                return person
            else:
                logger.warning(f"⚠️ Student not found: ID {student_id}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error retrieving student ID {student_id}: {str(e)}")
            return None
    
    async def update_person(self, person: PersonTable) -> Optional[PersonTable]:
        """
        Update person in database
        
        Args:
            person: PersonTable object with ID
            
        Returns:
            Updated person or None if failed
        """
        try:
            if not person.id:
                logger.error("❌ Cannot update person without ID")
                return None
            
            # Set updated timestamp
            person.updated_at = datetime.now()
            data = person.to_dict()
            
            # Remove None values except for nullable fields
            data = {k: v for k, v in data.items() if k in ['id', 'name', 'updated_at'] or v is not None}
            
            result = self.supabase.table('persons').update(data).eq('id', person.id).execute()
            
            if result.data:
                updated_person = PersonTable.from_dict(result.data[0])
                logger.info(f"✅ Person updated: {updated_person.name} (ID: {person.id})")
                return updated_person
            else:
                logger.error(f"❌ Failed to update person: {person.name}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error updating person {person.name}: {str(e)}")
            return None
    
    async def get_all_persons(self, limit: int = 100) -> List[PersonTable]:
        """
        Get all persons with recognition enabled
        
        Args:
            limit: Maximum number of records to retrieve
            
        Returns:
            List of PersonTable objects
        """
        try:
            result = self.supabase.table('persons')\
                .select("*")\
                .eq('recognition_enabled', True)\
                .limit(limit)\
                .execute()
            
            persons = [PersonTable.from_dict(data) for data in result.data]
            logger.info(f"✅ Retrieved {len(persons)} persons from database")
            return persons
            
        except Exception as e:
            logger.error(f"❌ Error retrieving all persons: {str(e)}")
            return []
    
    async def delete_person(self, person_id: int) -> bool:
        """
        Delete person from database (also deletes related records due to CASCADE)
        
        Args:
            person_id: Person ID
            
        Returns:
            True if successful
        """
        try:
            result = self.supabase.table('persons').delete().eq('id', person_id).execute()
            
            if result.data:
                logger.info(f"✅ Person deleted: ID {person_id}")
                return True
            else:
                logger.error(f"❌ Failed to delete person: ID {person_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error deleting person ID {person_id}: {str(e)}")
            return False
    
    # ==================== ATTENDANCE OPERATIONS ====================
    
    async def create_attendance_record(self, attendance: AttendanceTable) -> Optional[AttendanceTable]:
        """
        Create attendance record
        
        Args:
            attendance: AttendanceTable object
            
        Returns:
            Created attendance record or None if failed
        """
        try:
            data = attendance.to_dict()
            data = {k: v for k, v in data.items() if v is not None and k != 'id'}
            
            result = self.supabase.table('attendance_records').insert(data).execute()
            
            if result.data:
                created_attendance = AttendanceTable.from_dict(result.data[0])
                logger.info(f"✅ Attendance recorded: Person ID {attendance.person_id} at {attendance.location}")
                return created_attendance
            else:
                logger.error(f"❌ Failed to create attendance record for person {attendance.person_id}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating attendance record: {str(e)}")
            return None
    
    async def get_attendance_by_person(self, person_id: int, limit: int = 50) -> List[AttendanceTable]:
        """
        Get attendance records for a specific person
        
        Args:
            person_id: Person ID
            limit: Maximum records to retrieve
            
        Returns:
            List of AttendanceTable objects
        """
        try:
            result = self.supabase.table('attendance_records')\
                .select("*")\
                .eq('person_id', person_id)\
                .order('timestamp', desc=True)\
                .limit(limit)\
                .execute()
            
            records = [AttendanceTable.from_dict(data) for data in result.data]
            logger.info(f"✅ Retrieved {len(records)} attendance records for person {person_id}")
            return records
            
        except Exception as e:
            logger.error(f"❌ Error retrieving attendance for person {person_id}: {str(e)}")
            return []
    
    # ==================== TRAINING IMAGE OPERATIONS ====================
    
    async def create_training_image(self, training_image: TrainingImageTable) -> Optional[TrainingImageTable]:
        """
        Create training image record
        
        Args:
            training_image: TrainingImageTable object
            
        Returns:
            Created training image record or None if failed
        """
        try:
            data = training_image.to_dict()
            data = {k: v for k, v in data.items() if v is not None and k != 'id'}
            
            result = self.supabase.table('training_images').insert(data).execute()
            
            if result.data:
                created_image = TrainingImageTable.from_dict(result.data[0])
                logger.info(f"✅ Training image recorded for person {training_image.person_id}")
                return created_image
            else:
                logger.error(f"❌ Failed to create training image record")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating training image: {str(e)}")
            return None
    
    async def get_training_images_by_person(self, person_id: int) -> List[TrainingImageTable]:
        """
        Get training images for a specific person
        
        Args:
            person_id: Person ID
            
        Returns:
            List of TrainingImageTable objects
        """
        try:
            result = self.supabase.table('training_images')\
                .select("*")\
                .eq('person_id', person_id)\
                .execute()
            
            images = [TrainingImageTable.from_dict(data) for data in result.data]
            logger.info(f"✅ Retrieved {len(images)} training images for person {person_id}")
            return images
            
        except Exception as e:
            logger.error(f"❌ Error retrieving training images for person {person_id}: {str(e)}")
            return []
    
    # ==================== RECOGNITION LOG OPERATIONS ====================
    
    async def create_recognition_log(self, log: RecognitionLogTable) -> Optional[RecognitionLogTable]:
        """
        Create recognition log entry
        
        Args:
            log: RecognitionLogTable object
            
        Returns:
            Created log entry or None if failed
        """
        try:
            data = log.to_dict()
            data = {k: v for k, v in data.items() if v is not None and k != 'id'}
            
            result = self.supabase.table('recognition_logs').insert(data).execute()
            
            if result.data:
                created_log = RecognitionLogTable.from_dict(result.data[0])
                logger.debug(f"✅ Recognition log created: {log.successful_recognitions} successful")
                return created_log
            else:
                logger.error(f"❌ Failed to create recognition log")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating recognition log: {str(e)}")
            return None
    
    # ==================== UTILITY OPERATIONS ====================
    
    async def test_connection(self) -> bool:
        """
        Test database connection
        
        Returns:
            True if connection successful
        """
        return await self.client.test_connection()
    
    async def get_database_stats(self) -> Dict[str, int]:
        """
        Get database statistics
        
        Returns:
            Dictionary with table counts
        """
        try:
            stats = {}
            
            # Count persons
            persons_result = self.supabase.table('persons').select("id", count="exact").execute()
            stats['total_persons'] = persons_result.count if persons_result.count else 0
            
            # Count enabled persons
            enabled_result = self.supabase.table('persons')\
                .select("id", count="exact")\
                .eq('recognition_enabled', True)\
                .execute()
            stats['enabled_persons'] = enabled_result.count if enabled_result.count else 0
            
            # Count attendance records
            attendance_result = self.supabase.table('attendance_records').select("id", count="exact").execute()
            stats['total_attendance_records'] = attendance_result.count if attendance_result.count else 0
            
            # Count training images
            images_result = self.supabase.table('training_images').select("id", count="exact").execute()
            stats['total_training_images'] = images_result.count if images_result.count else 0
            
            logger.info(f"✅ Database stats retrieved: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error retrieving database stats: {str(e)}")
            return {}
    
    async def search_persons(self, query: str, limit: int = 20) -> List[PersonTable]:
        """
        Search persons by name, student_id, or employee_id
        
        Args:
            query: Search query
            limit: Maximum results
            
        Returns:
            List of matching PersonTable objects
        """
        try:
            # Search by name (case insensitive)
            result = self.supabase.table('persons')\
                .select("*")\
                .ilike('name', f'%{query}%')\
                .limit(limit)\
                .execute()
            
            persons = [PersonTable.from_dict(data) for data in result.data]
            
            # Also search by student_id and employee_id if no name matches
            if not persons:
                student_result = self.supabase.table('persons')\
                    .select("*")\
                    .ilike('student_id', f'%{query}%')\
                    .limit(limit)\
                    .execute()
                
                persons.extend([PersonTable.from_dict(data) for data in student_result.data])
                
                employee_result = self.supabase.table('persons')\
                    .select("*")\
                    .ilike('employee_id', f'%{query}%')\
                    .limit(limit)\
                    .execute()
                
                persons.extend([PersonTable.from_dict(data) for data in employee_result.data])
            
            logger.info(f"✅ Search '{query}' found {len(persons)} results")
            return persons
            
        except Exception as e:
            logger.error(f"❌ Error searching persons with query '{query}': {str(e)}")
            return []