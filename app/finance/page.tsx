import Link from "next/link";

import { AppShell } from "@/components/shell";
import { Section, Table } from "@/components/ui";
import { getFinanceHubData } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDate, formatDateTime, slugLabel } from "@/lib/utils";

export default async function FinancePage() {
  const user = await requireRouteAccess("/finance");
  const data = await getFinanceHubData();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        <Section
          eyebrow="Finance hub"
          title="Receivables, payroll handoff, and reporting control"
          description="Yes, there is now a dedicated Finance section. It brings together invoice tracking, payment posting, payroll receipt from HR, and management reporting."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Invoice workflow</p>
              <p className="mt-2 text-lg font-semibold text-ink">Issue, preview, collect, reconcile</p>
              <p className="mt-3 text-sm text-slate-600">
                Finance opens invoices, reviews breakdowns, records part-payments or full settlements, and monitors outstanding balances.
              </p>
              <Link className="mt-4 inline-block text-sm font-medium text-sky-700" href="/invoices">
                Open invoice control
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Payroll handoff</p>
              <p className="mt-2 text-lg font-semibold text-ink">HR prepares, Finance disburses</p>
              <p className="mt-3 text-sm text-slate-600">
                HR calculates gross pay, statutory deductions, and net salary, then submits the approved run to Finance for bank or mobile-money disbursement.
              </p>
              <Link className="mt-4 inline-block text-sm font-medium text-sky-700" href="/payroll">
                Open payroll
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Management reporting</p>
              <p className="mt-2 text-lg font-semibold text-ink">Revenue, payments, exposure</p>
              <p className="mt-3 text-sm text-slate-600">
                Reports summarize customer revenue, posted payments, payroll totals, and operational communications relevant to Finance.
              </p>
              <Link className="mt-4 inline-block text-sm font-medium text-sky-700" href="/reports">
                Open reports
              </Link>
            </div>
          </div>
        </Section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Section eyebrow="Examples" title="How to explain the ERP flow">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-ink">Example 1: Order to invoice</p>
                <p className="mt-2">
                  Sales creates an order for a retail company. Finance then generates the invoice, reviews the subtotal, discount, tax, and delivery fee,
                  then sends it to the customer for payment.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-ink">Example 2: HR to Finance payroll</p>
                <p className="mt-2">
                  HR prepares employee payroll with PAYE, SHIF, NSSF, Housing Levy, and any other deductions. Once reviewed, HR submits the run to Finance,
                  and Finance uses that approved net-pay list for salary disbursement.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-ink">Example 3: Delivery to signed proof</p>
                <p className="mt-2">
                  Warehouse creates the delivery, the driver captures the customer recipient name and signature on completion, and the linked order status
                  becomes Delivered.
                </p>
              </div>
            </div>
          </Section>

          <Section eyebrow="Finance trail" title="Recent finance-relevant communications">
            <div className="space-y-3">
              {data.communications.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-600">{log.eventType}</p>
                  <p className="mt-2 font-medium text-ink">{log.subject ?? log.templateName ?? "Operational message"}</p>
                  <p className="mt-1 text-sm text-slate-500">{log.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(log.sentAt)}</p>
                </div>
              ))}
            </div>
          </Section>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Section eyebrow="Receivables" title="Latest invoices">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoiceNumber}</td>
                      <td>{invoice.customer.name}</td>
                      <td>{slugLabel(invoice.status)}</td>
                      <td>{formatDate(invoice.dueDate)}</td>
                      <td>{formatCurrency(Number(invoice.grandTotal) - Number(invoice.paidAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          </Section>

          <Section eyebrow="Cashbook" title="Recent receipts">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.reference}</td>
                      <td>{payment.invoice.customer.name}</td>
                      <td>{formatCurrency(Number(payment.amount))}</td>
                      <td>{formatDateTime(payment.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          </Section>
        </section>
      </div>
    </AppShell>
  );
}
