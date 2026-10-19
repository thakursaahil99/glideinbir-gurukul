"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

export function Card({ title, description, children, className }: { title?: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("glass rounded-[24px] p-5 sm:p-6", className)}>
      {title && <h3 className="font-display text-lg font-bold">{title}</h3>}
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={cn("grid gap-4", (title || description) && "mt-5")}>{children}</div>
    </section>
  );
}

function Label({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-semibold">
      {label}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

interface BaseProps {
  label: string;
  hint?: string;
  className?: string;
}

export function TextField({
  label,
  hint,
  className,
  value,
  onChange,
  ...rest
}: BaseProps & { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} hint={hint} />
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} {...rest} />
    </div>
  );
}

export function AreaField({ label, hint, className, value, onChange, rows = 3 }: BaseProps & { value: string; onChange: (v: string) => void; rows?: number }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} hint={hint} />
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "resize-y")} />
    </div>
  );
}

export function NumberField({ label, hint, className, value, onChange, min = 0 }: BaseProps & { value: number; onChange: (v: number) => void; min?: number }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} hint={hint} />
      <input
        id={id}
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        className={inputCls}
      />
    </div>
  );
}

/** A list of short strings edited as one item per line. */
export function LinesField({ label, hint = "One per line", className, value, onChange, rows = 5 }: BaseProps & { value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  const id = useId();
  const [text, setText] = useState(value.join("\n"));
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} hint={hint} />
      <textarea
        id={id}
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
        }}
        className={cn(inputCls, "resize-y font-mono text-[13px]")}
      />
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} label={label} />
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
        />
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "font-mono")} maxLength={7} />
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left focus-visible:outline-none"
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-teal" : "bg-fg/15",
        )}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </button>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(inputCls, "capitalize")}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Button({ variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-gradient-to-r from-saffron via-rose to-primary text-white hover:brightness-110",
        variant === "ghost" && "border border-line hover:bg-fg/5",
        variant === "danger" && "border border-rose/40 text-rose hover:bg-rose/10",
        className,
      )}
      {...props}
    />
  );
}
