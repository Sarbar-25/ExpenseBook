import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "../css/styles.css";
import "../css/premium-overrides.css";
import { MonthProvider } from "./monthState.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MonthProvider>
      <App />
    </MonthProvider>
  </React.StrictMode>
);

