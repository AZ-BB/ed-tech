import "../contact/contact.css";

export default function WebinarsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="contact-route">{children}</div>;
}
