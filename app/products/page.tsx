import { AppShell } from "@/components/shell";
import { FormGrid, Input, Section, Select, SubmitButton, Table, Textarea } from "@/components/ui";
import { createProductAction, createProductCategoryAction } from "@/lib/actions";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, slugLabel } from "@/lib/utils";

export default async function ProductsPage({
  searchParams
}: {
  searchParams?: Promise<{ categoryCreated?: string; categoryError?: string }>;
}) {
  const user = await requireRouteAccess("/products");
  const [{ categories, products }, params] = await Promise.all([getCollections(), searchParams]);

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {params?.categoryCreated ? (
          <div className="xl:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Product category created successfully. You can now select it while adding products.
          </div>
        ) : null}

        {params?.categoryError ? (
          <div className="xl:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.categoryError}</div>
        ) : null}

        <Section eyebrow="Catalog" title="Phones and accessories">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.sku}</td>
                    <td>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-slate-400">
                        {product.brand} {product.model} {product.imeiTracked ? "• IMEI tracked" : ""}
                      </div>
                    </td>
                    <td>{product.category.name}</td>
                    <td>{formatCurrency(Number(product.unitPrice))}</td>
                    <td>
                      {product.stockOnHand} on hand
                      <div className="text-xs text-slate-400">Reorder at {product.reorderLevel}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Section>

        <Section
          eyebrow="Add SKU"
          title="Create product"
          description="Products depend on categories first. If this is your first setup, create one or two categories below, then return to the product form."
        >
          {categories.length === 0 ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No categories exist yet, so the product category dropdown would be empty. Create a category first.
            </div>
          ) : null}

          <form action={createProductCategoryAction} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-ink">Quick category setup</p>
            <FormGrid>
              <div>
                <label htmlFor="category-name">Category name</label>
                <Input id="category-name" name="name" placeholder="Smartphones" required />
              </div>
              <div>
                <label htmlFor="category-description">Description</label>
                <Input id="category-description" name="description" placeholder="Android and iPhone stock" />
              </div>
            </FormGrid>
            <SubmitButton>Create category</SubmitButton>
          </form>

          <form action={createProductAction} className="mt-5 space-y-4">
            <FormGrid>
              <div>
                <label htmlFor="name">Product name</label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <label htmlFor="brand">Brand</label>
                <Input id="brand" name="brand" required />
              </div>
              <div>
                <label htmlFor="model">Model</label>
                <Input id="model" name="model" required />
              </div>
              <div>
                <label htmlFor="categoryId">Category</label>
                <Select id="categoryId" name="categoryId" required>
                  {categories.length === 0 ? <option value="">Create a category first</option> : null}
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="unitPrice">Unit price</label>
                <Input id="unitPrice" min="0" name="unitPrice" required step="0.01" type="number" />
              </div>
              <div>
                <label htmlFor="taxRate">Tax rate %</label>
                <Input defaultValue="16" id="taxRate" min="0" name="taxRate" required step="0.01" type="number" />
              </div>
              <div>
                <label htmlFor="reorderLevel">Reorder level</label>
                <Input id="reorderLevel" min="0" name="reorderLevel" required type="number" />
              </div>
              <div>
                <label htmlFor="stockOnHand">Opening stock</label>
                <Input id="stockOnHand" min="0" name="stockOnHand" required type="number" />
              </div>
            </FormGrid>
            <div>
              <label htmlFor="description">Description</label>
              <Textarea id="description" name="description" required />
            </div>
            <SubmitButton>Create product</SubmitButton>
          </form>
        </Section>
      </div>
    </AppShell>
  );
}
