import type { RoleKey } from "@prisma/client";
import type { Route } from "next";

export type AppRoute =
  | "/"
  | "/customers"
  | "/products"
  | "/inventory"
  | "/orders"
  | "/invoices"
  | `/invoices/${string}`
  | "/deliveries"
  | "/reports"
  | "/staff"
  | "/payroll"
  | "/settings"
  | "/communications"
  | "/delivery-mobile";

export type NavItem = {
  href: AppRoute;
  label: string;
  roles: RoleKey[];
};

export const roleHomeMap: Record<RoleKey, Route> = {
  ADMIN: "/",
  SALES: "/orders",
  WAREHOUSE: "/inventory",
  DELIVERY: "/delivery-mobile",
  HR: "/payroll",
  FINANCE: "/invoices",
  MANAGER: "/reports"
};

export const navItems: readonly NavItem[] = [
  { href: "/", label: "Dashboard", roles: ["ADMIN", "SALES", "WAREHOUSE", "FINANCE", "MANAGER"] },
  { href: "/customers", label: "Customers", roles: ["ADMIN", "SALES", "MANAGER"] },
  { href: "/products", label: "Products", roles: ["ADMIN", "SALES", "WAREHOUSE", "MANAGER"] },
  { href: "/inventory", label: "Inventory", roles: ["ADMIN", "WAREHOUSE", "MANAGER"] },
  { href: "/orders", label: "Orders", roles: ["ADMIN", "SALES", "WAREHOUSE", "MANAGER"] },
  { href: "/invoices", label: "Invoices", roles: ["ADMIN", "SALES", "FINANCE", "MANAGER"] },
  { href: "/deliveries", label: "Deliveries", roles: ["ADMIN", "WAREHOUSE", "SALES", "MANAGER"] },
  { href: "/communications", label: "Comms", roles: ["ADMIN", "SALES", "FINANCE", "MANAGER", "WAREHOUSE"] },
  { href: "/reports", label: "Reports", roles: ["ADMIN", "FINANCE", "MANAGER"] },
  { href: "/staff", label: "Staff", roles: ["ADMIN", "HR", "MANAGER"] },
  { href: "/payroll", label: "Payroll", roles: ["ADMIN", "HR", "FINANCE"] },
  { href: "/settings", label: "Settings", roles: ["ADMIN"] },
  { href: "/delivery-mobile", label: "Driver View", roles: ["ADMIN", "DELIVERY"] }
] as const;

const allowedPrefixes: Record<RoleKey, string[]> = {
  ADMIN: ["/"],
  SALES: ["/", "/customers", "/products", "/orders", "/invoices", "/deliveries", "/communications"],
  WAREHOUSE: ["/", "/products", "/inventory", "/orders", "/deliveries", "/communications"],
  DELIVERY: ["/delivery-mobile"],
  HR: ["/staff", "/payroll"],
  FINANCE: ["/", "/invoices", "/reports", "/payroll", "/communications"],
  MANAGER: ["/", "/customers", "/products", "/orders", "/invoices", "/deliveries", "/reports", "/staff", "/communications"]
};

export function canAccessPath(role: RoleKey, path: string) {
  if (role === "ADMIN") {
    return true;
  }

  return allowedPrefixes[role].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function getNavForRole(role: RoleKey) {
  return navItems.filter((item) => item.roles.includes(role));
}
