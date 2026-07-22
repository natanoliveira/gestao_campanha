"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ShieldCheck, BarChart3, Users, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { loginSchema, type LoginDTO } from "@/modules/auth/dto";

const FEATURES = [
  {
    Icon: BarChart3,
    title: "Gestão financeira em tempo real",
    desc: "Entradas, saídas e saldo de cada projeto com rastreabilidade completa.",
  },
  {
    Icon: ShieldCheck,
    title: "Prestação de contas transparente",
    desc: "Portal público para apoiadores acompanharem cada etapa dos projetos.",
  },
  {
    Icon: Users,
    title: "Controle de acesso por função",
    desc: "Admin, gestor, tesoureiro, comunicação e auditor com permissões distintas.",
  },
  {
    Icon: Eye,
    title: "Timeline de progresso",
    desc: "Registro cronológico de atualizações publicado automaticamente no portal.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDTO>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginDTO) {
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Credenciais inválidas.");
        return;
      }

      localStorage.setItem("access_token", json.accessToken);
      localStorage.setItem("user", JSON.stringify(json.user));
      router.push("/dashboard");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: informativo ── */}
      <div
        className="hidden lg:flex flex-col w-[55%] relative overflow-hidden px-14 py-12"
        style={{
          background: "linear-gradient(140deg, #0d0d1f 0%, #0f0a1e 40%, #0a0a14 100%)",
        }}
      >
        {/* Glow decorativo */}
        <div
          className="pointer-events-none absolute -top-40 -left-20 size-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 size-[360px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #d97706 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 mb-16">
          <div className="size-8 bg-primary rounded-[8px] grid place-items-center shrink-0">
            <svg viewBox="0 0 24 24" className="size-4 fill-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            GestãoProjetos
          </span>
        </div>

        {/* Headline */}
        <div className="relative flex-1 flex flex-col justify-center max-w-md">
          <h1 className="text-[2.6rem] font-semibold leading-[1.15] tracking-tight text-white mb-4">
            Transparência e controle para projetos comunitários.
          </h1>
          <p className="text-[15px] text-[#9ca3af] leading-relaxed mb-12">
            Gerencie iniciativas, finanças e comunicação num único sistema — com prestação de contas acessível a todos os apoiadores.
          </p>

          {/* Features */}
          <ul className="space-y-5">
            {FEATURES.map(({ Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3.5">
                <div className="mt-0.5 size-7 rounded-md bg-primary/15 border border-primary/20 grid place-items-center shrink-0">
                  <Icon className="size-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white leading-snug">{title}</p>
                  <p className="text-[12px] text-[#6b7280] leading-snug mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative text-[11px] text-[#4b5563] mt-12">
          © {new Date().getFullYear()} GestãoProjetos · Gestão de Projetos Financiados por Comunidades
        </p>
      </div>

      {/* ── Right: formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-background">
        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="size-7 bg-primary rounded-[6px] grid place-items-center">
            <svg viewBox="0 0 24 24" className="size-3.5 fill-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[14px] font-semibold tracking-tight">GestãoProjetos</span>
        </div>

        <div className="w-full max-w-[360px]">
          <h2 className="text-[22px] font-semibold text-foreground mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-[13px] text-muted-foreground mb-8">
            Acesse sua conta para gerenciar projetos.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@demo.com"
                autoComplete="email"
                className="h-9 bg-card border-border focus-visible:border-ring"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[12px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-9 bg-card border-border focus-visible:border-ring"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-[12px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <p className="text-[12px] text-destructive bg-destructive/10 rounded px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-9 mt-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
