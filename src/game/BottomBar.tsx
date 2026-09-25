import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Where everything tappable lives, pinned under the child's thumbs.
 *
 * A tablet held in two hands reaches the bottom edge easily and the top
 * corners hardly at all, so the top of each screen is for reading — points,
 * combo, coins — and this bar is for doing. Three columns, so a middle button
 * stays centred whatever sits either side of it.
 *
 * The game screen splits it five ways instead — tray, lifeline, pause,
 * lifeline, pets — so pause sits in a cluster like a controller's centre.
 *
 * Styled as the twin of the HUD panel — a floating frosted dock the same width
 * — so the screen is framed by one instrument above and one below.
 */
export function BottomBar({
  children,
  className,
}: {
  children: React.ReactNode;
  /** Overrides the column layout; three equal columns by default. */
  className?: string;
}) {
  return (
    <motion.nav
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.1 }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4"
      // Floats clear of the edge, and of the iOS home indicator below it.
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div
        className={cn(
          "pointer-events-auto relative mx-auto grid w-full max-w-136 grid-cols-3 items-center gap-3 rounded-xl border border-border/70 bg-card/85 px-3 py-2 shadow-[0_-4px_32px_-14px_oklch(0.4_0.16_295/0.45)] backdrop-blur-md",
          className,
        )}
      >
        <span
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
          aria-hidden
        />
        {children}
      </div>
    </motion.nav>
  );
}

/** The small round icon buttons in the dock's side tray. One look for all of them. */
export const dockIconClass =
  "flex size-10 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-card hover:text-foreground active:scale-90 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none";
