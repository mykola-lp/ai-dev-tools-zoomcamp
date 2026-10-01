import { Link, Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { useRealtime } from "../realtime/useRealtime";

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuth();
  const { state } = useRealtime();

  if (loading) {
    return <p className="empty-state">Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-links">
          <Link to="/assignments">Assignments</Link>
          <Link to="/chores">Chores</Link>
          <Link to="/board">Board</Link>

          {user.role === "admin" && <Link to="/admin">Admin</Link>}
        </div>

        <button className="button button-quiet" onClick={logout}>
          Log out
        </button>
      </nav>

      {state !== "open" && (
        <p className="status-line" role="status">
          Reconnecting…
        </p>
      )}

      <Outlet />
    </div>
  );
}
