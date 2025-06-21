import { SiteHeader } from "@/components/site-header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container py-8">{children}</main>
      <footer className="py-6 md:px-8 md:py-0 no-print">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            FacturaFacil &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
      {/* Hidden iframe for robust printing */}
      <iframe id="printFrame" className="hidden" title="Print Frame"></iframe>
    </div>
  );
}
