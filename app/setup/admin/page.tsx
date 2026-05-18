import Link from "next/link";
import { redirect } from "next/navigation";

import { Input, SubmitButton } from "@/components/ui";
import { bootstrapInitialAdminAction } from "@/lib/actions";
import { hasAnyUserAccounts } from "@/lib/services";

export default async function AdminBootstrapPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const [hasUsers, params] = await Promise.all([hasAnyUserAccounts(), searchParams]);

  if (hasUsers) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fefce8_0%,#f8fafc_55%,#dbeafe_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2.25rem] bg-slate p-8 text-white shadow-panel lg:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Production bootstrap</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Create the first real admin account.</h1>
          <p className="mt-5 max-w-xl text-base text-slate-300">
            This setup page is only available while the ERP has no users. It creates the first admin securely without loading sample sales, payroll,
            or customer data.
          </p>

          <div className="mt-10 space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200">What happens next</p>
              <p className="mt-2 text-sm text-slate-300">
                After this, sign in from the normal login page, open Settings, and create department accounts for Finance, HR, Sales, Warehouse,
                Delivery, and Management.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Security note</p>
              <p className="mt-2 text-sm text-slate-300">
                The password you choose here is hashed before storage. Use a strong unique admin password that is not already used anywhere else.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2.25rem] border border-white/60 bg-white/90 p-8 shadow-panel lg:p-12">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-600">Initial access</p>
          <h2 className="mt-4 text-3xl font-semibold text-ink">Bootstrap admin</h2>
          <p className="mt-3 text-sm text-slate-500">
            This page disappears automatically after the first account is created.
          </p>

          {params?.error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{params.error}</div>
          ) : null}

          <form action={bootstrapInitialAdminAction} className="mt-8 space-y-4">
            <div>
              <label htmlFor="fullName">Admin full name</label>
              <Input id="fullName" name="fullName" placeholder="Samwel Kemboi" required />
            </div>
            <div>
              <label htmlFor="email">Admin email</label>
              <Input id="email" name="email" placeholder="admin@yourcompany.com" required type="email" />
            </div>
            <div>
              <label htmlFor="password">Admin password</label>
              <Input id="password" name="password" placeholder="Choose a strong unique password" required type="password" />
            </div>
            <div>
              <label htmlFor="phone">Phone</label>
              <Input id="phone" name="phone" placeholder="+2547..." required />
            </div>
            <div>
              <label htmlFor="branch">Branch</label>
              <Input id="branch" name="branch" placeholder="Nairobi HQ" required />
            </div>
            <div>
              <label htmlFor="employeeCode">Employee code</label>
              <Input id="employeeCode" name="employeeCode" placeholder="Optional, default is EMP-001" />
            </div>
            <SubmitButton>Create admin account</SubmitButton>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Already created your first user? <Link className="font-medium text-sky-700" href="/login">Return to login</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
