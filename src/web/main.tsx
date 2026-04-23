import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "./styles.css";
import App from "./app.tsx";
import { registerSW, initInstallPrompt } from "./lib/pwa";
registerSW();
initInstallPrompt();
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Router>
			<App />
		</Router>
	</StrictMode>,
);
