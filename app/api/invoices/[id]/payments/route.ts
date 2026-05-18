import { NextRequest, NextResponse } from "next/server";

import { recordPayment } from "@/lib/services";
import { requireRouteAccess, requireSessionUser } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRouteAccess("/invoices");
  const user = await requireSessionUser();
  const { id } = await params;
  const body = await request.json();
  const invoice = await recordPayment({
    invoiceId: id,
    amount: body.amount,
    method: body.method,
    reference: body.reference,
    note: body.note,
    userId: user.id
  });
  return NextResponse.json(invoice, { status: 201 });
}
