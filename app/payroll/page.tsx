import { AppShell } from "@/components/shell";
import { Input, Section, SubmitButton, Table, Textarea } from "@/components/ui";
import { submitPayrollToFinanceAction } from "@/lib/actions";
import { getPayrollData } from "@/lib/services";
import { requireRouteAccess } from "@/lib/session";
import { formatCurrency, formatDate, formatDateTime, slugLabel } from "@/lib/utils";

export default async function PayrollPage({
  searchParams
}: {
  searchParams?: Promise<{ submitted?: string }>;
}) {
  const user = await requireRouteAccess("/payroll");
  const [{ latestRun, latestSubmission, runs }, params] = await Promise.all([getPayrollData(), searchParams]);
  const canSubmitToFinance = user.role === "ADMIN" || user.role === "HR";

  return (
    <AppShell user={{ fullName: user.fullName, role: slugLabel(user.role), roleKey: user.role }}>
      <div className="grid gap-6">
        {params?.submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            HR has submitted the payroll run to Finance for salary disbursement. Finance can now work from the approved figures.
          </div>
        ) : null}

        <Section
          eyebrow="Payroll"
          title="Functional payroll with statutory deductions"
          description="This sample payroll includes PAYE, SHIF, NSSF, and Housing Levy breakdowns for every employee in the run."
        >
          {latestRun ? (
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Gross</th>
                    <th>PAYE</th>
                    <th>SHIF</th>
                    <th>NSSF</th>
                    <th>Housing</th>
                    <th>Total Deductions</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRun.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.staff.title}</td>
                      <td>{formatCurrency(Number(item.grossPay))}</td>
                      <td>{formatCurrency(Number(item.paye))}</td>
                      <td>{formatCurrency(Number(item.shif))}</td>
                      <td>{formatCurrency(Number(item.nssfEmployee))}</td>
                      <td>{formatCurrency(Number(item.housingLevy))}</td>
                      <td>{formatCurrency(Number(item.totalDeductions))}</td>
                      <td>{formatCurrency(Number(item.netPay))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          ) : null}
        </Section>

        <Section
          eyebrow="Explainer"
          title="How to explain the payroll flow"
          description="Use this as a simple business explanation when demonstrating the ERP to HR, Finance, or management."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-ink">Step 1: HR prepares payroll</p>
              <p className="mt-2">
                HR reviews each employee record, confirms salary and allowance, then the ERP calculates PAYE, SHIF, NSSF, Housing Levy, total deductions,
                and net salary.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-ink">Step 2: HR submits to Finance</p>
              <p className="mt-2">
                HR uses the month-end handoff form below to send the approved payroll figures to Finance. The system records that communication in the ERP trail.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-ink">Step 3: Finance disburses salaries</p>
              <p className="mt-2">
                Finance works from the approved net-pay amounts and uses bank transfer, payroll file upload, or mobile-money disbursement outside the ERP,
                while keeping the ERP as the control record.
              </p>
            </div>
          </div>
        </Section>

        {latestRun ? (
          <Section
            eyebrow="Month end handoff"
            title="HR to finance salary dispatch"
            description="Yes. HR can formally send the approved salary figures to Finance from here, and the system records the handoff in the communication log."
          >
            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Latest run</p>
                <p className="mt-2 text-xl font-semibold text-ink">{latestRun.label}</p>
                <p className="mt-3 text-sm text-slate-600">
                  Status: <span className="font-medium">{slugLabel(latestRun.status)}</span>
                </p>
                <p className="mt-2 text-sm text-slate-600">Gross payroll: {formatCurrency(Number(latestRun.totalGross))}</p>
                <p className="mt-2 text-sm text-slate-600">Net payroll: {formatCurrency(Number(latestRun.totalNet))}</p>
                <p className="mt-2 text-sm text-slate-600">Payroll lines: {latestRun.items.length}</p>
                <p className="mt-4 text-sm text-slate-500">
                  {latestSubmission
                    ? `Last handoff recorded on ${formatDateTime(latestSubmission.sentAt)}.`
                    : "No payroll handoff has been recorded yet for Finance."}
                </p>
              </div>

              {canSubmitToFinance ? (
                <form action={submitPayrollToFinanceAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <Input name="payrollRunId" type="hidden" value={latestRun.id} />
                  <div>
                    <label htmlFor="note">Finance handoff note</label>
                    <Textarea
                      id="note"
                      name="note"
                      placeholder="Share any month-end notes for Finance, such as bank file timing, holds, or final approval remarks."
                    />
                  </div>
                  <SubmitButton>Send payroll to Finance</SubmitButton>
                </form>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                  HR or Admin submits the payroll here. Finance receives the approved run through the shared payroll status and the internal communication log.
                </div>
              )}
            </div>
          </Section>
        ) : null}

        <Section eyebrow="Run history" title="Payroll runs">
          <Table>
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Gross</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.label}</td>
                    <td>
                      {formatDate(run.periodStart)} - {formatDate(run.periodEnd)}
                    </td>
                    <td>{slugLabel(run.status)}</td>
                    <td>{formatCurrency(Number(run.totalGross))}</td>
                    <td>{formatCurrency(Number(run.totalNet))}</td>
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
