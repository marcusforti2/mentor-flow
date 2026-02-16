import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./components/playbooks/tiptap-styles.css";

createRoot(document.getElementById("root")!).render(<App />);
