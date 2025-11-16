# Face Recognition Module Configuration
# Customize these settings for your campus management system

# GPU Configuration
GPU_CONFIG = {
    "memory_limit_mb": 2048,  # GPU memory limit for RTX 3050
    "detection_size": (640, 640),  # Face detection resolution
    "providers": ["CUDAExecutionProvider"],  # Use GPU only
    "device_id": 0,
    "optimize_for_rtx3050": True
}

# Face Recognition Settings
RECOGNITION_CONFIG = {
    "similarity_threshold": 0.5,  # Minimum similarity for positive match
    "max_faces_per_image": 20,   # Maximum faces to process per image
    "embedding_dimension": 512,   # ArcFace embedding size
    "normalize_embeddings": True
}

# Image Processing Settings
IMAGE_CONFIG = {
    "max_image_size": 1024,      # Maximum image dimension
    "supported_formats": [".jpg", ".jpeg", ".png", ".bmp"],
    "jpeg_quality": 95,
    "enhance_images": True,       # Apply image enhancement
    "face_crop_padding": 0.2     # Padding around face crops (20%)
}

# Database Integration Settings
DATABASE_CONFIG = {
    "database_type": "supabase",     # "supabase" or "sqlite" or "pickle"
    "auto_save": True,               # Auto-save face database
    "backup_interval_hours": 24,     # Database backup interval
    "max_training_images": 10,       # Max images per person for training
    "database_path": "face_database.pkl",  # Fallback for pickle/sqlite
    
    # Supabase specific settings
    "supabase_config": {
        "url": None,                 # Will be loaded from environment variable SUPABASE_URL
        "anon_key": None,            # Will be loaded from environment variable SUPABASE_ANON_KEY  
        "service_role_key": None,    # Will be loaded from environment variable SUPABASE_SERVICE_ROLE_KEY
        "connection_timeout": 30,    # Connection timeout in seconds
        "max_retries": 3,            # Maximum retry attempts
        "batch_size": 100,           # Batch size for bulk operations
    },
    
    # Data storage preferences
    "store_embeddings": True,        # Store face embeddings in database
    "store_training_images": False,  # Store actual image data (not recommended for large datasets)
    "store_image_paths": True,       # Store file paths to images
    "compress_embeddings": False,    # Compress embeddings before storage
}

# Campus System Integration
CAMPUS_CONFIG = {
    "attendance_locations": [
        "Main Gate",
        "Library",
        "Classroom A",
        "Classroom B", 
        "Cafeteria",
        "Lab 1",
        "Lab 2"
    ],
    "roles": ["student", "faculty", "staff", "visitor"],
    "departments": [
        "Computer Science",
        "Electrical Engineering", 
        "Mechanical Engineering",
        "Mathematics",
        "Physics",
        "Administration"
    ]
}

# Performance Monitoring
MONITORING_CONFIG = {
    "log_level": "INFO",         # Logging level
    "performance_tracking": True, # Track processing times
    "gpu_monitoring": True,      # Monitor GPU usage
    "save_recognition_logs": True,
    "log_file_path": "recognition.log"
}

# Security Settings
SECURITY_CONFIG = {
    "min_face_size": 50,         # Minimum face size in pixels
    "max_concurrent_requests": 10, # Max simultaneous processing
    "rate_limit_per_minute": 100,  # API rate limit
    "require_authentication": False # Set to True for production
}

# Export configurations
CONFIG = {
    "gpu": GPU_CONFIG,
    "recognition": RECOGNITION_CONFIG,
    "image": IMAGE_CONFIG,
    "database": DATABASE_CONFIG,
    "campus": CAMPUS_CONFIG,
    "monitoring": MONITORING_CONFIG,
    "security": SECURITY_CONFIG
}