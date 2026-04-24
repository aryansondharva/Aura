import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Features from "./pages/Features"
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Signin from "./pages/Signin";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import Todo from "./pages/Todo";
import Topics from "./pages/Topics";
import Exam from "./pages/Exam";
import Progress from "./pages/Progress";
import Archive from "./pages/Archive";
import Study_Metrics from "./pages/StudyMetrics";
import Settings from "./pages/Settings";
import Developers from "./pages/Developers";
import VoiceAssistant from "./components/VoiceAssistant";
import ExamReadiness from "./pages/ExamReadiness";
import SharedAnalysis from "./pages/SharedAnalysis";
import JavaPractice from "./pages/JavaPractice";
import JavaImportantPdfs from "./pages/JavaImportantPdfs";
import JavaAssignments from "./pages/JavaAssignments";
import SevenMarksJava from "./pages/SevenMarksJava";

function App() {
  return (
    <Router>
      <VoiceAssistant />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/developers" element={<Developers />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/todo" element={<Todo />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/studymetrics" element={<Study_Metrics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/exam-readiness" element={<ProtectedRoute><ExamReadiness /></ProtectedRoute>} />
        <Route path="/java-practice" element={<JavaPractice />} />
        <Route path="/java-important-pdfs" element={<JavaImportantPdfs />} />
        <Route path="/java-assignments" element={<JavaAssignments />} />
        <Route path="/7_marks_java" element={<SevenMarksJava />} />
        <Route path="/shared/:token" element={<SharedAnalysis />} />
        
      </Routes>
    </Router>
  );
}

export default App;

