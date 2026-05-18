"use client";

export function PrintButton() {
  return (
    <button
      className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-700"
      onClick={() => window.print()}
      type="button"
    >
      Print invoice
    </button>
  );
}
