import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getDashboardPath, getPostLoginPath } from "../utils/dashboardRoutes.js";

export default function DashboardRedirect() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (user?.mustChangePassword) {
    const targetPath = getDashboardPath(user.role, "security");
    return location.pathname === targetPath ? null : <Navigate to={targetPath} replace />;
  }

  const targetPath = getPostLoginPath(user);
  return location.pathname === targetPath ? null : <Navigate to={targetPath} replace />;
}
