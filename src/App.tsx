  import { Toaster } from "@/components/ui/toaster";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
  import { useEffect } from "react";
  import { useUser } from './UserContext';

  import Login from "./pages/Login";
  import SignupForm from "./pages/signuph";
  import Index from "./pages/Index";
  import Schedule from "./pages/Schedule";
  import Courses from "./pages/Courses";
  import Resources from "./pages/Resources";
  import Events from "./pages/Events";
  import Profile from "./pages/Profile";
  import NotFound from "./pages/NotFound";
  import Reports from "./pages/Reports";
  import Libraries from "./pages/Libraries";
  import LostFound from "./pages/LostFound";
  import EmergencyAlerts from "./pages/EmergencyAlerts";
  import ProblemDashboard from "./pages/problem";
  import { UserProvider } from "./UserContext";
  import MyReports from './pages/MyReports';
  import AdminPage from './pages/AdminPage';
  import DataAnalysis from './pages/DataAnalysis';
import AcademicEve from './pages/academic_eve';
import CareerEve from './pages/career_eve';
import SocialEve from './pages/social_eve';
import AllEve from './pages/all_eve';
import Community from './pages/Community';
import Sem4 from './pages/sam_4';
import Attendance from './pages/Attendance';
import ClassManagement from './pages/ClassManagement';
import ViewAttendance from './pages/ViewAttendance';
  const queryClient = new QueryClient();

  const SessionRedirectHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
      const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

      // If logged in, redirect to /Index when trying to access login/signup
      if (isLoggedIn && (location.pathname === "/" || location.pathname === "/signup")) {
        navigate("/Index", { replace: true });

        // Replace current history entry with /Index to prevent going back
        window.history.replaceState(null, "", "/Index");

        // Ensure that whenever the back button is clicked, the user is redirected to /Index
        window.onpopstate = () => {
          // Push the same /Index state back to the history so user can't go back
          window.history.pushState(null, "", "/Index");
          // Manually navigate to the /Index route to ensure user stays there
          navigate("/Index", { replace: true });
        };

      }
      
      // If not logged in and trying to access protected routes, redirect to login
      if (!isLoggedIn && location.pathname !== "/" && location.pathname !== "/signup") {
        navigate("/", { replace: true });
      }
    }, [navigate, location]);

    return null;
  };

  function ProblemsOrMyReports() {
    const { userData } = useUser();
    if (userData?.role === 'admin') {
      return <ProblemDashboard />;
    } else {
      return <MyReports />;
    }
  }

  function FacultyRoute({ children }) {
    const { userData } = useUser();
    if (userData?.role === 'faculty') {
      return children;
    } else {
      return <Navigate to="/Index" replace />;
    }
  }

  function AdminRoute({ children }) {
    const { userData } = useUser();
    if (userData?.role === 'admin') {
      return children;
    } else {
      return <Navigate to="/Index" replace />;
    }
  }

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <UserProvider>
        <SessionRedirectHandler />

        <Routes>
            {/* <Route path="/" element={<Index />} /> */}
            <Route path="/" element={<Login/>} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/Index" element={<Index />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/events" element={<Events />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/libraries" element={<Libraries />} />
            <Route path="/lost-found" element={<LostFound />} />
            <Route path="/emergency" element={<EmergencyAlerts />} />
            <Route path="/problems" element={<ProblemsOrMyReports />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/all_eve" element={<AllEve />} />
            <Route path="/AdminPage" element={<AdminPage />} />
            <Route path="/community" element={<Community />} />
            <Route path="/academic_eve" element={<AcademicEve />} />
            <Route path="/career_eve" element={<CareerEve />} />
            <Route path="/social_eve" element={<SocialEve />} />
            <Route path="/sem_4" element={<Sem4 />} /> {/* Added route for Semester 4 */}
            <Route path="/attendance" element={<FacultyRoute><Attendance /></FacultyRoute>} />
            <Route path="/class-management" element={<AdminRoute><ClassManagement /></AdminRoute>} />
            <Route path="/view-attendance" element={<ViewAttendance />} />
            <Route path="/data-analysis" element={<AdminRoute><DataAnalysis /></AdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>

        </UserProvider>
          
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );

  export default App;
