import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


export const metadata: Metadata = {
  title: "RAG Chatbot",
  description: "Chatbot for Insurellm",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
     
    >
      <body>{children}</body>
    </html>
  );
}
