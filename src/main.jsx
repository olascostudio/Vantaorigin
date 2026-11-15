import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./data/AuthContext.jsx";
import ResumeSubscribe from "./components/ResumeSubscribe.jsx";
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
        {/* Finishes a subscribe somebody started before they had an
            account. Needs both the router and the provider, and renders
            nothing, so it sits beside App rather than inside it. */}
        <ResumeSubscribe />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
