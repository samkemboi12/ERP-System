import { NextRequest, NextResponse } from "next/server";

import { addInventoryMovement, getCollections } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/inventory");
  const { movements } = await getCollections();
  return NextResponse.json(movements);
}

export async function POST(request: NextRequest) {
  await requireRouteAccess("/inventory");
  const user = await requireSessionUser();
  const body = await request.json();
  const movement = await addInventoryMovement({ ...body, userId: user.id });
  return NextResponse.json(movement, { status: 201 });
}
