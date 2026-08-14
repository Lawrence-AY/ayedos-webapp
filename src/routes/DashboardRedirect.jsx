import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getDashboardPath, getPostLoginPath } from "../utils/dashboardRoutes.js";

export default function DashboardRedirect() {
  const { user } = useContext(AuthContext);

  if (user?.mustChangePassword) {
    return <Navigate to={getDashboardPath(user.role, "security")} replace />;
  }

  return <Navigate to={getPostLoginPath(user)} replace />;
}
