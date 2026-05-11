import type { Metadata } from "next";
import "./for-advisors.css";

export const metadata: Metadata = {
  title: "For advisors — Univeera",
  description:
    "Grow your advisory practice on Univeera — connect with students, run sessions, and build your profile.",
};

export default function ForAdvisorsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="for-advisors-route">{children}</div>;
}
