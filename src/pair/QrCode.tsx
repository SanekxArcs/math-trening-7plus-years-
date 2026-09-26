import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { pairUrl } from "./pairLink";

/**
 * The pairing code as a scannable QR image, of its pairing link.
 *
 * Always dark on white, whatever the theme: phone cameras read a light-on-dark
 * code badly, and a code that will not scan is worse than one that clashes.
 * The generator is loaded on first use — most visits never show a QR code.
 */
export function QrCode({ code, className }: { code: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then((qr) =>
      qr
        .toString(pairUrl(code), {
          type: "svg",
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#241b3a", light: "#ffffff" },
        })
        .then((markup) => {
          if (!cancelled) setSvg(markup);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: svg ? 1 : 0.4, scale: 1 }}
      className={cn(
        "relative aspect-square rounded-lg bg-white p-2 shadow-[0_8px_24px_-12px_oklch(0.4_0.16_295/0.6)] ring-1 ring-black/5",
        className,
      )}
      role="img"
      aria-label={`QR ${code.split("").join(" ")}`}
    >
      {svg ? (
        // Markup from the QR library, built from our own link — nothing user-typed goes in.
        <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="size-full animate-pulse rounded-md bg-muted" />
      )}
    </motion.div>
  );
}
