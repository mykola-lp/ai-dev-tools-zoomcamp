import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import ProtectedLayout from "./layout/ProtectedLayout";
import AdminPage from "./pages/AdminPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import BoardPage from "./pages/BoardPage";
import ChoresPage from "./pages/ChoresPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminRoute from "./routes/AdminRoute";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/assignments" replace />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/chores" element={<ChoresPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
