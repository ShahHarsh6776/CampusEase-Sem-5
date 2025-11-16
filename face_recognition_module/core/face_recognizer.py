"""
Face Recognition Engine for Campus Management System
Handles face matching and identification
"""

import numpy as np
import pickle
import cv2
import uuid
import time
import logging
from typing import List, Dict, Optional, Tuple
from .face_encoder import FaceEncoder

logger = logging.getLogger(__name__)

class FaceRecognizer:
    """
    High-level face recognition system for campus management
    Handles training, recognition, and database operations
    """
    
    def __init__(self, similarity_threshold: float = 0.4):
        """
        Initialize Face Recognizer
        
        Args:
            similarity_threshold: Minimum similarity score for positive identification
        """
        self.encoder = FaceEncoder()
        self.similarity_threshold = similarity_threshold
        self.known_faces = []  # Will store {id, name, embedding} dicts
        
        logger.info(f"🎯 FaceRecognizer initialized - Threshold: {similarity_threshold}")
    
    def train_person(self, person_id: int, name: str, image_data_list: List) -> Dict:
        """
        Train the system to recognize a specific person
        
        Args:
            person_id: Unique identifier for the person
            name: Person's name
            image_data_list: List of image data (bytes or numpy arrays)
            
        Returns:
            Training result dictionary
        """
        start_time = time.time()
        embeddings = []
        
        logger.info(f"🎓 Training person: {name} (ID: {person_id}) with {len(image_data_list)} images")
        
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
                'message': f"No valid faces found for {name}",
                'person_id': person_id,
                'name': name,
                'images_processed': 0,
                'training_time_ms': 0
            }
            logger.error(f"❌ Training failed for {name}: No valid faces")
            return result
        
        # Average embeddings for robust representation
        avg_embedding = np.mean(embeddings, axis=0)
        
        # Store in memory (you can modify this to save to your campus database)
        person_data = {
            'id': person_id,
            'name': name,
            'embedding': avg_embedding,
            'training_images': len(embeddings)
        }
        
        # Update or add person
        existing_idx = None
        for i, known_person in enumerate(self.known_faces):
            if known_person['id'] == person_id:
                existing_idx = i
                break
        
        if existing_idx is not None:
            self.known_faces[existing_idx] = person_data
            action = "updated"
        else:
            self.known_faces.append(person_data)
            action = "added"
        
        training_time = (time.time() - start_time) * 1000
        
        result = {
            'success': True,
            'message': f"✅ {name} (ID={person_id}) {action} successfully!",
            'person_id': person_id,
            'name': name,
            'images_processed': len(embeddings),
            'training_time_ms': training_time,
            'action': action
        }
        
        logger.info(f"🎉 Training completed: {result['message']}")
        return result
    
    def recognize_faces(self, image_data, return_annotated_image: bool = True) -> Dict:
        """
        Recognize all faces in an image
        
        Args:
            image_data: Input image (bytes or numpy array)
            return_annotated_image: Whether to return annotated image
            
        Returns:
            Recognition results dictionary
        """
        start_time = time.time()
        
        if not self.known_faces:
            return {
                'success': False,
                'message': "No trained faces in database",
                'faces_detected': 0,
                'recognition_time_ms': 0
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
            return {
                'success': True,
                'message': "No faces detected in image",
                'faces_detected': 0,
                'recognition_time_ms': (time.time() - start_time) * 1000
            }
        
        # Prepare known embeddings matrix for vectorized computation
        known_embeddings = np.array([person['embedding'] for person in self.known_faces])
        known_names = [person['name'] for person in self.known_faces]
        known_ids = [person['id'] for person in self.known_faces]
        
        recognition_results = []
        
        for face_data in detected_faces:
            face_embedding = face_data['embedding']
            
            # Compute similarities with all known faces
            similarities = np.dot(known_embeddings, face_embedding)
            
            # Find best match
            best_idx = np.argmax(similarities)
            best_similarity = similarities[best_idx]
            
            # Apply threshold
            if best_similarity > self.similarity_threshold:
                identified_name = known_names[best_idx]
                identified_id = known_ids[best_idx]
                confidence = float(best_similarity)
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
                'detection_score': face_data['detection_score']
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
                
                cv2.putText(img, label, (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        recognition_time = (time.time() - start_time) * 1000
        
        result = {
            'success': True,
            'message': f"Processed {len(detected_faces)} faces",
            'faces_detected': len(detected_faces),
            'recognition_results': recognition_results,
            'recognition_time_ms': recognition_time
        }
        
        if return_annotated_image and img is not None:
            # Save annotated image
            output_filename = f"recognized_{uuid.uuid4().hex}.jpg"
            cv2.imwrite(output_filename, img)
            result['annotated_image_path'] = output_filename
        
        logger.info(f"🔍 Recognition completed: {len(detected_faces)} faces in {recognition_time:.2f}ms")
        return result
    
    def get_known_persons(self) -> List[Dict]:
        """Get list of all trained persons"""
        return [
            {
                'id': person['id'],
                'name': person['name'],
                'training_images': person['training_images']
            }
            for person in self.known_faces
        ]
    
    def remove_person(self, person_id: int) -> bool:
        """Remove a person from the recognition database"""
        for i, person in enumerate(self.known_faces):
            if person['id'] == person_id:
                removed_person = self.known_faces.pop(i)
                logger.info(f"🗑️ Removed person: {removed_person['name']} (ID: {person_id})")
                return True
        return False
    
    def save_database(self, filepath: str) -> bool:
        """Save the face database to file"""
        try:
            with open(filepath, 'wb') as f:
                pickle.dump(self.known_faces, f)
            logger.info(f"💾 Database saved to {filepath}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to save database: {e}")
            return False
    
    def load_database(self, filepath: str) -> bool:
        """Load face database from file"""
        try:
            with open(filepath, 'rb') as f:
                self.known_faces = pickle.load(f)
            logger.info(f"📂 Database loaded from {filepath} - {len(self.known_faces)} persons")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to load database: {e}")
            return False