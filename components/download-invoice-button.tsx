"use client";

export function DownloadInvoiceButton({ invoiceNumber }: { invoiceNumber: string }) {
  return (
    <button
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-ink transition hover:bg-slate-50"
      onClick={() => {
        const source = document.getElementById("invoice-download-root");

        if (!source) {
          return;
        }

        const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${invoiceNumber}</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}h1,h2,h3,p{margin:0 0 12px} .card{border:1px solid #cbd5e1;border-radius:16px;padding:16px;margin-bottom:16px}</style></head><body>${source.innerHTML}</body></html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${invoiceNumber}.html`;
        link.click();
        URL.revokeObjectURL(url);
      }}
      type="button"
    >
      Download invoice
    </button>
  );
}
