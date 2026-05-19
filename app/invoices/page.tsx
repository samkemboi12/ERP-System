import Link from "next/link";

import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, Select, SubmitButton, Table, Textarea } from "@/components/ui";
import { recordPaymentAction } from "@/lib/actions";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDate, slugLabel } from "@/lib/utils";

export default async function InvoicesPage() {
  const user = await requireRouteAccess("/invoices");
  const { invoices } = await getCollections();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section eyebrow="Billing" title="Invoice control and payment tracking">
          {invoices.length === 0 ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No invoices exist yet. Create an order, confirm it, then generate an invoice from the Orders page, or load starter examples from Settings.
            </div>
          ) : null}
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const total = Number(invoice.grandTotal);
                  const paid = Number(invoice.paidAmount);

                  return (
                    <tr key={invoice.id}>
                      <td>{invoice.invoiceNumber}</td>
                      <td>{invoice.customer.name}</td>
                      <td>{slugLabel(invoice.status)}</td>
                      <td>{formatDate(invoice.dueDate)}</td>
                      <td>{formatCurrency(paid)}</td>
                      <td>{formatCurrency(total - paid)}</td>
                      <td>
                        <Link className="text-sm font-medium text-sky-700" href={`/invoices/${invoice.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Table>
        </Section>

        <Section eyebrow="Cash application" title="Record invoice payment">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Finance uses this section to receive a customer payment, post the amount, keep the invoice breakdown intact, and update the outstanding balance.
          </div>
          <form action={recordPaymentAction} className="space-y-4">
            <div>
              <label htmlFor="invoiceId">Invoice</label>
              <Select id="invoiceId" name="invoiceId" required>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {invoice.customer.name}
                  </option>
                ))}
              </Select>
            </div>
            <FormGrid>
              <div>
                <label htmlFor="amount">Amount</label>
                <Input id="amount" min="0" name="amount" required step="0.01" type="number" />
              </div>
              <div>
                <label htmlFor="method">Method</label>
                <Select id="method" name="method">
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>M-Pesa</option>
                  <option>Cheque</option>
                </Select>
              </div>
            </FormGrid>
            <div>
              <label htmlFor="reference">Reference</label>
              <Input id="reference" name="reference" required />
            </div>
            <div>
              <label htmlFor="note">Finance note</label>
              <Textarea id="note" name="note" />
            </div>
            <SubmitButton>Apply payment</SubmitButton>
          </form>
        </Section>
      </div>
    </AppShell>
  );
}
