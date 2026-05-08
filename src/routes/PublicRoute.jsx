import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";

export default function PublicRoute({ element }) {
  const { user, accessToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return null;
  }

  if (accessToken && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return element;
}
