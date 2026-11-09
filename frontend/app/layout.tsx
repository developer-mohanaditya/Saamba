import type { Metadata } from "next";
import "./saamba.css";

export const metadata: Metadata = {
  title: "Saamba — your meeting library",
  description: "Everything worth remembering, in one place.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2212%22 fill=%22%23deb569%22/%3E%3Ctext x=%2232%22 y=%2250%22 text-anchor=%22middle%22 font-family=%22Georgia,serif%22 font-weight=%22bold%22 font-size=%2253%22 fill=%22%23234235%22%3ES%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
