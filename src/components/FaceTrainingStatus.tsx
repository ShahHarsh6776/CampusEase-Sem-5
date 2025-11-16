import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Camera, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FaceUploadComponent from '@/components/FaceUploadComponent';

interface FaceTrainingStatusProps {
  studentId: string;
  studentName: string;
  department?: string;
  showUploadOption?: boolean;
}

const FACE_RECOGNITION_API_URL = 'http://localhost:8000';

export const FaceTrainingStatus: React.FC<FaceTrainingStatusProps> = ({
  studentId,
  studentName,
  department,
  showUploadOption = false
}) => {
  const [trainingStatus, setTrainingStatus] = useState<{
    trained: boolean;
    loading: boolean;
    error: string | null;
    training_date?: string;
    embedding_available?: boolean;
  }>({
    trained: false,
    loading: false,
    error: null
  });
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  const checkTrainingStatus = async () => {
    setTrainingStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${FACE_RECOGNITION_API_URL}/students/${studentId}/face-training-status`);
      
      if (response.ok) {
        const data = await response.json();
        setTrainingStatus({
          trained: data.trained,
          loading: false,
          error: null,
          training_date: data.training_date,
          embedding_available: data.embedding_available
        });
      } else {
        setTrainingStatus(prev => ({
          ...prev,
          loading: false,
          error: 'Unable to check training status'
        }));
      }
    } catch (error) {
      console.error('Error checking training status:', error);
      setTrainingStatus(prev => ({
        ...prev,
        loading: false,
        error: 'Face recognition service unavailable'
      }));
    }
  };

  const deleteTrainingData = async () => {
    if (!confirm('Are you sure you want to delete all face training data? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${FACE_RECOGNITION_API_URL}/students/${studentId}/face-data`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Training Data Deleted",
          description: "Face recognition training data has been removed.",
        });
        await checkTrainingStatus(); // Refresh status
      } else {
        throw new Error('Failed to delete training data');
      }
    } catch (error) {
      console.error('Error deleting training data:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete face training data.",
        variant: "destructive"
      });
    }
  };

  const handleTrainingComplete = () => {
    setShowUpload(false);
    checkTrainingStatus(); // Refresh status
  };

  useEffect(() => {
    checkTrainingStatus();
  }, [studentId]);

  if (showUpload) {
    return (
      <FaceUploadComponent
        studentId={studentId}
        studentName={studentName}
        department={department}
        onTrainingComplete={handleTrainingComplete}
        onClose={() => setShowUpload(false)}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Face Recognition Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trainingStatus.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{trainingStatus.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{studentName}</span>
              <span className="text-sm text-gray-500">({studentId})</span>
            </div>
            
            <div className="flex items-center gap-2">
              {trainingStatus.loading ? (
                <Badge variant="outline">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                  Checking...
                </Badge>
              ) : trainingStatus.trained ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Trained
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Trained
                </Badge>
              )}
            </div>

            {trainingStatus.trained && trainingStatus.training_date && (
              <p className="text-xs text-gray-500">
                Trained on: {new Date(trainingStatus.training_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!trainingStatus.trained && showUploadOption && (
              <Button
                onClick={() => setShowUpload(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos
              </Button>
            )}

            {trainingStatus.trained && showUploadOption && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowUpload(true)}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Retrain
                </Button>
                <Button
                  onClick={deleteTrainingData}
                  variant="destructive"
                  size="sm"
                >
                  Delete
                </Button>
              </div>
            )}

            <Button
              onClick={checkTrainingStatus}
              variant="outline"
              size="sm"
              disabled={trainingStatus.loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Status Information */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <h4 className="font-medium mb-2">About Face Recognition:</h4>
          <ul className="text-gray-600 space-y-1">
            {trainingStatus.trained ? (
              <>
                <li>✓ Face recognition is enabled for this student</li>
                <li>✓ Can be automatically detected in class photos</li>
                <li>✓ Attendance can be marked using AI face recognition</li>
              </>
            ) : (
              <>
                <li>• Upload 2-5 clear photos to enable face recognition</li>
                <li>• Face recognition allows automatic attendance marking</li>
                <li>• Photos are processed securely and stored encrypted</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FaceTrainingStatus;