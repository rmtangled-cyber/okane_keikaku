"use client";

import { useAuth } from "@/lib/auth-context";

interface Props {
  children: React.ReactNode;
}

export default function Masked({ children }: Props) {
  const { isMasked } = useAuth();
  if (isMasked) return <span className="tracking-widest text-gray-300 select-none">●●●</span>;
  return <>{children}</>;
}
