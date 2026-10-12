import Link from "@/platform/link";
import { usePathname } from "@/platform/navigation";
import { ArrowLeftRight, ChevronDown, ImageUp, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isToolsPath } from "@/lib/appNav";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/convertir",
    label: "Convertir",
    hint: "PDF, Word, PNG ou texte",
    icon: ArrowLeftRight,
  },
  {
    href: "/editer",
    label: "Éditer",
    hint: "PDF, Word ou texte",
    icon: Pencil,
  },
  {
    href: "/image",
    label: "Texte d'une image",
    hint: "Modifier ou extraire le texte",
    icon: ImageUp,
  },
];

export function ToolsNavMenu({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const active = isToolsPath(pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Outils"
          className={cn(
            "inline-flex items-center rounded-full text-sm font-medium outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-principale/30",
            compact ? "gap-0.5 px-2.5 py-1.5" : "gap-1 px-3 py-1.5",
            active
              ? "bg-indigo-clair text-principale"
              : "text-navy/70 hover:bg-indigo-clair hover:text-principale",
          )}
        >
          Outils
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="min-w-[13.5rem] rounded-xl border-gris bg-white p-1.5 shadow-brand motion-reduce:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-navy/80",
                  "focus:bg-indigo-clair focus:text-principale",
                  itemActive && "bg-indigo-clair text-principale",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium leading-tight">{item.label}</span>
                  <span className="text-[11px] font-normal leading-snug text-navy/50">{item.hint}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
