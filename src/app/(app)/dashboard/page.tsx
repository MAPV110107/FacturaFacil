
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus2, Users, Settings, ArrowRight, History, Undo2, SlidersHorizontal } from "lucide-react";

export default function DashboardPage() {
  const features = [
    {
      title: "Nueva Factura",
      description: "Crear y emitir una nueva factura fiscal.",
      href: "/invoice/new?new=true", 
      icon: FilePlus2,
      cta: "Crear Factura",
    },
    {
      title: "Gestionar Clientes",
      description: "Añadir, ver y editar información de clientes.",
      href: "/customers",
      icon: Users,
      cta: "Ver Clientes",
    },
    {
      title: "Historial de Facturas",
      description: "Consultar y gestionar facturas emitidas.",
      href: "/invoices",
      icon: History,
      cta: "Ver Historial",
    },
    {
      title: "Procesar Devolución",
      description: "Gestionar devoluciones de facturas existentes.",
      href: "/returns",
      icon: Undo2,
      cta: "Ir a Devoluciones",
    },
    {
      title: "Configuración de Empresa",
      description: "Actualizar los datos fiscales de su empresa.",
      href: "/company",
      icon: Settings,
      cta: "Configurar Empresa",
    },
    {
      title: "Ajustes del Entorno",
      description: "Configurar la apariencia y ver información de la app.",
      href: "/settings",
      icon: SlidersHorizontal,
      cta: "Configurar Entorno",
    },
  ];

  return (
    <div className="flex flex-col space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Bienvenido a FacturaFacil</h1>
        <p className="text-muted-foreground mt-2">Su solución sencilla para la facturación fiscal.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const IconComponent = feature.icon;
          return (
            <Card key={feature.title} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <IconComponent className="h-8 w-8 text-primary" />
                  <CardTitle className="text-xl text-primary">{feature.title}</CardTitle>
                </div>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href={feature.href}>
                    {feature.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
