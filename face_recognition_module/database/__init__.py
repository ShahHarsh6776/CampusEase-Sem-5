"""
Database package for face recognition module
"""

from .supabase_client import SupabaseClient
from .models import PersonTable, AttendanceTable, TrainingImageTable, RecognitionLogTable
from .database_manager import DatabaseManager

__all__ = [
    'SupabaseClient',
    'PersonTable', 
    'AttendanceTable',
    'TrainingImageTable',
    'RecognitionLogTable',
    'DatabaseManager'
]