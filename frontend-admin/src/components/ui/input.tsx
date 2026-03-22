import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-[1rem] border border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] px-4 py-3 text-sm text-[color:var(--jo-ink)] shadow-sm outline-none transition placeholder:text-[color:rgba(107,114,102,0.72)] focus:border-[rgba(65,150,70,0.45)] focus:ring-4 focus:ring-[rgba(65,150,70,0.12)]",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[132px] w-full rounded-[1rem] border border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] px-4 py-3 text-sm text-[color:var(--jo-ink)] shadow-sm outline-none transition placeholder:text-[color:rgba(107,114,102,0.72)] focus:border-[rgba(65,150,70,0.45)] focus:ring-4 focus:ring-[rgba(65,150,70,0.12)]",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Input, Textarea };
