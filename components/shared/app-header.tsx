"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hammer, History, Layers, Library, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { use_toolbar_store } from "@/lib/stores/toolbar-store";

const nav_items = [
  { href: "/builder", label: "Builder", icon: Hammer },
  { href: "/history", label: "History", icon: History },
  { href: "/queue", label: "Queue", icon: Layers },
  { href: "/library", label: "Library", icon: Library },
  { href: "/admin", label: "Stats", icon: BarChart3 },
] as const;

export const AppHeader = () => {
  const pathname = usePathname();
  const left = use_toolbar_store((s) => s.left);
  const right = use_toolbar_store((s) => s.right);

  return (
    <div className="h-14 border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 shrink-0 flex items-center justify-between px-4">
      {/* Left slot: page-specific actions */}
      <div className="flex items-center gap-2">
        {left}
      </div>

      {/* Right: page-specific actions + nav */}
      <div className="flex items-center gap-2">
        {right}

        <div className="flex items-center border rounded-lg p-1 ml-2">
          {nav_items.map((item, index) => {
            const is_active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <div key={item.href} className="flex items-center">
                {index > 0 && <div className="w-px h-4 bg-border mx-1" />}
                <Link href={item.href}>
                  <button
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 h-7 text-sm font-medium transition-colors",
                      is_active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
