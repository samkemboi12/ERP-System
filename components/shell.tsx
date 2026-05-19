import Link from "next/link";
import { type ReactNode } from "react";

import { logoutAction } from "@/lib/actions";
import { getNavForRole } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

export function AppShell({
  children,
  user
}: {
  children: ReactNode;
  user: {
    fullName: string;
    role: string;
    roleKey: Parameters<typeof getNavForRole>[0];
  };
}) {
  const navItems = getNavForRole(user.roleKey);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#fffdfa_0%,#f8fafc_62%,#eff6ff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-white/60 bg-slate p-6 text-white shadow-panel lg:block">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200">PhoneFlow ERP</p>
            <h1 className="mt-3 text-2xl font-semibold">Wholesale phone operations</h1>
            <p className="mt-3 text-sm text-slate-300">
              Sales, stock, invoicing, field delivery, payroll, and communication control for a phone distribution business.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="block rounded-2xl px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <p className="font-medium">{user.fullName}</p>
            <p>{user.role}</p>
            <p className="mt-2 text-xs text-slate-400">Session refreshed: {formatDateTime(new Date())}</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-6 rounded-[2rem] border border-slate-200/70 bg-white/80 p-5 shadow-panel backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Integrated phone distribution system</p>
                <h2 className="mt-2 text-3xl font-semibold text-ink">PhoneFlow Distributors</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Department-aware access keeps delivery, finance, HR, and warehouse work separated while admin sees everything.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-100" href="/account/security">
                  Account Security
                </Link>
                <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">Signed in as {user.fullName}</div>
                <form action={logoutAction}>
                  <button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate">
                    Log out
                  </button>
                </form>
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
