import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { SidebarNavigation, MobileNav } from "@/components/moslab/SidebarNavigation";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The route you're looking for doesn't exist in MOSLab AI.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MOSLab AI — Predict. Optimize. Sense Smarter." },
      {
        name: "description",
        content:
          "AI-assisted research platform for optimizing experimental conditions of MOS gas sensors.",
      },
      { property: "og:title", content: "MOSLab AI — Predict. Optimize. Sense Smarter." },
      { property: "og:description", content: "MOSLab AI: Sensor Insights is a React dashboard for optimizing MOS gas sensor experiments." },
      { name: "twitter:title", content: "MOSLab AI — Predict. Optimize. Sense Smarter." },
      { name: "description", content: "MOSLab AI: Sensor Insights is a React dashboard for optimizing MOS gas sensor experiments." },
      { name: "twitter:description", content: "MOSLab AI: Sensor Insights is a React dashboard for optimizing MOS gas sensor experiments." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/61c2e177-c8a8-4814-a1bd-102c4e0f48b3/id-preview-428137cc--b8a01248-248a-4184-9fbc-9d545cb2e95a.lovable.app-1779299793390.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/61c2e177-c8a8-4814-a1bd-102c4e0f48b3/id-preview-428137cc--b8a01248-248a-4184-9fbc-9d545cb2e95a.lovable.app-1779299793390.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex bg-background">
        <SidebarNavigation />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav />
          <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
          <footer className="px-6 lg:px-10 py-6 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>© MOSLab AI · Research preview</span>
            <span className="font-mono">Scientific dataset available</span>
          </footer>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
