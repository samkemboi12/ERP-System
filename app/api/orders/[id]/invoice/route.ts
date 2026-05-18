import { NextRequest, NextResponse } from "next/server";

import { generateInvoiceForOrder } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRouteAccess("/invoices");
  const user = await requireSessionUser();
  const { id } = await params;
  await request.json();
  const invoice = await generateInvoiceForOrder(id, user.id);
  return NextResponse.json(invoice, { status: 201 });
}
