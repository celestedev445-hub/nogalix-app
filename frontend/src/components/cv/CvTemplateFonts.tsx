import "@/styles/cv-fonts.css";

/** Playfair Display (--font-serif) et Great Vibes (--font-script), auto-hébergées, pour les modèles de CV. */
export function CvTemplateFonts({ children }: { children: React.ReactNode }) {
  return <div className="font-serif-variable font-script-variable min-h-0" data-app-outlet="">{children}</div>;
}
