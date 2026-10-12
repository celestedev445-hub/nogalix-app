import Link from "@/platform/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/platform/navigation";
import {
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  FileText,
  Users,
  ArrowLeft,
  LifeBuoy,
  UserRound,
  Wallet,
} from "lucide-react";
import { BrandLogo } from "@/components/vitrine/BrandLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/appConfig";
import { canAccessAdmin } from "@/lib/security";
import { useAuthStore } from "@/store/authStore";
import { logout } from "@/services/auth";
import { toast } from "@/hooks/use-toast";
import { adminPageTitle } from "@/lib/appNav";
import { useAppTabbar } from "@/hooks/useAppTabbar";
import { AppTabBar } from "@/components/mobile/AppTabBar";
import { AppMoreSheet } from "@/components/mobile/AppMoreSheet";
import { AppTopBar } from "@/components/mobile/AppTopBar";
import { ClientOnly } from "@/components/mobile/ClientOnly";

const links = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
  { href: "/admin/paiements", label: "Paiements", icon: Wallet },
  { href: "/admin/cvs", label: "CV", icon: FileText },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

const mobileTabs = [
  { href: "/admin", label: "Vue", icon: LayoutDashboard },
  { href: "/admin/utilisateurs", label: "Membres", icon: Users },
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
  { href: "/admin/cvs", label: "CV", icon: FileText },
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [moreOpen, setMoreOpen] = useState(false);
  const name = displayName(user);
  const allowed = canAccessAdmin(user, appConfig.adminEmails);
  const { shown: tabbarShown } = useAppTabbar(hydrated && allowed, "lg");

  useEffect(() => {
    if (!hydrated) return;
    if (!allowed) {
      toast({
        title: "Accès refusé",
        description: "Cette zone est réservée à l'administration.",
        variant: "destructive",
      });
      router.replace("/dashboard");
    }
  }, [hydrated, allowed, router]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function onLogout() {
    await logout();
    toast({ title: "Déconnexion réussie", variant: "success" });
    router.push("/");
  }

  if (!hydrated || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-indigo-clair/40 text-sm text-navy/60">
        Vérification de l&apos;accès…
      </div>
    );
  }

  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip bg-[#F6F7FB] lg:pl-64 xl:min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gris bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gris px-5">
          <BrandLogo href="/admin" className="[&_img]:h-8" />
          <span className="rounded-full bg-indigo-clair px-2 py-0.5 text-[11px] font-semibold text-indigo">
            Admin
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Administration">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/40">
            Pilotage
          </p>
          <ul className="space-y-0.5">
            {links.map((link) => {
              const Icon = link.icon;
              const active =
                pathname === link.href ||
                (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-clair text-principale"
                        : "text-navy/70 hover:bg-indigo-clair/60 hover:text-principale",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="shrink-0 space-y-1 border-t border-gris p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy/70 transition-colors hover:bg-indigo-clair/60 hover:text-principale"
          >
            <ArrowLeft className="h-4 w-4" />
            Espace membre
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-indigo-clair/60"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar ?? undefined} alt={name} />
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy">{name}</span>
                  <span className="block truncate text-xs text-navy/50">{user?.email}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-navy/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel>{name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Espace membre</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profil">Mon profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/support">Support</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onLogout()}>
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <ClientOnly>
      <AppTopBar
        className="lg:hidden"
        title={adminPageTitle(pathname)}
        leading={<BrandLogo href="/admin" className="[&_img]:h-7" />}
        trailing={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Menu du compte" className="rounded-full p-0.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar ?? undefined} alt={name} />
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Espace membre</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profil">Mon profil</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onLogout()}>
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      </ClientOnly>

      <main
        data-app-outlet=""
        className={cn(
          "mx-auto w-full min-w-0 max-w-[88rem] overflow-x-clip px-[var(--page-gutter)] pt-4 lg:px-8 lg:pb-16 lg:pt-8",
          tabbarShown ? "pb-[calc(var(--app-tabbar-offset)+0.75rem)]" : "pb-8",
        )}
      >
        {children}
      </main>

      <ClientOnly>
      {tabbarShown ? (
        <>
          <AppTabBar
            className="lg:hidden"
            tabs={mobileTabs}
            moreOpen={moreOpen}
            onMoreClick={() => setMoreOpen(true)}
          />
          <AppMoreSheet
            open={moreOpen}
            onOpenChange={setMoreOpen}
            title="Administration"
            items={[
              { href: "/admin/paiements", label: "Paiements", icon: Wallet },
              { href: "/admin/messages", label: "Messages", icon: MessageSquare },
              { href: "/support", label: "Support", icon: LifeBuoy },
              { href: "/dashboard", label: "Espace", icon: ArrowLeft },
              { href: "/profil", label: "Profil", icon: UserRound },
              { label: "Quitter", icon: LogOut, danger: true, onClick: () => void onLogout() },
            ]}
          />
        </>
      ) : null}
      </ClientOnly>
    </div>
  );
}
