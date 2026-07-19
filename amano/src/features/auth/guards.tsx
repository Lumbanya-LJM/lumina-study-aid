import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./store";

/** Gate for the authenticated shell — preserves return-to intent. */
export function RequireAuth() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) {
    return <Navigate to="/auth" state={{ returnTo: location.pathname }} replace />;
  }
  return <Outlet />;
}

/** Auth pages bounce signed-in users straight into the app. */
export function RedirectIfAuthed() {
  const user = useAuth((s) => s.user);
  if (user) return <Navigate to={user.onboarded ? "/home" : "/onboarding"} replace />;
  return <Outlet />;
}
