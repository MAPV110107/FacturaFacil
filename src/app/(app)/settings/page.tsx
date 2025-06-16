
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Palette, Info } from "lucide-react";

export default function SettingsPage() {
  const currentThemeColors = {
    primary: "232 63% 30% (Ej: #1A237E)",
    background: "0 0% 96% (Ej: #F5F5F5)",
    accent: "230 46% 48% (Ej: #3F51B5)",
  };

  const suggestedPalettes = [
    {
      name: "Tema Rojo",
      primary: "0 70% 50%",
      background: "0 0% 96%",
      accent: "30 80% 60%",
    },
    {
      name: "Tema Verde",
      primary: "120 60% 35%",
      background: "0 0% 96%",
      accent: "140 50% 55%",
    },
    {
      name: "Tema Amarillo",
      primary: "45 70% 45%",
      background: "0 0% 98%",
      accent: "60 90% 70%",
    },
    {
      name: "Tema Morado",
      primary: "270 50% 45%",
      background: "0 0% 96%",
      accent: "290 60% 65%",
    },
    {
      name: "Tema Naranja",
      primary: "30 90% 50%",
      background: "0 0% 96%",
      accent: "40 100% 65%",
    },
     {
      name: "Tema Azul Original",
      primary: "232 63% 30%",
      background: "0 0% 96%",
      accent: "230 46% 48%",
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
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
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-2">Colores Actuales del Tema:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li><strong>Primario:</strong> <code>{currentThemeColors.primary}</code></li>
              <li><strong>Fondo:</strong> <code>{currentThemeColors.background}</code></li>
              <li><strong>Acento:</strong> <code>{currentThemeColors.accent}</code></li>
            </ul>
          </div>
          
          <div className="p-4 rounded-md bg-accent/10 border border-accent/30 text-accent-foreground">
            <p className="text-sm font-medium">
              Para cambiar la paleta de colores de la aplicación, indique al asistente de IA los nuevos valores HSL que desea utilizar
              para las variables <code>--primary</code>, <code>--background</code>, y <code>--accent</code> en el archivo <code>src/app/globals.css</code>.
            </p>
            <p className="text-xs mt-1">
              Ejemplo de solicitud general: "Cambia el color primario a HSL 210 100% 50%, el fondo a 0 0% 100%, y el acento a 150 70% 40%."
            </p>
            <p className="text-sm font-medium mt-3">
              Alternativamente, puede elegir una de las paletas sugeridas a continuación y pedir al asistente que la aplique.
            </p>
            <p className="text-xs mt-1">
              Ejemplo de solicitud para una paleta sugerida: "Aplica el Tema Rojo con Primario: 0 70% 50%, Fondo: 0 0% 96%, y Acento: 30 80% 60%."
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mt-6 mb-4 text-lg">Paletas de Colores Sugeridas:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedPalettes.map((palette) => (
                <Card key={palette.name} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg text-primary">{palette.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center">
                      <div className="inline-block w-5 h-5 rounded-sm mr-2 border" style={{ backgroundColor: `hsl(${palette.primary})` }} />
                      <div>
                        <span className="font-semibold">Primario:</span>
                        <code className="ml-1 text-xs bg-muted p-1 rounded">{palette.primary}</code>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="inline-block w-5 h-5 rounded-sm mr-2 border" style={{ backgroundColor: `hsl(${palette.background})` }} />
                      <div>
                        <span className="font-semibold">Fondo:</span>
                        <code className="ml-1 text-xs bg-muted p-1 rounded">{palette.background}</code>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="inline-block w-5 h-5 rounded-sm mr-2 border" style={{ backgroundColor: `hsl(${palette.accent})` }} />
                      <div>
                        <span className="font-semibold">Acento:</span>
                        <code className="ml-1 text-xs bg-muted p-1 rounded">{palette.accent}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
