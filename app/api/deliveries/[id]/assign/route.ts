import { NextRequest, NextResponse } from "next/server";

import { assignDelivery } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRouteAccess("/deliveries");
  const user = await requireSessionUser();
  const { id } = await params;
  const body = await request.json();
  const delivery = await assignDelivery(id, body.driverId, user.id);
  return NextResponse.json(delivery);
}
