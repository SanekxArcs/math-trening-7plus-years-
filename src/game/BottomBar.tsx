/**
 * Where everything tappable lives, pinned under the child's thumbs.
 *
 * A tablet held in two hands reaches the bottom edge easily and the top
 * corners hardly at all, so the top of each screen is for reading — points,
 * combo, coins — and this bar is for doing. Three columns, so a middle button
 * stays centred whatever sits either side of it.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur"
      // Clears the iOS home indicator.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid w-full max-w-xl grid-cols-3 items-center gap-3 px-4 py-2.5">
        {children}
      </div>
    </nav>
  );
}
