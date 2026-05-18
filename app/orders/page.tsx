import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, Select, SubmitButton, Table, Textarea } from "@/components/ui";
import { confirmOrderAction, createOrderAction, generateInvoiceAction } from "@/lib/actions";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, slugLabel } from "@/lib/utils";

export default async function OrdersPage() {
  const user = await requireRouteAccess("/orders");
  const { customers, orders, products } = await getCollections();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        <Section eyebrow="Sales desk" title="Create and progress phone orders">
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.customer.name}</td>
                      <td>
                        {order.items.map((item) => (
                          <div key={item.id}>
                            {item.product.name} x {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td>{slugLabel(order.status)}</td>
                      <td>{formatCurrency(Number(order.grandTotal))}</td>
                      <td>
                        <div className="flex flex-col gap-2">
                          <form action={confirmOrderAction}>
                            <input name="orderId" type="hidden" value={order.id} />
                            <button className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">Confirm</button>
                          </form>
                          <form action={generateInvoiceAction}>
                            <input name="orderId" type="hidden" value={order.id} />
                            <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                              Generate invoice
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>

            <form action={createOrderAction} className="space-y-4 rounded-[1.5rem] bg-slate-50 p-5">
              <FormGrid>
                <div>
                  <label htmlFor="customerId">Customer</label>
                  <Select id="customerId" name="customerId" required>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="productId">Product</label>
                  <Select id="productId" name="productId" required>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="quantity">Quantity</label>
                  <Input defaultValue="1" id="quantity" min="1" name="quantity" required type="number" />
                </div>
                <div>
                  <label htmlFor="discount">Discount</label>
                  <Input defaultValue="0" id="discount" min="0" name="discount" step="0.01" type="number" />
                </div>
                <div>
                  <label htmlFor="deliveryFee">Delivery fee</label>
                  <Input defaultValue="0" id="deliveryFee" min="0" name="deliveryFee" step="0.01" type="number" />
                </div>
              </FormGrid>
              <div>
                <label htmlFor="notes">Notes</label>
                <Textarea id="notes" name="notes" />
              </div>
              <SubmitButton>Create order</SubmitButton>
            </form>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
