import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/nunito";
import App from "./App.tsx";
import { convex } from "./lib/convex.ts";
import { I18nProvider } from "./i18n/useI18n.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import "./index.css";

// Follow the device's light/dark setting live, as it changes at dusk.
const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
const applyScheme = () => document.documentElement.classList.toggle("dark", Boolean(darkQuery?.matches));
applyScheme();
darkQuery?.addEventListener?.("change", applyScheme);

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

// reducedMotion="user": the CSS media query cannot reach motion's JS
// animations, so this is what stills the looping ones for a child whose
// device asks for less motion.
const tree = (
  <ErrorBoundary>
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </MotionConfig>
  </ErrorBoundary>
);

createRoot(root).render(
  <StrictMode>
    {convex ? <ConvexProvider client={convex}>{tree}</ConvexProvider> : tree}
  </StrictMode>,
);
