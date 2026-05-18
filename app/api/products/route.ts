import { NextRequest, NextResponse } from "next/server";

import { createProduct, getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";

export async function GET() {
  await requireRouteAccess("/products");
  const { products } = await getCollections();
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  await requireRouteAccess("/products");
  const body = await request.json();
  const product = await createProduct(body);
  return NextResponse.json(product, { status: 201 });
}
