import * as React from 'react';

import { Link } from 'react-router-dom';
import { Menu, X, Bell, User, Flag, Book, Search, HelpCircle, AlertTriangle, AlertCircle, BookOpen, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/UserContext';


import { 
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {

  const { userData } = useUser();
  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-900/90">
      <div className="container flex items-center justify-between h-16 mx-auto px-4">
        <div className="flex items-center gap-2">
          
          
          <Link to="/Index" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-campusblue-600 dark:text-campusblue-400">Campus<span className="text-gradient">Ease</span></span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/Index" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Home</Link>
          <Link to="/schedule" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Schedule</Link>
          <Link to="/courses" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Courses</Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-sm font-medium hover:text-campusblue-500 hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20">
                Services
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900">
              <DropdownMenuItem asChild>
                <Link to="/libraries" className="flex items-center gap-2 hover:text-campusblue-500">
                  <Book className="h-4 w-4" />
                  <span>Libraries</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/lost-found" className="flex items-center gap-2 hover:text-campusblue-500">
                  <Search className="h-4 w-4" />
                  <span>Lost & Found</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/community" className="flex items-center gap-2 hover:text-campusblue-500">
                  <MessageSquare className="h-4 w-4" />
                  <span>Community Chat</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/reports" className="flex items-center gap-2 hover:text-campusblue-500">
                  <Flag className="h-4 w-4" />
                  <span>Report System</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/emergency" className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-red-500" />
                  <span className="text-red-500 font-medium">Emergency Alerts</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/problems" className="flex items-center gap-2 hover:text-campusblue-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>Problems</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link to="/resources" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Resources</Link>
          <Link to="/events" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Events</Link>
          {userData?.role === 'faculty' && (
            <Link to="/attendance" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Mark Attendance</Link>
          )}
          {userData?.role === 'student' && (
            <Link to="/view-attendance" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">My Attendance</Link>
          )}
          {userData?.role === 'admin' && (
            <>
              <Link to="/class-management" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Class Management</Link>
              <Link to="/data-analysis" className="px-3 py-2 text-sm font-medium hover:text-campusblue-500 rounded-md hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20 transition-colors">Data Analysis</Link>
            </>
          )}
        </nav>
        
        <div className="flex items-center gap-2">
          <Link to="/emergency">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-red-500" />
              <span className="notification-dot animate-pulse"></span>
              <span className="sr-only">Emergency Alerts</span>
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="hover:bg-campusblue-50 dark:hover:bg-campusblue-900/20">
              <User className="h-5 w-5" />
              <span className="sr-only">Profile</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
