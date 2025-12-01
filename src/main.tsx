import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 1. Importar
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  // 2. Envolver com BrowserRouter
  <BrowserRouter>
    <App />
  </BrowserRouter>
  // React.StrictMode foi removido porque seu arquivo original não o tinha
  // e ele causa a dupla execução do useEffect de impressão.
  // Se precisar dele, mantenha, mas a impressão pode piscar.
);
