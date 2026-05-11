import type { Metadata } from "next";
import "../contact/contact.css";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Thoughtful content, guides, and updates for students, families, and partners — coming soon on Univeera.",
};

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reuses contact marketing shell styles (nav + footer) via `contact-route`.
  return <div className="contact-route">{children}</div>;
}
