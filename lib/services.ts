import {
  CommunicationDirection,
  DeliveryStatus,
  InvoiceStatus,
  MovementType,
  OrderStatus,
  PayrollRunStatus,
  Prisma,
  PrismaClient,
  type RoleKey
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { roleHomeMap } from "@/lib/permissions";
import { toNumber } from "@/lib/utils";

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCK_MINUTES = 15;
const SAMPLE_ACCOUNT_EMAILS = [
  "admin@phoneflow.co.ke",
  "sales@phoneflow.co.ke",
  "warehouse@phoneflow.co.ke",
  "delivery@phoneflow.co.ke",
  "hr@phoneflow.co.ke",
  "finance@phoneflow.co.ke",
  "manager@phoneflow.co.ke"
] as const;

type DbClient = PrismaClient | Prisma.TransactionClient;

const PAYE_BANDS = [
  { limit: 24000, rate: 0.1 },
  { limit: 8333, rate: 0.25 },
  { limit: 467667, rate: 0.3 },
  { limit: 300000, rate: 0.325 },
  { limit: Number.POSITIVE_INFINITY, rate: 0.35 }
] as const;

const PERSONAL_RELIEF = 2400;
const SHIF_RATE = 0.0275;
const HOUSING_LEVY_RATE = 0.015;
const NSSF_LOWER_LIMIT = 9000;
const NSSF_UPPER_LIMIT = 108000;
const NSSF_RATE = 0.06;

function computeLineTotal(quantity: number, unitPrice: number, discount = 0) {
  return quantity * unitPrice - discount;
}

function computeTotals(lines: Array<{ quantity: number; unitPrice: number; discount?: number; taxRate: number }>, deliveryFee = 0) {
  const subtotal = lines.reduce((sum, line) => sum + computeLineTotal(line.quantity, line.unitPrice, line.discount ?? 0), 0);
  const discountTotal = lines.reduce((sum, line) => sum + (line.discount ?? 0), 0);
  const taxTotal = lines.reduce(
    (sum, line) => sum + computeLineTotal(line.quantity, line.unitPrice, line.discount ?? 0) * (line.taxRate / 100),
    0
  );

  return {
    subtotal,
    discountTotal,
    taxTotal,
    deliveryFee,
    grandTotal: subtotal + taxTotal + deliveryFee
  };
}

function calculateNssfEmployee(grossPay: number) {
  const lowerTier = Math.min(grossPay, NSSF_LOWER_LIMIT) * NSSF_RATE;
  const upperTierWages = Math.max(Math.min(grossPay, NSSF_UPPER_LIMIT) - NSSF_LOWER_LIMIT, 0);
  const upperTier = upperTierWages * NSSF_RATE;
  return lowerTier + upperTier;
}

function calculatePayeTax(taxablePay: number) {
  let remaining = taxablePay;
  let grossTax = 0;

  for (const band of PAYE_BANDS) {
    if (remaining <= 0) {
      break;
    }

    const taxableInBand = Math.min(remaining, band.limit);
    grossTax += taxableInBand * band.rate;
    remaining -= taxableInBand;
  }

  return Math.max(grossTax - PERSONAL_RELIEF, 0);
}

export function computePayrollBreakdown({
  basicSalary,
  allowance,
  commission,
  otherDeductions = 0
}: {
  basicSalary: number;
  allowance: number;
  commission: number;
  otherDeductions?: number;
}) {
  const grossPay = basicSalary + allowance + commission;
  const nssfEmployee = calculateNssfEmployee(grossPay);
  const shif = grossPay * SHIF_RATE;
  const housingLevy = grossPay * HOUSING_LEVY_RATE;
  const taxablePay = Math.max(grossPay - nssfEmployee - shif - housingLevy, 0);
  const paye = calculatePayeTax(taxablePay);
  const totalDeductions = paye + shif + housingLevy + nssfEmployee + otherDeductions;
  const netPay = grossPay - totalDeductions;

  return {
    basicSalary,
    allowance,
    commission,
    grossPay,
    taxablePay,
    paye,
    shif,
    nssfEmployee,
    housingLevy,
    otherDeductions,
    totalDeductions,
    netPay
  };
}

async function nextSequence(prefix: string, field: "invoiceNumber" | "orderNumber" | "deliveryNumber") {
  let lastValue = `${prefix}-0000`;

  if (field === "invoiceNumber") {
    const lastRecord = await prisma.invoice.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true }
    });
    lastValue = lastRecord?.invoiceNumber ?? lastValue;
  } else if (field === "orderNumber") {
    const lastRecord = await prisma.order.findFirst({
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true }
    });
    lastValue = lastRecord?.orderNumber ?? lastValue;
  } else {
    const lastRecord = await prisma.delivery.findFirst({
      orderBy: { createdAt: "desc" },
      select: { deliveryNumber: true }
    });
    lastValue = lastRecord?.deliveryNumber ?? lastValue;
  }

  const lastDigits = Number(String(lastValue).split("-").pop());
  return `${prefix}-${String(lastDigits + 1).padStart(4, "0")}`;
}

async function addAudit(
  tx: DbClient,
  userId: string | null | undefined,
  action: string,
  entityType: string,
  entityId: string,
  detail: string
) {
  await tx.auditLog.create({
    data: {
      userId: userId || null,
      action,
      entityType,
      entityId,
      detail
    }
  });
}

async function addCommunication(
  tx: DbClient,
  input: {
    customerId?: string | null;
    orderId?: string | null;
    invoiceId?: string | null;
    deliveryId?: string | null;
    channel: string;
    direction?: CommunicationDirection;
    eventType: string;
    templateName?: string | null;
    subject?: string | null;
    body: string;
    recipientName?: string | null;
    recipientContact?: string | null;
    status?: string;
  }
) {
  await tx.communicationLog.create({
    data: {
      customerId: input.customerId ?? null,
      orderId: input.orderId ?? null,
      invoiceId: input.invoiceId ?? null,
      deliveryId: input.deliveryId ?? null,
      channel: input.channel,
      direction: input.direction ?? CommunicationDirection.OUTBOUND,
      eventType: input.eventType,
      templateName: input.templateName ?? null,
      subject: input.subject ?? null,
      body: input.body,
      recipientName: input.recipientName ?? null,
      recipientContact: input.recipientContact ?? null,
      status: input.status ?? "Sent",
      sentAt: new Date()
    }
  });
}

export async function getDashboardData() {
  const [products, orders, invoices, deliveries, communications, settings] = await Promise.all([
    prisma.product.findMany({ orderBy: { stockOnHand: "asc" } }),
    prisma.order.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.invoice.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.delivery.findMany({ include: { assignedDriver: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.communicationLog.findMany({ orderBy: { sentAt: "desc" }, take: 8, include: { customer: true } }),
    prisma.setting.findMany({ orderBy: { key: "asc" } })
  ]);

  const lowStockItems = products.filter((product) => product.stockOnHand <= product.reorderLevel);
  const overdueInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.OVERDUE);
  const revenueMonth = (
    await prisma.payment.aggregate({
      _sum: { amount: true }
    })
  )._sum.amount;

  return {
    kpis: {
      revenueMonth: toNumber(revenueMonth ?? 0),
      pendingOrders: orders.filter((order) => order.status !== OrderStatus.CLOSED && order.status !== OrderStatus.CANCELLED).length,
      deliveriesInTransit: deliveries.filter((delivery) => delivery.status === DeliveryStatus.IN_TRANSIT).length,
      overdueInvoices: overdueInvoices.length,
      lowStockItems: lowStockItems.length,
      customers: await prisma.customer.count(),
      staff: await prisma.staff.count()
    },
    lowStockItems,
    orders,
    invoices,
    deliveries,
    communications,
    settings
  };
}

export async function getReportsData() {
  const [salesByCustomer, inventory, commissions, payrollRuns, appraisals, payments] = await Promise.all([
    prisma.invoice.findMany({ include: { customer: true } }),
    prisma.inventoryMovement.findMany({ include: { product: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.commission.findMany({ include: { staff: true }, orderBy: { createdAt: "desc" } }),
    prisma.payrollRun.findMany({ include: { items: { include: { staff: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.appraisal.findMany({ include: { staff: true }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ include: { invoice: { include: { customer: true } } }, orderBy: { receivedAt: "desc" }, take: 10 })
  ]);

  const customerRanking = salesByCustomer.reduce<Record<string, number>>((acc, invoice) => {
    acc[invoice.customer.name] = (acc[invoice.customer.name] ?? 0) + toNumber(invoice.grandTotal);
    return acc;
  }, {});

  return {
    customerRanking: Object.entries(customerRanking)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total),
    inventory,
    commissions,
    payrollRuns,
    appraisals,
    payments
  };
}

export async function getFinanceHubData() {
  const [invoices, payments, payrollRuns, communications] = await Promise.all([
    prisma.invoice.findMany({
      include: { customer: true, order: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.payment.findMany({
      include: { invoice: { include: { customer: true } } },
      orderBy: { receivedAt: "desc" },
      take: 8
    }),
    prisma.payrollRun.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 4
    }),
    prisma.communicationLog.findMany({
      where: {
        eventType: {
          in: ["PAYROLL_SUBMITTED_TO_FINANCE", "INVOICE_ISSUED", "PAYMENT_RECORDED"]
        }
      },
      orderBy: { sentAt: "desc" },
      take: 8
    })
  ]);

  return {
    invoices,
    payments,
    payrollRuns,
    communications
  };
}

export async function getPayrollData() {
  const [runs, staff] = await Promise.all([
    prisma.payrollRun.findMany({
      include: { items: { include: { staff: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.staff.findMany({ orderBy: { employeeCode: "asc" } })
  ]);

  const latestRun = runs[0] ?? null;
  const latestSubmission = await prisma.communicationLog.findFirst({
    where: { eventType: "PAYROLL_SUBMITTED_TO_FINANCE" },
    orderBy: { sentAt: "desc" }
  });

  return { runs, latestRun, latestSubmission, staff };
}

export async function getCommunicationFeed() {
  return prisma.communicationLog.findMany({
    include: { customer: true, order: true, invoice: true, delivery: true },
    orderBy: { sentAt: "desc" },
    take: 40
  });
}

export async function createCustomer(input: {
  name: string;
  segment: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  creditLimit?: number;
  notes?: string;
}) {
  const count = await prisma.customer.count();

  return prisma.customer.create({
    data: {
      code: `CUS-${String(count + 1).padStart(3, "0")}`,
      name: input.name,
      segment: input.segment,
      phone: input.phone,
      email: input.email || null,
      city: input.city,
      address: input.address,
      industry: "Phone Retail",
      creditLimit: money(input.creditLimit ?? 0),
      overdueBalance: money(0),
      notes: input.notes || null
    }
  });
}

export async function createProduct(input: {
  name: string;
  brand: string;
  model: string;
  categoryId: string;
  description: string;
  unitPrice: number;
  taxRate: number;
  reorderLevel: number;
  stockOnHand: number;
}) {
  const count = await prisma.product.count();

  return prisma.product.create({
    data: {
      sku: `PHN-${String(count + 1).padStart(4, "0")}`,
      name: input.name,
      brand: input.brand,
      model: input.model,
      categoryId: input.categoryId,
      description: input.description,
      unitPrice: money(input.unitPrice),
      taxRate: money(input.taxRate),
      reorderLevel: input.reorderLevel,
      stockOnHand: input.stockOnHand,
      imeiTracked: true
    }
  });
}

export async function createProductCategory(input: { name: string; description?: string }) {
  return prisma.productCategory.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null
    }
  });
}

export async function addInventoryMovement(input: {
  productId: string;
  type: MovementType;
  quantity: number;
  reference: string;
  note?: string;
  userId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
    const nextStock = product.stockOnHand + input.quantity;

    if (nextStock < 0) {
      throw new Error("Stock movement would make inventory negative.");
    }

    await tx.inventoryMovement.create({
      data: {
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        reference: input.reference,
        note: input.note || null,
        createdById: input.userId || null
      }
    });

    const updatedProduct = await tx.product.update({
      where: { id: input.productId },
      data: { stockOnHand: nextStock }
    });

    await addAudit(
      tx,
      input.userId,
      "INVENTORY_MOVEMENT",
      "Product",
      product.id,
      `${input.type} adjustment of ${input.quantity} units on ${product.name}.`
    );

    return updatedProduct;
  });
}

export async function createOrder(input: {
  customerId: string;
  createdById: string;
  productId: string;
  quantity: number;
  deliveryFee?: number;
  discount?: number;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const [product, customer, user] = await Promise.all([
      tx.product.findUniqueOrThrow({ where: { id: input.productId } }),
      tx.customer.findUniqueOrThrow({ where: { id: input.customerId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.createdById } })
    ]);

    if (product.stockOnHand - product.reservedStock < input.quantity) {
      throw new Error(`Insufficient stock for ${product.name}.`);
    }

    const totals = computeTotals(
      [
        {
          quantity: input.quantity,
          unitPrice: toNumber(product.unitPrice),
          discount: input.discount ?? 0,
          taxRate: toNumber(product.taxRate)
        }
      ],
      input.deliveryFee ?? 0
    );

    const orderNumber = await nextSequence("ORD", "orderNumber");

    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        createdById: input.createdById,
        status: OrderStatus.DRAFT,
        subtotal: money(totals.subtotal),
        discountTotal: money(totals.discountTotal),
        taxTotal: money(totals.taxTotal),
        deliveryFee: money(totals.deliveryFee),
        grandTotal: money(totals.grandTotal),
        notes: input.notes || null,
        items: {
          create: {
            productId: product.id,
            quantity: input.quantity,
            unitPrice: product.unitPrice,
            discount: money(input.discount ?? 0),
            taxRate: product.taxRate,
            lineTotal: money(computeLineTotal(input.quantity, toNumber(product.unitPrice), input.discount ?? 0))
          }
        }
      },
      include: { items: true }
    });

    await tx.product.update({
      where: { id: product.id },
      data: { reservedStock: product.reservedStock + input.quantity }
    });

    await tx.inventoryMovement.create({
      data: {
        productId: product.id,
        type: MovementType.SALES_RESERVATION,
        quantity: -input.quantity,
        reference: orderNumber,
        note: "Reserved stock for phone order",
        createdById: input.createdById
      }
    });

    await addCommunication(tx, {
      customerId: customer.id,
      orderId: order.id,
      channel: "Email",
      eventType: "ORDER_CREATED",
      templateName: "Order Created",
      subject: `Order ${orderNumber} received`,
      recipientName: customer.name,
      recipientContact: customer.email ?? customer.phone,
      body: `${user.fullName} created order ${orderNumber} for ${input.quantity} units of ${product.name}.`,
      status: "Queued"
    });

    await addAudit(tx, input.createdById, "CREATE_ORDER", "Order", order.id, `Created phone order ${orderNumber}.`);

    return order;
  });
}

export async function confirmOrder(orderId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
      include: { customer: true }
    });

    await addCommunication(tx, {
      customerId: order.customerId,
      orderId: order.id,
      channel: "Email",
      eventType: "ORDER_CONFIRMED",
      templateName: "Order Confirmation",
      subject: `Order ${order.orderNumber} confirmed`,
      recipientName: order.customer.name,
      recipientContact: order.customer.email ?? order.customer.phone,
      body: `Your phone order ${order.orderNumber} has been confirmed and is awaiting invoicing.`,
      status: "Sent"
    });

    await addAudit(tx, userId, "CONFIRM_ORDER", "Order", order.id, `Confirmed order ${order.orderNumber}.`);
    return order;
  });
}

export async function generateInvoiceForOrder(orderId: string, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true, customer: true, invoices: true }
    });

    if (order.invoices.length > 0) {
      throw new Error("This order already has an invoice.");
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String((await tx.invoice.count()) + 1).padStart(4, "0")}`;

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        customerId: order.customerId,
        createdById,
        status: InvoiceStatus.ISSUED,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        taxTotal: order.taxTotal,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        paidAmount: money(0),
        notes: "Tax invoice for wholesale phone supply.",
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: item.lineTotal
          }))
        }
      }
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.INVOICED }
    });

    await addCommunication(tx, {
      customerId: order.customerId,
      orderId: order.id,
      invoiceId: invoice.id,
      channel: "Email",
      eventType: "INVOICE_ISSUED",
      templateName: "Invoice Issued",
      subject: `Invoice ${invoice.invoiceNumber} issued`,
      recipientName: order.customer.name,
      recipientContact: order.customer.email ?? order.customer.phone,
      body: `Invoice ${invoice.invoiceNumber} has been issued for order ${order.orderNumber}.`,
      status: "Sent"
    });

    await addAudit(tx, createdById, "CREATE_INVOICE", "Invoice", invoice.id, `Issued invoice ${invoice.invoiceNumber}.`);

    return invoice;
  });
}

export async function recordPayment(input: {
  invoiceId: string;
  amount: number;
  method: string;
  reference: string;
  note?: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: input.invoiceId },
      include: { customer: true, order: true }
    });
    const nextPaidAmount = toNumber(invoice.paidAmount) + input.amount;
    const total = toNumber(invoice.grandTotal);
    const status =
      nextPaidAmount >= total ? InvoiceStatus.PAID : nextPaidAmount > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.ISSUED;

    await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: money(input.amount),
        method: input.method,
        reference: input.reference,
        note: input.note || null,
        receivedAt: new Date()
      }
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: input.invoiceId },
      data: {
        paidAmount: money(nextPaidAmount),
        status
      }
    });

    await addCommunication(tx, {
      customerId: invoice.customerId,
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      channel: "Email",
      eventType: "PAYMENT_RECORDED",
      templateName: "Payment Receipt",
      subject: `Payment received for ${invoice.invoiceNumber}`,
      recipientName: invoice.customer.name,
      recipientContact: invoice.customer.email ?? invoice.customer.phone,
      body: `We recorded ${input.method} payment ${input.reference} for ${invoice.invoiceNumber}. Balance outstanding is KES ${(
        total - nextPaidAmount
      ).toFixed(2)}.`,
      status: "Sent"
    });

    await addAudit(tx, input.userId, "RECORD_PAYMENT", "Invoice", invoice.id, `Recorded payment ${input.reference}.`);

    return updatedInvoice;
  });
}

export async function createDelivery(input: {
  orderId: string;
  invoiceId?: string;
  createdById: string;
  assignedDriverId?: string;
  destination: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { customer: true, items: true }
    });

    const deliveryNumber = await nextSequence(`DEL-${new Date().getFullYear()}`, "deliveryNumber");

    const delivery = await tx.delivery.create({
      data: {
        deliveryNumber,
        orderId: order.id,
        invoiceId: input.invoiceId || null,
        createdById: input.createdById,
        assignedDriverId: input.assignedDriverId || null,
        status: input.assignedDriverId ? DeliveryStatus.ASSIGNED : DeliveryStatus.PENDING,
        destination: input.destination,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        trackingNotes: "Waiting for warehouse dispatch.",
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        }
      }
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PACKED }
    });

    await addCommunication(tx, {
      customerId: order.customerId,
      orderId: order.id,
      invoiceId: input.invoiceId || null,
      deliveryId: delivery.id,
      channel: "Email",
      eventType: "DELIVERY_CREATED",
      templateName: "Delivery Planned",
      subject: `Delivery ${delivery.deliveryNumber} scheduled`,
      recipientName: order.customer.name,
      recipientContact: order.customer.email ?? order.customer.phone,
      body: `Delivery ${delivery.deliveryNumber} has been scheduled for your phone order ${order.orderNumber}.`,
      status: "Sent"
    });

    await addAudit(tx, input.createdById, "CREATE_DELIVERY", "Delivery", delivery.id, `Created delivery ${delivery.deliveryNumber}.`);

    return delivery;
  });
}

export async function assignDelivery(deliveryId: string, driverId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        assignedDriverId: driverId,
        status: DeliveryStatus.ASSIGNED
      },
      include: { order: true }
    });

    await addAudit(tx, userId, "ASSIGN_DELIVERY", "Delivery", delivery.id, `Assigned driver to ${delivery.deliveryNumber}.`);
    return delivery;
  });
}

export async function startDelivery(deliveryId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { items: true, order: true, invoice: true }
    });

    for (const item of delivery.items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
      if (product.stockOnHand < item.quantity) {
        throw new Error(`Not enough stock to dispatch ${product.name}.`);
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          stockOnHand: product.stockOnHand - item.quantity,
          reservedStock: Math.max(product.reservedStock - item.quantity, 0)
        }
      });

      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: MovementType.DELIVERY_DISPATCH,
          quantity: -item.quantity,
          reference: delivery.deliveryNumber,
          note: "Phone stock dispatched to retail customer",
          createdById: userId
        }
      });
    }

    if (delivery.orderId) {
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.DISPATCHED }
      });
    }

    const updatedDelivery = await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.IN_TRANSIT,
        dispatchDate: new Date(),
        trackingNotes: "Driver picked stock and left dispatch."
      }
    });

    await addCommunication(tx, {
      customerId: delivery.order?.customerId ?? null,
      orderId: delivery.orderId,
      invoiceId: delivery.invoiceId,
      deliveryId: delivery.id,
      channel: "SMS",
      eventType: "DELIVERY_IN_TRANSIT",
      templateName: "Delivery Update",
      recipientName: delivery.customerName,
      recipientContact: delivery.customerPhone,
      body: `Delivery ${delivery.deliveryNumber} is now in transit with your phone stock.`,
      status: "Sent"
    });

    await addAudit(tx, userId, "START_DELIVERY", "Delivery", delivery.id, `Started delivery ${delivery.deliveryNumber}.`);
    return updatedDelivery;
  });
}

export async function completeDelivery(input: {
  deliveryId: string;
  recipientName: string;
  signatureText: string;
  location?: string;
  notes?: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUniqueOrThrow({
      where: { id: input.deliveryId },
      include: { order: true, items: true, invoice: true }
    });

    await tx.proofOfDelivery.upsert({
      where: { deliveryId: input.deliveryId },
      update: {
        recipientName: input.recipientName,
        signatureText: input.signatureText,
        location: input.location || null,
        deliveredAt: new Date(),
        notes: input.notes || null
      },
      create: {
        deliveryId: input.deliveryId,
        recipientName: input.recipientName,
        signatureText: input.signatureText,
        location: input.location || null,
        deliveredAt: new Date(),
        notes: input.notes || null
      }
    });

    for (const item of delivery.items) {
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: MovementType.DELIVERY_CONFIRMED,
          quantity: 0,
          reference: delivery.deliveryNumber,
          note: "Phone delivery confirmed with POD",
          createdById: input.userId
        }
      });
    }

    if (delivery.orderId) {
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.DELIVERED }
      });
    }

    const updatedDelivery = await tx.delivery.update({
      where: { id: input.deliveryId },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        trackingNotes: input.notes || "Delivered and signed."
      }
    });

    await addCommunication(tx, {
      customerId: delivery.order?.customerId ?? null,
      orderId: delivery.orderId,
      invoiceId: delivery.invoiceId,
      deliveryId: delivery.id,
      channel: "Email",
      eventType: "DELIVERY_COMPLETED",
      templateName: "Proof of Delivery",
      subject: `Delivery ${delivery.deliveryNumber} completed`,
      recipientName: input.recipientName,
      recipientContact: delivery.customerPhone,
      body: `Delivery ${delivery.deliveryNumber} has been completed and acknowledged by ${input.recipientName}.`,
      status: "Sent"
    });

    await addAudit(tx, input.userId, "COMPLETE_DELIVERY", "Delivery", delivery.id, `Completed delivery ${delivery.deliveryNumber}.`);
    return updatedDelivery;
  });
}

export async function getCollections() {
  const [customers, categories, products, orders, invoices, deliveries, staff, movements, commissionRules, payrollRuns, appraisals, templates, auditLogs, settings, communications] =
    await Promise.all([
      prisma.customer.findMany({ orderBy: { createdAt: "desc" }, include: { contacts: true } }),
      prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }),
      prisma.order.findMany({
        include: { customer: true, items: { include: { product: true } }, communications: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.invoice.findMany({
        include: { customer: true, order: true, payments: true, items: { include: { product: true } }, communications: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.delivery.findMany({
        include: {
          assignedDriver: true,
          order: true,
          invoice: true,
          items: { include: { product: true } },
          proofOfDelivery: true,
          communications: true
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.staff.findMany({ orderBy: { department: "asc" }, include: { commissions: true, payrollItems: true, appraisals: true } }),
      prisma.inventoryMovement.findMany({ include: { product: true }, orderBy: { createdAt: "desc" } }),
      prisma.commissionRule.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.payrollRun.findMany({ include: { items: { include: { staff: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.appraisal.findMany({ include: { staff: true }, orderBy: { createdAt: "desc" } }),
      prisma.communicationTemplate.findMany({ orderBy: { name: "asc" } }),
      prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.setting.findMany({ orderBy: { key: "asc" } }),
      prisma.communicationLog.findMany({ include: { customer: true }, orderBy: { sentAt: "desc" }, take: 20 })
    ]);

  return {
    customers,
    categories,
    products,
    orders,
    invoices,
    deliveries,
    staff,
    movements,
    commissionRules,
    payrollRuns,
    appraisals,
    templates,
    auditLogs,
    settings,
    communications
  };
}

export async function getSecurityReviewData() {
  const [users, settings] = await Promise.all([
    prisma.user.findMany({
      include: { staff: true },
      orderBy: [{ role: "asc" }, { fullName: "asc" }]
    }),
    prisma.setting.findMany({
      where: {
        key: {
          in: ["security.lastPrivilegedAccessReviewAt", "security.lastPrivilegedAccessReviewBy"]
        }
      }
    })
  ]);

  const settingsMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  return {
    privilegedUsers: users.filter((user) => ["ADMIN", "FINANCE", "HR"].includes(user.role)),
    sampleUsers: users.filter((user) => SAMPLE_ACCOUNT_EMAILS.includes(user.email as (typeof SAMPLE_ACCOUNT_EMAILS)[number])),
    lastReviewedAt: settingsMap.get("security.lastPrivilegedAccessReviewAt") ?? null,
    lastReviewedBy: settingsMap.get("security.lastPrivilegedAccessReviewBy") ?? null
  };
}

export async function getInvoicePreview(invoiceId: string) {
  return prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      customer: { include: { contacts: true } },
      order: true,
      items: { include: { product: true } },
      payments: true,
      communications: true
    }
  });
}

export async function getUserDirectory() {
  return prisma.user.findMany({
    include: { staff: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }]
  });
}

export async function hasAnyUserAccounts() {
  const count = await prisma.user.count();
  return count > 0;
}

export async function authenticate(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { staff: true }
  });

  if (!user || !user.isActive) {
    return { status: "invalid" as const };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      status: "locked" as const,
      lockedUntil: user.lockedUntil
    };
  }

  const passwordCheck = await verifyPassword(password, user.password);

  if (!passwordCheck.valid) {
    const nextFailedAttempts = user.failedLoginAttempts + 1;
    const shouldLock = nextFailedAttempts >= LOGIN_ATTEMPT_LIMIT;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : nextFailedAttempts,
        lockedUntil
      }
    });

    return shouldLock
      ? {
          status: "locked" as const,
          lockedUntil
        }
      : { status: "invalid" as const };
  }

  const updatedPassword = passwordCheck.needsUpgrade ? await hashPassword(password) : user.password;

  const refreshedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: updatedPassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      ...(passwordCheck.needsUpgrade && !user.passwordChangedAt ? { passwordChangedAt: new Date() } : {})
    },
    include: { staff: true }
  });

  if (passwordCheck.needsUpgrade) {
    refreshedUser.password = updatedPassword;
  }

  return {
    status: refreshedUser.mustChangePassword ? ("must_change_password" as const) : ("success" as const),
    user: refreshedUser
  };
}

export async function bootstrapInitialAdminAccount(input: {
  fullName: string;
  email: string;
  password: string;
  employeeCode?: string;
  phone: string;
  branch: string;
}) {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    throw new Error("Admin bootstrap is no longer available because the system already has active accounts.");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        password: await hashPassword(input.password),
        role: "ADMIN",
        passwordChangedAt: new Date()
      }
    });

    const staff = await tx.staff.create({
      data: {
        userId: user.id,
        employeeCode: input.employeeCode?.trim().toUpperCase() || "EMP-001",
        department: "Management",
        title: "System Administrator",
        branch: input.branch.trim(),
        phone: input.phone.trim(),
        employmentStatus: "Active",
        employmentStartDate: new Date(),
        monthlySalary: money(0),
        roleLabel: "ADMIN"
      }
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "BOOTSTRAP_ADMIN",
        entityType: "User",
        entityId: user.id,
        detail: `Initial admin account created for ${user.fullName}.`
      }
    });

    return { user, staff };
  });
}

export async function createManagedUserAccount(input: {
  adminUserId: string;
  email: string;
  fullName: string;
  password: string;
  role: RoleKey;
  employeeCode?: string;
  department: string;
  title: string;
  branch: string;
  phone: string;
  monthlySalary: number;
  employmentStartDate: Date;
  employmentStatus?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const employeeCode =
      input.employeeCode && input.employeeCode.trim().length > 0
        ? input.employeeCode.trim().toUpperCase()
        : `EMP-${String((await tx.staff.count()) + 1).padStart(3, "0")}`;

    const user = await tx.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        password: await hashPassword(input.password),
        role: input.role,
        mustChangePassword: true
      }
    });

    const staff = await tx.staff.create({
      data: {
        userId: user.id,
        employeeCode,
        department: input.department.trim(),
        title: input.title.trim(),
        branch: input.branch.trim(),
        phone: input.phone.trim(),
        employmentStatus: input.employmentStatus?.trim() || "Active",
        employmentStartDate: input.employmentStartDate,
        monthlySalary: money(input.monthlySalary),
        roleLabel: input.role
      }
    });

    await addAudit(
      tx,
      input.adminUserId,
      "CREATE_USER_ACCOUNT",
      "User",
      user.id,
      `Created ${input.role.toLowerCase()} account for ${user.fullName} (${staff.employeeCode}).`
    );

    return { user, staff };
  });
}

export async function changeUserPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId }
  });

  const passwordCheck = await verifyPassword(input.currentPassword, user.password);

  if (!passwordCheck.valid) {
    throw new Error("Current password is incorrect.");
  }

  if (input.currentPassword === input.newPassword) {
    throw new Error("Choose a new password that is different from the current one.");
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      password: await hashPassword(input.newPassword),
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: new Date()
    }
  });
}

export async function adminResetUserPassword(input: {
  adminUserId: string;
  userId: string;
  newPassword: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: {
        password: await hashPassword(input.newPassword),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: new Date()
      }
    });

    await tx.session.deleteMany({
      where: { userId: input.userId }
    });

    await addAudit(
      tx,
      input.adminUserId,
      "RESET_USER_PASSWORD",
      "User",
      user.id,
      `Reset password for ${user.fullName} and required a password change on next login.`
    );

    return user;
  });
}

export async function setUserActiveState(input: {
  adminUserId: string;
  userId: string;
  isActive: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: {
        isActive: input.isActive,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    if (!input.isActive) {
      await tx.session.deleteMany({
        where: { userId: input.userId }
      });
    }

    await addAudit(
      tx,
      input.adminUserId,
      input.isActive ? "REACTIVATE_USER" : "DEACTIVATE_USER",
      "User",
      user.id,
      `${input.isActive ? "Reactivated" : "Deactivated"} account for ${user.fullName}.`
    );

    return user;
  });
}

export async function retireSampleAccounts(input: {
  adminUserId: string;
  excludeUserId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const sampleUsers = await tx.user.findMany({
      where: {
        email: { in: [...SAMPLE_ACCOUNT_EMAILS] },
        ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {})
      }
    });

    if (sampleUsers.length === 0) {
      return 0;
    }

    await tx.user.updateMany({
      where: {
        id: { in: sampleUsers.map((user) => user.id) }
      },
      data: {
        isActive: false,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    await tx.session.deleteMany({
      where: {
        userId: { in: sampleUsers.map((user) => user.id) }
      }
    });

    await addAudit(
      tx,
      input.adminUserId,
      "RETIRE_SAMPLE_ACCOUNTS",
      "User",
      sampleUsers.map((user) => user.id).join(","),
      `Retired ${sampleUsers.length} sample account(s).`
    );

    return sampleUsers.length;
  });
}

export async function recordPrivilegedAccessReview(input: {
  adminUserId: string;
  reviewerName: string;
}) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.setting.upsert({
      where: { key: "security.lastPrivilegedAccessReviewAt" },
      update: { value: now.toISOString() },
      create: { key: "security.lastPrivilegedAccessReviewAt", value: now.toISOString() }
    });

    await tx.setting.upsert({
      where: { key: "security.lastPrivilegedAccessReviewBy" },
      update: { value: input.reviewerName },
      create: { key: "security.lastPrivilegedAccessReviewBy", value: input.reviewerName }
    });

    await addAudit(
      tx,
      input.adminUserId,
      "REVIEW_PRIVILEGED_ACCESS",
      "User",
      input.adminUserId,
      `${input.reviewerName} reviewed privileged Finance and HR access assignments.`
    );
  });
}

export async function submitPayrollToFinance(input: {
  payrollRunId: string;
  submittedByUserId: string;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const [run, hrUser, financeUsers] = await Promise.all([
      tx.payrollRun.findUniqueOrThrow({
        where: { id: input.payrollRunId },
        include: {
          items: {
            include: { staff: true }
          }
        }
      }),
      tx.user.findUniqueOrThrow({ where: { id: input.submittedByUserId } }),
      tx.user.findMany({ where: { role: "FINANCE", isActive: true } })
    ]);

    const updatedRun = await tx.payrollRun.update({
      where: { id: input.payrollRunId },
      data: { status: PayrollRunStatus.APPROVED }
    });

    const financeRecipients = financeUsers.length > 0 ? financeUsers.map((user) => user.email).join(", ") : "Finance team";
    const lineCount = run.items.length;

    await addCommunication(tx, {
      channel: "Internal",
      direction: CommunicationDirection.INTERNAL,
      eventType: "PAYROLL_SUBMITTED_TO_FINANCE",
      templateName: "Payroll Handoff",
      subject: `${run.label} submitted to finance`,
      recipientName: "Finance Department",
      recipientContact: financeRecipients,
      body:
        input.note?.trim() ||
        `${hrUser.fullName} submitted ${run.label} to Finance for salary disbursement. ${lineCount} employee payroll lines are ready for payment processing.`,
      status: "Shared"
    });

    await addAudit(
      tx,
      input.submittedByUserId,
      "SUBMIT_PAYROLL_TO_FINANCE",
      "PayrollRun",
      updatedRun.id,
      `Submitted payroll run ${run.label} to Finance for disbursement.`
    );

    return updatedRun;
  });
}

export async function populateStarterOperationalData(input: { userId: string }) {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUniqueOrThrow({ where: { id: input.userId }, include: { staff: true } });

    const categories = await Promise.all(
      [
        { name: "Smartphones", description: "Android and iPhone retail stock" },
        { name: "Feature Phones", description: "Reliable entry-level handsets" },
        { name: "Accessories", description: "Chargers, covers, and earphones" }
      ].map((category) =>
        tx.productCategory.upsert({
          where: { name: category.name },
          update: { description: category.description },
          create: category
        })
      )
    );

    const products = await Promise.all([
      tx.product.upsert({
        where: { sku: "PHN-SM-A55" },
        update: {},
        create: {
          sku: "PHN-SM-A55",
          name: "Samsung Galaxy A55 256GB",
          brand: "Samsung",
          model: "Galaxy A55",
          description: "Mid-premium Android handset for wholesale retail supply.",
          categoryId: categories[0].id,
          unitPrice: money(58500),
          taxRate: money(16),
          reorderLevel: 10,
          stockOnHand: 36,
          reservedStock: 0,
          imeiTracked: true
        }
      }),
      tx.product.upsert({
        where: { sku: "PHN-TEC-SP10" },
        update: {},
        create: {
          sku: "PHN-TEC-SP10",
          name: "Tecno Spark 10C 128GB",
          brand: "Tecno",
          model: "Spark 10C",
          description: "Fast-moving budget smartphone for neighborhood retailers.",
          categoryId: categories[0].id,
          unitPrice: money(17800),
          taxRate: money(16),
          reorderLevel: 30,
          stockOnHand: 110,
          reservedStock: 0,
          imeiTracked: true
        }
      }),
      tx.product.upsert({
        where: { sku: "PHN-NOK-150" },
        update: {},
        create: {
          sku: "PHN-NOK-150",
          name: "Nokia 150",
          brand: "Nokia",
          model: "150",
          description: "Durable feature phone for rural and kiosk demand.",
          categoryId: categories[1].id,
          unitPrice: money(3900),
          taxRate: money(16),
          reorderLevel: 50,
          stockOnHand: 180,
          reservedStock: 0,
          imeiTracked: false
        }
      }),
      tx.product.upsert({
        where: { sku: "PHN-ACC-CH25" },
        update: {},
        create: {
          sku: "PHN-ACC-CH25",
          name: "25W Fast Charger",
          brand: "Voltix",
          model: "CH25",
          description: "Fast charger for Android smartphone bundles.",
          categoryId: categories[2].id,
          unitPrice: money(1800),
          taxRate: money(16),
          reorderLevel: 60,
          stockOnHand: 220,
          reservedStock: 0,
          imeiTracked: false
        }
      })
    ]);

    const customers = await Promise.all([
      tx.customer.upsert({
        where: { code: "CUS-101" },
        update: {},
        create: {
          code: "CUS-101",
          name: "Capital Mobile Traders Ltd",
          segment: "Key Account",
          industry: "Phone Retail",
          email: "procurement@capitalmobile.co.ke",
          phone: "+254711200300",
          city: "Nairobi",
          address: "Luthuli Avenue, Nairobi",
          creditLimit: money(1250000),
          overdueBalance: money(0),
          notes: "Buys mixed Android and accessories for CBD outlets."
        }
      }),
      tx.customer.upsert({
        where: { code: "CUS-102" },
        update: {},
        create: {
          code: "CUS-102",
          name: "Lakeview Devices Limited",
          segment: "Regional Buyer",
          industry: "Phone Retail",
          email: "orders@lakeviewdevices.co.ke",
          phone: "+254722555610",
          city: "Kisumu",
          address: "Oginga Odinga Street, Kisumu",
          creditLimit: money(820000),
          overdueBalance: money(0),
          notes: "Frequently buys Spark series and accessories."
        }
      })
    ]);

    await Promise.all(
      [
        {
          name: "Order Confirmation",
          channel: "Email",
          triggerEvent: "ORDER_CONFIRMED",
          subject: "Your phone order has been confirmed",
          body: "We have confirmed your wholesale order and moved it to fulfillment."
        },
        {
          name: "Invoice Issued",
          channel: "Email",
          triggerEvent: "INVOICE_ISSUED",
          subject: "Your invoice is ready",
          body: "The ERP has generated an invoice with tax and delivery breakdown."
        },
        {
          name: "Payment Receipt",
          channel: "Email",
          triggerEvent: "PAYMENT_RECORDED",
          subject: "Payment posted",
          body: "We have posted your payment and updated the outstanding balance."
        },
        {
          name: "Delivery Update",
          channel: "SMS",
          triggerEvent: "DELIVERY_IN_TRANSIT",
          subject: null,
          body: "Your order is on the way."
        }
      ].map((template) =>
        tx.communicationTemplate.upsert({
          where: { name: template.name },
          update: {
            channel: template.channel,
            triggerEvent: template.triggerEvent,
            subject: template.subject,
            body: template.body
          },
          create: template
        })
      )
    );

    const salesUser =
      (await tx.user.findFirst({ where: { role: "SALES", isActive: true } })) ??
      (await tx.user.findFirst({ where: { role: "ADMIN", id: actor.id } })) ??
      actor;
    const financeUser =
      (await tx.user.findFirst({ where: { role: "FINANCE", isActive: true } })) ??
      (await tx.user.findFirst({ where: { role: "ADMIN", id: actor.id } })) ??
      actor;
    const warehouseUser =
      (await tx.user.findFirst({ where: { role: "WAREHOUSE", isActive: true } })) ??
      (await tx.user.findFirst({ where: { role: "ADMIN", id: actor.id } })) ??
      actor;
    const driver = await tx.staff.findFirst({
      where: {
        OR: [{ roleLabel: "DELIVERY" }, { roleLabel: "Delivery" }]
      }
    });

    if ((await tx.order.count()) === 0) {
      const totals = computeTotals(
        [
          {
            quantity: 6,
            unitPrice: toNumber(products[0].unitPrice),
            discount: 3000,
            taxRate: toNumber(products[0].taxRate)
          }
        ],
        2500
      );

      const order = await tx.order.create({
        data: {
          orderNumber: await nextSequence("ORD", "orderNumber"),
          customerId: customers[0].id,
          createdById: salesUser.id,
          status: OrderStatus.CONFIRMED,
          subtotal: money(totals.subtotal),
          discountTotal: money(totals.discountTotal),
          taxTotal: money(totals.taxTotal),
          deliveryFee: money(totals.deliveryFee),
          grandTotal: money(totals.grandTotal),
          notes: "Example wholesale order for explaining order, invoice, and delivery flow.",
          items: {
            create: {
              productId: products[0].id,
              quantity: 6,
              unitPrice: products[0].unitPrice,
              discount: money(3000),
              taxRate: products[0].taxRate,
              lineTotal: money(computeLineTotal(6, toNumber(products[0].unitPrice), 3000))
            }
          }
        },
        include: { items: true }
      });

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String((await tx.invoice.count()) + 1).padStart(4, "0")}`,
          orderId: order.id,
          customerId: customers[0].id,
          createdById: financeUser.id,
          status: InvoiceStatus.PARTIALLY_PAID,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          subtotal: money(totals.subtotal),
          discountTotal: money(totals.discountTotal),
          taxTotal: money(totals.taxTotal),
          deliveryFee: money(totals.deliveryFee),
          grandTotal: money(totals.grandTotal),
          paidAmount: money(150000),
          notes: "Example invoice with full tax and delivery breakdown for demonstration.",
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              lineTotal: item.lineTotal
            }))
          },
          payments: {
            create: {
              amount: money(150000),
              method: "Bank Transfer",
              reference: "PAY-DEMO-001",
              note: "Part-payment used to demonstrate balance tracking.",
              receivedAt: new Date()
            }
          }
        }
      });

      const delivery = await tx.delivery.create({
        data: {
          deliveryNumber: await nextSequence(`DEL-${new Date().getFullYear()}`, "deliveryNumber"),
          orderId: order.id,
          invoiceId: invoice.id,
          createdById: warehouseUser.id,
          assignedDriverId: driver?.id ?? null,
          status: DeliveryStatus.DELIVERED,
          dispatchDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          destination: customers[0].address,
          customerName: customers[0].name,
          customerPhone: customers[0].phone,
          trackingNotes: "Example completed delivery showing signed handoff.",
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          },
          proofOfDelivery: {
            create: {
              recipientName: "Grace Nduta",
              signatureText: "Grace Nduta",
              location: "Capital Mobile Traders receiving bay",
              deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              notes: "Accepted in good condition."
            }
          }
        }
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DELIVERED }
      });

      await addCommunication(tx, {
        customerId: customers[0].id,
        orderId: order.id,
        channel: "Email",
        eventType: "ORDER_CONFIRMED",
        templateName: "Order Confirmation",
        subject: `Order ${order.orderNumber} confirmed`,
        recipientName: customers[0].name,
        recipientContact: customers[0].email ?? customers[0].phone,
        body: `Example order ${order.orderNumber} was confirmed by Sales and passed to Finance for invoicing.`,
        status: "Sent"
      });

      await addCommunication(tx, {
        customerId: customers[0].id,
        orderId: order.id,
        invoiceId: invoice.id,
        channel: "Email",
        eventType: "INVOICE_ISSUED",
        templateName: "Invoice Issued",
        subject: `Invoice ${invoice.invoiceNumber} issued`,
        recipientName: customers[0].name,
        recipientContact: customers[0].email ?? customers[0].phone,
        body: `Finance issued ${invoice.invoiceNumber} with subtotal, discount, tax, delivery, paid amount, and balance.`,
        status: "Sent"
      });

      await addCommunication(tx, {
        customerId: customers[0].id,
        orderId: order.id,
        invoiceId: invoice.id,
        channel: "Email",
        eventType: "PAYMENT_RECORDED",
        templateName: "Payment Receipt",
        subject: `Payment posted for ${invoice.invoiceNumber}`,
        recipientName: customers[0].name,
        recipientContact: customers[0].email ?? customers[0].phone,
        body: `Finance recorded KES 150,000 and the invoice still shows an outstanding balance.`,
        status: "Sent"
      });

      await addCommunication(tx, {
        customerId: customers[0].id,
        orderId: order.id,
        invoiceId: invoice.id,
        deliveryId: delivery.id,
        channel: "SMS",
        eventType: "DELIVERY_COMPLETED",
        templateName: "Proof of Delivery",
        subject: `Delivery ${delivery.deliveryNumber} completed`,
        recipientName: "Grace Nduta",
        recipientContact: customers[0].phone,
        body: `Driver completed ${delivery.deliveryNumber} and captured customer signature for proof of delivery.`,
        status: "Sent"
      });
    }

    if ((await tx.payrollRun.count()) === 0) {
      const staff = await tx.staff.findMany({
        where: {
          user: { isActive: true }
        },
        include: { user: true },
        orderBy: { employeeCode: "asc" }
      });

      if (staff.length > 0) {
        const payrollRows = staff.map((member, index) => {
          const basicSalary = Number(member.monthlySalary) || 50000 + index * 5000;
          const allowance = member.department === "Sales" ? 12000 : member.department === "Finance" ? 9000 : 7000;
          const commission = member.department === "Sales" ? 8500 : 0;
          const otherDeductions = index === 0 ? 1500 : 0;

          return {
            staffId: member.id,
            ...computePayrollBreakdown({
              basicSalary,
              allowance,
              commission,
              otherDeductions
            })
          };
        });

        const totalGross = payrollRows.reduce((sum, row) => sum + row.grossPay, 0);
        const totalNet = payrollRows.reduce((sum, row) => sum + row.netPay, 0);
        const currentMonth = new Date().toLocaleString("en-KE", { month: "long", year: "numeric" });

        const payrollRun = await tx.payrollRun.create({
          data: {
            label: `${currentMonth} Payroll`,
            periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
            status: PayrollRunStatus.CALCULATED,
            totalGross: money(totalGross),
            totalNet: money(totalNet)
          }
        });

        await Promise.all(
          payrollRows.map((row) =>
            tx.payrollItem.create({
              data: {
                payrollRunId: payrollRun.id,
                staffId: row.staffId,
                basicSalary: money(row.basicSalary),
                allowance: money(row.allowance),
                commission: money(row.commission),
                grossPay: money(row.grossPay),
                taxablePay: money(row.taxablePay),
                paye: money(row.paye),
                shif: money(row.shif),
                nssfEmployee: money(row.nssfEmployee),
                housingLevy: money(row.housingLevy),
                otherDeductions: money(row.otherDeductions),
                totalDeductions: money(row.totalDeductions),
                netPay: money(row.netPay)
              }
            })
          )
        );

        await addCommunication(tx, {
          channel: "Internal",
          direction: CommunicationDirection.INTERNAL,
          eventType: "PAYROLL_EXAMPLE_PREPARED",
          templateName: "Payroll Preparation",
          subject: `${payrollRun.label} prepared by HR`,
          recipientName: "Finance Department",
          recipientContact: "Finance queue",
          body: `Example payroll run ${payrollRun.label} has been prepared so HR can demonstrate salary review and later submit it to Finance for disbursement.`,
          status: "Prepared"
        });
      }
    }

    await addAudit(
      tx,
      input.userId,
      "POPULATE_STARTER_DATA",
      "System",
      actor.id,
      "Loaded non-destructive starter categories, products, customers, invoice flow, delivery proof, and payroll examples."
    );

    return {
      categories: await tx.productCategory.count(),
      customers: await tx.customer.count(),
      products: await tx.product.count(),
      orders: await tx.order.count(),
      invoices: await tx.invoice.count(),
      deliveries: await tx.delivery.count(),
      payrollRuns: await tx.payrollRun.count()
    };
  });
}

export { roleHomeMap };
