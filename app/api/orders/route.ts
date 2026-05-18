import { NextRequest, NextResponse } from "next/server";

import { createOrder, getCollections } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/orders");
  const { orders } = await getCollections();
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  await requireRouteAccess("/orders");
  const user = await requireSessionUser();
  const body = await request.json();
  const order = await createOrder({ ...body, createdById: user.id });
  return NextResponse.json(order, { status: 201 });
}
