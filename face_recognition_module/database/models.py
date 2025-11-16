"""
Database models for Supabase integration
"""

import json
import base64
import numpy as np
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class PersonTable:
    """
    Person table model for Supabase
    """
    name: str
    student_id: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None  # 'student', 'faculty', 'staff', 'visitor'
    email: Optional[str] = None
    phone: Optional[str] = None
    face_embedding: Optional[str] = None  # Base64 encoded numpy array
    training_images_count: int = 0
    last_trained: Optional[datetime] = None
    recognition_enabled: bool = True
    is_active: bool = True
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def set_face_embedding(self, embedding: np.ndarray) -> None:
        """
        Convert numpy array to base64 string for storage
        
        Args:
            embedding: Face embedding as numpy array
        """
        if embedding is not None:
            # Convert to bytes, then to base64 string
            embedding_bytes = embedding.tobytes()
            self.face_embedding = base64.b64encode(embedding_bytes).decode('utf-8')
    
    def get_face_embedding(self) -> Optional[np.ndarray]:
        """
        Convert base64 string back to numpy array
        
        Returns:
            Face embedding as numpy array or None
        """
        if self.face_embedding:
            try:
                # Decode base64 to bytes, then to numpy array
                embedding_bytes = base64.b64decode(self.face_embedding.encode('utf-8'))
                # Assuming 512-dimensional embeddings (typical for ArcFace)
                embedding = np.frombuffer(embedding_bytes, dtype=np.float32)
                return embedding
            except Exception as e:
                logger.error(f"❌ Error decoding face embedding: {str(e)}")
                return None
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        data = asdict(self)
        # Convert datetime objects to ISO format strings
        if self.last_trained:
            data['last_trained'] = self.last_trained.isoformat()
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PersonTable':
        """Create PersonTable from dictionary"""
        # Convert ISO format strings back to datetime objects
        if 'last_trained' in data and data['last_trained']:
            data['last_trained'] = datetime.fromisoformat(data['last_trained'].replace('Z', '+00:00'))
        if 'created_at' in data and data['created_at']:
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        if 'updated_at' in data and data['updated_at']:
            data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
        
        return cls(**data)

@dataclass
class AttendanceTable:
    """
    Attendance record table model for Supabase
    """
    person_id: int
    timestamp: datetime
    location: Optional[str] = None
    confidence: float = 0.0
    image_path: Optional[str] = None
    verified: bool = False
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        data = asdict(self)
        # Convert datetime objects to ISO format strings
        if self.timestamp:
            data['timestamp'] = self.timestamp.isoformat()
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AttendanceTable':
        """Create AttendanceTable from dictionary"""
        # Convert ISO format strings back to datetime objects
        if 'timestamp' in data and data['timestamp']:
            data['timestamp'] = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
        if 'created_at' in data and data['created_at']:
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        
        return cls(**data)

@dataclass
class TrainingImageTable:
    """
    Training image table model for Supabase
    """
    person_id: int
    image_path: Optional[str] = None
    image_data: Optional[str] = None  # Base64 encoded image (optional)
    quality_score: Optional[float] = None
    face_bbox: Optional[str] = None  # JSON string for bounding box coordinates
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    
    def set_face_bbox(self, bbox: List[float]) -> None:
        """
        Convert bounding box coordinates to JSON string
        
        Args:
            bbox: Bounding box as [x1, y1, x2, y2]
        """
        if bbox:
            self.face_bbox = json.dumps(bbox)
    
    def get_face_bbox(self) -> Optional[List[float]]:
        """
        Convert JSON string back to bounding box coordinates
        
        Returns:
            Bounding box as [x1, y1, x2, y2] or None
        """
        if self.face_bbox:
            try:
                return json.loads(self.face_bbox)
            except Exception as e:
                logger.error(f"❌ Error decoding face bbox: {str(e)}")
                return None
        return None
    
    def set_image_data(self, image_bytes: bytes) -> None:
        """
        Convert image bytes to base64 string for storage
        
        Args:
            image_bytes: Image as bytes
        """
        if image_bytes:
            self.image_data = base64.b64encode(image_bytes).decode('utf-8')
    
    def get_image_data(self) -> Optional[bytes]:
        """
        Convert base64 string back to image bytes
        
        Returns:
            Image as bytes or None
        """
        if self.image_data:
            try:
                return base64.b64decode(self.image_data.encode('utf-8'))
            except Exception as e:
                logger.error(f"❌ Error decoding image data: {str(e)}")
                return None
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        data = asdict(self)
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TrainingImageTable':
        """Create TrainingImageTable from dictionary"""
        if 'created_at' in data and data['created_at']:
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        
        return cls(**data)

@dataclass
class RecognitionLogTable:
    """
    Recognition log table model for Supabase
    """
    timestamp: datetime
    total_faces_detected: int = 0
    successful_recognitions: int = 0
    failed_recognitions: int = 0
    processing_time_ms: Optional[float] = None
    location: Optional[str] = None
    session_id: Optional[str] = None
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        data = asdict(self)
        if self.timestamp:
            data['timestamp'] = self.timestamp.isoformat()
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RecognitionLogTable':
        """Create RecognitionLogTable from dictionary"""
        if 'timestamp' in data and data['timestamp']:
            data['timestamp'] = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
        if 'created_at' in data and data['created_at']:
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        
        return cls(**data)

@dataclass
class SystemConfigTable:
    """
    System configuration table model for Supabase
    """
    config_key: str
    config_value: Optional[str] = None
    description: Optional[str] = None
    id: Optional[int] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database operations"""
        data = asdict(self)
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SystemConfigTable':
        """Create SystemConfigTable from dictionary"""
        if 'updated_at' in data and data['updated_at']:
            data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
        
        return cls(**data)