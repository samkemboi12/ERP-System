import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, Select, SubmitButton, Table } from "@/components/ui";
import { assignDeliveryAction, createDeliveryAction, startDeliveryAction } from "@/lib/actions";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function DeliveriesPage() {
  const user = await requireRouteAccess("/deliveries");
  const { deliveries, invoices, orders, staff } = await getCollections();
  const drivers = staff.filter((member) => member.roleLabel === "Delivery");

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        <Section eyebrow="Dispatch" title="Delivery planning and field progress">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Delivery</th>
                    <th>Customer</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Proof</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>
                        <div className="font-medium">{delivery.deliveryNumber}</div>
                        <div className="text-xs text-slate-400">{delivery.destination}</div>
                      </td>
                      <td>{delivery.customerName}</td>
                      <td>{delivery.assignedDriver?.title ?? "Unassigned"}</td>
                      <td>{slugLabel(delivery.status)}</td>
                      <td>{delivery.proofOfDelivery ? formatDateTime(delivery.proofOfDelivery.deliveredAt) : "Pending"}</td>
                      <td>
                        <div className="flex flex-col gap-2">
                          <form action={assignDeliveryAction}>
                            <input name="deliveryId" type="hidden" value={delivery.id} />
                            <Select className="mb-2 text-xs" defaultValue={delivery.assignedDriverId ?? ""} name="driverId">
                              <option value="">Choose driver</option>
                              {drivers.map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.title}
                                </option>
                              ))}
                            </Select>
                            <button className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">Assign</button>
                          </form>
                          <form action={startDeliveryAction}>
                            <input name="deliveryId" type="hidden" value={delivery.id} />
                            <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                              Start trip
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>

            <form action={createDeliveryAction} className="space-y-4 rounded-[1.5rem] bg-slate-50 p-5">
              <div>
                <label htmlFor="orderId">Order</label>
                <Select id="orderId" name="orderId" required>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customer.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="invoiceId">Invoice</label>
                <Select id="invoiceId" name="invoiceId">
                  <option value="">Optional linked invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                    </option>
                  ))}
                </Select>
              </div>
              <FormGrid>
                <div>
                  <label htmlFor="assignedDriverId">Driver</label>
                  <Select id="assignedDriverId" name="assignedDriverId">
                    <option value="">Assign later</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="destination">Destination</label>
                  <Input id="destination" name="destination" required />
                </div>
              </FormGrid>
              <SubmitButton>Create delivery</SubmitButton>
            </form>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
