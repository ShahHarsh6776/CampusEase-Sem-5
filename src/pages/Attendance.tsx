import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase/supabaseClient';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useUser } from '@/UserContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import MassFaceRecognitionComponent from '@/components/MassFaceRecognitionComponent';
import { 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Search,
  Download,
  GraduationCap,
  Zap
} from 'lucide-react';

interface ClassDetail {
  id: number;
  class_name: string;
  class_id: string;
  department: string;
  institute: string;
  semester: number;
  academic_year: string;
  course_taken: string;
  student_count?: number;
}

interface Student {
  id: number;
  user_id: string; // Unique student ID (like 24DIT001)
  fname: string;
  lname: string;
  email: string;
  mobile_num: string;
  roll_no: string; // University roll number (like 24DIT001)
  dob: string;
  address: string;
  emergency_contact: string;
  course_taken: string;
  class_id: string; // Links to class_details.class_id
  department: string; // Student's department
  institute: string;
  semester: number;
  academic_year: string;
}

interface AttendanceRecord {
  id?: string;
  user_id: string; // References student user_id
  student_name: string;
  roll_no?: string; // Student roll number for reference
  department?: string; // Student's department
  date: string;
  subject: string;
  class_type: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  faculty_name?: string; // Faculty member who marked the attendance
  class_id: string; // Which class this attendance is for
  created_at?: string;
  updated_at?: string;
}

const Attendance: React.FC = () => {
  const { userData } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Class and student management
  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [fetchingStudents, setFetchingStudents] = useState<string | null>(null); // Track which class we're fetching
  
  // Attendance management
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedClassType, setSelectedClassType] = useState<string>('');
  
  // UI state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mark');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);

  // Predefined subjects and class types
  const subjects = [
    'Data Structures',
    'Database Management',
    'Computer Networks',
    'Operating Systems',
    'Software Engineering',
    'Web Development',
    'Machine Learning',
    'Computer Graphics',
    'Mobile App Development',
    'Cyber Security'
  ];

  const classTypes = [
    'Theory',
    'Practical',
    'Tutorial',
    'Seminar'
  ];

  // Check if user is faculty
  useEffect(() => {
    if (!userData || userData.role !== 'faculty') {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to faculty members.",
        variant: "destructive"
      });
      navigate('/Index');
    }
  }, [userData, navigate, toast]);
  
  useEffect(() => {
    fetchClasses();
  }, []);

  // Only fetch students when class ID changes
  useEffect(() => {
    if (selectedClass?.class_id && fetchingStudents !== selectedClass.class_id) {
      fetchStudents(selectedClass.class_id);
    }
  }, [selectedClass?.class_id]); // Only depend on the class_id

  const fetchClasses = async () => {
    try {
      setLoading(true);
      
      // Fetch classes first
      const { data: classData, error: classError } = await supabase
        .from('class_details')
        .select('*')
        .order('class_name');

      if (classError) {
        console.error('Error fetching class_details:', classError);
        throw classError;
      }

      console.log('Fetched classes:', classData);

      // For now, just set classes with student_count as 0
      // We'll get the exact count when needed
      const classesWithCount = (classData || []).map(classDetail => ({
        ...classDetail,
        student_count: 0 // Will be updated when needed
      }));

      console.log('Classes prepared:', classesWithCount);
      setClasses(classesWithCount);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: "Error",
        description: `Failed to fetch classes: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId: string) => {
    // Prevent multiple concurrent calls for the same class
    if (fetchingStudents === classId) {
      console.log('Already fetching students for class:', classId);
      return;
    }

    try {
      setFetchingStudents(classId);
      setLoading(true);
      console.log('Fetching students for class ID:', classId);
      
      // Use exact same logic as ClassManagement.tsx
      const { data, error } = await supabase
        .from('student_records')
        .select('*')
        .eq('class_id', classId)
        .order('user_id');

      if (error) {
        console.error('Error fetching students:', error);
        throw error;
      }
      
      console.log('Fetched students for class', classId, ':', data);
      setStudents(data || []);
      
      // Update the class student count
      if (data) {
        setClasses(prevClasses => 
          prevClasses.map(c => 
            c.class_id === classId 
              ? { ...c, student_count: data.length }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: `Failed to fetch students: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setFetchingStudents(null);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedDate || !selectedSubject || !selectedClass) return;

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate)
        .eq('subject', selectedSubject)
        .eq('class_id', selectedClass.class_id)
        .eq('marked_by', userData?.user_id)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected if table doesn't exist
        throw error;
      }
      
      console.log('Fetched attendance records:', data);
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch existing attendance records.",
        variant: "destructive"
      });
    }
  };

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!selectedSubject || !selectedClassType || !selectedClass) {
      toast({
        title: "Missing Information",
        description: "Please select class, subject and class type.",
        variant: "destructive"
      });
      return;
    }

    const student = students.find(s => s.user_id === studentId);
    if (!student) {
      toast({
        title: "Student Not Found",
        description: "Could not find student record.",
        variant: "destructive"
      });
      return;
    }

    const attendanceRecord: AttendanceRecord = {
      user_id: studentId,
      class_id: selectedClass.class_id,
      student_name: `${student.fname} ${student.lname}`,
      roll_no: student.roll_no,
      department: student.department || selectedClass.department,
      date: selectedDate,
      subject: selectedSubject,
      class_type: selectedClassType,
      status,
      marked_by: userData?.user_id || '',
      faculty_name: `${userData?.fname || ''} ${userData?.lname || ''}`.trim() || 'Faculty'
    };

    try {
      // Check if attendance already exists in our local state
      const existingIndex = attendance.findIndex(
        a => a.user_id === studentId && a.date === selectedDate && a.subject === selectedSubject
      );

      let updatedAttendance = [...attendance];

      if (existingIndex >= 0) {
        // Update existing record in database
        const { data, error } = await supabase
          .from('attendance')
          .update({ 
            status, 
            class_type: selectedClassType,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', studentId)
          .eq('date', selectedDate)
          .eq('subject', selectedSubject)
          .eq('marked_by', userData?.user_id)
          .select()
          .single();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        // Update local state with database response or our record
        updatedAttendance[existingIndex] = data || {
          ...updatedAttendance[existingIndex], 
          status,
          class_type: selectedClassType,
          updated_at: new Date().toISOString()
        };
      } else {
        // Try to insert new record, but handle constraint violations gracefully
        const { data, error } = await supabase
          .from('attendance')
          .insert([attendanceRecord])
          .select()
          .single();

        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505') {
            console.log('Duplicate record detected, trying to update instead...');
            
            // Record already exists, try to update it
            const { data: updateData, error: updateError } = await supabase
              .from('attendance')
              .update({ 
                status, 
                class_type: selectedClassType,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', studentId)
              .eq('date', selectedDate)
              .eq('subject', selectedSubject)
              .eq('marked_by', userData?.user_id)
              .select()
              .single();

            if (updateError) throw updateError;
            
            // Add to local state
            updatedAttendance.push(updateData || attendanceRecord);
          } else {
            console.error('Insert error:', error);
            throw error;
          }
        } else {
          // Successful insert, add to local state
          updatedAttendance.push(data || attendanceRecord);
        }
      }

      setAttendance(updatedAttendance);
      
      // Refresh attendance history for the view tab
      if (activeTab === 'view') {
        fetchAttendanceHistory().then(setAttendanceHistory);
      }
      
      toast({
        title: "Success",
        description: `Marked ${student.fname} ${student.lname} as ${status}.`,
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      
      // Even if there's an error, check if the record was actually saved
      const { data: checkData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', studentId)
        .eq('date', selectedDate)
        .eq('subject', selectedSubject)
        .eq('marked_by', userData?.user_id)
        .single();
      
      if (checkData) {
        // Record exists in database, update local state
        const existingIndex = attendance.findIndex(
          a => a.user_id === studentId && a.date === selectedDate && a.subject === selectedSubject
        );
        
        let updatedAttendance = [...attendance];
        if (existingIndex >= 0) {
          updatedAttendance[existingIndex] = checkData;
        } else {
          updatedAttendance.push(checkData);
        }
        setAttendance(updatedAttendance);
        
        toast({
          title: "Success",
          description: `Marked ${student.fname} ${student.lname} as ${status}.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to mark attendance. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const saveAllAttendance = async () => {
    if (!selectedSubject || !selectedClassType || !selectedClass) {
      toast({
        title: "Missing Information",
        description: "Please select class, subject and class type before saving.",
        variant: "destructive"
      });
      return;
    }

    if (attendance.length === 0) {
      toast({
        title: "No Attendance Marked",
        description: "Please mark attendance for at least one student before saving.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate statistics
      const attendanceCount = attendance.length;
      const presentCount = attendance.filter(a => a.status === 'present').length;
      const absentCount = attendance.filter(a => a.status === 'absent').length;
      const lateCount = attendance.filter(a => a.status === 'late').length;
      
      // Validate that all attendance records are properly saved to database
      let unsavedCount = 0;
      for (const record of attendance) {
        const { data } = await supabase
          .from('attendance')
          .select('id')
          .eq('user_id', record.user_id)
          .eq('date', selectedDate)
          .eq('subject', selectedSubject)
          .eq('marked_by', userData?.user_id)
          .single();
        
        if (!data) {
          unsavedCount++;
        }
      }
      
      if (unsavedCount > 0) {
        toast({
          title: "Warning",
          description: `${unsavedCount} attendance records may not be saved properly. Please try marking attendance again.`,
          variant: "destructive"
        });
      } else {
        // Refresh attendance history
        await fetchAttendanceHistory().then(setAttendanceHistory);
        
        toast({
          title: "Attendance Saved Successfully",
          description: `Total: ${attendanceCount} students - ${presentCount} present, ${absentCount} absent, ${lateCount} late.`,
        });
      }
    } catch (error) {
      console.error('Error validating attendance save:', error);
      toast({
        title: "Error",
        description: "Failed to validate saved attendance.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAllPresent = async () => {
    if (!selectedClass) {
      toast({
        title: "No Class Selected",
        description: "Please select a class first.",
        variant: "destructive"
      });
      return;
    }

    for (const student of students) {
      await markAttendance(student.user_id, 'present');
    }
  };

  const getAttendanceStatus = (studentId: string) => {
    return attendance.find(a => a.user_id === studentId)?.status || '';
  };

  const filteredStudents = students.filter(student => {
    const fname = student.fname || '';
    const lname = student.lname || '';
    const user_id = student.user_id || '';
    const roll_no = student.roll_no || '';
    
    return fname.toLowerCase().includes(searchTerm.toLowerCase()) ||
           lname.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           roll_no.toLowerCase().includes(searchTerm.toLowerCase());
  });

  console.log('Students data:', students);
  console.log('Filtered students:', filteredStudents);
  console.log('Search term:', searchTerm);

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = classItem.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classItem.class_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || classItem.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const getDepartments = () => {
    const departments = Array.from(new Set(classes.map(c => c.department)));
    return departments.filter(dept => dept && dept.trim() !== '');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceStats = () => {
    if (!attendance.length) return { present: 0, absent: 0, late: 0, total: 0 };
    
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    
    return { present, absent, late, total: attendance.length };
  };

  const handleFaceRecognitionResults = (results: any[]) => {
    // Convert face recognition results to attendance records
    const attendanceRecords = results.map(result => {
      const student = students.find(s => s.user_id === result.student_id);
      return {
        user_id: result.student_id,
        class_id: selectedClass?.class_id || '',
        student_name: result.student_name,
        roll_no: student?.roll_no || '',
        department: student?.department || selectedClass?.department || '',
        date: selectedDate,
        subject: selectedSubject,
        class_type: selectedClassType,
        status: result.status,
        marked_by: userData?.user_id || '',
        faculty_name: `${userData?.fname || ''} ${userData?.lname || ''}`.trim() || 'Faculty',
        face_recognition_confidence: result.confidence,
        marked_via: result.confidence > 0 ? 'face_recognition' : 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // Update the attendance state
    setAttendance(attendanceRecords);
    
    // Close the face recognition modal
    setShowFaceRecognition(false);
    
    toast({
      title: "Face Recognition Complete",
      description: `Processed ${results.length} students. Review and save the attendance.`,
    });
  };

  const fetchAttendanceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('marked_by', userData?.user_id)
        .order('created_at', { ascending: false })
        .limit(50); // Get last 50 records

      if (error) throw error;
      
      console.log('Attendance history:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance history.",
        variant: "destructive"
      });
      return [];
    }
  };

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (activeTab === 'view') {
      fetchAttendanceHistory().then(setAttendanceHistory);
    }
  }, [activeTab, userData?.user_id]);

  const stats = getAttendanceStats();

  if (!userData || userData.role !== 'faculty') {
    return null; // Don't render anything if not faculty
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Management</h1>
          <p className="text-gray-600">Mark and manage student attendance for your classes</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="select">Select Class</TabsTrigger>
            <TabsTrigger value="mark" disabled={!selectedClass}>Mark Attendance</TabsTrigger>
            <TabsTrigger value="view">View History</TabsTrigger>
          </TabsList>

          {/* Class Selection Tab */}
          <TabsContent value="select" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Select Class for Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search classes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {getDepartments().map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Classes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    <div className="col-span-full text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading classes...</p>
                    </div>
                  ) : filteredClasses.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900">No classes found</h3>
                      <p className="text-gray-500">Try adjusting your search or filters.</p>
                    </div>
                  ) : (
                    filteredClasses.map(classItem => (
                      <Card
                        key={classItem.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedClass?.id === classItem.id
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedClass(classItem);
                          setActiveTab('mark');
                          setSearchTerm(''); // Reset search when selecting class
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-lg">{classItem.class_name}</h3>
                              <p className="text-sm text-gray-600">{classItem.class_id}</p>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Department:</span>
                                <span className="font-medium">{classItem.department}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Institute:</span>
                                <span className="font-medium">{classItem.institute}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Year:</span>
                                <span className="font-medium">{classItem.academic_year}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Students:</span>
                                <Badge variant="outline">
                                  <Users className="h-3 w-3 mr-1" />
                                  {classItem.student_count}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Marking Tab */}
          <TabsContent value="mark" className="space-y-6">
            {selectedClass ? (
              <>
                {/* Selected Class Info */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {selectedClass.class_name} ({selectedClass.class_id})
                        </h3>
                        <p className="text-sm text-gray-600">
                          {selectedClass.department} • {selectedClass.institute} • {selectedClass.academic_year}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedClass(null);
                          setActiveTab('select');
                        }}
                      >
                        Change Class
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Attendance Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map(subject => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="classType">Class Type</Label>
                        <Select value={selectedClassType} onValueChange={setSelectedClassType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class type" />
                          </SelectTrigger>
                          <SelectContent>
                            {classTypes.map(type => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="search">Search Students</Label>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            id="search"
                            placeholder="Search by name or ID"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-4 pt-4 border-t">
                      <Button
                        onClick={() => setShowFaceRecognition(true)}
                        variant="outline"
                        disabled={!selectedSubject || !selectedClassType}
                        className="bg-blue-50 hover:bg-blue-100"
                      >
                        <Zap className="h-4 w-4 mr-2 text-blue-600" />
                        Smart Face Recognition
                      </Button>
                      <Button
                        onClick={markAllPresent}
                        variant="outline"
                        disabled={!selectedSubject || !selectedClassType}
                        className="bg-green-50 hover:bg-green-100"
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Mark All Present
                      </Button>
                      <Button
                        onClick={saveAllAttendance}
                        disabled={loading || !selectedSubject || !selectedClassType}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Attendance
                      </Button>
                    </div>

                    {/* Stats */}
                    {attendance.length > 0 && (
                      <div className="flex flex-wrap gap-4 pt-4 border-t">
                        <Badge variant="outline" className="bg-green-50">
                          <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          Present: {stats.present}
                        </Badge>
                        <Badge variant="outline" className="bg-red-50">
                          <XCircle className="h-4 w-4 mr-1 text-red-600" />
                          Absent: {stats.absent}
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-50">
                          <Clock className="h-4 w-4 mr-1 text-yellow-600" />
                          Late: {stats.late}
                        </Badge>
                        <Badge variant="outline">
                          <Users className="h-4 w-4 mr-1" />
                          Total Marked: {stats.total}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Student List */}
                {selectedSubject && selectedClassType ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Students ({filteredStudents.length})
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {loading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-500">Loading students...</p>
                          </div>
                        ) : filteredStudents.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Found</h3>
                            <p className="text-gray-500 mb-4">
                              This class doesn't have any students yet.
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              Class ID: {selectedClass?.class_id} • Students in database: {students.length}
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => window.open('/class-management', '_blank')}
                            >
                              Add Students to Class
                            </Button>
                          </div>
                        ) : (
                          filteredStudents.map(student => {
                            const currentStatus = getAttendanceStatus(student.user_id);
                            return (
                              <div key={student.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium">{student.fname} {student.lname}</div>
                                  <div className="text-sm text-gray-500">
                                    ID: {student.roll_no} • {student.course_taken}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {currentStatus && (
                                    <Badge className={getStatusColor(currentStatus)}>
                                      {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                                    </Badge>
                                  )}
                                  
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant={currentStatus === 'present' ? 'default' : 'outline'}
                                      onClick={() => markAttendance(student.user_id, 'present')}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button
                                      size="sm"
                                      variant={currentStatus === 'late' ? 'default' : 'outline'}
                                      onClick={() => markAttendance(student.user_id, 'late')}
                                      className="text-yellow-600"
                                    >
                                      <Clock className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button
                                      size="sm"
                                      variant={currentStatus === 'absent' ? 'default' : 'outline'}
                                      onClick={() => markAttendance(student.user_id, 'absent')}
                                      className="text-red-600"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Subject & Class Type</h3>
                      <p className="text-gray-500 mb-4">Please select both subject and class type to view students.</p>
                      <div className="text-sm text-gray-400">
                        Subject: {selectedSubject || 'Not selected'} • Class Type: {selectedClassType || 'Not selected'}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Class Selected</h3>
                  <p className="text-gray-500 mb-4">Please select a class first to mark attendance.</p>
                  <Button onClick={() => setActiveTab('select')}>
                    Select Class
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Attendance History Tab */}
          <TabsContent value="view" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Records</h3>
                    <p className="text-gray-500">You haven't marked any attendance yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Group by date and subject */}
                    {Object.entries(
                      attendanceHistory.reduce((groups, record) => {
                        const key = `${record.date}_${record.subject}_${record.class_type}`;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(record);
                        return groups;
                      }, {} as Record<string, AttendanceRecord[]>)
                    ).map(([key, records]) => {
                      const [date, subject, classType] = key.split('_');
                      const presentCount = records.filter(r => r.status === 'present').length;
                      const absentCount = records.filter(r => r.status === 'absent').length;
                      const lateCount = records.filter(r => r.status === 'late').length;
                      
                      return (
                        <Card key={key} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-semibold text-lg">{subject}</h3>
                                <p className="text-sm text-gray-600">{classType} • {date}</p>
                              </div>
                              <Badge variant="outline">
                                {records.length} students
                              </Badge>
                            </div>
                            
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-green-700">Present: {presentCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-red-700">Absent: {absentCount}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <span className="text-yellow-700">Late: {lateCount}</span>
                              </div>
                            </div>
                            
                            {/* Show student details */}
                            <details className="mt-3">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                View student details
                              </summary>
                              <div className="mt-3 space-y-2">
                                {records.map(record => (
                                  <div key={`${record.user_id}_${record.date}_${record.subject}`} 
                                       className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="font-medium">{record.student_name}</span>
                                    <Badge className={getStatusColor(record.status)}>
                                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Face Recognition Modal */}
      {showFaceRecognition && selectedClass && selectedSubject && selectedClassType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto">
            <MassFaceRecognitionComponent
              classId={selectedClass.class_id}
              className={selectedClass.class_name}
              subject={selectedSubject}
              classType={selectedClassType}
              date={selectedDate}
              facultyId={userData?.user_id || ''}
              facultyName={`${userData?.fname || ''} ${userData?.lname || ''}`.trim() || 'Faculty'}
              onAttendanceSaved={handleFaceRecognitionResults}
              onClose={() => setShowFaceRecognition(false)}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Attendance;