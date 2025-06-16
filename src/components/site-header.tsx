
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Settings, Users, FilePlus2, LayoutDashboard, History } from "lucide-react";
import { Logo } from "@/components/icons";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoice/new", label: "Nueva Factura", icon: FilePlus2 },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/invoices", label: "Historial", icon: History },
  { href: "/company", label: "Empresa", icon: Settings },
];

export function SiteHeader() {
  const pathname = usePathname();

  const renderNavLinks = (isMobile = false) =>
    navItems.map((item) => (
      <Button
        key={item.href}
        variant={pathname === item.href ? "secondary" : "ghost"}
        asChild
        className={cn(
          "w-full justify-start",
          isMobile ? "text-lg py-3" : ""
        )}
      >
        <Link href={item.href}>
          <item.icon className="mr-2 h-5 w-5" />
          {item.label}
        </Link>
      </Button>
    ));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <div className="container flex h-16 items-center">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
          <Logo />
          <span className="font-bold sm:inline-block text-xl">
            FacturaFacil
          </span>
        </Link>
        <nav className="hidden md:flex flex-1 items-center space-x-2">
          {renderNavLinks()}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <Link href="/dashboard" className="mb-6 flex items-center space-x-2">
                <Logo />
                <span className="font-bold text-xl">FacturaFacil</span>
              </Link>
              <nav className="flex flex-col space-y-2">
                {renderNavLinks(true)}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
