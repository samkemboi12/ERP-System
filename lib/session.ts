import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { canAccessPath, roleHomeMap } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "erp_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_MS = 15 * 60 * 1000;

function sessionSecret() {
  return process.env.SESSION_SECRET ?? "development-session-secret-change-me";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signToken(token: string) {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

function encodeSessionCookie(token: string) {
  return `${token}.${signToken(token)}`;
}

function decodeSessionCookie(value: string) {
  const parts = value.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [token, signature] = parts;
  const expected = signToken(token);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  return token;
}

async function readSessionRecord() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value;

  if (!cookieValue) {
    return null;
  }

  const rawToken = decodeSessionCookie(cookieValue);

  if (!rawToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { include: { staff: true } } }
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > SESSION_REFRESH_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() }
    });
  }

  return session;
}

export async function createSessionForUser(userId: string) {
  const rawToken = randomBytes(32).toString("base64url");

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    }
  });

  return encodeSessionCookie(rawToken);
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value;

  if (cookieValue) {
    const rawToken = decodeSessionCookie(cookieValue);

    if (rawToken) {
      await prisma.session.deleteMany({
        where: { tokenHash: hashToken(rawToken) }
      });
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function destroyUserSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {})
    }
  });
}

export async function getAuthenticatedSession() {
  return readSessionRecord();
}

export async function getSessionUser() {
  const session = await readSessionRecord();
  return session?.user ?? null;
}

export async function requireSessionUser() {
  const session = await readSessionRecord();

  if (!session) {
    redirect("/login");
  }

  if (session.user.mustChangePassword) {
    redirect("/account/security?required=1");
  }

  return session.user;
}

export async function requireSessionContext() {
  const session = await readSessionRecord();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRouteAccess(path: string) {
  const session = await readSessionRecord();

  if (!session) {
    redirect("/login");
  }

  if (session.user.mustChangePassword && path !== "/account/security") {
    redirect("/account/security?required=1");
  }

  if (!canAccessPath(session.user.role, path)) {
    redirect(roleHomeMap[session.user.role]);
  }

  return session.user;
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}
