"""
Migration utility to transfer data from SQLite embeddings.db to Supabase
This script will help you migrate your existing face recognition data
"""

import asyncio
import pickle
import sqlite3
import numpy as np
import logging
import base64
from datetime import datetime
from typing import List, Dict, Optional
import sys
import os

# Add the face_recognition_module to the path
sys.path.append('face_recognition_module')

from face_recognition_module.database import DatabaseManager, PersonTable

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataMigrator:
    """
    Migrates data from SQLite embeddings.db to Supabase
    """
    
    def __init__(self, sqlite_db_path: str = "embeddings.db"):
        """
        Initialize migrator
        
        Args:
            sqlite_db_path: Path to SQLite database file
        """
        self.sqlite_db_path = sqlite_db_path
        self.db_manager = None
        
    async def initialize_supabase(self) -> bool:
        """
        Initialize Supabase connection
        
        Returns:
            bool: True if successful
        """
        try:
            self.db_manager = DatabaseManager()
            connection_ok = await self.db_manager.test_connection()
            if connection_ok:
                logger.info("✅ Supabase connection established")
                return True
            else:
                logger.error("❌ Failed to connect to Supabase")
                return False
        except Exception as e:
            logger.error(f"❌ Error initializing Supabase: {str(e)}")
            return False
    
    def extract_sqlite_data(self) -> List[Dict]:
        """
        Extract data from SQLite embeddings.db
        
        Returns:
            List of person records
        """
        if not os.path.exists(self.sqlite_db_path):
            logger.error(f"❌ SQLite database not found: {self.sqlite_db_path}")
            return []
        
        try:
            conn = sqlite3.connect(self.sqlite_db_path)
            cursor = conn.cursor()
            
            # Check if the persons table exists
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='persons'
            """)
            
            if not cursor.fetchone():
                logger.error("❌ 'persons' table not found in SQLite database")
                conn.close()
                return []
            
            # Get table schema to understand structure
            cursor.execute("PRAGMA table_info(persons)")
            columns = cursor.fetchall()
            logger.info(f"📋 SQLite table schema: {[col[1] for col in columns]}")
            
            # Extract all person records
            cursor.execute("SELECT * FROM persons")
            records = cursor.fetchall()
            
            # Get column names
            column_names = [description[0] for description in cursor.description]
            logger.info(f"📋 Column names: {column_names}")
            
            # Convert to dictionaries
            persons_data = []
            for record in records:
                person_dict = dict(zip(column_names, record))
                persons_data.append(person_dict)
            
            conn.close()
            
            logger.info(f"✅ Extracted {len(persons_data)} records from SQLite")
            return persons_data
            
        except Exception as e:
            logger.error(f"❌ Error extracting SQLite data: {str(e)}")
            return []
    
    def convert_embedding_to_base64(self, embedding_blob: bytes) -> Optional[str]:
        """
        Convert pickled numpy array to base64 string
        
        Args:
            embedding_blob: Pickled numpy array from SQLite
            
        Returns:
            Base64 encoded string or None if conversion fails
        """
        try:
            # Unpickle the numpy array
            embedding = pickle.loads(embedding_blob)
            
            if not isinstance(embedding, np.ndarray):
                logger.warning(f"⚠️ Embedding is not a numpy array: {type(embedding)}")
                return None
            
            # Convert to bytes and then to base64
            embedding_bytes = embedding.tobytes()
            base64_string = base64.b64encode(embedding_bytes).decode('utf-8')
            
            return base64_string
            
        except Exception as e:
            logger.error(f"❌ Error converting embedding: {str(e)}")
            return None
    
    async def migrate_persons(self, sqlite_data: List[Dict]) -> Dict[str, int]:
        """
        Migrate person records to Supabase
        
        Args:
            sqlite_data: List of person records from SQLite
            
        Returns:
            Migration statistics
        """
        stats = {
            'total_records': len(sqlite_data),
            'successful_migrations': 0,
            'failed_migrations': 0,
            'skipped_records': 0
        }
        
        for i, person_data in enumerate(sqlite_data):
            try:
                logger.info(f"🔄 Migrating person {i+1}/{len(sqlite_data)}: {person_data.get('name', 'Unknown')}")
                
                # Extract embedding
                embedding_base64 = None
                if 'embedding' in person_data and person_data['embedding']:
                    embedding_base64 = self.convert_embedding_to_base64(person_data['embedding'])
                
                if not embedding_base64:
                    logger.warning(f"⚠️ No valid embedding for person: {person_data.get('name')}")
                    stats['skipped_records'] += 1
                    continue
                
                # Create PersonTable object
                person = PersonTable(
                    name=person_data.get('name', f'Person_{person_data.get("id", "unknown")}'),
                    student_id=person_data.get('student_id'),  # May not exist in old schema
                    employee_id=person_data.get('employee_id'),  # May not exist in old schema
                    department=person_data.get('department'),  # May not exist in old schema
                    role=person_data.get('role', 'student'),  # Default to student
                    email=person_data.get('email'),  # May not exist in old schema
                    phone=person_data.get('phone'),  # May not exist in old schema
                    face_embedding=embedding_base64,
                    training_images_count=1,  # Assume 1 for migrated data
                    last_trained=datetime.now(),
                    recognition_enabled=True
                )
                
                # Check if person already exists by name (to avoid duplicates)
                existing_persons = await self.db_manager.search_persons(person.name)
                if existing_persons:
                    logger.info(f"⚠️ Person already exists in Supabase: {person.name}")
                    stats['skipped_records'] += 1
                    continue
                
                # Create person in Supabase
                created_person = await self.db_manager.create_person(person)
                
                if created_person:
                    logger.info(f"✅ Successfully migrated: {person.name} (New ID: {created_person.id})")
                    stats['successful_migrations'] += 1
                else:
                    logger.error(f"❌ Failed to create person in Supabase: {person.name}")
                    stats['failed_migrations'] += 1
                    
            except Exception as e:
                logger.error(f"❌ Error migrating person {person_data.get('name', 'Unknown')}: {str(e)}")
                stats['failed_migrations'] += 1
        
        return stats
    
    async def verify_migration(self) -> Dict[str, any]:
        """
        Verify migration by comparing record counts and checking data integrity
        
        Returns:
            Verification results
        """
        try:
            # Get SQLite record count
            sqlite_data = self.extract_sqlite_data()
            sqlite_count = len(sqlite_data)
            
            # Get Supabase record count
            supabase_stats = await self.db_manager.get_database_stats()
            supabase_count = supabase_stats.get('total_persons', 0)
            
            # Check a few random records for data integrity
            sample_checks = []
            if sqlite_data and supabase_count > 0:
                # Check first few records
                for i, sqlite_person in enumerate(sqlite_data[:3]):
                    if 'name' in sqlite_person:
                        supabase_persons = await self.db_manager.search_persons(sqlite_person['name'])
                        if supabase_persons:
                            supabase_person = supabase_persons[0]
                            sample_checks.append({
                                'sqlite_name': sqlite_person['name'],
                                'supabase_name': supabase_person['name'],
                                'embedding_migrated': bool(supabase_person.get('face_embedding')),
                                'match': sqlite_person['name'] == supabase_person['name']
                            })
            
            verification_result = {
                'sqlite_record_count': sqlite_count,
                'supabase_record_count': supabase_count,
                'migration_complete': sqlite_count > 0 and supabase_count > 0,
                'sample_data_checks': sample_checks,
                'verification_status': 'success' if sqlite_count <= supabase_count else 'partial'
            }
            
            logger.info(f"📊 Verification complete: {verification_result}")
            return verification_result
            
        except Exception as e:
            logger.error(f"❌ Error during verification: {str(e)}")
            return {
                'verification_status': 'error',
                'error': str(e)
            }
    
    def analyze_current_data(self) -> Dict[str, any]:
        """
        Analyze the current SQLite data structure and content
        
        Returns:
            Analysis results
        """
        try:
            sqlite_data = self.extract_sqlite_data()
            
            if not sqlite_data:
                return {
                    'status': 'no_data',
                    'message': 'No data found in SQLite database'
                }
            
            # Analyze data structure
            sample_record = sqlite_data[0]
            available_fields = list(sample_record.keys())
            
            # Check embedding data
            embedding_info = {}
            if 'embedding' in sample_record and sample_record['embedding']:
                try:
                    embedding = pickle.loads(sample_record['embedding'])
                    if isinstance(embedding, np.ndarray):
                        embedding_info = {
                            'type': 'numpy_array',
                            'shape': embedding.shape,
                            'dtype': str(embedding.dtype),
                            'size_bytes': embedding.nbytes,
                            'can_migrate': True
                        }
                    else:
                        embedding_info = {
                            'type': str(type(embedding)),
                            'can_migrate': False
                        }
                except Exception as e:
                    embedding_info = {
                        'type': 'unknown',
                        'error': str(e),
                        'can_migrate': False
                    }
            
            analysis = {
                'status': 'success',
                'total_records': len(sqlite_data),
                'available_fields': available_fields,
                'embedding_analysis': embedding_info,
                'sample_record_names': [person.get('name', 'Unknown') for person in sqlite_data[:5]],
                'migration_feasible': bool(embedding_info.get('can_migrate', False))
            }
            
            logger.info(f"📋 Data analysis complete: {analysis}")
            return analysis
            
        except Exception as e:
            logger.error(f"❌ Error analyzing data: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

async def main():
    """
    Main migration function
    """
    print("🚀 Face Recognition Data Migration Tool")
    print("=" * 50)
    
    migrator = DataMigrator("embeddings.db")
    
    # Step 1: Analyze current data
    print("\n📋 Step 1: Analyzing current SQLite data...")
    analysis = migrator.analyze_current_data()
    
    if analysis['status'] == 'no_data':
        print("❌ No data found in embeddings.db")
        print("Please ensure your embeddings.db file exists and contains data.")
        return
    
    if analysis['status'] == 'error':
        print(f"❌ Error analyzing data: {analysis['error']}")
        return
    
    if not analysis['migration_feasible']:
        print("❌ Migration not feasible - embedding data cannot be processed")
        print(f"Embedding analysis: {analysis['embedding_analysis']}")
        return
    
    print(f"✅ Found {analysis['total_records']} records ready for migration")
    print(f"📊 Available fields: {', '.join(analysis['available_fields'])}")
    print(f"🧠 Embedding info: {analysis['embedding_analysis']['shape']} shape, {analysis['embedding_analysis']['dtype']} dtype")
    print(f"👥 Sample names: {', '.join(analysis['sample_record_names'])}")
    
    # Step 2: Initialize Supabase connection
    print("\n🔗 Step 2: Connecting to Supabase...")
    supabase_ready = await migrator.initialize_supabase()
    
    if not supabase_ready:
        print("❌ Failed to connect to Supabase")
        print("Please check your .env file and ensure Supabase credentials are correct.")
        return
    
    # Step 3: Get user confirmation
    print(f"\n⚠️  Ready to migrate {analysis['total_records']} records to Supabase")
    print("This will create new person records in your Supabase database.")
    
    while True:
        response = input("\nProceed with migration? (y/n): ").strip().lower()
        if response in ['y', 'yes']:
            break
        elif response in ['n', 'no']:
            print("Migration cancelled.")
            return
        else:
            print("Please enter 'y' or 'n'")
    
    # Step 4: Perform migration
    print("\n🔄 Step 3: Migrating data...")
    sqlite_data = migrator.extract_sqlite_data()
    migration_stats = await migrator.migrate_persons(sqlite_data)
    
    print(f"\n📊 Migration Results:")
    print(f"Total records: {migration_stats['total_records']}")
    print(f"✅ Successful: {migration_stats['successful_migrations']}")
    print(f"❌ Failed: {migration_stats['failed_migrations']}")
    print(f"⏭️  Skipped: {migration_stats['skipped_records']}")
    
    # Step 5: Verify migration
    print("\n🔍 Step 4: Verifying migration...")
    verification = await migrator.verify_migration()
    
    print(f"SQLite records: {verification['sqlite_record_count']}")
    print(f"Supabase records: {verification['supabase_record_count']}")
    print(f"Status: {verification['verification_status']}")
    
    if verification['sample_data_checks']:
        print("\nSample data verification:")
        for check in verification['sample_data_checks']:
            status = "✅" if check['match'] else "❌"
            print(f"  {status} {check['sqlite_name']} -> {check['supabase_name']}")
    
    print(f"\n🎉 Migration completed! Your data is now available in Supabase.")
    print(f"You can now use the FaceRecognizerWithSupabase class for recognition.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n❌ Migration cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Migration failed with error: {str(e)}")
        print("Please check your configuration and try again.")