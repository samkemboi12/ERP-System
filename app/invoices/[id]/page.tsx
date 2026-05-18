import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { AppShell } from "@/components/shell";
import { Section, Table } from "@/components/ui";
import { getInvoicePreview } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDate, slugLabel } from "@/lib/utils";

export default async function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRouteAccess("/invoices");
  const { id } = await params;
  const invoice = await getInvoicePreview(id);
  const balance = Number(invoice.grandTotal) - Number(invoice.paidAmount);

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="space-y-6 print:block">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link className="text-sm font-medium text-sky-700" href="/invoices">
            Back to invoices
          </Link>
          <PrintButton />
        </div>

        <Section eyebrow="Invoice preview" title={invoice.invoiceNumber}>
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Bill to</p>
              <p className="mt-2 text-xl font-semibold">{invoice.customer.name}</p>
              <p className="text-sm text-slate-500">{invoice.customer.address}</p>
              <p className="text-sm text-slate-500">{invoice.customer.phone}</p>
              <p className="text-sm text-slate-500">{invoice.customer.email ?? "No email"}</p>
            </div>

            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span>{slugLabel(invoice.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Issue date</span>
                  <span>{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due date</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order</span>
                  <span>{invoice.order?.orderNumber ?? "Direct invoice"}</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section eyebrow="Breakdown" title="Itemized amount preview">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Tax</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product.name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(Number(item.unitPrice))}</td>
                    <td>{Number(item.taxRate)}%</td>
                    <td>{formatCurrency(Number(item.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>

          <div className="mt-6 grid gap-3 md:ml-auto md:max-w-md">
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Discount</span>
              <span>{formatCurrency(Number(invoice.discountTotal))}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Tax</span>
              <span>{formatCurrency(Number(invoice.taxTotal))}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Delivery fee</span>
              <span>{formatCurrency(Number(invoice.deliveryFee))}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
              <span>Grand total</span>
              <span>{formatCurrency(Number(invoice.grandTotal))}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-sky-50 px-4 py-3 text-sky-900">
              <span>Paid to date</span>
              <span>{formatCurrency(Number(invoice.paidAmount))}</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-amber-50 px-4 py-3 text-amber-900">
              <span>Outstanding balance</span>
              <span>{formatCurrency(balance)}</span>
            </div>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
