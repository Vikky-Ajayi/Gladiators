import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landrify-green disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          variant === "primary" && "bg-landrify-green text-white hover:bg-landrify-green-dark shadow-sm",
          variant === "outline" && "border border-landrify-green text-landrify-green hover:bg-landrify-green/5",
          variant === "ghost" && "hover:bg-gray-100 text-gray-700",
          "px-8 py-3",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
