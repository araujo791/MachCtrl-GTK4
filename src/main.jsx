import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Comportamento de app nativo: bloqueia o menu de contexto (botão direito) e
// atalhos de navegador que não fazem sentido aqui (recarregar, zoom, localizar,
// imprimir). Em desenvolvimento, mantém F12/DevTools liberado.
const isDev = import.meta.env.DEV;

document.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  // permite DevTools em dev
  if (isDev && (k === "f12" || (e.ctrlKey && e.shiftKey && (k === "i" || k === "c" || k === "j")))) {
    return;
  }
  // bloqueia recarregar (F5, Ctrl+R), localizar (Ctrl+F), imprimir (Ctrl+P),
  // zoom (Ctrl +/-/0) e seleção-tudo (Ctrl+A) fora de inputs
  const isInput = ["INPUT", "TEXTAREA"].includes(e.target?.tagName);
  if (
    k === "f5" ||
    (e.ctrlKey && ["r", "f", "p", "g", "+", "-", "=", "0"].includes(k)) ||
    (e.ctrlKey && k === "a" && !isInput)
  ) {
    e.preventDefault();
  }
});

// bloqueia zoom por ctrl+scroll
document.addEventListener("wheel", (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

