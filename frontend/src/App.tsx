import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AdminDashboard } from "./pages/AdminDashboard";
import { EventDetail } from "./pages/EventDetail";
import { MemberDashboard } from "./pages/MemberDashboard";
import { MemberEvent } from "./pages/MemberEvent";
import { GalleryAccess } from "./pages/GalleryAccess";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/gallery/:slug" element={<GalleryAccess />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/:eventId"
            element={
              <ProtectedRoute role="ADMIN">
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member"
            element={
              <ProtectedRoute role="MEMBER">
                <MemberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/events/:eventId"
            element={
              <ProtectedRoute role="MEMBER">
                <MemberEvent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
