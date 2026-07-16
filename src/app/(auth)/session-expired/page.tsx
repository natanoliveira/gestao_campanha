"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function SessionExpiredPage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(2);

  useEffect(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    const timer = setTimeout(() => router.replace("/login"), 2000);
    const interval = setInterval(() => setSeconds((s) => s - 1), 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="size-7 text-destructive" />
        </div>
        <div>
          <h1 className="text-[16px] font-semibold mb-1">Sessão expirada</h1>
          <p className="text-[13px] text-muted-foreground">
            Token inválido ou expirado. Redirecionando para o login em{" "}
            <span className="font-medium text-foreground">{seconds}s</span>…
          </p>
        </div>
      </div>
    </div>
  );
}
