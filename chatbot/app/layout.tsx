import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "RAG Chatbot",
  description: "Chatbot for Insurellm",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={poppins.variable}>
      <body><div className="p-4">{children}</div></body>
    </html>
  );
}
