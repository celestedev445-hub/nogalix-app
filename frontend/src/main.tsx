import "@/styles/fonts.css";
import "@/app/globals.css";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { createAppRouter } from "@/app/router";

void (async () => {
  const container = document.getElementById("root")!;
  const router = await createAppRouter();
  const app = (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );

  // Page pré-rendue par le serveur : React reprend le HTML existant sans le redessiner.
  if (container.hasAttribute("data-prerendered")) {
    hydrateRoot(container, app);
  } else {
    createRoot(container).render(app);
  }
})();
