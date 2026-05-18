import { AppShell } from "@/components/shell";
import { Section, Table } from "@/components/ui";
import { getCommunicationFeed } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function CommunicationsPage() {
  const user = await requireRouteAccess("/communications");
  const feed = await getCommunicationFeed();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <Section
        eyebrow="Communication flow"
        title="Order-to-cash message trail"
        description="Track how the system communicates from order creation, to invoice issuance, to delivery updates, and payment confirmation."
      >
        <Table>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Channel</th>
                <th>Recipient</th>
                <th>Linked Flow</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {feed.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.sentAt)}</td>
                  <td>
                    <div className="font-medium">{item.eventType}</div>
                    <div className="text-xs text-slate-400">{item.subject ?? item.templateName ?? "Operational message"}</div>
                  </td>
                  <td>{item.channel}</td>
                  <td>{item.recipientName ?? item.customer?.name ?? "Internal"}</td>
                  <td>
                    {item.order?.orderNumber ?? "-"}
                    {item.invoice ? ` / ${item.invoice.invoiceNumber}` : ""}
                    {item.delivery ? ` / ${item.delivery.deliveryNumber}` : ""}
                  </td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Table>
      </Section>
    </AppShell>
  );
}
