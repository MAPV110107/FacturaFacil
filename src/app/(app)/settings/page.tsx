
'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link'; // Import Link
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Palette, Info, CheckCircle, BookOpen, Eye, Undo2 } from "lucide-react"; // Added Eye, Undo2
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
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Panel Principal (Dashboard)</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>El Dashboard es su punto de partida. Desde aquí puede acceder a todas las funciones principales de la aplicación:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Nueva Factura:</strong> Para crear y emitir facturas fiscales.</li>
                  <li><strong>Gestionar Clientes:</strong> Para añadir, ver y editar la información de sus clientes.</li>
                  <li><strong>Historial de Documentos:</strong> Para consultar facturas y notas de crédito emitidas.</li>
                  <li><strong>Procesar Devolución:</strong> Para generar notas de crédito basadas en facturas existentes.</li>
                  <li><strong>Configuración de Empresa:</strong> Para actualizar los datos fiscales de su empresa que aparecen en las facturas.</li>
                  <li><strong>Ajustes del Entorno:</strong> Donde se encuentra ahora, para cambiar temas, ver información de la app y este manual.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Crear Nueva Factura</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>Para emitir una nueva factura:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Navegue a "Nueva Factura" desde el <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link> o el menú.</li>
                  <li>Complete los detalles de la factura como número de factura y fecha. El número de factura se genera automáticamente pero puede modificarlo.</li>
                  <li><strong>Información del Cliente:</strong> Ingrese el RIF/Cédula del cliente en el campo provisto y presione Enter o el botón "Buscar".
                    <ul className="list-disc pl-5">
                      <li>Si el cliente existe, sus datos (nombre, RIF, dirección, etc.) se autocompletarán en los campos correspondientes.</li>
                      <li>Si no existe, se le indicará y podrá completar los campos de Nombre, Dirección, Teléfono (opcional) y Email (opcional) para registrarlo. El cliente se guardará automáticamente en su lista al generar la factura.</li>
                      <li>Alternativamente, puede seleccionar un cliente existente de la lista desplegable.</li>
                    </ul>
                  </li>
                  <li><strong>Artículos:</strong> Añada uno o más artículos o servicios haciendo clic en "Añadir Artículo". Para cada uno, especifique la descripción, cantidad y precio unitario. El total por artículo se calcula automáticamente.</li>
                  <li><strong>Detalles del Pago:</strong> Agregue uno o más métodos de pago (Efectivo, Tarjeta, Transferencia, etc.), el monto pagado por cada método y una referencia opcional (ej. número de confirmación de transferencia).</li>
                  <li><strong>Configuración Adicional:</strong> Puede ingresar un monto de descuento (que se aplica al subtotal antes del IVA), modificar la tasa de IVA (por defecto 16%), cambiar el mensaje de agradecimiento y añadir notas adicionales a la factura.</li>
                  <li>A la derecha de la pantalla, verá una <strong>previsualización en tiempo real</strong> de la factura con todos los datos que va ingresando.</li>
                  <li>Una vez completados todos los datos, haga clic en "Guardar y Generar Factura". La factura se guardará en el <Link href="/invoices" className="text-primary hover:underline">Historial de Documentos</Link>.</li>
                  <li>Luego, puede usar el botón "Imprimir Factura" que aparece debajo de la previsualización para imprimirla o guardarla como PDF.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Gestionar Clientes</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>En la sección <Link href="/customers" className="text-primary hover:underline">Clientes</Link>:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Puede ver una lista de todos sus clientes registrados.</li>
                  <li>Use el campo de búsqueda para filtrar clientes por nombre o RIF/Cédula.</li>
                  <li>Haga clic en "Añadir Nuevo Cliente" para abrir un formulario y registrar un nuevo cliente con todos sus detalles.</li>
                  <li>Para cada cliente en la lista, tiene opciones para "Editar" su información o "Eliminarlo" (esta acción requiere confirmación).</li>
                </ul>
                <p>La información del cliente (nombre, RIF/Cédula, dirección fiscal) es crucial para la correcta emisión de facturas y notas de crédito.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Historial de Facturas y Notas de Crédito</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>La sección <Link href="/invoices" className="text-primary hover:underline">Historial de Documentos</Link> le permite:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Consultar un listado de todas las facturas de venta y notas de crédito generadas, ordenadas por fecha (la más reciente primero).</li>
                  <li>Para cada documento, se muestra su número, tipo (Factura o Nota de Crédito), fecha de emisión, nombre del cliente y monto total.</li>
                  <li>Puede hacer clic en el icono del ojo (<Eye className="inline h-4 w-4" />) para ver el detalle completo del documento en una nueva vista, donde también podrá imprimirlo.</li>
                  <li>Para las facturas de venta que aún no tengan una nota de crédito asociada, verá un icono de devolución (<Undo2 className="inline h-4 w-4" />). Al hacer clic, será redirigido a la página de "Procesar Devolución" con la información de esa factura ya cargada, listo para generar una nota de crédito.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Procesar Devoluciones (Generar Notas de Crédito)</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>Para generar una nota de crédito a partir de una factura de venta existente:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Navegue a "Procesar Devolución" desde el <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link>, el menú, o usando el acceso directo <Undo2 className="inline h-4 w-4" /> en el <Link href="/invoices" className="text-primary hover:underline">Historial</Link>.</li>
                  <li>Si no vino desde el historial, ingrese el número de la factura original que desea devolver o su ID interno en el campo de búsqueda y haga clic en "Buscar Factura Original".</li>
                  <li>Si la factura se encuentra, es de tipo "venta" y aún no se le ha generado una nota de crédito, se mostrará una previsualización de la factura original.</li>
                  <li>Actualmente, el sistema procesa una devolución total de la factura. Haga clic en "Generar Nota de Crédito".</li>
                  <li>Aparecerá un cuadro de diálogo pidiéndole que confirme la generación de la nota de crédito y mostrando el monto total.</li>
                  <li>Al confirmar, se creará un nuevo documento de tipo "Nota de Crédito". Este documento tendrá su propio número (generalmente con prefijo "NC-"), la fecha actual, y referenciará la factura original.</li>
                  <li>Esta Nota de Crédito se guardará en el <Link href="/invoices" className="text-primary hover:underline">Historial de Documentos</Link> y tendrá una marca de agua distintiva en su previsualización.</li>
                  <li>Desde la vista de la Nota de Crédito, podrá imprimirla o guardarla como PDF.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>Configuración de Empresa</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>En la sección <Link href="/company" className="text-primary hover:underline">Empresa</Link>, puede configurar los datos de su negocio:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Nombre de la Empresa:</strong> Su razón social.</li>
                  <li><strong>RIF:</strong> Su Registro de Información Fiscal.</li>
                  <li><strong>Dirección Fiscal:</strong> La dirección legal de su empresa.</li>
                  <li><strong>Teléfono (Opcional):</strong> Número de contacto.</li>
                  <li><strong>Correo Electrónico (Opcional):</strong> Email de contacto.</li>
                  <li><strong>URL del Logo (Opcional):</strong> Enlace a una imagen de su logo. Si se provee, aparecerá en las facturas (principalmente visible en impresiones de página completa, no en térmicas pequeñas). Se muestra una previsualización al ingresar la URL.</li>
                </ul>
                <p>Estos datos son fundamentales ya que aparecerán en el encabezado de todas sus facturas y notas de crédito. Asegúrese de que sean correctos y estén actualizados.</p>
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-7">
              <AccordionTrigger>Impresión de Documentos</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>Tanto las facturas de venta como las notas de crédito pueden ser impresas o guardadas digitalmente:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Al visualizar un documento (ya sea en la previsualización al crear una factura nueva, o al ver un documento desde el historial), encontrará un botón "Imprimir Factura" o "Imprimir Nota de Crédito".</li>
                  <li>Al hacer clic, se abrirá el diálogo de impresión estándar de su navegador o sistema operativo.</li>
                  <li><strong>Guardar como PDF:</strong> En este diálogo de impresión, generalmente tiene la opción de seleccionar "Guardar como PDF" (o un nombre similar como "Microsoft Print to PDF", "Imprimir a PDF") en la lista de impresoras disponibles. Esto le permite descargar el documento como un archivo PDF.</li>
                  <li><strong>Impresoras Térmicas Fiscales/De Recibos:</strong> El formato de impresión está adaptado para ser compatible con impresoras térmicas que usan rollos de papel estrechos. Seleccione su impresora térmica en el diálogo de impresión. La aplicación utiliza un tipo de letra monoespaciado y un diseño compacto para este propósito.</li>
                  <li><strong>Impresoras de Oficina (Inyección/Láser):</strong> También puede imprimir en impresoras estándar de página completa (A4, Carta, etc.). El diseño se adaptará razonablemente bien.</li>
                  <li>La aplicación es compatible con cualquier impresora que esté correctamente configurada en su computadora o dispositivo (conectada por USB, Wi-Fi, Bluetooth, etc.), ya que utiliza la funcionalidad de impresión del sistema.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-8">
              <AccordionTrigger>Almacenamiento de Datos y Temas</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>FacturaFacil utiliza el almacenamiento local de su navegador (conocido como <code>localStorage</code>) para guardar la siguiente información:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Los detalles de su empresa (nombre, RIF, dirección, etc.).</li>
                  <li>Su lista completa de clientes registrados.</li>
                  <li>Todas las facturas de venta y notas de crédito que ha generado.</li>
                  <li>Su preferencia de tema de color para la interfaz de la aplicación.</li>
                </ul>
                <p><strong>Consideraciones Importantes sobre el Almacenamiento Local:</strong></p>
                <ul className="list-disc pl-5">
                  <li>Los datos se guardan <strong>exclusivamente en el navegador y dispositivo</strong> que está utilizando. No se sincronizan automáticamente con otros dispositivos o navegadores.</li>
                  <li>Si usted <strong>limpia la caché, las cookies o los datos de navegación</strong> de su navegador, es muy probable que <strong>pierda toda la información</strong> almacenada por FacturaFacil (configuración, clientes, historial de facturas).</li>
                  <li>Se recomienda encarecidamente que realice <strong>copias de seguridad periódicas</strong> de sus documentos importantes (facturas, notas de crédito) guardándolos como PDF.</li>
                  <li>No hay un sistema de cuentas de usuario en la nube; toda la operación es local.</li>
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
