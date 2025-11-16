import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertCircle, Users, FileImage, Zap, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface Student {
  student_id: string;
  student_name: string;
  confidence: number;
  status: 'present' | 'absent' | 'late';
  detected: boolean;
}

interface MassFaceRecognitionProps {
  classId: string;
  className: string;
  subject: string;
  classType: string;
  date: string;
  facultyId: string;
  facultyName: string;
  onAttendanceSaved: (results: Student[]) => void;
  onClose: () => void;
}

const FACE_RECOGNITION_API_URL = 'http://localhost:8000';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for class photos
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export const MassFaceRecognitionComponent: React.FC<MassFaceRecognitionProps> = ({
  classId,
  className,
  subject,
  classType,
  date,
  facultyId,
  facultyName,
  onAttendanceSaved,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review' | 'saving'>('upload');
  const [classPhoto, setClassPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attendanceResults, setAttendanceResults] = useState<Student[]>([]);
  const [editedResults, setEditedResults] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only JPEG and PNG images are allowed' };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 20MB' };
    }
    
    return { valid: true };
  };

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setClassPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const processClassPhoto = async () => {
    if (!classPhoto) {
      setError('Please select a class photo first');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCurrentStep('processing');
    setError(null);

    try {
      const formData = new FormData();
      
      // Add attendance data
      const attendanceData = {
        class_id: classId,
        subject,
        class_type: classType,
        date,
        faculty_id: facultyId,
        faculty_name: facultyName
      };
      
      formData.append('attendance_data', JSON.stringify(attendanceData));
      formData.append('class_photo', classPhoto);

      setProgress(25);

      // Send to face recognition API
      const response = await fetch(`${FACE_RECOGNITION_API_URL}/mass-recognition`, {
        method: 'POST',
        body: formData,
      });

      setProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Face recognition failed');
      }

      const result = await response.json();
      setProgress(100);

      if (result.success) {
        setAttendanceResults(result.attendance_results);
        setEditedResults([...result.attendance_results]);
        setCurrentStep('review');
        
        toast({
          title: "Face Recognition Complete",
          description: `Detected ${result.attendance_results.filter(r => r.detected).length} out of ${result.total_students_in_class} students`,
        });
      } else {
        throw new Error(result.message || 'Face recognition failed');
      }

    } catch (error) {
      console.error('Face recognition error:', error);
      setError(error.message || 'Failed to process class photo');
      setCurrentStep('upload');
      toast({
        title: "Recognition Failed",
        description: error.message || 'Failed to process class photo for face recognition',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const updateStudentStatus = (studentId: string, newStatus: 'present' | 'absent' | 'late') => {
    setEditedResults(prev =>
      prev.map(student =>
        student.student_id === studentId
          ? { ...student, status: newStatus }
          : student
      )
    );
  };

  const saveAttendance = async () => {
    setSaving(true);
    setCurrentStep('saving');
    setError(null);

    try {
      const attendanceData = {
        class_id: classId,
        subject,
        class_type: classType,
        date,
        faculty_id: facultyId,
        faculty_name: facultyName
      };

      const response = await fetch(`${FACE_RECOGNITION_API_URL}/save-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance_data: attendanceData,
          attendance_results: editedResults
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save attendance');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Attendance Saved",
          description: `Successfully saved attendance for ${result.saved_records} students`,
        });
        
        // Call parent callback with results
        onAttendanceSaved(editedResults);
        onClose();
      } else {
        throw new Error(result.message || 'Failed to save attendance');
      }

    } catch (error) {
      console.error('Save attendance error:', error);
      setError(error.message || 'Failed to save attendance');
      setCurrentStep('review');
      toast({
        title: "Save Failed",
        description: error.message || 'Failed to save attendance records',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload': return 'Upload Class Photo';
      case 'processing': return 'Processing Faces...';
      case 'review': return 'Review & Edit Attendance';
      case 'saving': return 'Saving Attendance...';
      default: return 'Mass Face Recognition';
    }
  };

  const presentCount = editedResults.filter(s => s.status === 'present').length;
  const absentCount = editedResults.filter(s => s.status === 'absent').length;
  const lateCount = editedResults.filter(s => s.status === 'late').length;
  const detectedCount = editedResults.filter(s => s.detected).length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {getStepTitle()}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Class:</strong> {className} • <strong>Subject:</strong> {subject}</p>
          <p><strong>Date:</strong> {date} • <strong>Type:</strong> {classType}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Upload Class Photo */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Upload a clear class photo containing students</li>
                <li>AI will automatically detect and identify faces</li>
                <li>Review and manually adjust attendance if needed</li>
                <li>Save the final attendance records</li>
              </ol>
            </div>

            {/* Photo Upload Area */}
            <div
              className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-4">
                {photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview}
                      alt="Class Photo Preview"
                      className="max-w-md max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                    <div className="space-y-2">
                      <p className="font-medium text-green-700">✓ Class photo uploaded</p>
                      <Button variant="outline" size="sm" onClick={() => {
                        setClassPhoto(null);
                        setPhotoPreview(null);
                      }}>
                        Choose Different Photo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <FileImage className="h-12 w-12 text-blue-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">Drop class photo here or click to browse</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Supports JPEG, PNG • Maximum 20MB • Clear front-facing photo works best
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <Input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            </div>

            {/* Action Button */}
            {classPhoto && (
              <Button onClick={processClassPhoto} className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Start Face Recognition
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Processing */}
        {currentStep === 'processing' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="h-16 w-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Processing Class Photo...</h3>
                <p className="text-gray-600">AI is detecting and identifying faces in the image</p>
              </div>
            </div>
            
            <div className="max-w-md mx-auto space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500">{progress}% complete</p>
            </div>
            
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Processing"
                className="max-w-sm max-h-48 mx-auto rounded-lg opacity-75"
              />
            )}
          </div>
        )}

        {/* Step 3: Review Results */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                  <div className="text-sm text-gray-600">Present</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                  <div className="text-sm text-gray-600">Absent</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
                  <div className="text-sm text-gray-600">Late</div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{detectedCount}</div>
                  <div className="text-sm text-gray-600">Auto-Detected</div>
                </div>
              </Card>
            </div>

            <Separator />

            {/* Attendance Results Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Student Attendance</h3>
                <Badge variant="outline">
                  {editedResults.length} students • {detectedCount} auto-detected
                </Badge>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <div className="grid gap-1 p-2">
                  {editedResults.map((student) => (
                    <Card key={student.student_id} className={`p-3 ${student.detected ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {student.detected ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Edit3 className="h-4 w-4 text-gray-500" />
                            )}
                            <div>
                              <div className="font-medium">{student.student_name}</div>
                              <div className="text-sm text-gray-500">
                                ID: {student.student_id}
                                {student.detected && (
                                  <span className="ml-2 text-green-600">
                                    • Confidence: {(student.confidence * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status Buttons */}
                          <div className="flex gap-1">
                            {['present', 'absent', 'late'].map((status) => (
                              <Button
                                key={status}
                                variant={student.status === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateStudentStatus(student.student_id, status as any)}
                                className={`capitalize ${
                                  student.status === status 
                                    ? status === 'present' ? 'bg-green-600' : 
                                      status === 'absent' ? 'bg-red-600' : 'bg-yellow-600'
                                    : ''
                                }`}
                              >
                                {status}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('upload')}
                className="flex-1"
              >
                Upload Different Photo
              </Button>
              <Button
                onClick={saveAttendance}
                className="flex-1"
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Attendance ({editedResults.length} students)
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Saving */}
        {currentStep === 'saving' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Saving Attendance...</h3>
                <p className="text-gray-600">Finalizing attendance records</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MassFaceRecognitionComponent;