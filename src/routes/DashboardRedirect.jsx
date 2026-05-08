import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { getDashboardPath } from "../utils/dashboardRoutes.js";

export default function DashboardRedirect() {
  const { user } = useContext(AuthContext);

  return <Navigate to={getDashboardPath(user?.role)} replace />;
}
