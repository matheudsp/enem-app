import type React from "react";
import { Navbar } from "@/components/navbar";
import { AuthGuard } from "@/auth/auth-guard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 mx-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
