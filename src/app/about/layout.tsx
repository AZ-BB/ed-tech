import type { Metadata } from "next";
import "./about.css";

export const metadata: Metadata = {
  title: "About — UniApply",
};

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="about-route">{children}</div>;
}
