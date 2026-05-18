import Link from "next/link";

import { Input, SubmitButton } from "@/components/ui";
import { loginAction } from "@/lib/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fefce8_0%,#f8fafc_55%,#dbeafe_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2.25rem] bg-slate p-8 text-white shadow-panel lg:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200">PhoneFlow ERP</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">High-control ERP for wholesale phone operations.</h1>
          <p className="mt-5 max-w-xl text-base text-slate-300">
            Manage stock, retail-customer orders, invoices, delivery proof, payroll deductions, and department-specific access from one system.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Access model</p>
              <p className="mt-2 font-medium">One ERP, role-limited workspaces</p>
              <p className="mt-3 text-sm text-slate-300">
                Sales, warehouse, finance, HR, management, and drivers all sign in through one secure portal and only see the workflows assigned to them.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Account security</p>
              <p className="mt-2 font-medium">Credentials are issued by admin</p>
              <p className="mt-3 text-sm text-slate-300">
                If you need an account or a password reset, contact your ERP administrator. Demo passwords are not displayed in production.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2.25rem] border border-white/60 bg-white/90 p-8 shadow-panel lg:p-12">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-600">Secure sign in</p>
          <h2 className="mt-4 text-3xl font-semibold text-ink">Access the ERP workspace</h2>
          <p className="mt-3 text-sm text-slate-500">
            Finance, HR, warehouse, sales, management, and delivery teams each land in the parts of the system they are allowed to use.
          </p>

          {params?.error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              Email or password was not recognized.
            </div>
          ) : null}

          <form action={loginAction} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email">Email</label>
              <Input id="email" name="email" placeholder="name@yourcompany.com" required type="email" />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <Input id="password" name="password" placeholder="Enter your password" required type="password" />
            </div>
            <SubmitButton>Sign in</SubmitButton>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Delivery staff can jump into field mode from <Link className="font-medium text-sky-700" href="/delivery-mobile">Driver View</Link> after login.
          </p>
        </section>
      </div>
    </div>
  );
}
