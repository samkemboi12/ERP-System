import { MovementType } from "@prisma/client";

import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, Select, SubmitButton, Table, Textarea } from "@/components/ui";
import { addInventoryMovementAction } from "@/lib/actions";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function InventoryPage() {
  const user = await requireRouteAccess("/inventory");
  const { movements, products } = await getCollections();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Section eyebrow="Stock ledger" title="Phone inventory balances and movement trail">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Movement</th>
                  <th>Qty</th>
                  <th>Reference</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{movement.product.name}</td>
                    <td>{slugLabel(movement.type)}</td>
                    <td>{movement.quantity}</td>
                    <td>{movement.reference}</td>
                    <td>{formatDateTime(movement.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Section>

        <Section eyebrow="Adjust stock" title="Record inventory movement">
          <form action={addInventoryMovementAction} className="space-y-4">
            <FormGrid>
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
                <label htmlFor="type">Movement type</label>
                <Select id="type" name="type">
                  {Object.values(MovementType).map((type) => (
                    <option key={type} value={type}>
                      {slugLabel(type)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="quantity">Quantity (+/-)</label>
                <Input id="quantity" name="quantity" required type="number" />
              </div>
              <div>
                <label htmlFor="reference">Reference</label>
                <Input id="reference" name="reference" required />
              </div>
            </FormGrid>
            <div>
              <label htmlFor="note">Note</label>
              <Textarea id="note" name="note" />
            </div>
            <SubmitButton>Record movement</SubmitButton>
          </form>
        </Section>
      </div>
    </AppShell>
  );
}
