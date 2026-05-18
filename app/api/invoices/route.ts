import { NextResponse } from "next/server";

import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/invoices");
  const { invoices } = await getCollections();
  return NextResponse.json(invoices);
}
