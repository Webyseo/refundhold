export const membershipRoles = [
  "OWNER",
  "ADMIN",
  "REVIEWER",
  "VIEWER",
] as const;

export type MembershipRole = (typeof membershipRoles)[number];

type Permission =
  | "viewDashboard"
  | "reviewActionRequests"
  | "executeRefunds"
  | "managePolicies"
  | "manageConnectors"
  | "manageMembers";

const permissionsByRole: Record<MembershipRole, readonly Permission[]> = {
  OWNER: [
    "viewDashboard",
    "reviewActionRequests",
    "executeRefunds",
    "managePolicies",
    "manageConnectors",
    "manageMembers",
  ],
  ADMIN: [
    "viewDashboard",
    "reviewActionRequests",
    "executeRefunds",
    "managePolicies",
    "manageConnectors",
  ],
  REVIEWER: ["viewDashboard", "reviewActionRequests", "executeRefunds"],
  VIEWER: ["viewDashboard"],
};

export function isMembershipRole(value: unknown): value is MembershipRole {
  return (
    typeof value === "string" &&
    membershipRoles.includes(value as MembershipRole)
  );
}

export function canViewDashboard(role: MembershipRole): boolean {
  return hasPermission(role, "viewDashboard");
}

export function canReviewActionRequests(role: MembershipRole): boolean {
  return hasPermission(role, "reviewActionRequests");
}

export function canExecuteRefunds(role: MembershipRole): boolean {
  return hasPermission(role, "executeRefunds");
}

export function canManagePolicies(role: MembershipRole): boolean {
  return hasPermission(role, "managePolicies");
}

export function canManageConnectors(role: MembershipRole): boolean {
  return hasPermission(role, "manageConnectors");
}

export function canManageMembers(role: MembershipRole): boolean {
  return hasPermission(role, "manageMembers");
}

function hasPermission(role: MembershipRole, permission: Permission): boolean {
  return permissionsByRole[role].includes(permission);
}
