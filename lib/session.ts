import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { canAccessPath, roleHomeMap } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "erp_user_email";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const email = cookieStore.get(SESSION_COOKIE)?.value;

  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { staff: true }
  });

  if (!user?.isActive) {
    return null;
  }

  return user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRouteAccess(path: string) {
  const user = await requireSessionUser();

  if (!canAccessPath(user.role, path)) {
    redirect(roleHomeMap[user.role]);
  }

  return user;
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}
