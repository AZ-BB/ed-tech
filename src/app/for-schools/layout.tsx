import type { Metadata } from "next";
import "./for-schools.css";

export const metadata: Metadata = {
  title: "For schools — Univeera",
  description:
    "Partner with Univeera to give your students university discovery, scholarships, and guidance — with full visibility for your school.",
};

export default function ForSchoolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="for-schools-route">{children}</div>;
}
