import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sky-600 text-white shadow-sm hover:bg-sky-700 active:bg-sky-800",
  secondary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  outline: "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800"
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", type = "button", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50",
      variantClasses[variant],
      className
    )}
    type={type}
    {...props}
  />
));

Button.displayName = "Button";

export { Button };
