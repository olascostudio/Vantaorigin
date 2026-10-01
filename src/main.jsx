import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./data/AuthContext.jsx";
import { wakeApi } from "./data/api";
import { countVisits } from "./data/analytics";
import "./index.css";

// Start waking the API before anyone asks it for anything.
wakeApi();

// And count the visit, on the real site only.
countVisits();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
