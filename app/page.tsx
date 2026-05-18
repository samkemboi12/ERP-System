import { AppShell } from "@/components/shell";
import { Section, StatCard, Table } from "@/components/ui";
import { getDashboardData } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDateTime, slugLabel } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireRouteAccess("/");
  const data = await getDashboardData();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Revenue collected" value={formatCurrency(data.kpis.revenueMonth)} />
          <StatCard label="Pending orders" value={String(data.kpis.pendingOrders)} />
          <StatCard label="Deliveries in transit" value={String(data.kpis.deliveriesInTransit)} />
          <StatCard label="Overdue invoices" value={String(data.kpis.overdueInvoices)} tone="alert" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Section
            eyebrow="Phone distribution"
            title="Operational control board"
            description="Track phone stock pressure, active orders, invoice exposure, and the latest customer-facing communication."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Low-stock products</p>
                <div className="mt-4 space-y-3">
                  {data.lowStockItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-slate-500">
                        {item.stockOnHand} in stock, reorder at {item.reorderLevel}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-900 p-5 text-white">
                <p className="text-sm text-slate-300">Policy switches</p>
                <div className="mt-4 space-y-3">
                  {data.settings.map((setting) => (
                    <div key={setting.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-sky-200">{setting.key}</p>
                      <p className="mt-1 font-medium">{setting.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section eyebrow="Communication" title="Latest customer flow">
            <div className="space-y-3">
              {data.communications.map((log) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-600">{log.eventType}</p>
                  <p className="mt-2 font-medium">{log.subject ?? log.templateName ?? "Operational message"}</p>
                  <p className="text-sm text-slate-500">{log.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(log.sentAt)}</p>
                </div>
              ))}
            </div>
          </Section>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Section eyebrow="Orders" title="Recent commercial activity">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.customer.name}</td>
                      <td>{slugLabel(order.status)}</td>
                      <td>{formatCurrency(Number(order.grandTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          </Section>

          <Section eyebrow="Logistics" title="Recent deliveries">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Delivery</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>{delivery.deliveryNumber}</td>
                      <td>{delivery.assignedDriver?.title ?? "Unassigned"}</td>
                      <td>{slugLabel(delivery.status)}</td>
                      <td>{formatDateTime(delivery.updatedAt)}</td>
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
