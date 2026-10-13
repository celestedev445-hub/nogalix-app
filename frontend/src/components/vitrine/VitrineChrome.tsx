import Link from "@/platform/link";
import { usePathname } from "@/platform/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CreditCard,
  HelpCircle,
  Home,
  LayoutTemplate,
  LogIn,
  Mail,
  MessageCircle,
  Pencil,
  ImageUp,
  Sparkles,
  Wrench,
} from "lucide-react";
import { BrandLogo } from "@/components/vitrine/BrandLogo";
import { Button } from "@/components/ui/button";
import { ToolsNavMenu } from "@/components/nav/ToolsNavMenu";
import { appConfig } from "@/lib/appConfig";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useHydrated } from "@/hooks/use-hydrated";
import { isVitrineAuthPath } from "@/lib/appNav";
import { useAppTabbar } from "@/hooks/useAppTabbar";
import { AppTabBar } from "@/components/mobile/AppTabBar";
import { AppMoreSheet } from "@/components/mobile/AppMoreSheet";

const footerGroups = [
  {
    title: "Produit",
    items: [
      { href: "/modeles", label: "Modèles" },
      { href: "/convertir", label: "Convertir" },
      { href: "/editer", label: "Éditer" },
      { href: "/image", label: "Texte d'une image" },
    ],
  },
  {
    title: "Légal",
    items: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/cgu", label: "CGU" },
      { href: "/politique-confidentialite", label: "Confidentialité" },
    ],
  },
];

function VitrineNavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        pathname === href
          ? "bg-indigo-clair text-principale"
          : "text-navy/70 hover:bg-indigo-clair hover:text-principale",
      )}
    >
      {label}
    </Link>
  );
}

const links = [
  { href: "/", label: "Accueil" },
  { href: "/modeles", label: "Modèles" },
  { href: "/emploi", label: "Emploi" },
  { href: "/plans", label: "Plans" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function VitrineHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const mounted = useHydrated();
  const authenticated = useAuthStore((s) => s.authenticated) && mounted;

  return (
    <header
      className={cn(
        "z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6",
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0",
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-gris bg-white/90 px-3 py-2 shadow-brand backdrop-blur-md">
        <BrandLogo />
        <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {links.slice(0, 2).map((link) => (
            <VitrineNavLink key={link.href} pathname={pathname} {...link} />
          ))}
          <ToolsNavMenu />
          {links.slice(2).map((link) => (
            <VitrineNavLink key={link.href} pathname={pathname} {...link} />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {authenticated ? (
            <Button asChild className="rounded-xl max-md:h-9 max-md:px-3 max-md:text-sm">
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden rounded-xl md:inline-flex">
                <Link href="/auth/login">Connexion</Link>
              </Button>
              <Button asChild className="rounded-xl shadow-brand max-md:h-9 max-md:px-3 max-md:text-sm">
                <Link href="/auth/signup">Créer un CV</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

const vitrineTabs = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/modeles", label: "Modèles", icon: LayoutTemplate },
  { href: "/emploi", label: "Emploi", icon: Briefcase },
  { href: "/plans", label: "Plans", icon: CreditCard },
];

export function VitrineMobileNav() {
  const pathname = usePathname();
  const mounted = useHydrated();
  const authenticated = useAuthStore((s) => s.authenticated) && mounted;
  const [moreOpen, setMoreOpen] = useState(false);
  const hide = isVitrineAuthPath(pathname);
  const { shown } = useAppTabbar(mounted && !hide, "md");

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (!mounted || !shown) return null;

  return (
    <>
      <AppTabBar
        className="md:hidden"
        tabs={vitrineTabs}
        moreOpen={moreOpen}
        onMoreClick={() => setMoreOpen(true)}
      />
      <AppMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title={appConfig.name}
        items={[
          { href: "/convertir", label: "Convertir", icon: Wrench },
          { href: "/editer", label: "Éditer", icon: Pencil },
          { href: "/image", label: "Image", icon: ImageUp },
          { href: "/faq", label: "FAQ", icon: HelpCircle },
          { href: "/contact", label: "Contact", icon: MessageCircle },
          ...(authenticated
            ? [{ href: "/dashboard", label: "Espace", icon: Sparkles }]
            : [
                { href: "/auth/login", label: "Connexion", icon: LogIn },
                { href: "/auth/signup", label: "Créer un CV", icon: Sparkles },
              ]),
        ]}
      />
    </>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex h-12 items-center text-left text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.16em] text-principale">
      {children}
    </h2>
  );
}

function FooterContactIcon({ icon: Icon }: { icon: typeof Mail }) {
  return (
    <span
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-principale ring-1 ring-white/20"
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

export function VitrineFooter() {
  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="site-inner pb-[calc(2rem+var(--app-tabbar-offset))] pt-[4.25rem] md:pb-10 md:pt-[5.25rem]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-12 lg:grid-cols-12">
          <div className="col-span-2 min-w-0 lg:col-span-4">
            <div className="flex h-12 items-center">
              <div className="inline-flex rounded-full bg-white px-3 py-1.5 shadow-brand">
                <BrandLogo />
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {appConfig.name} aide les candidats à créer un CV qui passe les filtres recruteurs.
              Importez un fichier, convertissez PDF et Word, laissez {appConfig.assistantFirstName}{" "}
              rédiger ou traduire, puis exportez. Gratuit pour commencer, sans carte bancaire.
            </p>
          </div>
          {footerGroups.map((group) => (
            <nav key={group.title} className="min-w-0 lg:col-span-2" aria-label={group.title}>
              <FooterHeading>{group.title}</FooterHeading>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/65 transition-colors duration-200 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="col-span-2 min-w-0 lg:col-span-4">
            <FooterHeading>Contact</FooterHeading>
            <div className="mt-3 flex items-start gap-3">
              <FooterContactIcon icon={Mail} />
              <div className="min-w-0">
                <p className="text-left text-[0.6875rem] font-medium uppercase tracking-wider text-white/40">
                  Messagerie
                </p>
                <a
                  href={`mailto:${appConfig.contactEmail}`}
                  className="mt-0.5 block break-all text-left text-sm text-white/85 transition-colors duration-200 hover:text-white"
                >
                  {appConfig.contactEmail}
                </a>
              </div>
            </div>
            <a
              href={appConfig.cbcUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Contacts Business Center (${appConfig.cbcName}), partenaire — ouvrir le site`}
              className="group relative mt-5 block overflow-hidden rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/[0.1] hover:ring-white/20"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#2955b3] via-[#ff9900] to-[#7ac943]"
              />
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
                  <img
                    src="/images/partners/cbc-emblem.png"
                    alt=""
                    width={192}
                    height={93}
                    loading="lazy"
                    className="h-auto w-16"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-left text-sm font-semibold text-white">
                      Contacts <span className="text-[#ff9900]">Business</span> Center
                    </p>
                    <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-px text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Pub
                    </span>
                  </div>
                  <p className="mt-1 text-left text-xs leading-relaxed text-white/60">
                    Annuaire, formations et marketplace pour développer votre activité.
                  </p>
                </div>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#ff9900]">
                Découvrir {appConfig.cbcName}
                <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </span>
            </a>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6">
          <p className="text-left text-xs text-white/55">
            © {new Date().getFullYear()} {appConfig.name}. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
