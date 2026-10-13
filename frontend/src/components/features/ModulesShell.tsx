import Link from "@/platform/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/platform/navigation";
import {
  Briefcase,
  ChevronDown,
  CreditCard,
  FileText,
  Home,
  LayoutTemplate,
  LifeBuoy,
  LogOut,
  Shield,
  Sparkles,
  Target,
  UserRound,
  ArrowLeftRight,
  FolderOpen,
  Pencil,
  ImageUp,
} from "lucide-react";
import { BrandLogo } from "@/components/vitrine/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToolsNavMenu } from "@/components/nav/ToolsNavMenu";
import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/appConfig";
import { canAccessAdmin } from "@/lib/security";
import { useAuthStore } from "@/store/authStore";
import { useCvStore } from "@/store/cvStore";
import { useNotificationStore } from "@/store/notificationsStore";
import { logout } from "@/services/auth";
import { NotificationBell } from "@/components/features/NotificationBell";
import { EmailVerifyBanner } from "@/components/auth/EmailVerifyBanner";
import { toast } from "@/hooks/use-toast";
import { recordNavigation } from "@/lib/navigationHistory";
import { isAppTabActive, isModuleEditorPath, modulePageTitle } from "@/lib/appNav";
import { useAppTabbar } from "@/hooks/useAppTabbar";
import { AppTabBar } from "@/components/mobile/AppTabBar";
import { AppMoreSheet } from "@/components/mobile/AppMoreSheet";
import { AppTopBar } from "@/components/mobile/AppTopBar";
import { ClientOnly } from "@/components/mobile/ClientOnly";
import { BackButton } from "@/components/ui/BackButton";
import { useHydrated } from "@/hooks/use-hydrated";

const links = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/cv", label: "Mes CV" },
  { href: "/modeles", label: "Modèles" },
  { href: "/analyse", label: "Analyse IA" },
  { href: "/candidature", label: "Candidature" },
  { href: "/documents", label: "Documents" },
  { href: "/emploi", label: "Emploi" },
];

const mobileTabs = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/cv", label: "CV", icon: FileText },
  { href: "/analyse", label: "Analyse", icon: Sparkles },
  { href: "/emploi", label: "Emploi", icon: Briefcase },
];

function displayName(user: { name?: string; first_name?: string; last_name?: string } | null) {
  if (!user) return "Compte";
  if (user.name) return user.name;
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || "Compte";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ModuleNavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-indigo-clair text-principale"
          : "text-navy/70 hover:bg-indigo-clair hover:text-principale",
      )}
    >
      {label}
    </Link>
  );
}

function AccountMenu({
  name,
  user,
  showAdmin,
  onLogout,
  compact = false,
}: {
  name: string;
  user: { avatar?: string | null } | null;
  showAdmin: boolean;
  onLogout: () => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu du compte"
          className={cn(
            "flex items-center rounded-full hover:bg-indigo-clair",
            compact ? "p-0.5" : "gap-2 py-1 pl-1 pr-2",
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar ?? undefined} alt={name} />
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          {compact ? null : (
            <>
              <span className="hidden text-sm font-medium text-navy sm:inline">{name}</span>
              <ChevronDown className="hidden h-4 w-4 text-navy/50 sm:block" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profil">Mon profil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/plans">Plans</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/support">Support</Link>
        </DropdownMenuItem>
        {showAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">Administration</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void onLogout()}>
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ModulesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loadCvs = useCvStore((s) => s.load);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const [moreOpen, setMoreOpen] = useState(false);
  const name = displayName(user);
  const showAdmin = canAccessAdmin(user, appConfig.adminEmails);
  const lockViewport = isModuleEditorPath(pathname);
  const mounted = useHydrated();
  const { shown: tabbarShown } = useAppTabbar(mounted && !lockViewport, "xl");

  useEffect(() => {
    recordNavigation(pathname);
  }, [pathname]);

  useEffect(() => {
    void loadCvs();
    void fetchNotifications();
  }, [loadCvs, fetchNotifications]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function onLogout() {
    await logout();
    toast({ title: "Déconnexion réussie", variant: "success" });
    router.push("/");
  }

  const moreItems = [
    { href: "/modeles", label: "Modèles", icon: LayoutTemplate },
    { href: "/convertir", label: "Convertir", icon: ArrowLeftRight },
    { href: "/editer", label: "Éditer", icon: Pencil },
    { href: "/image", label: "Image", icon: ImageUp },
    { href: "/candidature", label: "Candidature", icon: Target },
    { href: "/documents", label: "Documents", icon: FolderOpen },
    { href: "/profil", label: "Profil", icon: UserRound },
    { href: "/plans", label: "Plans", icon: CreditCard },
    { href: "/support", label: "Support", icon: LifeBuoy },
    ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    { label: "Quitter", icon: LogOut, danger: true, onClick: () => void onLogout() },
  ];

  const showBack = !mobileTabs.some((tab) => isAppTabActive(pathname, tab.href));

  return (
    <div
      className={cn(
        "min-w-0 overflow-x-clip bg-[#F9FBFF]",
        lockViewport ? "flex h-dvh flex-col overflow-hidden" : "min-h-dvh xl:min-h-screen",
      )}
    >
      <header className={cn("sticky top-0 z-40 px-3 pt-3 md:px-6", mounted && "hidden xl:block")}>
        <nav className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-gris bg-white/90 px-3 py-2 shadow-brand backdrop-blur-md">
          <BrandLogo href="/dashboard" />
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
            {links.slice(0, 3).map((link) => (
              <ModuleNavLink key={link.href} pathname={pathname} {...link} />
            ))}
            <ToolsNavMenu compact />
            {links.slice(3).map((link) => (
              <ModuleNavLink key={link.href} pathname={pathname} {...link} />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <AccountMenu name={name} user={user} showAdmin={showAdmin} onLogout={() => void onLogout()} />
          </div>
        </nav>
      </header>

      <ClientOnly>
        {/* Éditeur : la barre reste visible ; le retour passe par le bouton de l'éditeur (garde de sortie). */}
        <AppTopBar
          className="shrink-0 xl:hidden"
          title={modulePageTitle(pathname)}
          leading={
            showBack && !lockViewport ? (
              <BackButton fallbackHref="/dashboard" label="" className="h-10 w-10 px-0" />
            ) : (
              <BrandLogo href="/dashboard" className="[&_img]:h-7" />
            )
          }
          trailing={
            <>
              <NotificationBell />
              <AccountMenu
                compact
                name={name}
                user={user}
                showAdmin={showAdmin}
                onLogout={() => void onLogout()}
              />
            </>
          }
        />
      </ClientOnly>

      <main
        data-app-outlet=""
        className={cn(
          "site-inner min-w-0 overflow-x-clip",
          lockViewport
            ? "flex min-h-0 flex-1 flex-col overflow-hidden pb-4 pt-4"
            : cn("pt-4 xl:pb-24 xl:pt-6", tabbarShown ? "pb-[calc(var(--app-tabbar-offset)+4.75rem)]" : "pb-8"),
        )}
      >
        {!lockViewport ? (
          <ClientOnly>
            <EmailVerifyBanner />
          </ClientOnly>
        ) : null}
        {children}
      </main>

      <ClientOnly>
        {tabbarShown ? (
          <>
            <AppTabBar
              className="xl:hidden"
              tabs={mobileTabs}
              moreOpen={moreOpen}
              onMoreClick={() => setMoreOpen(true)}
            />
            <AppMoreSheet
              open={moreOpen}
              onOpenChange={setMoreOpen}
              title="Tout l'espace"
              items={moreItems}
            />
          </>
        ) : null}
      </ClientOnly>
    </div>
  );
}
