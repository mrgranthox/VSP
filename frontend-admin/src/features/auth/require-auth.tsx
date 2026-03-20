import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { clearStoredSession, useStoredSession } from "@/lib/auth-storage";
import { ApiClientError } from "@/lib/api";
import { useCurrentAdmin } from "@/features/auth/auth";

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="glass-panel flex items-center gap-3 px-6 py-4 text-sm font-medium text-white">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-400" />
      Restoring your admin session
    </div>
  </div>
);

const RequireAuth = () => {
  const session = useStoredSession();
  const location = useLocation();
  const meQuery = useCurrentAdmin();

  useEffect(() => {
    if (meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
      clearStoredSession();
    }
  }, [meQuery.error]);

  if (!session?.accessToken) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (meQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (meQuery.isError) {
    return <Navigate replace state={{ from: location.pathname }} to="/session-expired" />;
  }

  if ((meQuery.data?.roles.length ?? 0) === 0) {
    return <Navigate replace to="/access-denied" />;
  }

  return <Outlet />;
};

export { LoadingScreen, RequireAuth };
