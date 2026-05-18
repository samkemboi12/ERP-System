import { NextRequest, NextResponse } from "next/server";

import { createCustomer, getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/customers");
  const { customers } = await getCollections();
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  await requireRouteAccess("/customers");
  const body = await request.json();
  const customer = await createCustomer(body);
  return NextResponse.json(customer, { status: 201 });
}
