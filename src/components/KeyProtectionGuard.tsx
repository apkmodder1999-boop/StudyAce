import { type ReactNode } from "react";

interface KeyProtectionGuardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function KeyProtectionGuard({ children }: KeyProtectionGuardProps) {
  return <>{children}</>;
}
