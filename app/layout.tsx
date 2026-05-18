import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "PhoneFlow ERP",
  description: "Integrated sales, inventory, invoicing, delivery, payroll, and reporting ERP for phone distribution."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
