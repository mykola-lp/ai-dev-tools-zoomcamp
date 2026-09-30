import { Link, Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <p>Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <nav>
        <Link to="/assignments">Assignments</Link>
        <Link to="/chores">Chores</Link>
        <Link to="/board">Board</Link>
        {user.role === "admin" && <Link to="/admin">Admin</Link>}
        <button onClick={logout}>Log out</button>
      </nav>
      <Outlet />
    </div>
  );
}
