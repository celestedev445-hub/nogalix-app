/**
 * Pré-rendu à la compilation (scripts/prerender.mjs) : produit le HTML initial de chaque page,
 * servi tel quel par le serveur Python puis repris par React dans le navigateur (hydratation).
 * Même principe que les pages statiques de l'ancienne version : contenu visible avant le JavaScript.
 */
import { StrictMode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router";
import { appRoutes } from "@/app/routes";

export { appConfig } from "@/lib/appConfig";

async function streamToString(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function render(pathname: string): Promise<string> {
  const handler = createStaticHandler(appRoutes);
  const context = await handler.query(new Request(`http://localhost${pathname}`));
  if (context instanceof Response) {
    throw new Error(`Redirection inattendue pendant le pré-rendu de ${pathname}`);
  }
  const router = createStaticRouter(handler.dataRoutes, context);
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </StrictMode>,
  );
  return streamToString(prelude);
}
