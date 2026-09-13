import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import App from "./App.tsx";
import { convex } from "./lib/convex.ts";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

const tree = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

createRoot(root).render(
  <StrictMode>
    {convex ? <ConvexProvider client={convex}>{tree}</ConvexProvider> : tree}
  </StrictMode>,
);
