import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative grid size-8 place-items-center rounded-lg bg-gradient-brand glow-ring">
        <span className="size-2.5 rounded-[3px] bg-primary-foreground/95" />
      </span>
      <span className="text-[15px] font-semibold tracking-[0.16em] text-foreground uppercase">
        Videonova<span className="text-gradient"> AI</span>
      </span>
    </Link>
  );
}