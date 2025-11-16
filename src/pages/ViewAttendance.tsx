import React, { useState, useEffect } from 'react';
import { useUser } from '../UserContext';
import { supabase } from '../supabase/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, Users, TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AttendanceRecord {
  id?: string;
  user_id: string;
  student_name: string;
  roll_no?: string;
  department?: string;
  date: string;
  subject: string;
  class_type: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  faculty_name?: string;
  class_id: string;
  created_at?: string;
  updated_at?: string;
}

interface AttendanceStats {
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  lateClasses: number;
  attendancePercentage: number;
}

const ViewAttendance: React.FC = () => {
  const { userData } = useUser();
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  
  // Filter states
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Get unique values for filters
  const uniqueSubjects = [...new Set(attendanceRecords.map(record => record.subject))];
  const uniqueMonths = [...new Set(attendanceRecords.map(record => {
    const date = new Date(record.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }))];

  const fetchAttendanceRecords = async () => {
    if (!userData || userData.role !== 'student') {
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching attendance for student:', userData.user_id);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userData.user_id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        toast({
          title: "Error",
          description: "Failed to fetch attendance records.",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched attendance records:', data);
      setAttendanceRecords(data || []);
      setFilteredRecords(data || []);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...attendanceRecords];

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(record => record.subject === selectedSubject);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(record => {
        const recordMonth = `${new Date(record.date).getFullYear()}-${String(new Date(record.date).getMonth() + 1).padStart(2, '0')}`;
        return recordMonth === selectedMonth;
      });
    }

    setFilteredRecords(filtered);
  }, [selectedSubject, selectedStatus, selectedMonth, attendanceRecords]);

  // Calculate statistics
  const calculateStats = (): AttendanceStats => {
    const stats = filteredRecords.reduce(
      (acc, record) => {
        acc.totalClasses++;
        if (record.status === 'present') acc.presentClasses++;
        else if (record.status === 'absent') acc.absentClasses++;
        else if (record.status === 'late') acc.lateClasses++;
        return acc;
      },
      { totalClasses: 0, presentClasses: 0, absentClasses: 0, lateClasses: 0, attendancePercentage: 0 }
    );

    stats.attendancePercentage = stats.totalClasses > 0 
      ? Math.round(((stats.presentClasses + stats.lateClasses) / stats.totalClasses) * 100)
      : 0;

    return stats;
  };

  const stats = calculateStats();

  useEffect(() => {
    if (userData && userData.role === 'student') {
      fetchAttendanceRecords();
    }
  }, [userData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Late</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatMonthYear = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
  };

  if (!userData || userData.role !== 'student') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-gray-600">This page is only available for students.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Attendance</h1>
          <p className="text-gray-600">Track your class attendance and performance</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attendance records...</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="records">Attendance Records</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Classes</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Present</p>
                        <p className="text-2xl font-bold text-green-600">{stats.presentClasses}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Absent</p>
                        <p className="text-2xl font-bold text-red-600">{stats.absentClasses}</p>
                      </div>
                      <TrendingDown className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Attendance %</p>
                        <p className={`text-2xl font-bold ${stats.attendancePercentage >= 75 ? 'text-green-600' : stats.attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {stats.attendancePercentage}%
                        </p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stats.attendancePercentage >= 75 ? 'bg-green-100' : stats.attendancePercentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                        <span className={`text-sm font-bold ${stats.attendancePercentage >= 75 ? 'text-green-600' : stats.attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          %
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                  <CardDescription>Your most recent class attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
                      <p className="text-gray-600">Your attendance records will appear here once faculty marks attendance.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRecords.slice(0, 5).map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(record.status)}
                            <div>
                              <h4 className="font-medium text-gray-900">{record.subject}</h4>
                              <p className="text-sm text-gray-600">
                                {record.class_type} • {formatDate(record.date)}
                              </p>
                              {record.faculty_name && (
                                <p className="text-xs text-gray-500">By: {record.faculty_name}</p>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Subject</label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {uniqueSubjects.map(subject => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Month</label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Months" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {uniqueMonths.map(month => (
                            <SelectItem key={month} value={month}>{formatMonthYear(month)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedSubject('all');
                        setSelectedStatus('all');
                        setSelectedMonth('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Records */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    Showing {filteredRecords.length} of {attendanceRecords.length} records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No records match your filters</h3>
                      <p className="text-gray-600">Try adjusting your filter criteria.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRecords.map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(record.status)}
                            <div>
                              <h4 className="font-medium text-gray-900">{record.subject}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(record.date)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {record.class_type}
                                </span>
                              </div>
                              {record.faculty_name && (
                                <p className="text-xs text-gray-500 mt-1">Faculty: {record.faculty_name}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(record.status)}
                            {record.created_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                Marked on {new Date(record.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject-wise Attendance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Subject-wise Attendance</CardTitle>
                    <CardDescription>Attendance percentage by subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {uniqueSubjects.length === 0 ? (
                      <p className="text-gray-600 text-center py-4">No data available</p>
                    ) : (
                      <div className="space-y-4">
                        {uniqueSubjects.map(subject => {
                          const subjectRecords = attendanceRecords.filter(r => r.subject === subject);
                          const presentCount = subjectRecords.filter(r => r.status === 'present' || r.status === 'late').length;
                          const percentage = subjectRecords.length > 0 ? Math.round((presentCount / subjectRecords.length) * 100) : 0;
                          
                          return (
                            <div key={subject} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{subject}</span>
                                <span className={`font-bold ${percentage >= 75 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {percentage}% ({presentCount}/{subjectRecords.length})
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${percentage >= 75 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trends</CardTitle>
                    <CardDescription>Attendance percentage by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {uniqueMonths.length === 0 ? (
                      <p className="text-gray-600 text-center py-4">No data available</p>
                    ) : (
                      <div className="space-y-4">
                        {uniqueMonths.map(month => {
                          const monthRecords = attendanceRecords.filter(r => {
                            const recordMonth = `${new Date(r.date).getFullYear()}-${String(new Date(r.date).getMonth() + 1).padStart(2, '0')}`;
                            return recordMonth === month;
                          });
                          const presentCount = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
                          const percentage = monthRecords.length > 0 ? Math.round((presentCount / monthRecords.length) * 100) : 0;
                          
                          return (
                            <div key={month} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{formatMonthYear(month)}</span>
                                <span className={`font-bold ${percentage >= 75 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {percentage}% ({presentCount}/{monthRecords.length})
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${percentage >= 75 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                  <CardDescription>Overall attendance performance analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${stats.attendancePercentage >= 75 ? 'bg-green-100' : stats.attendancePercentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                        <span className={`text-xl font-bold ${stats.attendancePercentage >= 75 ? 'text-green-600' : stats.attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {stats.attendancePercentage}%
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Overall Attendance</h3>
                      <p className="text-sm text-gray-600">
                        {stats.attendancePercentage >= 75 ? 'Excellent attendance!' : 
                         stats.attendancePercentage >= 50 ? 'Good, but room for improvement' : 
                         'Needs improvement'}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-blue-100">
                        <span className="text-xl font-bold text-blue-600">{stats.totalClasses}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Total Classes</h3>
                      <p className="text-sm text-gray-600">Classes attended so far</p>
                    </div>

                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${stats.lateClasses === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        <span className={`text-xl font-bold ${stats.lateClasses === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {stats.lateClasses}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Late Arrivals</h3>
                      <p className="text-sm text-gray-600">
                        {stats.lateClasses === 0 ? 'Always on time!' : 'Try to arrive on time'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ViewAttendance;