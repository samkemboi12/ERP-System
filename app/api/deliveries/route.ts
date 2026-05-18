import { NextRequest, NextResponse } from "next/server";

import { createDelivery, getCollections } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/deliveries");
  const { deliveries } = await getCollections();
  return NextResponse.json(deliveries);
}

export async function POST(request: NextRequest) {
  await requireRouteAccess("/deliveries");
  const user = await requireSessionUser();
  const body = await request.json();
  const delivery = await createDelivery({ ...body, createdById: user.id });
  return NextResponse.json(delivery, { status: 201 });
}
