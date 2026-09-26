import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CameraOff, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/translations";
import { useI18n } from "@/i18n/useI18n";
import { Backdrop, GameDialog, ghostActionClass, secondaryActionClass } from "@/game/GameDialog";
import { parsePairCode } from "./pairLink";

/** Just what is used of the Barcode Detection API, which TypeScript's DOM types do not include yet. */
interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
interface DetectorClass {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
}

/** Between frames: fast enough to feel instant, slow enough to leave a phone cool. */
const SCAN_EVERY_MS = 150;

/**
 * Reads a code off another device's screen with the camera.
 *
 * The browser's own detector where there is one (Chrome, Android); otherwise
 * jsQR decoding frames from a canvas, loaded only when needed (Safari,
 * Firefox). Either way the camera is released the moment the scanner closes.
 */
function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<TranslationKey | null>(null);
  const [wrongCode, setWrongCode] = useState(false);
  // Held in a ref so a new callback on a re-render never restarts the camera.
  const found = useRef(onCode);
  found.current = onCode;

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer = 0;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setProblem("cameraUnavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (cause) {
        setProblem((cause as DOMException)?.name === "NotAllowedError" ? "cameraDenied" : "cameraUnavailable");
        return;
      }
      if (stopped || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => undefined);

      const Native = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
      const formats = Native ? await Native.getSupportedFormats?.().catch(() => []) : [];
      const detector = Native && formats?.includes("qr_code") ? new Native({ formats: ["qr_code"] }) : null;
      const jsQR = detector ? null : (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      const read = async (): Promise<string | null> => {
        const frame = video.current;
        if (!frame || frame.readyState < 2 || frame.videoWidth === 0) return null;
        if (detector) return (await detector.detect(frame))[0]?.rawValue ?? null;
        if (!jsQR || !context) return null;
        // Decoding a smaller frame is much faster and plenty for a code held up close.
        const scale = Math.min(1, 640 / Math.max(frame.videoWidth, frame.videoHeight));
        canvas.width = Math.round(frame.videoWidth * scale);
        canvas.height = Math.round(frame.videoHeight * scale);
        context.drawImage(frame, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        return jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data ?? null;
      };

      const loop = async () => {
        if (stopped) return;
        const text = await read().catch(() => null);
        if (stopped) return;
        if (text) {
          const code = parsePairCode(text);
          if (code) {
            navigator.vibrate?.(40);
            found.current(code);
            return;
          }
          setWrongCode(true);
        }
        timer = window.setTimeout(loop, SCAN_EVERY_MS);
      };
      void loop();
    };

    void start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, []);

  return (
    <Backdrop>
      <GameDialog hero={<ScanLine className="size-10" aria-hidden />}>
        <h2 className="font-display text-2xl font-black">{t("scanQr")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("scanQrHint")}</p>

        <div className="relative mx-auto mt-5 aspect-square w-full max-w-64 overflow-hidden rounded-xl bg-foreground/90">
          {problem ? (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-5 text-background">
              <CameraOff className="size-10 opacity-80" aria-hidden />
              <p role="alert" className="text-sm font-bold">
                {t(problem)}
              </p>
            </div>
          ) : (
            <>
              <video ref={video} className="size-full object-cover" muted playsInline autoPlay />
              {/* Viewfinder corners and a sweeping line: where to hold the code, and that it is looking. */}
              <span className="pointer-events-none absolute inset-6" aria-hidden>
                {["left-0 top-0 border-l-4 border-t-4 rounded-tl-xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-xl"].map(
                  (corner) => (
                    <span key={corner} className={cn("absolute size-8 border-white", corner)} />
                  ),
                )}
                <motion.span
                  className="absolute inset-x-2 h-0.5 rounded-full bg-primary shadow-[0_0_12px_2px_var(--primary)]"
                  animate={{ top: ["8%", "92%", "8%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              </span>
            </>
          )}
        </div>

        <AnimatePresence>
          {wrongCode && !problem && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-sm font-bold text-wrong"
            >
              {t("scanNotACode")}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="button" onClick={onClose} className={cn(ghostActionClass, "mt-4")}>
          {problem ? t("typeCodeInstead") : t("cancel")}
        </button>
      </GameDialog>
    </Backdrop>
  );
}

/** The "scan instead of typing" button that sits beside a pairing-code field. */
export function ScanButton({ onCode, className }: { onCode: (code: string) => void; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(secondaryActionClass, "py-2.5 text-base", className)}>
        <ScanLine className="size-5" aria-hidden />
        {t("scanQr")}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <Scanner
              onCode={(code) => {
                setOpen(false);
                onCode(code);
              }}
              onClose={() => setOpen(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
