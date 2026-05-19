"use server";

import { MovementType, Prisma, type RoleKey } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { roleHomeMap } from "@/lib/permissions";
import {
  addInventoryMovement,
  adminResetUserPassword,
  assignDelivery,
  authenticate,
  bootstrapInitialAdminAccount,
  changeUserPassword,
  completeDelivery,
  confirmOrder,
  createManagedUserAccount,
  createProductCategory,
  createCustomer,
  createDelivery,
  createOrder,
  createProduct,
  generateInvoiceForOrder,
  recordPrivilegedAccessReview,
  recordPayment,
  populateStarterOperationalData,
  retireSampleAccounts,
  setUserActiveState,
  submitPayrollToFinance,
  startDelivery
} from "@/lib/services";
import { createSessionForUser, destroyCurrentSession, destroyUserSessions, requireSessionContext, requireSessionUser, sessionCookieName } from "@/lib/session";

const createAccountSchema = z.object({
  fullName: z.string().trim().min(3, "Full name is required."),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(10, "Temporary password must be at least 10 characters."),
  role: z.enum(["ADMIN", "SALES", "WAREHOUSE", "DELIVERY", "HR", "FINANCE", "MANAGER"]),
  employeeCode: z.string().trim().optional(),
  department: z.string().trim().min(2, "Department is required."),
  title: z.string().trim().min(2, "Job title is required."),
  branch: z.string().trim().min(2, "Branch is required."),
  phone: z.string().trim().min(7, "Phone number is required."),
  monthlySalary: z.coerce.number().min(0, "Salary cannot be negative."),
  employmentStartDate: z.string().trim().min(1, "Start date is required."),
  employmentStatus: z.string().trim().optional()
});

const bootstrapAdminSchema = z.object({
  fullName: z.string().trim().min(3, "Admin name is required."),
  email: z.string().trim().email("A valid admin email is required."),
  password: z.string().min(10, "Admin password must be at least 10 characters."),
  employeeCode: z.string().trim().optional(),
  phone: z.string().trim().min(7, "Phone number is required."),
  branch: z.string().trim().min(2, "Branch is required.")
});

const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required."),
  description: z.string().trim().optional()
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 characters.")
      .regex(/[A-Z]/, "New password must include an uppercase letter.")
      .regex(/[a-z]/, "New password must include a lowercase letter.")
      .regex(/[0-9]/, "New password must include a number.")
      .regex(/[^A-Za-z0-9]/, "New password must include a symbol."),
    confirmPassword: z.string().min(1, "Confirm the new password.")
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmPassword"]
  });

const adminResetPasswordSchema = z.object({
  userId: z.string().trim().min(1),
  newPassword: z
    .string()
    .min(12, "Temporary password must be at least 12 characters.")
    .regex(/[A-Z]/, "Temporary password must include an uppercase letter.")
    .regex(/[a-z]/, "Temporary password must include a lowercase letter.")
    .regex(/[0-9]/, "Temporary password must include a number.")
    .regex(/[^A-Za-z0-9]/, "Temporary password must include a symbol.")
});

function assertRole(role: RoleKey, allowed: RoleKey[]) {
  if (!allowed.includes(role)) {
    redirect(roleHomeMap[role]);
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await authenticate(email, password);

  if (result.status === "invalid") {
    redirect("/login?error=invalid");
  }

  if (result.status === "locked") {
    redirect(`/login?error=${encodeURIComponent("locked")}`);
  }

  const cookieValue = await createSessionForUser(result.user.id);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), cookieValue, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  if (result.status === "must_change_password") {
    redirect("/account/security?required=1");
  }

  redirect(roleHomeMap[result.user.role]);
}

export async function logoutAction() {
  await destroyCurrentSession();
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

export async function createProductCategoryAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "WAREHOUSE", "MANAGER"]);

  const parsed = createCategorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "")
  });

  if (!parsed.success) {
    redirect(`/products?categoryError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to create category.")}`);
  }

  try {
    await createProductCategory(parsed.data);
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? "That category already exists."
        : error instanceof Error
          ? error.message
          : "Unable to create category.";
    redirect(`/products?categoryError=${encodeURIComponent(message)}`);
  }

  revalidatePath("/products");
  redirect("/products?categoryCreated=1");
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

export async function createManagedUserAccountAction(formData: FormData) {
  const adminUser = await requireSessionUser();
  assertRole(adminUser.role, ["ADMIN"]);

  const payload = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "") as RoleKey,
    employeeCode: String(formData.get("employeeCode") ?? ""),
    department: String(formData.get("department") ?? ""),
    title: String(formData.get("title") ?? ""),
    branch: String(formData.get("branch") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    monthlySalary: Number(formData.get("monthlySalary") ?? 0),
    employmentStartDate: String(formData.get("employmentStartDate") ?? ""),
    employmentStatus: String(formData.get("employmentStatus") ?? "Active")
  };

  const parsed = createAccountSchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/settings?userError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to create account.")}`);
  }

  try {
    await createManagedUserAccount({
      adminUserId: adminUser.id,
      ...parsed.data,
      employmentStartDate: new Date(parsed.data.employmentStartDate)
    });
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? "That email address or employee code is already in use."
        : error instanceof Error
          ? error.message
          : "Unable to create account.";
    redirect(`/settings?userError=${encodeURIComponent(message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/staff");
  redirect("/settings?userCreated=1");
}

export async function changeOwnPasswordAction(formData: FormData) {
  const session = await requireSessionContext();
  const payload = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? "")
  };

  const parsed = passwordChangeSchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/account/security?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to change password.")}`);
  }

  try {
    await changeUserPassword({
      userId: session.user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword
    });

    await destroyUserSessions(session.user.id, session.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to change password.";
    redirect(`/account/security?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/account/security");
  redirect("/account/security?changed=1");
}

export async function adminResetUserPasswordAction(formData: FormData) {
  const session = await requireSessionContext();
  assertRole(session.user.role, ["ADMIN"]);

  const parsed = adminResetPasswordSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    newPassword: String(formData.get("newPassword") ?? "")
  });

  if (!parsed.success) {
    redirect(`/settings?userError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to reset password.")}`);
  }

  await adminResetUserPassword({
    adminUserId: session.user.id,
    userId: parsed.data.userId,
    newPassword: parsed.data.newPassword
  });

  revalidatePath("/settings");
  redirect("/settings?userReset=1");
}

export async function toggleUserActiveStateAction(formData: FormData) {
  const session = await requireSessionContext();
  assertRole(session.user.role, ["ADMIN"]);

  const userId = String(formData.get("userId") ?? "");
  const nextState = String(formData.get("nextState") ?? "") === "active";

  if (!userId || userId === session.user.id) {
    redirect("/settings?userError=You cannot deactivate your own current admin session.");
  }

  await setUserActiveState({
    adminUserId: session.user.id,
    userId,
    isActive: nextState
  });

  revalidatePath("/settings");
  redirect(`/settings?${nextState ? "userReactivated" : "userDeactivated"}=1`);
}

export async function retireSampleAccountsAction() {
  const session = await requireSessionContext();
  assertRole(session.user.role, ["ADMIN"]);

  const retiredCount = await retireSampleAccounts({
    adminUserId: session.user.id,
    excludeUserId: session.user.id
  });

  revalidatePath("/settings");
  redirect(`/settings?retired=${retiredCount}`);
}

export async function recordPrivilegedAccessReviewAction() {
  const session = await requireSessionContext();
  assertRole(session.user.role, ["ADMIN"]);

  await recordPrivilegedAccessReview({
    adminUserId: session.user.id,
    reviewerName: session.user.fullName
  });

  revalidatePath("/settings");
  redirect("/settings?reviewed=1");
}

export async function populateStarterOperationalDataAction() {
  const session = await requireSessionContext();
  assertRole(session.user.role, ["ADMIN"]);

  await populateStarterOperationalData({ userId: session.user.id });

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/orders");
  revalidatePath("/invoices");
  revalidatePath("/deliveries");
  revalidatePath("/payroll");
  revalidatePath("/communications");
  revalidatePath("/finance");
  revalidatePath("/settings");
  redirect("/settings?starterLoaded=1");
}

export async function bootstrapInitialAdminAction(formData: FormData) {
  const payload = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    employeeCode: String(formData.get("employeeCode") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    branch: String(formData.get("branch") ?? "")
  };

  const parsed = bootstrapAdminSchema.safeParse(payload);

  if (!parsed.success) {
    redirect(`/setup/admin?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Unable to create admin account.")}`);
  }

  try {
    await bootstrapInitialAdminAccount(parsed.data);
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? "That email address or employee code is already in use."
        : error instanceof Error
          ? error.message
          : "Unable to create admin account.";
    redirect(`/setup/admin?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/login");
  redirect("/login?bootstrapped=1");
}

export async function submitPayrollToFinanceAction(formData: FormData) {
  const user = await requireSessionUser();
  assertRole(user.role, ["ADMIN", "HR"]);

  await submitPayrollToFinance({
    payrollRunId: String(formData.get("payrollRunId") ?? ""),
    submittedByUserId: user.id,
    note: String(formData.get("note") ?? "")
  });

  revalidatePath("/payroll");
  revalidatePath("/communications");
  revalidatePath("/reports");
  redirect("/payroll?submitted=1");
}
