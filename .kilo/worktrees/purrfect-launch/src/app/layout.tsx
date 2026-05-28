import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniCore CRM",
  description:
    "Enterprise omnichannel communication platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#050816] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
