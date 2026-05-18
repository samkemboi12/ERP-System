import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/");
  const data = await getDashboardData();
  return NextResponse.json(data);
}
