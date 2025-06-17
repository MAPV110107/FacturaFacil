
'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Palette, Info, CheckCircle, BookOpen, Eye, Undo2, DollarSign, Gift, Users, FilePlus2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    
    if (palette.background.includes("90%") || palette.background.includes("96%") || palette.background.includes("98%") || palette.background.includes("100%")) {
        document.documentElement.style.setProperty('--foreground', '0 0% 3.9%'); 
        document.documentElement.style.setProperty('--card', '0 0% 100%');
        document.documentElement.style.setProperty('--card-foreground', '0 0% 3.9%');
        document.documentElement.style.setProperty('--popover', '0 0% 100%');
        document.documentElement.style.setProperty('--popover-foreground', '0 0% 3.9%');
        document.documentElement.style.setProperty('--primary-foreground', '0 0% 98%'); 
        document.documentElement.style.setProperty('--accent-foreground', '0 0% 98%');
    } else { 
        document.documentElement.style.setProperty('--foreground', '0 0% 98%'); 
        document.documentElement.style.setProperty('--card', '0 0% 10%'); 
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
                Configure la apariencia, vea información de la aplicación y consulte el manual de usuario.
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
            <BookOpen className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl text-primary">Manual de Usuario Rápido</CardTitle>
          </div>
          <CardDescription>
            Consulte esta guía rápida para entender las funcionalidades principales de FacturaFacil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>Panel Principal (Dashboard)</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>El Dashboard es su punto de partida. Desde aquí puede acceder a todas las funciones principales de la aplicación:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong><Link href="/invoice/new" className="text-primary hover:underline">Nueva Factura</Link> (<FilePlus2 className="inline h-4 w-4" />):</strong> Para crear y emitir facturas fiscales, registrar abonos a deudas o depósitos a cuenta.</li>
                  <li><strong><Link href="/customers" className="text-primary hover:underline">Gestionar Clientes</Link> (<Users className="inline h-4 w-4" />):</strong> Para añadir, ver, editar información de clientes y consultar sus saldos.</li>
                  <li><strong><Link href="/invoices" className="text-primary hover:underline">Historial de Documentos</Link> (<History className="inline h-4 w-4" />):</strong> Para consultar facturas, notas de crédito, abonos y depósitos emitidos.</li>
                  <li><strong><Link href="/returns" className="text-primary hover:underline">Procesar Devolución / Retiro de Saldo</Link> (<Undo2 className="inline h-4 w-4" />):</strong> Para generar notas de crédito basadas en facturas existentes o procesar retiros de saldo a favor del cliente.</li>
                  <li><strong><Link href="/company" className="text-primary hover:underline">Configuración de Empresa</Link> (<Settings className="inline h-4 w-4" />):</strong> Para actualizar los datos fiscales de su empresa que aparecen en los documentos.</li>
                  <li><strong><Link href="/settings" className="text-primary hover:underline">Ajustes del Entorno</Link> (<SlidersHorizontal className="inline h-4 w-4" />):</strong> Donde se encuentra ahora, para cambiar temas, ver información de la app y este manual.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>Gestión de Clientes y Saldos</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>La sección <Link href="/customers" className="text-primary hover:underline">Clientes</Link> (<Users className="inline h-4 w-4" />) es fundamental para administrar su cartera.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Puede ver una lista de todos sus clientes, buscar, añadir nuevos y editar existentes.</li>
                  <li><strong>Saldos del Cliente:</strong> En la lista, verá las columnas "S. Pendiente" (Saldo Pendiente) y "S. a Favor" (Saldo a Favor).
                    <ul className="list-disc pl-5">
                      <li>El <strong>Saldo Pendiente</strong> se incrementa si un cliente paga menos del total de una factura.</li>
                      <li>El <strong>Saldo a Favor</strong> se incrementa si un cliente paga más del total de una factura o si realiza un depósito directo a su cuenta.</li>
                    </ul>
                  </li>
                  <li><strong>Acciones Rápidas en la Lista:</strong>
                    <ul className="list-disc pl-5">
                      <li><Eye className="inline h-4 w-4" /> (Ver Resumen): Abre la <Link href="#customer-summary-page" className="text-primary hover:underline">Página de Resumen del Cliente</Link>.</li>
                      <li><DollarSign className="inline h-4 w-4" /> (Pagar Deuda): Si hay saldo pendiente, lo lleva al editor de facturas en modo "Abono a Deuda".</li>
                      <li><Gift className="inline h-4 w-4" /> (Retirar Saldo): Si hay saldo a favor, lo lleva a la página de devoluciones en modo "Retiro de Saldo".</li>
                    </ul>
                  </li>
                </ul>
                <div id="customer-summary-page">
                  <h4 className="font-semibold text-foreground mt-2">Página de Resumen del Cliente</h4>
                  <p>Al hacer clic en el nombre de un cliente o en el icono <Eye className="inline h-4 w-4" />, accederá a una página detallada con:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Información de contacto del cliente.</li>
                    <li><strong>Resumen Financiero:</strong> Total Gastado en Tienda, Saldo Pendiente (con botón para pagar), y Saldo a Favor (con botón para retirar).</li>
                    <li><strong>Historial de Transacciones:</strong> Una tabla con todas las facturas, notas de crédito, abonos y depósitos asociados a ese cliente, con opción de ver cada documento.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>Crear Documentos (Facturas, Abonos, Depósitos)</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Para emitir un nuevo documento, navegue a "Nueva Factura" (<FilePlus2 className="inline h-4 w-4" />). El editor puede operar en tres modos:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong>Factura Estándar:</strong>
                    <ul className="list-disc pl-5">
                      <li>Complete los detalles (Nro. factura, fecha).</li>
                      <li><strong>Cliente:</strong> Busque por RIF/Cédula o seleccione de la lista. Si no existe, complete los campos para registrarlo.</li>
                      <li><strong>Artículos:</strong> Añada productos/servicios con descripción, cantidad y precio unitario.</li>
                      <li><strong>Detalles del Pago:</strong>
                        <ul className="list-disc pl-5">
                          <li>Agregue métodos de pago.</li>
                          <li>Si el cliente tiene <strong>Saldo a Favor</strong>, aparecerá como opción. Puede usarlo para cubrir parte o todo el monto de la factura. El sistema autocompletará el monto a usar, pero puede editarlo (sin exceder el crédito disponible).</li>
                        </ul>
                      </li>
                      <li>Configure descuento, IVA, mensaje de agradecimiento y notas.</li>
                      <li>Al guardar, se actualizarán los saldos del cliente si el pago fue menor (aumenta Saldo Pendiente) o mayor (aumenta Saldo a Favor), o si se usó Saldo a Favor (reduce Saldo a Favor).</li>
                    </ul>
                  </li>
                  <li><strong>Registrar Abono a Deuda:</strong>
                     <ul className="list-disc pl-5">
                      <li>Se accede desde la lista de clientes (<DollarSign className="inline h-4 w-4" />), el resumen del cliente, o desde el editor de facturas si el cliente seleccionado tiene deuda.</li>
                      <li>El cliente y el monto de la deuda se precargan.</li>
                      <li>El concepto es "Abono a Deuda Pendiente". No se añaden más artículos. IVA y descuento son cero.</li>
                      <li>Ingrese los detalles del pago. Al guardar, el Saldo Pendiente del cliente se reduce.</li>
                    </ul>
                  </li>
                  <li><strong>Registrar Depósito a Cuenta Cliente:</strong>
                    <ul className="list-disc pl-5">
                      <li>Se accede desde el editor de facturas (botón "Registrar Depósito a Cuenta") si hay un cliente seleccionado.</li>
                      <li>El cliente se precarga. El concepto es "Depósito a Cuenta Cliente", con cantidad 1 y precio unitario cero (no editable).</li>
                      <li>El monto del depósito se define en la sección "Detalles del Pago". IVA y descuento son cero.</li>
                      <li>Al guardar, el Saldo a Favor del cliente se incrementa.</li>
                    </ul>
                  </li>
                   <li><strong>Cancelar Modo Especial:</strong> Si está en modo Abono o Depósito, un botón le permite volver a una factura estándar.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>Historial de Documentos</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>La sección <Link href="/invoices" className="text-primary hover:underline">Historial de Documentos</Link> (<History className="inline h-4 w-4" />) le permite:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Consultar un listado de todos los documentos (facturas, notas de crédito, abonos, depósitos), ordenados por fecha.</li>
                  <li>Ver el tipo de documento, cliente, y monto.</li>
                  <li>Hacer clic en el icono del ojo (<Eye className="inline h-4 w-4" />) para ver el detalle completo e imprimir.</li>
                  <li>Para facturas de venta que no sean abonos/depósitos y no tengan nota de crédito, un icono (<Undo2 className="inline h-4 w-4" />) permite procesar una devolución.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>Procesar Devoluciones y Retiros de Saldo</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>La sección "Procesar Devolución / Retiro de Saldo" (<Undo2 className="inline h-4 w-4" />) maneja dos escenarios:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong>Devolución de Factura (Nota de Crédito):</strong>
                    <ul className="list-disc pl-5">
                      <li>Acceda desde el <Link href="/invoices" className="text-primary hover:underline">Historial</Link> (<Undo2 className="inline h-4 w-4" />) o buscando la factura original.</li>
                      <li>Se previsualiza la factura original. Especifique los detalles del reembolso.</li>
                      <li>Al confirmar, se genera una Nota de Crédito por el total de la factura original y se guarda en el historial.</li>
                      <li>El sistema no actualiza automáticamente saldos pendientes o a favor basados en la devolución de una factura estándar; estos ajustes, si son necesarios (ej. si la factura original generó deuda), deberían manejarse manualmente o mediante un abono/depósito posterior.</li>
                    </ul>
                  </li>
                  <li><strong>Retiro de Saldo a Favor:</strong>
                    <ul className="list-disc pl-5">
                      <li>Acceda desde la lista de clientes (<Gift className="inline h-4 w-4" />) o el resumen del cliente.</li>
                      <li>Se le pedirá ingresar el monto a retirar (hasta el saldo disponible del cliente).</li>
                      <li>Confirme los detalles del reembolso.</li>
                      <li>Se genera una Nota de Crédito especial por el monto retirado, y el Saldo a Favor del cliente se reduce.</li>
                    </ul>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6">
              <AccordionTrigger>Configuración de Empresa</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>En la sección <Link href="/company" className="text-primary hover:underline">Empresa</Link> (<Settings className="inline h-4 w-4" />), puede configurar los datos de su negocio que aparecerán en todos los documentos emitidos. Asegúrese de que sean correctos y estén actualizados.</p>
              </AccordionContent>
            </AccordionItem>

             <AccordionItem value="item-7">
              <AccordionTrigger>Impresión de Documentos</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>Todos los documentos (facturas, notas de crédito, abonos, depósitos) pueden ser impresos o guardados digitalmente:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Al visualizar un documento, encontrará un botón "Imprimir".</li>
                  <li>Esto abre el diálogo de impresión de su sistema, donde puede seleccionar una impresora física o "Guardar como PDF".</li>
                  <li>El formato está adaptado para impresoras térmicas de recibos y también funciona bien en impresoras de página completa.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>Almacenamiento de Datos y Temas</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>FacturaFacil utiliza el almacenamiento local de su navegador (<code>localStorage</code>) para guardar la configuración de la empresa, lista de clientes, todos los documentos generados y su preferencia de tema de color.</p>
                <p><strong>Consideraciones Importantes:</strong></p>
                <ul className="list-disc pl-5">
                  <li>Los datos se guardan <strong>exclusivamente en el navegador y dispositivo</strong> que está utilizando.</li>
                  <li>Si limpia la caché o datos de navegación, <strong>perderá toda la información</strong>.</li>
                  <li>Se recomienda <strong>realizar copias de seguridad periódicas</strong> de sus documentos guardándolos como PDF.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
            <span className="text-muted-foreground">1.1.0 (Con Gestión de Saldos)</span>
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

