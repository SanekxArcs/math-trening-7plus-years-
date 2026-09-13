import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PairScreenProps {
  onSubmit: (pairCode: string, pin: string) => Promise<boolean>;
  error: string | null;
  busy: boolean;
}

export function PairScreen({ onSubmit, error, busy }: PairScreenProps) {
  const [pairCode, setPairCode] = useState("");
  const [pin, setPin] = useState("");

  const ready = pairCode.length === 6 && pin.length >= 4 && !busy;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) void onSubmit(pairCode, pin);
        }}
        className="space-y-6 rounded-[--radius-xl] bg-card p-7 shadow-xl"
      >
        <div>
          <h1 className="font-display text-2xl font-black">Parent dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the pairing code from your child's device, and the PIN you set
            when you created their profile.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pair-code">Pairing code</Label>
          <Input
            id="pair-code"
            value={pairCode}
            onChange={(event) =>
              // The code alphabet is uppercase and unambiguous; normalising here
              // means a parent reading it off a screen never fails on case.
              setPairCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
            }
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABC234"
            className="h-14 text-center font-display text-2xl tracking-[0.35em]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">PIN</Label>
          <Input
            id="pin"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            className="h-14 text-center font-display text-2xl tracking-[0.4em]"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-bold text-wrong">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!ready} size="lg" className="w-full font-display text-lg">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Sign in
        </Button>

        <Link
          to="/"
          className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to the game
        </Link>
      </motion.form>
    </main>
  );
}
