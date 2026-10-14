import { usePathname } from "@/platform/navigation";
import { AuthAtmosphere } from "@/components/auth/AuthAtmosphere";
import { ModulesShell } from "@/components/features/ModulesShell";
import { VitrineFooter, VitrineHeader, VitrineMobileNav } from "@/components/vitrine/VitrineChrome";
import { useAuthStore } from "@/store/authStore";
import { useHydrated } from "@/hooks/use-hydrated";

export function VitrineLayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mounted = useHydrated();
  const authenticated = useAuthStore((s) => s.authenticated);
  const isAuthRoute = pathname.startsWith("/auth");

  const isHome = pathname === "/";

  if (isAuthRoute) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-clip bg-navy md:min-h-screen">
        <div className="relative z-10 -mb-7 flex min-h-0 flex-1 flex-col overflow-clip rounded-b-[1.75rem] bg-[#F9FBFF] md:-mb-9 md:rounded-b-[2.25rem]">
          <AuthAtmosphere />
          <VitrineHeader />
          <div className="site-inner relative z-10 min-w-0 flex-1 overflow-x-clip py-8 md:py-10" data-app-outlet="">
            {children}
          </div>
        </div>
        <VitrineFooter />
      </div>
    );
  }

  const vitrine = (
    <div className="flex min-h-dvh flex-col bg-navy md:min-h-screen">
      <div className="relative z-10 -mb-7 flex min-h-0 flex-1 flex-col overflow-clip rounded-b-[1.75rem] bg-[#F9FBFF] md:-mb-9 md:rounded-b-[2.25rem]">
        <VitrineHeader overlay={isHome} />
        <div className={isHome ? "flex-1" : "site-inner flex-1 py-8 md:py-10"} data-app-outlet="">
          {children}
        </div>
      </div>
      <VitrineFooter />
      <VitrineMobileNav />
    </div>
  );

  if (mounted && authenticated && pathname !== "/") {
    return <ModulesShell>{children}</ModulesShell>;
  }

  return vitrine;
}
