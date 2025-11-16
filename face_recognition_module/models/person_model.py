"""
Data Models for Campus Face Recognition System
Compatible with SQLAlchemy and other ORMs
"""

from typing import Optional, List
from dataclasses import dataclass
import numpy as np

@dataclass
class PersonModel:
    """
    Data model for person in campus management system
    Can be easily integrated with your existing database models
    """
    id: int
    name: str
    student_id: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None  # 'student', 'faculty', 'staff'
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Face recognition specific fields
    face_embedding: Optional[bytes] = None  # Pickled numpy array
    training_images_count: int = 0
    last_trained: Optional[str] = None
    recognition_enabled: bool = True
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'name': self.name,
            'student_id': self.student_id,
            'employee_id': self.employee_id,
            'department': self.department,
            'role': self.role,
            'email': self.email,
            'phone': self.phone,
            'training_images_count': self.training_images_count,
            'last_trained': self.last_trained,
            'recognition_enabled': self.recognition_enabled
        }
    
    @classmethod
    def from_dict(cls, data: dict):
        """Create PersonModel from dictionary"""
        return cls(**data)

@dataclass
class AttendanceRecord:
    """
    Attendance record model for campus management
    """
    id: Optional[int] = None
    person_id: int = None
    timestamp: str = None
    location: Optional[str] = None
    confidence: float = 0.0
    image_path: Optional[str] = None
    verified: bool = False
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'person_id': self.person_id,
            'timestamp': self.timestamp,
            'location': self.location,
            'confidence': self.confidence,
            'image_path': self.image_path,
            'verified': self.verified
        }

@dataclass
class RecognitionResult:
    """
    Face recognition result model
    """
    face_id: int
    person_id: Optional[int]
    person_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    detection_score: float
    timestamp: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            'face_id': self.face_id,
            'person_id': self.person_id,
            'person_name': self.person_name,
            'confidence': self.confidence,
            'bbox': self.bbox,
            'detection_score': self.detection_score,
            'timestamp': self.timestamp
        }

# For SQLAlchemy integration (example)
"""
from sqlalchemy import Column, Integer, String, LargeBinary, Boolean, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Person(Base):
    __tablename__ = "persons"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    student_id = Column(String, unique=True, nullable=True)
    employee_id = Column(String, unique=True, nullable=True)
    department = Column(String, nullable=True)
    role = Column(String, nullable=True)  # 'student', 'faculty', 'staff'
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Face recognition fields
    face_embedding = Column(LargeBinary, nullable=True)  # Pickled numpy array
    training_images_count = Column(Integer, default=0)
    last_trained = Column(DateTime, nullable=True)
    recognition_enabled = Column(Boolean, default=True)

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    confidence = Column(Float, nullable=False)
    image_path = Column(String, nullable=True)
    verified = Column(Boolean, default=False)
"""