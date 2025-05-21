import type React from "react";
import { getAuthenticatedUser } from "./auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Server component that ensures a user is authenticated before rendering children
 * This can be used in layout.tsx files to protect entire route groups
 */
export async function AuthGuard({ children }: AuthGuardProps) {
  // This will redirect to login if user is not authenticated
  await getAuthenticatedUser();

  // If we get here, the user is authenticated
  return <>{children}</>;
}
