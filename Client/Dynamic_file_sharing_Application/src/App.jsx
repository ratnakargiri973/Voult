import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./Routes/protectedRoute.jsx";
import SignInWithOTP from "./Auth/SignInWithOtp.jsx"
import FileManager from './FIleManager/FileManager.jsx'
import Dashboard from "./Dashboard/Dashboard.jsx";
import ShareModal from "./FIleManager/ShareModal.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public */}
        <Route path="/login" element={<SignInWithOTP />} />

        {/* Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}