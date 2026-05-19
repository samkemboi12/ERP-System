import { AppShell } from "@/components/shell";
import { Input, Section, SubmitButton } from "@/components/ui";
import { changeOwnPasswordAction } from "@/lib/actions";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function AccountSecurityPage({
  searchParams
}: {
  searchParams?: Promise<{ changed?: string; error?: string; required?: string }>;
}) {
  const user = await requireRouteAccess("/account/security");
  const params = await searchParams;

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Section
          eyebrow="Account security"
          title="Change your password"
          description="Use a strong, unique password. When accounts are created or reset by Admin, the employee should replace the temporary password here."
        >
          {params?.required || user.mustChangePassword ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              A password change is required before you continue normal work in the ERP.
            </div>
          ) : null}

          {params?.changed ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Password changed successfully. Other active sessions were signed out for safety.
            </div>
          ) : null}

          {params?.error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</div>
          ) : null}

          <form action={changeOwnPasswordAction} className="space-y-4">
            <div>
              <label htmlFor="currentPassword">Current password</label>
              <Input id="currentPassword" name="currentPassword" required type="password" />
            </div>
            <div>
              <label htmlFor="newPassword">New password</label>
              <Input id="newPassword" name="newPassword" required type="password" />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirm new password</label>
              <Input id="confirmPassword" name="confirmPassword" required type="password" />
            </div>
            <SubmitButton>Update password</SubmitButton>
          </form>
        </Section>

        <Section eyebrow="Status" title="Security profile">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Signed-in account</p>
              <p className="mt-2 font-medium text-ink">{user.fullName}</p>
              <p className="mt-1 text-sm text-slate-600">{user.email}</p>
              <p className="mt-1 text-sm text-slate-600">{slugLabel(user.role)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Password status</p>
              <p className="mt-2 text-sm text-slate-700">
                {user.passwordChangedAt ? `Last changed: ${formatDateTime(user.passwordChangedAt)}` : "Password has not been rotated yet."}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {user.mustChangePassword
                  ? "A password update is required before this account is considered fully activated."
                  : "This account is cleared to use the ERP."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Strong passwords should contain upper and lower case letters, numbers, and symbols, and should not be reused on any other system.
            </div>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
