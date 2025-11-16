"""
SQLite Data Analyzer for embeddings.db
Quick tool to examine your current face recognition data
"""

import sqlite3
import pickle
import numpy as np
import os
from datetime import datetime

def analyze_embeddings_db(db_path: str = "embeddings.db"):
    """
    Analyze the current embeddings.db file
    
    Args:
        db_path: Path to the SQLite database file
    """
    print("🔍 Analyzing embeddings.db")
    print("=" * 50)
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get database file size
        file_size = os.path.getsize(db_path)
        print(f"📁 Database file size: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"📋 Tables found: {[table[0] for table in tables]}")
        
        if not tables:
            print("❌ No tables found in database")
            conn.close()
            return
        
        # Focus on persons table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='persons'")
        if not cursor.fetchone():
            print("❌ 'persons' table not found")
            conn.close()
            return
        
        # Get table schema
        cursor.execute("PRAGMA table_info(persons)")
        columns = cursor.fetchall()
        print(f"\n📊 Table Schema (persons):")
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) {'- Primary Key' if col[5] else ''}")
        
        # Get record count
        cursor.execute("SELECT COUNT(*) FROM persons")
        record_count = cursor.fetchone()[0]
        print(f"\n👥 Total persons: {record_count}")
        
        if record_count == 0:
            print("⚠️ No person records found")
            conn.close()
            return
        
        # Analyze records
        cursor.execute("SELECT id, name, embedding FROM persons LIMIT 10")
        sample_records = cursor.fetchall()
        
        print(f"\n📝 Sample Records:")
        print("-" * 30)
        
        embedding_stats = {
            'total_embeddings': 0,
            'valid_embeddings': 0,
            'invalid_embeddings': 0,
            'embedding_shapes': {},
            'embedding_dtypes': {},
            'total_embedding_size': 0
        }
        
        for i, (person_id, name, embedding_blob) in enumerate(sample_records):
            print(f"{i+1}. ID: {person_id}, Name: {name}")
            
            if embedding_blob:
                embedding_stats['total_embeddings'] += 1
                try:
                    embedding = pickle.loads(embedding_blob)
                    if isinstance(embedding, np.ndarray):
                        embedding_stats['valid_embeddings'] += 1
                        shape_key = str(embedding.shape)
                        dtype_key = str(embedding.dtype)
                        
                        embedding_stats['embedding_shapes'][shape_key] = \
                            embedding_stats['embedding_shapes'].get(shape_key, 0) + 1
                        embedding_stats['embedding_dtypes'][dtype_key] = \
                            embedding_stats['embedding_dtypes'].get(dtype_key, 0) + 1
                        embedding_stats['total_embedding_size'] += embedding.nbytes
                        
                        print(f"   ✅ Embedding: {embedding.shape}, {embedding.dtype}")
                    else:
                        embedding_stats['invalid_embeddings'] += 1
                        print(f"   ❌ Invalid embedding type: {type(embedding)}")
                except Exception as e:
                    embedding_stats['invalid_embeddings'] += 1
                    print(f"   ❌ Failed to load embedding: {str(e)}")
            else:
                print(f"   ⚠️ No embedding data")
        
        # Get all records for complete analysis
        cursor.execute("SELECT embedding FROM persons WHERE embedding IS NOT NULL")
        all_embeddings = cursor.fetchall()
        
        print(f"\n🧠 Embedding Analysis:")
        print(f"  Total records with embeddings: {len(all_embeddings)}")
        print(f"  Valid embeddings: {embedding_stats['valid_embeddings']}")
        print(f"  Invalid embeddings: {embedding_stats['invalid_embeddings']}")
        
        if embedding_stats['embedding_shapes']:
            print(f"  Embedding shapes: {embedding_stats['embedding_shapes']}")
            print(f"  Data types: {embedding_stats['embedding_dtypes']}")
            avg_size = embedding_stats['total_embedding_size'] / max(embedding_stats['valid_embeddings'], 1)
            print(f"  Average embedding size: {avg_size:.0f} bytes")
            total_size_mb = embedding_stats['total_embedding_size'] / 1024 / 1024
            print(f"  Total embedding data: {total_size_mb:.2f} MB")
        
        # Check for unique names
        cursor.execute("SELECT COUNT(DISTINCT name) as unique_names FROM persons")
        unique_names = cursor.fetchone()[0]
        print(f"\n📊 Data Quality:")
        print(f"  Total records: {record_count}")
        print(f"  Unique names: {unique_names}")
        print(f"  Duplicate names: {record_count - unique_names}")
        
        # Show migration readiness
        migration_ready = (
            embedding_stats['valid_embeddings'] > 0 and
            embedding_stats['invalid_embeddings'] == 0 and
            len(embedding_stats['embedding_shapes']) <= 2  # Should be consistent
        )
        
        print(f"\n🚀 Migration Readiness:")
        if migration_ready:
            print("  ✅ Ready for migration to Supabase!")
            print("  - All embeddings are valid numpy arrays")
            print("  - Consistent data format detected")
        else:
            print("  ⚠️ Migration may have issues:")
            if embedding_stats['invalid_embeddings'] > 0:
                print(f"    - {embedding_stats['invalid_embeddings']} invalid embeddings found")
            if len(embedding_stats['embedding_shapes']) > 2:
                print(f"    - Inconsistent embedding shapes: {embedding_stats['embedding_shapes']}")
        
        print(f"\n📋 What can be migrated to Supabase:")
        print("  ✅ Person ID (will be auto-generated in Supabase)")
        print("  ✅ Person name")
        print("  ✅ Face embeddings (converted to Base64 format)")
        print("  ➕ Additional fields can be added (student_id, department, etc.)")
        
        print(f"\n🗃️ Supabase storage format:")
        print("  - Face embeddings: Base64 encoded strings")
        print("  - Searchable by: name, student_id, employee_id")
        print("  - Additional tables: attendance_records, training_images, logs")
        print("  - Real-time updates and scalable queries")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error analyzing database: {str(e)}")

if __name__ == "__main__":
    # Look for embeddings.db in current directory and parent directory
    db_paths = ["embeddings.db", "../embeddings.db", "../../embeddings.db"]
    
    found_db = None
    for path in db_paths:
        if os.path.exists(path):
            found_db = path
            break
    
    if found_db:
        print(f"📍 Found database: {found_db}")
        analyze_embeddings_db(found_db)
    else:
        print("❌ embeddings.db not found in current or parent directories")
        print("Please run this script from the same directory as your embeddings.db file")