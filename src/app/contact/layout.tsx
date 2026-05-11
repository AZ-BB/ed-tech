import type { Metadata } from "next";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact — Univeera",
  description:
    "Have a question, partnership inquiry, or need support? Reach out to the Univeera team.",
};

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="contact-route">{children}</div>;
}
