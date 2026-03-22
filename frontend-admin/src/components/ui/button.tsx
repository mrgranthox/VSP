import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[linear-gradient(135deg,var(--jo-forest),#55aa58,var(--jo-gold))] text-white shadow-[0_16px_30px_rgba(65,150,70,0.25)] hover:brightness-[1.03]",
  secondary: "bg-[color:var(--jo-ink)] text-white shadow-sm hover:bg-[#20453a]",
  ghost: "bg-transparent text-[color:var(--jo-muted)] hover:bg-[rgba(65,150,70,0.08)] hover:text-[color:var(--jo-ink)]",
  danger: "bg-[linear-gradient(135deg,var(--jo-coral),#ff6e39)] text-white shadow-[0_14px_28px_rgba(255,75,25,0.22)] hover:brightness-[1.04]",
  outline: "border border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] text-[color:var(--jo-ink)] hover:border-[rgba(65,150,70,0.24)] hover:bg-white",
  success: "bg-[linear-gradient(135deg,var(--jo-forest),#67b36a)] text-white shadow-[0_14px_28px_rgba(65,150,70,0.2)] hover:brightness-[1.03]"
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", type = "button", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(65,150,70,0.28)] disabled:cursor-not-allowed disabled:opacity-60",
      variantClasses[variant],
      className
    )}
    type={type}
    {...props}
  />
));

Button.displayName = "Button";

export { Button };
