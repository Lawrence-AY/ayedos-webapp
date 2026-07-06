import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getPostLoginPath } from "../utils/dashboardRoutes.js";

export default function PublicRoute({ element }) {
  const { user, accessToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return null;
  }

  if (accessToken && user) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return element;
}
