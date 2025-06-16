
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Palette, Info } from "lucide-react";

export default function SettingsPage() {
  // Estos son los valores actuales definidos en src/app/globals.css
  // Se muestran aquí para informar al usuario.
  const currentThemeColors = {
    primary: "232 63% 30% (Ej: #1A237E)",
    background: "0 0% 96% (Ej: #F5F5F5)",
    accent: "230 46% 48% (Ej: #3F51B5)",
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <SlidersHorizontal className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Ajustes del Entorno</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure la apariencia y vea información de la aplicación.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Palette className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl text-primary">Apariencia y Tema</CardTitle>
          </div>
          <CardDescription>
            Los colores del tema se definen mediante variables CSS HSL en el archivo <code>src/app/globals.css</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Colores Actuales del Tema:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Primario:</strong> <code>{currentThemeColors.primary}</code></li>
              <li><strong>Fondo:</strong> <code>{currentThemeColors.background}</code></li>
              <li><strong>Acento:</strong> <code>{currentThemeColors.accent}</code></li>
            </ul>
          </div>
          <div className="p-3 rounded-md bg-accent/10 border border-accent/30 text-accent-foreground">
            <p className="text-sm font-medium">
              Para cambiar la paleta de colores, por favor, indique al asistente de IA los nuevos valores HSL
              que desea utilizar para las variables <code>--primary</code>, <code>--background</code>, y <code>--accent</code>.
              El asistente realizará los cambios en el archivo <code>src/app/globals.css</code>.
            </p>
            <p className="text-xs mt-2">
              Ejemplo de solicitud: "Cambia el color primario a HSL 210 100% 50%, el fondo a 0 0% 100%, y el acento a 150 70% 40%."
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
           <div className="flex items-center space-x-3">
            <Info className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl text-primary">Información de la Aplicación</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold text-foreground">Nombre:</span>
            <span className="text-muted-foreground">FacturaFacil</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-foreground">Versión:</span>
            <span className="text-muted-foreground">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-foreground">Desarrollado con:</span>
            <span className="text-muted-foreground">Firebase Studio</span>
          </div>
           <div className="flex justify-between">
            <span className="font-semibold text-foreground">Stack Tecnológico:</span>
            <span className="text-muted-foreground">Next.js, React, ShadCN UI, Tailwind CSS, Genkit</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
