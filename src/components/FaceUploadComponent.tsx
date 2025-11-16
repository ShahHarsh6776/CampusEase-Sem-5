import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface FaceUploadProps {
  studentId: string;
  studentName: string;
  department?: string;
  course?: string;
  onTrainingComplete?: () => void;
  onClose?: () => void;
  showUploadOption?: boolean;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
}

const FACE_RECOGNITION_API_URL = 'http://localhost:8000';
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export const FaceUploadComponent: React.FC<FaceUploadProps> = ({
  studentId,
  studentName,
  department,
  course,
  onTrainingComplete,
  onClose,
  showUploadOption = true
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only JPEG and PNG images are allowed' };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }
    
    return { valid: true };
  };

  const handleFileSelect = useCallback((files: FileList) => {
    const newImages: UploadedImage[] = [];
    
    for (let i = 0; i < files.length && (images.length + newImages.length) < MAX_IMAGES; i++) {
      const file = files[i];
      const validation = validateFile(file);
      
      const imageData: UploadedImage = {
        id: `${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        status: validation.valid ? 'valid' : 'invalid',
        error: validation.error
      };
      
      newImages.push(imageData);
    }
    
    setImages(prev => [...prev, ...newImages]);
    setError(null);
    
    if (files.length + images.length > MAX_IMAGES) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_IMAGES} images allowed. Some files were not added.`,
        variant: "destructive"
      });
    }
  }, [images.length, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // Revoke object URL to prevent memory leak
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return updated;
    });
  };

  const handleUpload = async () => {
    const validImages = images.filter(img => img.status === 'valid');
    
    if (validImages.length === 0) {
      setError('Please add at least one valid image');
      return;
    }

    if (validImages.length < 2) {
      setError('Please add at least 2 images for better accuracy');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add student data
      const studentData = {
        name: studentName,
        student_id: studentId,
        department: department || 'Unknown',
        role: 'student'
      };
      
      formData.append('student_data', JSON.stringify(studentData));
      
      // Add images
      validImages.forEach((imageData) => {
        formData.append('images', imageData.file);
      });

      // Upload to face recognition API
      const response = await fetch(`${FACE_RECOGNITION_API_URL}/train-student`, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);

      if (result.success) {
        setSuccess(true);
        toast({
          title: "Face Training Successful",
          description: `Successfully trained face recognition for ${studentName}. ${result.images_processed} images processed.`,
        });
        
        // Clean up object URLs
        images.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
        
        // Call completion callback
        if (onTrainingComplete) {
          onTrainingComplete();
        }
      } else {
        throw new Error(result.message || 'Training failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload images');
      toast({
        title: "Upload Failed",
        description: error.message || 'Failed to upload images for face recognition',
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getImageStatusIcon = (status: UploadedImage['status']) => {
    switch (status) {
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Upload className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Face Recognition Training
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Upload 2-5 clear photos of <strong>{studentName}</strong> for face recognition training
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {success && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Face recognition training completed successfully! You can now use automatic attendance marking.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Guidelines */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Photo Guidelines:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Upload 2-5 clear photos of your face</li>
            <li>• Face should be clearly visible and well-lit</li>
            <li>• Include different angles and expressions</li>
            <li>• Avoid sunglasses, masks, or face coverings</li>
            <li>• File size should be less than 10MB</li>
            <li>• Supported formats: JPEG, PNG</li>
          </ul>
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            images.length >= MAX_IMAGES 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => {
            if (images.length < MAX_IMAGES) {
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-blue-500 mx-auto" />
            {images.length < MAX_IMAGES ? (
              <>
                <p className="text-sm font-medium">Drop images here or click to browse</p>
                <p className="text-xs text-gray-500">
                  {images.length}/{MAX_IMAGES} images added
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-gray-500">
                Maximum {MAX_IMAGES} images reached
              </p>
            )}
          </div>
          
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
                e.target.value = ''; // Reset input
              }
            }}
            className="hidden"
          />
        </div>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Uploaded Images</Label>
              <Badge variant="outline">
                {images.filter(img => img.status === 'valid').length} valid images
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={image.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <div className={`p-1 rounded-full ${
                      image.status === 'valid' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {getImageStatusIcon(image.status)}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  
                  {/* Error Message */}
                  {image.error && (
                    <p className="text-xs text-red-600 mt-1 break-words">
                      {image.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Training face recognition...</Label>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleUpload}
            disabled={
              images.filter(img => img.status === 'valid').length < 2 || 
              uploading ||
              success
            }
            className="flex-1"
          >
            {uploading ? (
              <>
                <Camera className="h-4 w-4 mr-2 animate-spin" />
                Training...
              </>
            ) : success ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Training Complete
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Start Training ({images.filter(img => img.status === 'valid').length} images)
              </>
            )}
          </Button>
          
          {!success && images.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                images.forEach(img => URL.revokeObjectURL(img.preview));
                setImages([]);
                setError(null);
              }}
              disabled={uploading}
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Success Actions */}
        {success && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSuccess(false);
                setError(null);
              }}
              className="flex-1"
            >
              Train More Images
            </Button>
            {onClose && (
              <Button onClick={onClose} className="flex-1">
                Done
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceUploadComponent;