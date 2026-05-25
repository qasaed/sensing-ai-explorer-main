import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BarChart3, Database, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/predict", label: "Predict", icon: Sparkles },
  { to: "/compare", label: "Compare", icon: BarChart3 },
  { to: "/data", label: "Data", icon: Database },
] as const;

export function SidebarNavigation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="text-lg font-semibold tracking-tight text-foreground">
          MOSLab AI
        </div>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1">
        {nav.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                active
                  ? "text-primary bg-primary-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-sidebar-border text-xs text-muted-foreground">
        <div className="font-mono">v0.1 · n-type focus</div>
        <div className="mt-1">ZnO · SnO₂ · WO₃</div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="md:hidden sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="px-4 pt-3 pb-1">
        <div className="text-sm font-semibold tracking-tight text-foreground">MOSLab AI</div>
      </div>
      <div className="px-2 py-2 flex gap-1 overflow-x-auto no-scrollbar">
        {nav.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
