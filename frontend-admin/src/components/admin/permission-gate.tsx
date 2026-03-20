import { type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useCurrentAdmin } from "@/features/auth/auth";
import { LoadingScreen } from "@/features/auth/require-auth";
import { hasPermission } from "@/lib/admin-permissions";

interface PermissionGateProps extends PropsWithChildren {
  permission?: string;
  fallbackTo?: string;
}

const PermissionGate = ({ permission, fallbackTo = "/access-denied", children }: PermissionGateProps) => {
  const location = useLocation();
  const adminQuery = useCurrentAdmin();

  if (adminQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (!hasPermission(adminQuery.data?.roles ?? [], permission)) {
    return <Navigate replace state={{ from: location.pathname }} to={fallbackTo} />;
  }

  return <>{children}</>;
};

export { PermissionGate };
