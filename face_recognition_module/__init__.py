# Face Recognition Module for Campus Management System with Supabase Integration
# Version: 1.1.0
# GPU-Accelerated Multi-Face Recognition System with Database Integration

from .core.face_encoder import FaceEncoder
from .core.face_recognizer import FaceRecognizer
from .core.face_recognizer_supabase import FaceRecognizerWithSupabase
from .models.person_model import PersonModel
from .utils.image_processor import ImageProcessor
from .utils.gpu_monitor import GPUMonitor

# Database integration
from .database import (
    DatabaseManager, 
    SupabaseClient,
    PersonTable,
    AttendanceTable,
    TrainingImageTable,
    RecognitionLogTable
)

__version__ = "1.1.0"
__author__ = "Campus Management System"

# Main exports
__all__ = [
    # Core components
    'FaceEncoder',
    'FaceRecognizer',           # Original in-memory recognizer
    'FaceRecognizerWithSupabase',  # New Supabase-integrated recognizer
    'PersonModel',
    'ImageProcessor',
    'GPUMonitor',
    
    # Database components  
    'DatabaseManager',
    'SupabaseClient',
    'PersonTable',
    'AttendanceTable',
    'TrainingImageTable',
    'RecognitionLogTable'
]