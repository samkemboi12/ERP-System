import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Section({
  title,
  eyebrow,
  description,
  children,
  className
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[2rem] border border-slate-200/70 bg-white/90 p-6 shadow-panel", className)}>
      <div className="mb-5">
        {eyebrow ? <p className="text-xs uppercase tracking-[0.25em] text-orange-500">{eyebrow}</p> : null}
        <h3 className="mt-2 text-2xl font-semibold text-ink">{title}</h3>
        {description ? <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "alert";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-5",
        tone === "alert" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
      )}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-orange-400",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-orange-400",
        props.className
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-orange-400",
        props.className
      )}
    />
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate">{children}</button>
  );
}
