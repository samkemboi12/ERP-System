import { NextResponse } from "next/server";

import { getReportsData } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/reports");
  const data = await getReportsData();
  return NextResponse.json(data);
}
