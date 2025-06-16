
'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Palette, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ColorPalette {
  name: string;
  primary: string;
  background: string;
  accent: string;
}

const suggestedPalettes: ColorPalette[] = [
  {
    name: "Tema Azul Original",
    primary: "232 63% 30%",
    background: "0 0% 96%",
    accent: "230 46% 48%",
  },
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
];

const LOCAL_STORAGE_THEME_KEY = "facturafacil-theme";

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeThemeName, setActiveThemeName] = useState<string | null>(null);
  const [currentDisplayColors, setCurrentDisplayColors] = useState<ColorPalette | null>(null);

  const applyThemeToDOM = useCallback((palette: ColorPalette) => {
    document.documentElement.style.setProperty('--primary', palette.primary);
    document.documentElement.style.setProperty('--background', palette.background);
    document.documentElement.style.setProperty('--accent', palette.accent);
    
    // Potentially update other related colors if the palette defines them
    // For now, focusing on the main three. We might need to adjust foregrounds, card colors etc.
    // For a more robust solution, we'd define these in the palette object too.
    // Example: Inferring a sensible foreground for a light background.
    if (palette.background.includes("90%") || palette.background.includes("96%") || palette.background.includes("98%") || palette.background.includes("100%")) {
        document.documentElement.style.setProperty('--foreground', '0 0% 3.9%'); // Dark text on light background
        document.documentElement.style.setProperty('--card', '0 0% 100%');
        document.documentElement.style.setProperty('--card-foreground', '0 0% 3.9%');
        document.documentElement.style.setProperty('--popover', '0 0% 100%');
        document.documentElement.style.setProperty('--popover-foreground', '0 0% 3.9%');
        // Primary foreground often needs to contrast with primary
        // This is a simplification; ideally, it's defined per palette
        document.documentElement.style.setProperty('--primary-foreground', '0 0% 98%'); 
        document.documentElement.style.setProperty('--accent-foreground', '0 0% 98%');
    } else { // Assuming dark background
        document.documentElement.style.setProperty('--foreground', '0 0% 98%'); // Light text on dark background
        document.documentElement.style.setProperty('--card', '0 0% 10%'); // Darker card
        document.documentElement.style.setProperty('--card-foreground', '0 0% 98%');
        document.documentElement.style.setProperty('--popover', '0 0% 10%');
        document.documentElement.style.setProperty('--popover-foreground', '0 0% 98%');
        document.documentElement.style.setProperty('--primary-foreground', '0 0% 98%');
        document.documentElement.style.setProperty('--accent-foreground', '0 0% 98%');
    }

    setCurrentDisplayColors(palette);
    setActiveThemeName(palette.name);
  }, []);

  useEffect(() => {
    const getInitialColorValue = (cssVar: string, fallback: string) => {
      if (typeof window !== 'undefined') {
        const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
        return value || fallback;
      }
      return fallback;
    };
    
    const savedThemeName = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    const themeToApply = suggestedPalettes.find(p => p.name === savedThemeName) || 
                         suggestedPalettes.find(p => p.name === "Tema Azul Original") || 
                         suggestedPalettes[0];
    
    if (themeToApply) {
      applyThemeToDOM(themeToApply);
    } else {
      // Fallback to CSS defined defaults if no theme is found (should be rare with above logic)
       setCurrentDisplayColors({
        name: "Predeterminado (CSS)",
        primary: getInitialColorValue('--primary', "232 63% 30%"),
        background: getInitialColorValue('--background', "0 0% 96%"),
        accent: getInitialColorValue('--accent', "230 46% 48%"),
      });
      setActiveThemeName("Predeterminado (CSS)");
    }
  }, [applyThemeToDOM]);

  const handleThemeSelect = (palette: ColorPalette) => {
    applyThemeToDOM(palette);
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, palette.name);
    toast({
      title: "Tema Aplicado",
      description: `El ${palette.name} ha sido aplicado.`,
    });
  };

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
            Seleccione una paleta de colores para aplicarla instantáneamente. Su elección se guardará localmente.
            Los colores base del tema se definen en <code>src/app/globals.css</code> y pueden ser sobrescritos por su selección.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentDisplayColors && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Colores Actuales del Tema ({activeThemeName || "Desconocido"}):</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>Primario:</strong> <code>{currentDisplayColors.primary}</code></li>
                <li><strong>Fondo:</strong> <code>{currentDisplayColors.background}</code></li>
                <li><strong>Acento:</strong> <code>{currentDisplayColors.accent}</code></li>
              </ul>
            </div>
          )}
          
          <div className="p-4 rounded-md bg-accent/10 border border-accent/30 text-accent-foreground">
            <p className="text-sm font-medium">
              Para cambiar la paleta de colores de la aplicación, seleccione una de las opciones a continuación.
            </p>
             <p className="text-xs mt-1">
              Si desea que un tema específico sea el predeterminado para todos los usuarios (modificando <code>globals.css</code>), puede solicitarlo al asistente de IA.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mt-6 mb-4 text-lg">Paletas de Colores Disponibles:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedPalettes.map((palette) => (
                <Card key={palette.name} className={`shadow-md hover:shadow-lg transition-shadow relative overflow-hidden ${activeThemeName === palette.name ? 'border-2 border-primary ring-2 ring-primary' : 'border'}`}>
                  {activeThemeName === palette.name && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full z-10">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg" style={{ color: `hsl(${palette.primary})`}}>{palette.name}</CardTitle>
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
                    <Button 
                      onClick={() => handleThemeSelect(palette)} 
                      variant="outline" 
                      className="w-full mt-4"
                      disabled={activeThemeName === palette.name}
                    >
                      {activeThemeName === palette.name ? "Tema Activo" : "Aplicar Tema"}
                    </Button>
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

