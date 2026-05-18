import {
  CommunicationDirection,
  CommissionRuleType,
  DeliveryStatus,
  InvoiceStatus,
  MovementType,
  OrderStatus,
  PayrollRunStatus,
  Prisma,
  PrismaClient,
  RoleKey
} from "@prisma/client";

const prisma = new PrismaClient();

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

const PERSONAL_RELIEF = 2400;
const SHIF_RATE = 0.0275;
const HOUSING_LEVY_RATE = 0.015;
const NSSF_LOWER_LIMIT = 9000;
const NSSF_UPPER_LIMIT = 108000;
const NSSF_RATE = 0.06;

function calculateNssfEmployee(grossPay: number) {
  const lowerTier = Math.min(grossPay, NSSF_LOWER_LIMIT) * NSSF_RATE;
  const upperTierWages = Math.max(Math.min(grossPay, NSSF_UPPER_LIMIT) - NSSF_LOWER_LIMIT, 0);
  return lowerTier + upperTierWages * NSSF_RATE;
}

function calculatePayeTax(taxablePay: number) {
  const bands = [
    { limit: 24000, rate: 0.1 },
    { limit: 8333, rate: 0.25 },
    { limit: 467667, rate: 0.3 },
    { limit: 300000, rate: 0.325 },
    { limit: Number.POSITIVE_INFINITY, rate: 0.35 }
  ];

  let remaining = taxablePay;
  let tax = 0;

  for (const band of bands) {
    if (remaining <= 0) {
      break;
    }

    const slice = Math.min(remaining, band.limit);
    tax += slice * band.rate;
    remaining -= slice;
  }

  return Math.max(tax - PERSONAL_RELIEF, 0);
}

function payrollBreakdown(basicSalary: number, allowance: number, commission: number, otherDeductions: number) {
  const grossPay = basicSalary + allowance + commission;
  const nssfEmployee = calculateNssfEmployee(grossPay);
  const shif = grossPay * SHIF_RATE;
  const housingLevy = grossPay * HOUSING_LEVY_RATE;
  const taxablePay = Math.max(grossPay - nssfEmployee - shif - housingLevy, 0);
  const paye = calculatePayeTax(taxablePay);
  const totalDeductions = paye + nssfEmployee + shif + housingLevy + otherDeductions;
  const netPay = grossPay - totalDeductions;

  return {
    basicSalary: money(basicSalary),
    allowance: money(allowance),
    commission: money(commission),
    grossPay: money(grossPay),
    taxablePay: money(taxablePay),
    paye: money(paye),
    shif: money(shif),
    nssfEmployee: money(nssfEmployee),
    housingLevy: money(housingLevy),
    otherDeductions: money(otherDeductions),
    totalDeductions: money(totalDeductions),
    netPay: money(netPay)
  };
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.appraisal.deleteMany();
  await prisma.communicationLog.deleteMany();
  await prisma.communicationTemplate.deleteMany();
  await prisma.proofOfDelivery.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@phoneflow.co.ke",
        fullName: "Mercy Njeri",
        password: "admin123",
        role: RoleKey.ADMIN
      }
    }),
    prisma.user.create({
      data: {
        email: "sales@phoneflow.co.ke",
        fullName: "Kevin Mutua",
        password: "sales123",
        role: RoleKey.SALES
      }
    }),
    prisma.user.create({
      data: {
        email: "warehouse@phoneflow.co.ke",
        fullName: "Brian Wekesa",
        password: "warehouse123",
        role: RoleKey.WAREHOUSE
      }
    }),
    prisma.user.create({
      data: {
        email: "delivery@phoneflow.co.ke",
        fullName: "Jane Atieno",
        password: "delivery123",
        role: RoleKey.DELIVERY
      }
    }),
    prisma.user.create({
      data: {
        email: "hr@phoneflow.co.ke",
        fullName: "Esther Waithera",
        password: "hr123",
        role: RoleKey.HR
      }
    }),
    prisma.user.create({
      data: {
        email: "finance@phoneflow.co.ke",
        fullName: "Samuel Kiptoo",
        password: "finance123",
        role: RoleKey.FINANCE
      }
    }),
    prisma.user.create({
      data: {
        email: "manager@phoneflow.co.ke",
        fullName: "Paul Otieno",
        password: "manager123",
        role: RoleKey.MANAGER
      }
    })
  ]);

  const [adminUser, salesUser, warehouseUser, deliveryUser, hrUser, financeUser, managerUser] = users;

  const staff = await Promise.all([
    prisma.staff.create({
      data: {
        userId: adminUser.id,
        employeeCode: "EMP-001",
        department: "Management",
        title: "General Administrator",
        branch: "Nairobi HQ",
        phone: "+254700111222",
        employmentStatus: "Active",
        employmentStartDate: new Date("2022-03-01"),
        monthlySalary: money(220000),
        roleLabel: "Admin"
      }
    }),
    prisma.staff.create({
      data: {
        userId: salesUser.id,
        employeeCode: "EMP-002",
        department: "Sales",
        title: "Key Accounts Lead",
        branch: "Nairobi HQ",
        phone: "+254700333444",
        employmentStatus: "Active",
        employmentStartDate: new Date("2023-01-10"),
        monthlySalary: money(120000),
        roleLabel: "Sales"
      }
    }),
    prisma.staff.create({
      data: {
        userId: warehouseUser.id,
        employeeCode: "EMP-003",
        department: "Warehouse",
        title: "Stock Controller",
        branch: "Industrial Area",
        phone: "+254700555666",
        employmentStatus: "Active",
        employmentStartDate: new Date("2023-06-15"),
        monthlySalary: money(85000),
        roleLabel: "Warehouse"
      }
    }),
    prisma.staff.create({
      data: {
        userId: deliveryUser.id,
        employeeCode: "EMP-004",
        department: "Logistics",
        title: "Dispatch Rider",
        branch: "Westlands Dispatch",
        phone: "+254700777888",
        employmentStatus: "Active",
        employmentStartDate: new Date("2024-02-10"),
        monthlySalary: money(62000),
        roleLabel: "Delivery"
      }
    }),
    prisma.staff.create({
      data: {
        userId: hrUser.id,
        employeeCode: "EMP-005",
        department: "Human Resources",
        title: "HR Officer",
        branch: "Nairobi HQ",
        phone: "+254700999000",
        employmentStatus: "Active",
        employmentStartDate: new Date("2022-11-01"),
        monthlySalary: money(98000),
        roleLabel: "HR"
      }
    }),
    prisma.staff.create({
      data: {
        userId: financeUser.id,
        employeeCode: "EMP-006",
        department: "Finance",
        title: "Finance Officer",
        branch: "Nairobi HQ",
        phone: "+254711111333",
        employmentStatus: "Active",
        employmentStartDate: new Date("2022-08-20"),
        monthlySalary: money(110000),
        roleLabel: "Finance"
      }
    }),
    prisma.staff.create({
      data: {
        userId: managerUser.id,
        employeeCode: "EMP-007",
        department: "Management",
        title: "Commercial Manager",
        branch: "Nairobi HQ",
        phone: "+254722111333",
        employmentStatus: "Active",
        employmentStartDate: new Date("2021-07-12"),
        monthlySalary: money(160000),
        roleLabel: "Manager"
      }
    })
  ]);

  const categories = await Promise.all([
    prisma.productCategory.create({ data: { name: "Smartphones", description: "Android and iOS wholesale devices" } }),
    prisma.productCategory.create({ data: { name: "Feature Phones", description: "Entry-level and durable handsets" } }),
    prisma.productCategory.create({ data: { name: "Accessories", description: "Chargers, earphones, and covers" } })
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "PHN-SM-S24",
        name: "Galaxy S24 256GB",
        brand: "Samsung",
        model: "S24",
        description: "Flagship Android smartphone for premium retail outlets.",
        categoryId: categories[0].id,
        unitPrice: money(98500),
        taxRate: money(16),
        reorderLevel: 18,
        stockOnHand: 52,
        reservedStock: 8,
        imeiTracked: true,
        attributesJson: JSON.stringify({ color: "Mixed", storage: "256GB", network: "5G" })
      }
    }),
    prisma.product.create({
      data: {
        sku: "PHN-IP-15",
        name: "iPhone 15 128GB",
        brand: "Apple",
        model: "iPhone 15",
        description: "High-demand wholesale iPhone stock for city retailers.",
        categoryId: categories[0].id,
        unitPrice: money(118000),
        taxRate: money(16),
        reorderLevel: 12,
        stockOnHand: 24,
        reservedStock: 6,
        imeiTracked: true,
        attributesJson: JSON.stringify({ color: "Mixed", storage: "128GB", network: "5G" })
      }
    }),
    prisma.product.create({
      data: {
        sku: "PHN-FT-N150",
        name: "Nokia 150",
        brand: "Nokia",
        model: "150",
        description: "Reliable feature phone for upcountry retail channels.",
        categoryId: categories[1].id,
        unitPrice: money(3900),
        taxRate: money(16),
        reorderLevel: 60,
        stockOnHand: 140,
        reservedStock: 20,
        imeiTracked: false,
        attributesJson: JSON.stringify({ battery: "Long life", sim: "Dual SIM" })
      }
    }),
    prisma.product.create({
      data: {
        sku: "PHN-ACC-25W",
        name: "25W Fast Charger",
        brand: "Voltix",
        model: "VC25",
        description: "Wholesale fast charger compatible with top Android phones.",
        categoryId: categories[2].id,
        unitPrice: money(1800),
        taxRate: money(16),
        reorderLevel: 80,
        stockOnHand: 210,
        reservedStock: 15,
        imeiTracked: false,
        attributesJson: JSON.stringify({ wattage: "25W", cable: "USB-C" })
      }
    })
  ]);

  await prisma.inventoryMovement.createMany({
    data: [
      { productId: products[0].id, type: MovementType.PURCHASE_IN, quantity: 60, reference: "GRN-2001", note: "Premium smartphone restock", createdById: warehouseUser.id },
      { productId: products[1].id, type: MovementType.PURCHASE_IN, quantity: 30, reference: "GRN-2002", note: "Apple shipment", createdById: warehouseUser.id },
      { productId: products[2].id, type: MovementType.PURCHASE_IN, quantity: 160, reference: "GRN-2003", note: "Feature phone batch", createdById: warehouseUser.id },
      { productId: products[3].id, type: MovementType.PURCHASE_IN, quantity: 240, reference: "GRN-2004", note: "Accessory shipment", createdById: warehouseUser.id },
      { productId: products[0].id, type: MovementType.SALES_RESERVATION, quantity: -8, reference: "ORD-1002", note: "Reserved for retailer order", createdById: salesUser.id },
      { productId: products[2].id, type: MovementType.SALES_RESERVATION, quantity: -20, reference: "ORD-1003", note: "Reserved for rural reseller", createdById: salesUser.id }
    ]
  });

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        code: "CUS-001",
        name: "Downtown Mobile Traders Ltd",
        segment: "Key account",
        industry: "Phone Retail",
        email: "procurement@downtownmobile.co.ke",
        phone: "+254711555111",
        taxId: "P051234567A",
        creditLimit: money(1200000),
        overdueBalance: money(0),
        city: "Nairobi",
        address: "Luthuli Avenue, Nairobi",
        notes: "Buys flagship smartphones for CBD branches.",
        contacts: {
          create: [
            {
              name: "Faith Mumo",
              role: "Procurement Manager",
              phone: "+254711555112",
              email: "faith@downtownmobile.co.ke"
            }
          ]
        }
      }
    }),
    prisma.customer.create({
      data: {
        code: "CUS-002",
        name: "Coastline Device Mart",
        segment: "Frequent buyer",
        industry: "Electronics Retail",
        email: "orders@coastlinedevice.co.ke",
        phone: "+254733888111",
        taxId: "P059876543B",
        creditLimit: money(850000),
        overdueBalance: money(146000),
        city: "Mombasa",
        address: "Digo Road, Mombasa",
        notes: "Strong demand for iPhones and fast chargers."
      }
    }),
    prisma.customer.create({
      data: {
        code: "CUS-003",
        name: "Upcountry Telcom Supplies",
        segment: "Regional distributor",
        industry: "Phone Retail",
        email: "supply@upcountrytelcom.co.ke",
        phone: "+254722444555",
        taxId: "P057654321C",
        creditLimit: money(950000),
        overdueBalance: money(0),
        city: "Eldoret",
        address: "Oloo Street, Eldoret",
        notes: "Resupplies feature phones to small-town shops."
      }
    })
  ]);

  const order1 = await prisma.order.create({
    data: {
      orderNumber: "ORD-1001",
      customerId: customers[0].id,
      createdById: salesUser.id,
      status: OrderStatus.CONFIRMED,
      subtotal: money(394000),
      taxTotal: money(63040),
      discountTotal: money(15000),
      deliveryFee: money(2500),
      grandTotal: money(459540),
      expectedDeliveryAt: new Date("2026-05-20T10:00:00Z"),
      notes: "Urgent restock for flagship branch.",
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 4,
            unitPrice: money(98500),
            discount: money(15000),
            taxRate: money(16),
            lineTotal: money(394000)
          }
        ]
      }
    },
    include: { items: true }
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: "ORD-1002",
      customerId: customers[1].id,
      createdById: salesUser.id,
      status: OrderStatus.DISPATCHED,
      subtotal: money(508400),
      taxTotal: money(81344),
      discountTotal: money(8000),
      deliveryFee: money(6000),
      grandTotal: money(595744),
      expectedDeliveryAt: new Date("2026-05-18T13:00:00Z"),
      notes: "Mixed high-value phone shipment to Mombasa.",
      items: {
        create: [
          {
            productId: products[1].id,
            quantity: 4,
            unitPrice: money(118000),
            discount: money(8000),
            taxRate: money(16),
            lineTotal: money(472000)
          },
          {
            productId: products[3].id,
            quantity: 20,
            unitPrice: money(1800),
            discount: money(0),
            taxRate: money(16),
            lineTotal: money(36000)
          }
        ]
      }
    },
    include: { items: true }
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-0001",
      orderId: order1.id,
      customerId: customers[0].id,
      createdById: financeUser.id,
      status: InvoiceStatus.PARTIALLY_PAID,
      issueDate: new Date("2026-05-16"),
      dueDate: new Date("2026-05-23"),
      subtotal: money(394000),
      taxTotal: money(63040),
      discountTotal: money(15000),
      deliveryFee: money(2500),
      grandTotal: money(459540),
      paidAmount: money(200000),
      notes: "Tax invoice for Samsung flagship phones.",
      items: {
        create: order1.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: item.lineTotal
        }))
      },
      payments: {
        create: [
          {
            amount: money(200000),
            method: "Bank Transfer",
            reference: "PAY-9901",
            note: "Initial deposit from Downtown Mobile Traders",
            receivedAt: new Date("2026-05-17T09:00:00Z")
          }
        ]
      }
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-0002",
      orderId: order2.id,
      customerId: customers[1].id,
      createdById: financeUser.id,
      status: InvoiceStatus.OVERDUE,
      issueDate: new Date("2026-05-10"),
      dueDate: new Date("2026-05-15"),
      subtotal: money(508000),
      taxTotal: money(81280),
      discountTotal: money(8000),
      deliveryFee: money(6000),
      grandTotal: money(595280),
      paidAmount: money(0),
      notes: "Invoice remains unpaid beyond due date.",
      items: {
        create: order2.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          lineTotal: item.lineTotal
        }))
      }
    }
  });

  const delivery = await prisma.delivery.create({
    data: {
      deliveryNumber: "DEL-2026-0001",
      orderId: order2.id,
      invoiceId: invoice2.id,
      assignedDriverId: staff[3].id,
      createdById: warehouseUser.id,
      status: DeliveryStatus.IN_TRANSIT,
      dispatchDate: new Date("2026-05-17T06:30:00Z"),
      destination: "Coastline Device Mart, Mombasa",
      customerName: customers[1].name,
      customerPhone: customers[1].phone,
      trackingNotes: "Driver left Nairobi dispatch with insured parcel manifest.",
      items: {
        create: [
          { productId: products[1].id, quantity: 4 },
          { productId: products[3].id, quantity: 20 }
        ]
      }
    }
  });

  await prisma.communicationTemplate.createMany({
    data: [
      {
        name: "Order Confirmation",
        channel: "Email",
        triggerEvent: "ORDER_CONFIRMED",
        subject: "Your phone order has been confirmed",
        body: "We have confirmed your order and started internal fulfillment."
      },
      {
        name: "Invoice Issued",
        channel: "Email",
        triggerEvent: "INVOICE_ISSUED",
        subject: "Invoice ready for payment",
        body: "Your invoice has been issued with a full tax breakdown."
      },
      {
        name: "Delivery Update",
        channel: "SMS",
        triggerEvent: "DELIVERY_IN_TRANSIT",
        subject: null,
        body: "Your phone shipment is now in transit."
      },
      {
        name: "Payment Receipt",
        channel: "Email",
        triggerEvent: "PAYMENT_RECORDED",
        subject: "Payment receipt issued",
        body: "Your payment has been received and posted."
      }
    ]
  });

  await prisma.communicationLog.createMany({
    data: [
      {
        customerId: customers[0].id,
        orderId: order1.id,
        channel: "Email",
        direction: CommunicationDirection.OUTBOUND,
        eventType: "ORDER_CONFIRMED",
        templateName: "Order Confirmation",
        subject: "Order ORD-1001 confirmed",
        body: "Downtown Mobile Traders order has been confirmed for 4 Galaxy S24 units.",
        recipientName: "Faith Mumo",
        recipientContact: "faith@downtownmobile.co.ke",
        status: "Sent",
        sentAt: new Date("2026-05-16T09:00:00Z")
      },
      {
        customerId: customers[0].id,
        orderId: order1.id,
        invoiceId: invoice1.id,
        channel: "Email",
        direction: CommunicationDirection.OUTBOUND,
        eventType: "INVOICE_ISSUED",
        templateName: "Invoice Issued",
        subject: "Invoice INV-2026-0001 issued",
        body: "Invoice with tax and delivery breakdown sent for payment processing.",
        recipientName: "Faith Mumo",
        recipientContact: "faith@downtownmobile.co.ke",
        status: "Sent",
        sentAt: new Date("2026-05-16T10:00:00Z")
      },
      {
        customerId: customers[1].id,
        orderId: order2.id,
        invoiceId: invoice2.id,
        deliveryId: delivery.id,
        channel: "SMS",
        direction: CommunicationDirection.OUTBOUND,
        eventType: "DELIVERY_IN_TRANSIT",
        templateName: "Delivery Update",
        subject: null,
        body: "Driver Jane is delivering iPhones and chargers under DEL-2026-0001.",
        recipientName: "Coastline Device Mart",
        recipientContact: customers[1].phone,
        status: "Sent",
        sentAt: new Date("2026-05-17T07:00:00Z")
      },
      {
        customerId: customers[0].id,
        orderId: order1.id,
        invoiceId: invoice1.id,
        channel: "Email",
        direction: CommunicationDirection.OUTBOUND,
        eventType: "PAYMENT_RECORDED",
        templateName: "Payment Receipt",
        subject: "Payment PAY-9901 received",
        body: "Initial deposit of KES 200,000 has been posted to INV-2026-0001.",
        recipientName: "Faith Mumo",
        recipientContact: "faith@downtownmobile.co.ke",
        status: "Sent",
        sentAt: new Date("2026-05-17T09:15:00Z")
      }
    ]
  });

  await prisma.commissionRule.create({
    data: {
      name: "Sales commission on paid phone invoices",
      roleLabel: "Sales",
      type: CommissionRuleType.PERCENT,
      value: money(4.5)
    }
  });

  await prisma.commission.create({
    data: {
      staffId: staff[1].id,
      invoiceId: invoice1.id,
      periodLabel: "May 2026",
      amount: money(9000),
      basis: "4.5% on collected deposit of KES 200,000 and additional account performance bonus."
    }
  });

  const payrollRun = await prisma.payrollRun.create({
    data: {
      label: "May 2026 Payroll",
      periodStart: new Date("2026-05-01"),
      periodEnd: new Date("2026-05-31"),
      status: PayrollRunStatus.CALCULATED,
      totalGross: money(867000),
      totalNet: money(650359.13)
    }
  });

  const payrollRows = [
    { staffId: staff[0].id, basicSalary: 220000, allowance: 25000, commission: 0, otherDeductions: 1500 },
    { staffId: staff[1].id, basicSalary: 120000, allowance: 10000, commission: 9000, otherDeductions: 500 },
    { staffId: staff[2].id, basicSalary: 85000, allowance: 6000, commission: 0, otherDeductions: 0 },
    { staffId: staff[3].id, basicSalary: 62000, allowance: 5000, commission: 0, otherDeductions: 0 },
    { staffId: staff[4].id, basicSalary: 98000, allowance: 7000, commission: 0, otherDeductions: 0 },
    { staffId: staff[5].id, basicSalary: 110000, allowance: 9000, commission: 0, otherDeductions: 0 },
    { staffId: staff[6].id, basicSalary: 160000, allowance: 16000, commission: 0, otherDeductions: 1200 }
  ];

  await prisma.payrollItem.createMany({
    data: payrollRows.map((row) => ({
      payrollRunId: payrollRun.id,
      staffId: row.staffId,
      ...payrollBreakdown(row.basicSalary, row.allowance, row.commission, row.otherDeductions)
    }))
  });

  await prisma.appraisal.createMany({
    data: [
      {
        staffId: staff[1].id,
        reviewPeriod: "Q1 2026",
        score: 90,
        strengths: "Strong conversion of retail phone accounts and disciplined follow-up.",
        improvementArea: "Could improve CRM note completeness on the same day.",
        managerFeedback: "Excellent commercial performance with good customer retention."
      },
      {
        staffId: staff[3].id,
        reviewPeriod: "Q1 2026",
        score: 84,
        strengths: "Reliable dispatch execution and good customer handover.",
        improvementArea: "Capture more detailed delivery notes for high-value handsets.",
        managerFeedback: "Strong field discipline and on-time completion rate."
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: warehouseUser.id,
        action: "CREATE_DELIVERY",
        entityType: "Delivery",
        entityId: delivery.id,
        detail: "Created delivery DEL-2026-0001 for order ORD-1002."
      },
      {
        userId: financeUser.id,
        action: "CREATE_INVOICE",
        entityType: "Invoice",
        entityId: invoice1.id,
        detail: "Issued invoice INV-2026-0001 from order ORD-1001."
      },
      {
        userId: financeUser.id,
        action: "RECORD_PAYMENT",
        entityType: "Invoice",
        entityId: invoice1.id,
        detail: "Recorded bank transfer PAY-9901 for KES 200,000."
      }
    ]
  });

  await prisma.setting.createMany({
    data: [
      { key: "business.name", value: "PhoneFlow Distributors" },
      { key: "business.type", value: "Phones" },
      { key: "business.currency", value: "KES" },
      { key: "inventory.deductionPolicy", value: "DELIVERY_DISPATCH" },
      { key: "notifications.smsProvider", value: "AfricasTalking" },
      { key: "delivery.gpsCapture", value: "OPTIONAL" },
      { key: "payroll.shifRate", value: "2.75%" },
      { key: "payroll.housingLevy", value: "1.5%" }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
