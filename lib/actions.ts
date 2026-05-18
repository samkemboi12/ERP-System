"use server";

import { MovementType, type RoleKey } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { roleHomeMap } from "@/lib/permissions";
import {
  addInventoryMovement,
  assignDelivery,
  authenticate,
  completeDelivery,
  confirmOrder,
  createCustomer,
  createDelivery,
  createOrder,
  createProduct,
  generateInvoiceForOrder,
  recordPayment,
  startDelivery
} from "@/lib/services";
import { requireSessionUser, sessionCookieName } from "@/lib/session";

function assertRole(role: RoleKey, allowed: RoleKey[]) {
  if (!allowed.includes(role)) {
    redirect(roleHomeMap[role]);
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await authenticate(email, password);

  if (!user) {
    redirect("/login?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), user.email, {
    httpOnly: true,
    path: "/"
  });

  redirect(roleHomeMap[user.role]);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName());
  redirect("/login");
}

export async function createCustomerAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "SALES", "MANAGER"]);

  await createCustomer({
    name: String(formData.get("name") ?? ""),
    segment: String(formData.get("segment") ?? "Key account"),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    city: String(formData.get("city") ?? ""),
    address: String(formData.get("address") ?? ""),
    creditLimit: Number(formData.get("creditLimit") ?? 0),
    notes: String(formData.get("notes") ?? "")
  });

  revalidatePath("/customers");
  revalidatePath("/");
}

export async function createProductAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "SALES", "WAREHOUSE", "MANAGER"]);

  await createProduct({
    name: String(formData.get("name") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    model: String(formData.get("model") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    description: String(formData.get("description") ?? ""),
    unitPrice: Number(formData.get("unitPrice") ?? 0),
    taxRate: Number(formData.get("taxRate") ?? 16),
    reorderLevel: Number(formData.get("reorderLevel") ?? 0),
    stockOnHand: Number(formData.get("stockOnHand") ?? 0)
  });

  revalidatePath("/products");
  revalidatePath("/");
}

export async function addInventoryMovementAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "WAREHOUSE"]);

  await addInventoryMovement({
    productId: String(formData.get("productId") ?? ""),
    type: String(formData.get("type") ?? "MANUAL_ADJUSTMENT_IN") as MovementType,
    quantity: Number(formData.get("quantity") ?? 0),
    reference: String(formData.get("reference") ?? ""),
    note: String(formData.get("note") ?? ""),
    userId: user.id
  });

  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/");
}

export async function createOrderAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "SALES"]);

  await createOrder({
    customerId: String(formData.get("customerId") ?? ""),
    createdById: user.id,
    productId: String(formData.get("productId") ?? ""),
    quantity: Number(formData.get("quantity") ?? 1),
    deliveryFee: Number(formData.get("deliveryFee") ?? 0),
    discount: Number(formData.get("discount") ?? 0),
    notes: String(formData.get("notes") ?? "")
  });

  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/communications");
  revalidatePath("/");
}

export async function confirmOrderAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "SALES", "MANAGER"]);

  await confirmOrder(String(formData.get("orderId") ?? ""), user.id);
  revalidatePath("/orders");
  revalidatePath("/communications");
  revalidatePath("/");
}

export async function generateInvoiceAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "SALES", "FINANCE"]);

  await generateInvoiceForOrder(String(formData.get("orderId") ?? ""), user.id);
  revalidatePath("/orders");
  revalidatePath("/invoices");
  revalidatePath("/communications");
  revalidatePath("/");
}

export async function recordPaymentAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "FINANCE"]);

  await recordPayment({
    invoiceId: String(formData.get("invoiceId") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    method: String(formData.get("method") ?? "Bank Transfer"),
    reference: String(formData.get("reference") ?? ""),
    note: String(formData.get("note") ?? ""),
    userId: user.id
  });

  revalidatePath("/invoices");
  revalidatePath("/reports");
  revalidatePath("/communications");
  revalidatePath("/");
}

export async function createDeliveryAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "WAREHOUSE", "SALES"]);

  await createDelivery({
    orderId: String(formData.get("orderId") ?? ""),
    invoiceId: String(formData.get("invoiceId") ?? ""),
    createdById: user.id,
    assignedDriverId: String(formData.get("assignedDriverId") ?? ""),
    destination: String(formData.get("destination") ?? "")
  });

  revalidatePath("/deliveries");
  revalidatePath("/orders");
  revalidatePath("/communications");
  revalidatePath("/");
}

export async function assignDeliveryAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "WAREHOUSE"]);

  await assignDelivery(String(formData.get("deliveryId") ?? ""), String(formData.get("driverId") ?? ""), user.id);
  revalidatePath("/deliveries");
  revalidatePath("/delivery-mobile");
  revalidatePath("/");
}

export async function startDeliveryAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "DELIVERY", "WAREHOUSE"]);

  await startDelivery(String(formData.get("deliveryId") ?? ""), user.id);
  revalidatePath("/deliveries");
  revalidatePath("/delivery-mobile");
  revalidatePath("/inventory");
  revalidatePath("/communications");
  revalidatePath("/");
}

export async function completeDeliveryAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "DELIVERY"]);

  await completeDelivery({
    deliveryId: String(formData.get("deliveryId") ?? ""),
    recipientName: String(formData.get("recipientName") ?? ""),
    signatureText: String(formData.get("signatureText") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    userId: user.id
  });

  revalidatePath("/deliveries");
  revalidatePath("/delivery-mobile");
  revalidatePath("/orders");
  revalidatePath("/communications");
  revalidatePath("/");
}
