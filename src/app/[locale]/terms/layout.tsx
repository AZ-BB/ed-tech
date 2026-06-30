import type { Metadata } from "next";
import "./terms.css";

export const metadata: Metadata = {
  title: "Terms & Conditions — Univeera",
};

export default function TermsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="terms-route">{children}</div>;
}
