import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getPostLoginPath } from "../utils/dashboardRoutes.js";

export default function PublicRoute({ element }) {
  const { user, accessToken, isLoading } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (accessToken && user) {
    const targetPath = getPostLoginPath(user);
    return location.pathname === targetPath ? element : <Navigate to={targetPath} replace />;
  }

  return element;
}
