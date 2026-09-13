import { Navigate, Route, Routes } from "react-router-dom";
import { PlayRoute } from "@/game/PlayRoute";
import { ParentRoute } from "@/parent/ParentRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayRoute />} />
      <Route path="/parent/*" element={<ParentRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
