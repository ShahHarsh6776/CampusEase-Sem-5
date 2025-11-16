"""
Face Recognition Engine with Supabase Integration
Handles face matching, identification, and database operations
"""

import numpy as np
import cv2
import uuid
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from .face_encoder import FaceEncoder
from ..database import DatabaseManager, PersonTable, AttendanceTable, RecognitionLogTable

logger = logging.getLogger(__name__)

class FaceRecognizerWithSupabase:
    """
    Advanced face recognition system with Supabase database integration
    Replaces the simple in-memory storage with persistent database storage
    """
    
    def __init__(self, similarity_threshold: float = 0.4):
        """
        Initialize Face Recognizer with Supabase
        
        Args:
            similarity_threshold: Minimum similarity score for positive identification
        """
        self.encoder = FaceEncoder()
        self.similarity_threshold = similarity_threshold
        self.db_manager = DatabaseManager()
        
        # Cache for frequently accessed data
        self._person_cache = {}
        self._cache_timestamp = None
        self._cache_duration = 300  # 5 minutes
        
        logger.info(f"🎯 FaceRecognizerWithSupabase initialized - Threshold: {similarity_threshold}")
    
    async def initialize_database(self) -> bool:
        """
        Initialize and test database connection
        
        Returns:
            bool: True if database is ready
        """
        try:
            connection_ok = await self.db_manager.test_connection()
            if connection_ok:
                # Load persons into cache
                await self._refresh_person_cache()
                logger.info("✅ Database connection established and cache loaded")
                return True
            else:
                logger.error("❌ Database connection failed")
                return False
        except Exception as e:
            logger.error(f"❌ Database initialization error: {str(e)}")
            return False
    
    async def _refresh_person_cache(self) -> None:
        """
        Refresh the person cache from database
        """
        try:
            persons = await self.db_manager.get_all_persons()
            self._person_cache = {}
            
            for person in persons:
                if person.face_embedding:
                    embedding = person.get_face_embedding()
                    if embedding is not None:
                        self._person_cache[person.id] = {
                            'id': person.id,
                            'name': person.name,
                            'embedding': embedding,
                            'student_id': person.student_id,
                            'employee_id': person.employee_id,
                            'department': person.department,
                            'role': person.role
                        }
            
            self._cache_timestamp = time.time()
            logger.info(f"🔄 Person cache refreshed: {len(self._person_cache)} persons loaded")
            
        except Exception as e:
            logger.error(f"❌ Error refreshing person cache: {str(e)}")
    
    async def _check_cache_validity(self) -> None:
        """
        Check if cache needs refresh
        """
        if (not self._cache_timestamp or 
            time.time() - self._cache_timestamp > self._cache_duration):
            await self._refresh_person_cache()
    
    async def train_person(self, person_data: Dict, image_data_list: List) -> Dict:
        """
        Train the system to recognize a specific person and save to Supabase
        
        Args:
            person_data: Dictionary with person information (name, student_id, etc.)
            image_data_list: List of image data (bytes or numpy arrays)
            
        Returns:
            Training result dictionary
        """
        start_time = time.time()
        embeddings = []
        person_name = person_data.get('name', 'Unknown')
        
        logger.info(f"🎓 Training person: {person_name} with {len(image_data_list)} images")
        
        # Process images and extract embeddings
        for i, image_data in enumerate(image_data_list):
            embedding = self.encoder.encode_image(image_data)
            if embedding is not None:
                embeddings.append(embedding)
                logger.debug(f"✅ Processed image {i+1}/{len(image_data_list)}")
            else:
                logger.warning(f"⚠️ Failed to process image {i+1}/{len(image_data_list)}")
        
        if not embeddings:
            result = {
                'success': False,
                'message': f"No valid faces found for {person_name}",
                'person_id': None,
                'name': person_name,
                'images_processed': 0,
                'training_time_ms': 0
            }
            logger.error(f"❌ Training failed for {person_name}: No valid faces")
            return result
        
        try:
            # Average embeddings for robust representation
            avg_embedding = np.mean(embeddings, axis=0)
            
            # Create or update person in database
            person = PersonTable(
                name=person_data['name'],
                student_id=person_data.get('student_id'),
                employee_id=person_data.get('employee_id'),
                department=person_data.get('department'),
                role=person_data.get('role', 'student'),
                email=person_data.get('email'),
                phone=person_data.get('phone'),
                training_images_count=len(embeddings),
                last_trained=datetime.now(),
                recognition_enabled=True
            )
            
            # Set face embedding
            person.set_face_embedding(avg_embedding)
            
            # Check if person already exists (by student_id or employee_id)
            existing_person = None
            if person.student_id:
                existing_person = await self.db_manager.get_person_by_student_id(person.student_id)
            
            if existing_person:
                # Update existing person
                person.id = existing_person.id
                saved_person = await self.db_manager.update_person(person)
                action = "updated"
            else:
                # Create new person
                saved_person = await self.db_manager.create_person(person)
                action = "created"
            
            if not saved_person:
                raise Exception("Failed to save person to database")
            
            # Refresh cache to include new/updated person
            await self._refresh_person_cache()
            
            training_time = (time.time() - start_time) * 1000
            
            result = {
                'success': True,
                'message': f"✅ {person_name} (ID={saved_person.id}) {action} successfully!",
                'person_id': saved_person.id,
                'name': person_name,
                'images_processed': len(embeddings),
                'training_time_ms': training_time,
                'action': action,
                'database_id': saved_person.id
            }
            
            logger.info(f"🎉 Training completed: {result['message']}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error saving person to database: {str(e)}")
            return {
                'success': False,
                'message': f"Training successful but database save failed: {str(e)}",
                'person_id': None,
                'name': person_name,
                'images_processed': len(embeddings),
                'training_time_ms': (time.time() - start_time) * 1000
            }
    
    async def recognize_faces(self, image_data, location: str = None, 
                            save_attendance: bool = False, 
                            return_annotated_image: bool = True) -> Dict:
        """
        Recognize all faces in an image with database integration
        
        Args:
            image_data: Input image (bytes or numpy array)
            location: Location where recognition is happening
            save_attendance: Whether to save attendance records
            return_annotated_image: Whether to return annotated image
            
        Returns:
            Recognition results dictionary
        """
        start_time = time.time()
        session_id = str(uuid.uuid4())
        
        # Ensure cache is valid
        await self._check_cache_validity()
        
        if not self._person_cache:
            return {
                'success': False,
                'message': "No trained faces in database",
                'faces_detected': 0,
                'recognition_time_ms': 0,
                'session_id': session_id
            }
        
        # Decode image for annotation if needed
        if isinstance(image_data, bytes):
            npimg = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        else:
            img = image_data.copy()
        
        # Get all faces in the image
        detected_faces = self.encoder.encode_multiple_faces(image_data)
        
        if not detected_faces:
            # Log recognition attempt
            await self._log_recognition(
                session_id=session_id,
                total_faces=0,
                successful=0,
                failed=0,
                processing_time=(time.time() - start_time) * 1000,
                location=location
            )
            
            return {
                'success': True,
                'message': "No faces detected in image",
                'faces_detected': 0,
                'recognition_time_ms': (time.time() - start_time) * 1000,
                'session_id': session_id
            }
        
        # Prepare known embeddings for vectorized computation
        known_persons = list(self._person_cache.values())
        known_embeddings = np.array([person['embedding'] for person in known_persons])
        
        recognition_results = []
        successful_recognitions = 0
        
        for face_data in detected_faces:
            face_embedding = face_data['embedding']
            
            # Compute similarities with all known faces
            similarities = np.dot(known_embeddings, face_embedding)
            
            # Find best match
            best_idx = np.argmax(similarities)
            best_similarity = similarities[best_idx]
            
            # Apply threshold
            if best_similarity > self.similarity_threshold:
                identified_person = known_persons[best_idx]
                identified_name = identified_person['name']
                identified_id = identified_person['id']
                confidence = float(best_similarity)
                successful_recognitions += 1
                
                # Save attendance if requested
                if save_attendance:
                    await self._save_attendance_record(
                        person_id=identified_id,
                        location=location,
                        confidence=confidence
                    )
            else:
                identified_name = "Unknown"
                identified_id = None
                confidence = 0.0
            
            result = {
                'face_id': face_data['face_id'],
                'person_name': identified_name,
                'person_id': identified_id,
                'confidence': confidence,
                'bbox': face_data['bbox'],
                'detection_score': face_data['detection_score'],
                'student_id': identified_person.get('student_id') if identified_id else None,
                'employee_id': identified_person.get('employee_id') if identified_id else None,
                'department': identified_person.get('department') if identified_id else None,
                'role': identified_person.get('role') if identified_id else None
            }
            recognition_results.append(result)
            
            # Annotate image if requested
            if return_annotated_image and img is not None:
                x1, y1, x2, y2 = map(int, face_data['bbox'])
                color = (0, 255, 0) if identified_name != "Unknown" else (0, 0, 255)
                
                # Draw bounding box
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
                
                # Add label with confidence
                label = f"{identified_name}"
                if confidence > 0:
                    label += f" ({confidence:.2f})"
                
                # Add background for text
                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                cv2.rectangle(img, (x1, y1 - label_size[1] - 10), 
                            (x1 + label_size[0], y1), color, -1)
                cv2.putText(img, label, (x1, y1 - 5), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        processing_time = (time.time() - start_time) * 1000
        failed_recognitions = len(detected_faces) - successful_recognitions
        
        # Log recognition session
        await self._log_recognition(
            session_id=session_id,
            total_faces=len(detected_faces),
            successful=successful_recognitions,
            failed=failed_recognitions,
            processing_time=processing_time,
            location=location
        )
        
        result = {
            'success': True,
            'message': f"Recognized {successful_recognitions}/{len(detected_faces)} faces",
            'faces_detected': len(detected_faces),
            'successful_recognitions': successful_recognitions,
            'recognition_results': recognition_results,
            'recognition_time_ms': processing_time,
            'session_id': session_id
        }
        
        if return_annotated_image and img is not None:
            # Encode annotated image back to bytes
            _, encoded_img = cv2.imencode('.jpg', img)
            result['annotated_image'] = encoded_img.tobytes()
        
        logger.info(f"🔍 Recognition completed: {result['message']} in {processing_time:.1f}ms")
        return result
    
    async def _save_attendance_record(self, person_id: int, location: str, confidence: float) -> None:
        """
        Save attendance record to database
        
        Args:
            person_id: Person ID
            location: Location name
            confidence: Recognition confidence
        """
        try:
            attendance = AttendanceTable(
                person_id=person_id,
                timestamp=datetime.now(),
                location=location,
                confidence=confidence,
                verified=False  # Can be manually verified later
            )
            
            saved_attendance = await self.db_manager.create_attendance_record(attendance)
            if saved_attendance:
                logger.info(f"📝 Attendance saved: Person {person_id} at {location}")
            
        except Exception as e:
            logger.error(f"❌ Error saving attendance: {str(e)}")
    
    async def _log_recognition(self, session_id: str, total_faces: int, 
                             successful: int, failed: int, processing_time: float,
                             location: str = None) -> None:
        """
        Log recognition session to database
        
        Args:
            session_id: Unique session identifier
            total_faces: Total faces detected
            successful: Successful recognitions
            failed: Failed recognitions
            processing_time: Processing time in milliseconds
            location: Location name
        """
        try:
            log_entry = RecognitionLogTable(
                timestamp=datetime.now(),
                total_faces_detected=total_faces,
                successful_recognitions=successful,
                failed_recognitions=failed,
                processing_time_ms=processing_time,
                location=location,
                session_id=session_id
            )
            
            await self.db_manager.create_recognition_log(log_entry)
            
        except Exception as e:
            logger.error(f"❌ Error logging recognition session: {str(e)}")
    
    async def get_person_by_id(self, person_id: int) -> Optional[Dict]:
        """
        Get person information by ID
        
        Args:
            person_id: Person ID
            
        Returns:
            Person information dictionary or None
        """
        try:
            person = await self.db_manager.get_person_by_id(person_id)
            if person:
                return person.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting person {person_id}: {str(e)}")
            return None
    
    async def get_attendance_history(self, person_id: int, limit: int = 50) -> List[Dict]:
        """
        Get attendance history for a person
        
        Args:
            person_id: Person ID
            limit: Maximum records to return
            
        Returns:
            List of attendance records
        """
        try:
            records = await self.db_manager.get_attendance_by_person(person_id, limit)
            return [record.to_dict() for record in records]
            
        except Exception as e:
            logger.error(f"❌ Error getting attendance history: {str(e)}")
            return []
    
    async def search_persons(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Search for persons in database
        
        Args:
            query: Search query (name, student_id, employee_id)
            limit: Maximum results
            
        Returns:
            List of matching persons
        """
        try:
            persons = await self.db_manager.search_persons(query, limit)
            return [person.to_dict() for person in persons]
            
        except Exception as e:
            logger.error(f"❌ Error searching persons: {str(e)}")
            return []
    
    async def delete_person(self, person_id: int) -> bool:
        """
        Delete a person from the system
        
        Args:
            person_id: Person ID to delete
            
        Returns:
            bool: True if successful
        """
        try:
            success = await self.db_manager.delete_person(person_id)
            if success:
                # Refresh cache to remove deleted person
                await self._refresh_person_cache()
                logger.info(f"🗑️ Person {person_id} deleted successfully")
            return success
            
        except Exception as e:
            logger.error(f"❌ Error deleting person {person_id}: {str(e)}")
            return False
    
    async def get_system_stats(self) -> Dict:
        """
        Get system statistics
        
        Returns:
            Dictionary with system statistics
        """
        try:
            db_stats = await self.db_manager.get_database_stats()
            
            stats = {
                'database_stats': db_stats,
                'cache_stats': {
                    'cached_persons': len(self._person_cache),
                    'cache_age_seconds': time.time() - self._cache_timestamp if self._cache_timestamp else 0
                },
                'recognition_config': {
                    'similarity_threshold': self.similarity_threshold,
                    'cache_duration_seconds': self._cache_duration
                }
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error getting system stats: {str(e)}")
            return {}