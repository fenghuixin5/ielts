import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study & Shape — IELTS × Fitness",
  description: "A voice-enabled daily planner for IELTS preparation, training and nutrition.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
