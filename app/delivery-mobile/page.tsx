import { AppShell } from "@/components/shell";
import { Input, Section, SubmitButton, Textarea } from "@/components/ui";
import { completeDeliveryAction, startDeliveryAction } from "@/lib/actions";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function DeliveryMobilePage() {
  const user = await requireRouteAccess("/delivery-mobile");
  const { deliveries } = await getCollections();
  const assignedDeliveries = deliveries.filter(
    (delivery) => !user.staff?.id || delivery.assignedDriverId === user.staff.id || user.role === "ADMIN"
  );

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <Section
        eyebrow="Driver mode"
        title="Mobile proof-of-delivery workflow"
        description="Delivery staff only see assigned trips, customer handoff details, and POD capture."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {assignedDeliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-600">{delivery.deliveryNumber}</p>
                  <h3 className="mt-2 text-xl font-semibold">{delivery.customerName}</h3>
                  <p className="text-sm text-slate-500">{delivery.destination}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{slugLabel(delivery.status)}</div>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600">
                <p>Customer phone: {delivery.customerPhone}</p>
                <p>Dispatch time: {delivery.dispatchDate ? formatDateTime(delivery.dispatchDate) : "Not started"}</p>
                <p>Items: {delivery.items.map((item) => `${item.product.name} x ${item.quantity}`).join(", ")}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <form action={startDeliveryAction}>
                  <input name="deliveryId" type="hidden" value={delivery.id} />
                  <button className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white">Start delivery</button>
                </form>
              </div>

              <form action={completeDeliveryAction} className="mt-5 space-y-3">
                <input name="deliveryId" type="hidden" value={delivery.id} />
                <div>
                  <label htmlFor={`recipientName-${delivery.id}`}>Recipient name</label>
                  <Input id={`recipientName-${delivery.id}`} name="recipientName" required />
                </div>
                <div>
                  <label htmlFor={`signatureText-${delivery.id}`}>Signature capture</label>
                  <Input
                    id={`signatureText-${delivery.id}`}
                    name="signatureText"
                    placeholder="Type signed name as acknowledgment"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`location-${delivery.id}`}>Location</label>
                  <Input id={`location-${delivery.id}`} name="location" placeholder="CBD branch receiving bay" />
                </div>
                <div>
                  <label htmlFor={`notes-${delivery.id}`}>Delivery note</label>
                  <Textarea id={`notes-${delivery.id}`} name="notes" />
                </div>
                <SubmitButton>Mark delivered</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
