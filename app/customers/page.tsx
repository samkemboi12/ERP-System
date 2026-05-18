import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, SubmitButton, Table, Textarea } from "@/components/ui";
import { createCustomerAction } from "@/lib/actions";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, slugLabel } from "@/lib/utils";

export default async function CustomersPage() {
  const user = await requireRouteAccess("/customers");
  const { customers } = await getCollections();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Section eyebrow="B2B CRM" title="Retail company customers">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Segment</th>
                  <th>Industry</th>
                  <th>Contact</th>
                  <th>Credit Limit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-slate-400">{customer.code}</div>
                    </td>
                    <td>{customer.segment}</td>
                    <td>{customer.industry}</td>
                    <td>
                      <div>{customer.phone}</div>
                      <div className="text-xs text-slate-400">{customer.email ?? "No email"}</div>
                    </td>
                    <td>{formatCurrency(Number(customer.creditLimit))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Section>

        <Section eyebrow="Add account" title="Create retail customer">
          <form action={createCustomerAction} className="space-y-4">
            <FormGrid>
              <div>
                <label htmlFor="name">Company name</label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <label htmlFor="segment">Segment</label>
                <Input defaultValue="Key account" id="segment" name="segment" required />
              </div>
              <div>
                <label htmlFor="phone">Phone</label>
                <Input id="phone" name="phone" required />
              </div>
              <div>
                <label htmlFor="email">Email</label>
                <Input id="email" name="email" type="email" />
              </div>
              <div>
                <label htmlFor="city">City</label>
                <Input id="city" name="city" required />
              </div>
              <div>
                <label htmlFor="creditLimit">Credit limit</label>
                <Input id="creditLimit" min="0" name="creditLimit" step="0.01" type="number" />
              </div>
            </FormGrid>
            <div>
              <label htmlFor="address">Address</label>
              <Input id="address" name="address" required />
            </div>
            <div>
              <label htmlFor="notes">Notes</label>
              <Textarea id="notes" name="notes" />
            </div>
            <SubmitButton>Create customer</SubmitButton>
          </form>
        </Section>
      </div>
    </AppShell>
  );
}
