import type { Metadata } from "next";
import "./about.css";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "About — Univeera",
};

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="about-route">{children}</div>
      <LandingFooter />
    </>
  );
}
