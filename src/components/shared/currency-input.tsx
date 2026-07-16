"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const inputCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors";

function toDisplay(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toCents(raw: string): number {
  return Number(raw.replace(/\D/g, "")) || 0;
}

type Props = {
  value: string;          // numeric string, e.g. "1234.56"
  onChange: (v: string) => void; // emits numeric string
  className?: string;
  placeholder?: string;
  required?: boolean;
};

export function CurrencyInput({ value, onChange, className, placeholder = "R$ 0,00", required }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const displayValue = value
    ? toDisplay(Math.round(Number(value) * 100))
    : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cents = toCents(e.target.value);
    onChange((cents / 100).toFixed(2));

    // keep cursor at end
    requestAnimationFrame(() => {
      if (ref.current) {
        const len = ref.current.value.length;
        ref.current.setSelectionRange(len, len);
      }
    });
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      className={cn(inputCls, className)}
      placeholder={placeholder}
      required={required}
      value={displayValue}
      onChange={handleChange}
    />
  );
}
