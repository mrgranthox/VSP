import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, UserRoundCog } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useCurrentAdmin } from "@/features/auth/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError } from "@/lib/api";
import { hasPermission } from "@/lib/admin-permissions";
import { formatDateTime, formatDisplayName, formatNumber } from "@/lib/utils";
import type { AdminPermissionItem, AdminRoleItem, AdminUserListItem } from "@/types/admin";

const handleActionError = (error: unknown, fallback: string) => {
  if (isMfaRequiredError(error)) {
    toast.error("This action requires MFA verification from My Profile.");
    return;
  }

  toast.error(getApiErrorMessage(error, fallback));
};

const permissionGroupOrder = [
  "ANALYTICS",
  "USER",
  "WORKER",
  "REPORT",
  "MODERATION",
  "SUPPORT",
  "CONFIG",
  "FEATURE",
  "CITY",
  "ROLE",
  "ADMIN",
  "SERVICE",
  "BOOKING",
  "FRAUD",
  "SYSTEM",
  "CONTENT",
  "NOTIFICATION"
];

const AccessControlPage = () => {
  const location = useLocation();
  const { roleId, userId } = useParams();
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();
  const rolesGranted = adminQuery.data?.roles ?? [];
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("");
  const deferredUserSearch = useDeferredValue(userSearch);

  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => apiRequest<AdminRoleItem[]>("/admin/roles")
  });
  const permissionsQuery = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => apiRequest<AdminPermissionItem[]>("/admin/permissions")
  });
  const usersQuery = useQuery({
    queryKey: ["admin", "users", "access", deferredUserSearch],
    queryFn: () =>
      apiPaginatedRequest<AdminUserListItem>(
        `/admin/users?page=1&limit=12${deferredUserSearch.trim() ? `&q=${encodeURIComponent(deferredUserSearch.trim())}` : ""}`
      )
  });

  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];
  const users = usersQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedRoleId && roles[0]) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (roleId && roles.some((role) => role.id === roleId)) {
      setSelectedRoleId(roleId);
    }
  }, [roleId, roles]);

  useEffect(() => {
    if (!selectedUserId && users[0]) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    if (userId && users.some((user) => user.id === userId)) {
      setSelectedUserId(userId);
    }
  }, [userId, users]);

  useEffect(() => {
    if (!roleToAssign && roles[0]) {
      setRoleToAssign(roles[0].roleKey);
    }
  }, [roleToAssign, roles]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, AdminPermissionItem[]>();

    permissions.forEach((permission) => {
      const prefix = permission.permissionKey.split("_")[0] ?? "OTHER";
      groups.set(prefix, [...(groups.get(prefix) ?? []), permission]);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      const left = permissionGroupOrder.indexOf(a[0]);
      const right = permissionGroupOrder.indexOf(b[0]);

      if (left === -1 && right === -1) {
        return a[0].localeCompare(b[0]);
      }

      if (left === -1) {
        return 1;
      }

      if (right === -1) {
        return -1;
      }

      return left - right;
    });
  }, [permissions]);

  const updatePermissionsMutation = useMutation({
    mutationFn: (permissionKeys: string[]) =>
      apiRequest(`/admin/roles/${selectedRole?.id}/permissions`, {
        method: "PATCH",
        body: { permissionKeys }
      }),
    onSuccess: async () => {
      toast.success("Role permissions updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
    onError: (error) => handleActionError(error, "Unable to update role permissions")
  });

  const assignRoleMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/users/${selectedUser?.id}/roles`, {
        method: "POST",
        body: { roleKey: roleToAssign }
      }),
    onSuccess: async () => {
      toast.success("Admin role assigned");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "access"] });
    },
    onError: (error) => handleActionError(error, "Unable to assign role")
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleKey: string) => {
      const roleId = roles.find((role) => role.roleKey === roleKey)?.id;

      if (!roleId || !selectedUser?.id) {
        throw new Error("Role record not found");
      }

      return apiRequest(`/admin/users/${selectedUser.id}/roles/${roleId}`, {
        method: "DELETE"
      });
    },
    onSuccess: async () => {
      toast.success("Admin role removed");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "access"] });
    },
    onError: (error) => handleActionError(error, "Unable to remove role")
  });

  const selectedRolePermissions = new Set(selectedRole?.permissionKeys ?? []);
  const canUpdateRolePermissions = hasPermission(rolesGranted, "ROLE_PERMISSION_UPDATE");
  const canAssignAdminRole = hasPermission(rolesGranted, "ADMIN_ROLE_ASSIGN");
  const canRemoveAdminRole = hasPermission(rolesGranted, "ADMIN_ROLE_REMOVE");
  const isPermissionsCatalogView = location.pathname === "/access-control/permissions";
  const isRolePermissionEditorView = location.pathname.includes("/roles/") && location.pathname.endsWith("/permissions");
  const isAdminRoleAssignmentView = location.pathname.includes("/users/") && location.pathname.endsWith("/roles");
  const pageTitle = isRolePermissionEditorView ? "Role Permission Editor" : isAdminRoleAssignmentView ? "Admin Role Assignment" : isPermissionsCatalogView ? "Permissions Catalog" : "Access Control";
  const pageSubtitle = isRolePermissionEditorView
    ? "Focused role-permission editing lane with MFA-gated backend updates."
    : isAdminRoleAssignmentView
      ? "Assign and remove admin roles for a single user with live backend enforcement."
      : isPermissionsCatalogView
        ? "Permission catalog and grouping view across the admin RBAC surface."
        : "Role catalog, permission matrix, and admin-role assignment flows for super admins and ops leads.";

  return (
    <div className="space-y-6">
      <PageHeader subtitle={pageSubtitle} title={pageTitle} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className={`overflow-hidden border-white/70 bg-white/95 ${isAdminRoleAssignmentView ? "xl:order-2" : "xl:order-1"}`}>
          <CardHeader>
            <CardTitle>Role editor</CardTitle>
            <CardDescription>Every backend role and permission is surfaced here, including FULL_ACCESS for the super-admin lane.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              {roles.map((role) => (
                <button
                  className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                    selectedRole?.id === role.id ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                  }`}
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{role.label}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{role.roleKey}</p>
                    </div>
                    <Badge variant={role.roleKey === "SUPER_ADMIN" ? "purple" : "blue"}>{formatNumber(role.permissionKeys.length)} perms</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{role.description}</p>
                </button>
              ))}
            </div>

            {selectedRole ? (
              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{selectedRole.label}</p>
                    <p className="text-sm text-slate-500">{selectedRole.description}</p>
                  </div>
                  {selectedRole.roleKey === "SUPER_ADMIN" ? <Badge variant="purple">Immutable</Badge> : null}
                </div>

                <div className="space-y-5">
                  {groupedPermissions.map(([group, entries]) => (
                    <div className="space-y-3" key={group}>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{group}</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {entries.map((permission) => {
                          const enabled = selectedRolePermissions.has(permission.permissionKey);

                          return (
                            <label className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3" key={permission.id}>
                              <input
                                checked={enabled}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                disabled={selectedRole.roleKey === "SUPER_ADMIN" || !canUpdateRolePermissions}
                                onChange={() => {
                                  const next = new Set(selectedRolePermissions);

                                  if (enabled) {
                                    next.delete(permission.permissionKey);
                                  } else {
                                    next.add(permission.permissionKey);
                                  }

                                  updatePermissionsMutation.mutate(Array.from(next));
                                }}
                                type="checkbox"
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{permission.permissionKey}</p>
                                <p className="text-sm text-slate-500">{permission.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className={`overflow-hidden border-white/70 bg-white/95 ${isAdminRoleAssignmentView ? "xl:order-1" : "xl:order-2"}`}>
          <CardHeader>
            <CardTitle>Admin assignments</CardTitle>
            <CardDescription>Search users, inspect current admin-role allocation, and assign or remove roles safely.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Input onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by email or profile name" value={userSearch} />
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Users loaded</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{formatNumber(usersQuery.data?.pagination.total ?? 0)}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {users.map((user) => (
                <button
                  className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                    selectedUser?.id === user.id ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{formatDisplayName(user.profile, user.email ?? "Unknown user")}</p>
                      <p className="mt-1 text-sm text-slate-500">{user.email ?? "No email recorded"}</p>
                    </div>
                    <Badge variant={user.roles.length ? "green" : "slate"}>{user.roles.length ? user.roles.join(" · ") : "No admin role"}</Badge>
                  </div>
                </button>
              ))}
            </div>

            {selectedUser ? (
              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{formatDisplayName(selectedUser.profile, selectedUser.email ?? "Unknown user")}</p>
                    <p className="text-sm text-slate-500">{selectedUser.email ?? "No email recorded"}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Updated {formatDateTime(selectedUser.updatedAt)}</p>
                  </div>
                  <Shield className="h-5 w-5 text-slate-400" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.length ? (
                    selectedUser.roles.map((roleKey) => (
                      <button disabled={!canRemoveAdminRole} key={roleKey} onClick={() => removeRoleMutation.mutate(roleKey)} type="button">
                        <Badge className="cursor-pointer transition hover:opacity-80" variant={roleKey === "SUPER_ADMIN" ? "purple" : "blue"}>
                          {roleKey} x
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <Badge>No admin roles assigned</Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Select onChange={(event) => setRoleToAssign(event.target.value)} value={roleToAssign}>
                    {roles.map((role) => (
                      <option key={role.id} value={role.roleKey}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                  <Button disabled={assignRoleMutation.isPending || !roleToAssign || !canAssignAdminRole} onClick={() => assignRoleMutation.mutate()}>
                    <UserRoundCog className="h-4 w-4" />
                    Assign role
                  </Button>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {canUpdateRolePermissions || canAssignAdminRole || canRemoveAdminRole
                    ? "Dangerous access-control actions are still MFA-protected by the backend."
                    : "This role can inspect access control but cannot change assignments or permissions."}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { AccessControlPage };
