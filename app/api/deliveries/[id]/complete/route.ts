import { NextRequest, NextResponse } from "next/server";

import { completeDelivery } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRouteAccess("/delivery-mobile");
  const user = await requireSessionUser();
  const { id } = await params;
  const body = await request.json();
  const delivery = await completeDelivery({
    deliveryId: id,
    recipientName: body.recipientName,
    signatureText: body.signatureText,
    location: body.location,
    notes: body.notes,
    userId: user.id
  });
  return NextResponse.json(delivery);
}
