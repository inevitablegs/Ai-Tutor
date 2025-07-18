import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { QuizProvider } from "./contexts/QuizContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <QuizProvider>
        <App />
      </QuizProvider>
    </BrowserRouter>
  </StrictMode>
);
