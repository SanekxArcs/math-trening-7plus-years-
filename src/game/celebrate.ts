import confetti from "canvas-confetti";

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const COLORS = ["#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];

/** Small burst — a combo tier just went up. */
export function celebrateCombo() {
  if (reducedMotion()) return;
  void confetti({
    particleCount: 40,
    spread: 60,
    startVelocity: 28,
    origin: { y: 0.4 },
    colors: COLORS,
    disableForReducedMotion: true,
  });
}

/** The goal was reached. */
export function celebrateWin() {
  if (reducedMotion()) return;

  const end = Date.now() + 1400;
  const frame = () => {
    void confetti({
      particleCount: 6,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.65 },
      colors: COLORS,
      disableForReducedMotion: true,
    });
    void confetti({
      particleCount: 6,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.65 },
      colors: COLORS,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
