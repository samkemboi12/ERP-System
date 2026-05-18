import { NextResponse } from "next/server";

import { confirmOrder } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRouteAccess("/orders");
  const user = await requireSessionUser();
  const { id } = await params;
  const order = await confirmOrder(id, user.id);
  return NextResponse.json(order);
}
