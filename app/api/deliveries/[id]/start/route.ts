import { NextResponse } from "next/server";

import { startDelivery } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRouteAccess("/delivery-mobile");
  const user = await requireSessionUser();
  const { id } = await params;
  const delivery = await startDelivery(id, user.id);
  return NextResponse.json(delivery);
}
