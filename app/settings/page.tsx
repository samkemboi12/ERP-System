import { AppShell } from "@/components/shell";
import { Section, Table } from "@/components/ui";
import { getCollections } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatDateTime, slugLabel } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await requireRouteAccess("/settings");
  const { settings, templates, auditLogs } = await getCollections();

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        <Section eyebrow="Configuration" title="Operational settings and communication templates">
          <div className="grid gap-6 xl:grid-cols-2">
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.id}>
                      <td>{setting.key}</td>
                      <td>{setting.value}</td>
                      <td>{formatDateTime(setting.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>

            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-600">{template.channel}</p>
                  <p className="mt-2 font-medium">{template.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{template.triggerEvent}</p>
                  <p className="mt-2 text-sm text-slate-500">{template.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section eyebrow="Governance" title="Audit trail">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.user?.fullName ?? "System"}</td>
                    <td>{log.action}</td>
                    <td>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Section>
      </div>
    </AppShell>
  );
}
