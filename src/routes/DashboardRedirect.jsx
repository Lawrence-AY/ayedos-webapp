import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getPostLoginPath } from "../utils/dashboardRoutes.js";

export default function DashboardRedirect() {
  const { user } = useContext(AuthContext);

  return <Navigate to={getPostLoginPath(user)} replace />;
}
