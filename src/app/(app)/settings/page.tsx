
'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Palette, Info, CheckCircle, BookOpen, Eye, Undo, DollarSign, Gift, Users, FilePlus2, History, Settings as SettingsIcon, Download, Upload, Server, AlertTriangle, RotateCcw, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CompanyDetails, CustomerDetails, Invoice } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ThemeInitializer, LOCAL_STORAGE_UI_MODE_KEY } from "@/components/theme/theme-initializer";


interface ColorPalette {
  name: string;
  primary: string;
  background: string; // HSL for theme card preview (and potentially globals.css if a theme overrides it)
  accent: string;
}

interface DisplayColorPalette {
  name: string;
  primary: string;
  actualPageBackground: string;
  accent: string;
}


const suggestedPalettes: ColorPalette[] = [
  {
    name: "Tema Azul Original",
    primary: "232 63% 30%", // Dark Blue
    background: "0 0% 96%", // Light Gray (for preview tile & potentially globals)
    accent: "230 46% 48%",   // Medium Blue
  },
  {
    name: "Tema Rojo",
    primary: "0 70% 50%",    // Red
    background: "0 0% 96%", // Light Gray
    accent: "30 80% 60%",   // Orange-Red
  },
  {
    name: "Tema Verde",
    primary: "120 60% 35%",  // Dark Green
    background: "0 0% 96%", // Light Gray
    accent: "140 50% 55%",  // Medium Green
  },
  {
    name: "Tema Amarillo",
    primary: "45 70% 45%",   // Dark Yellow/Gold
    background: "0 0% 98%", // Very Light Gray
    accent: "60 90% 70%",   // Light Yellow
  },
  {
    name: "Tema Morado",
    primary: "270 50% 45%",  // Purple
    background: "0 0% 96%", // Light Gray
    accent: "290 60% 65%",  // Pink-Purple
  },
  {
    name: "Tema Naranja",
    primary: "30 90% 50%",   // Bright Orange
    background: "0 0% 96%", // Light Gray
    accent: "40 100% 65%",  // Lighter Orange
  },
];

const LOCAL_STORAGE_THEME_KEY = "facturafacil-theme";
// LOCAL_STORAGE_UI_MODE_KEY is imported from theme-initializer
const LOCAL_STORAGE_COMPANY_KEY = "companyDetails";
const LOCAL_STORAGE_CUSTOMERS_KEY = "customers";
const LOCAL_STORAGE_INVOICES_KEY = "invoices";

const LOCAL_STORAGE_LAST_EXPORT_TIMESTAMP_KEY = "facturafacil_last_export_timestamp";
const LOCAL_STORAGE_LAST_IMPORT_TIMESTAMP_KEY = "facturafacil_last_import_timestamp";
const LOCAL_STORAGE_LAST_IMPORT_REVERTED_KEY = "facturafacil_last_import_reverted";
const LOCAL_STORAGE_PRE_IMPORT_COMPANY_KEY = "facturafacil_pre_import_companyDetails";
const LOCAL_STORAGE_PRE_IMPORT_CUSTOMERS_KEY = "facturafacil_pre_import_customers";
const LOCAL_STORAGE_PRE_IMPORT_INVOICES_KEY = "facturafacil_pre_import_invoices";


interface BackupData {
  companyDetails?: CompanyDetails | null;
  customers?: CustomerDetails[] | null;
  invoices?: Invoice[] | null;
  exportDate?: string;
  appName?: string;
  version?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [activePaletteName, setActivePaletteName] = useState<string | null>(null);
  const [currentDisplayColors, setCurrentDisplayColors] = useState<DisplayColorPalette | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessages, setImportMessages] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const [lastExportTimestamp, setLastExportTimestamp] = useState<string | null>(null);
  const [lastImportTimestamp, setLastImportTimestamp] = useState<string | null>(null);
  const [isLastImportReverted, setIsLastImportReverted] = useState<boolean>(false);
  const [canRevertImport, setCanRevertImport] = useState<boolean>(false);

  const [uiMode, setUiMode] = useState<'light' | 'dark'>('light');


  const updateStatusIndicators = useCallback(() => {
    if (typeof window !== 'undefined') {
      setLastExportTimestamp(localStorage.getItem(LOCAL_STORAGE_LAST_EXPORT_TIMESTAMP_KEY));
      setLastImportTimestamp(localStorage.getItem(LOCAL_STORAGE_LAST_IMPORT_TIMESTAMP_KEY));
      const reverted = localStorage.getItem(LOCAL_STORAGE_LAST_IMPORT_REVERTED_KEY) === 'true';
      setIsLastImportReverted(reverted);
      const preImportBackupExists = !!localStorage.getItem(LOCAL_STORAGE_PRE_IMPORT_COMPANY_KEY);
      setCanRevertImport(preImportBackupExists && !reverted);
    }
  }, []);

  useEffect(() => {
    updateStatusIndicators();
  }, [updateStatusIndicators]);

  const getActualPageBackground = useCallback(() => {
     if (typeof document !== 'undefined') {
        // Reads the CSS variable --background which is set by :root or .dark in globals.css
        return getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      }
      return uiMode === 'dark' ? "0 0% 3.9%" : "0 0% 96%"; // Fallback, should match globals.css
  }, [uiMode]);

  const applyPaletteToDOM = useCallback((palette: ColorPalette) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary', palette.primary);
      document.documentElement.style.setProperty('--accent', palette.accent);
      // Ensure text on colored buttons is white for text-shadow effect
      document.documentElement.style.setProperty('--primary-foreground', '0 0% 98%');
      document.documentElement.style.setProperty('--accent-foreground', '0 0% 98%');
      document.documentElement.style.setProperty('--destructive-foreground', '0 0% 98%');
      // For secondary buttons in dark mode
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.style.setProperty('--secondary-foreground', '0 0% 98%');
      } else {
        document.documentElement.style.setProperty('--secondary-foreground', '0 0% 3.9%');
      }
    }

    requestAnimationFrame(() => {
        setCurrentDisplayColors({
            name: palette.name,
            primary: palette.primary,
            actualPageBackground: getActualPageBackground(),
            accent: palette.accent,
        });
    });
    setActivePaletteName(palette.name);
  }, [getActualPageBackground]);


  useEffect(() => {
    // Load saved UI mode (light/dark)
    const savedMode = localStorage.getItem(LOCAL_STORAGE_UI_MODE_KEY) as 'light' | 'dark' | null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode = savedMode || (prefersDark ? 'dark' : 'light');
    setUiMode(initialMode);
    // ThemeInitializer component handles adding/removing .dark class on initial app load.
    // Here we just sync the local state for the button.

    // Load saved color palette
    const savedPaletteName = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_THEME_KEY) : null;
    const paletteToApply = suggestedPalettes.find(p => p.name === savedPaletteName) ||
                           suggestedPalettes.find(p => p.name === "Tema Azul Original") ||
                           suggestedPalettes[0];

    if (paletteToApply) {
      applyPaletteToDOM(paletteToApply);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyPaletteToDOM]); // applyPaletteToDOM is stable due to useCallback

  const handlePaletteSelect = (palette: ColorPalette) => {
    applyPaletteToDOM(palette);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, palette.name);
    }
    toast({
      title: "Paleta Aplicada",
      description: `La paleta de colores ${palette.name} ha sido aplicada.`,
    });
  };

  const handleToggleUiMode = () => {
    setUiMode(prevMode => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(LOCAL_STORAGE_UI_MODE_KEY, newMode);
      if (newMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // After toggling .dark class, the --background CSS var changes.
      // We need to re-update currentDisplayColors to reflect this.
      const currentPaletteName = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      const currentPalette = suggestedPalettes.find(p => p.name === currentPaletteName) ||
                             suggestedPalettes.find(p => p.name === "Tema Azul Original") ||
                             suggestedPalettes[0];
      if (currentPalette) {
         requestAnimationFrame(() => { // ensure DOM has updated
            setCurrentDisplayColors({
                name: currentPalette.name,
                primary: currentPalette.primary,
                actualPageBackground: getActualPageBackground(), // Re-fetch the actual background
                accent: currentPalette.accent,
            });
            // Re-apply primary/accent foreground for dark/light secondary button text
            if (newMode === 'dark') {
                document.documentElement.style.setProperty('--secondary-foreground', '0 0% 98%');
            } else {
                document.documentElement.style.setProperty('--secondary-foreground', '0 0% 3.9%');
            }
        });
      }
      // Defer toast call to avoid issues during render
      setTimeout(() => {
        toast({
          title: `Modo cambiado a ${newMode === 'light' ? 'Claro' : 'Oscuro'}`,
        });
      }, 0);
      return newMode;
    });
  };


  const handleExportData = () => {
    if (typeof window === 'undefined') {
        toast({ title: "Error", description: "La exportación solo puede realizarse en el navegador.", variant: "destructive"});
        return;
    }
    try {
        const companyDetails = localStorage.getItem(LOCAL_STORAGE_COMPANY_KEY);
        const customers = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
        const invoices = localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);

        const backupData: BackupData = {
            companyDetails: companyDetails ? JSON.parse(companyDetails) : null,
            customers: customers ? JSON.parse(customers) : [],
            invoices: invoices ? JSON.parse(invoices) : [],
            exportDate: new Date().toISOString(),
            appName: "FacturaFacil",
            version: "1.6.0",
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        link.download = `facturafacil_backup_${dateSuffix}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);

        localStorage.setItem(LOCAL_STORAGE_LAST_EXPORT_TIMESTAMP_KEY, new Date().toISOString());
        updateStatusIndicators();

        toast({
            title: "Exportación Exitosa",
            description: "Los datos de la aplicación se han descargado como un archivo JSON.",
        });

    } catch (error) {
        console.error("Error al exportar datos:", error);
        toast({
            title: "Error de Exportación",
            description: "No se pudieron exportar los datos. Revise la consola para más detalles.",
            variant: "destructive",
        });
    }
  };

  const handleImportFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      toast({ title: "No se seleccionaron archivos", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setImportMessages(["Iniciando proceso de importación y fusión..."]);

    const currentCompanyJson = localStorage.getItem(LOCAL_STORAGE_COMPANY_KEY);
    const currentCustomersJson = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
    const currentInvoicesJson = localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);

    if (currentCompanyJson) localStorage.setItem(LOCAL_STORAGE_PRE_IMPORT_COMPANY_KEY, currentCompanyJson);
    else localStorage.removeItem(LOCAL_STORAGE_PRE_IMPORT_COMPANY_KEY);
    if (currentCustomersJson) localStorage.setItem(LOCAL_STORAGE_PRE_IMPORT_CUSTOMERS_KEY, currentCustomersJson);
    else localStorage.removeItem(LOCAL_STORAGE_PRE_IMPORT_CUSTOMERS_KEY);
    if (currentInvoicesJson) localStorage.setItem(LOCAL_STORAGE_PRE_IMPORT_INVOICES_KEY, currentInvoicesJson);
    else localStorage.removeItem(LOCAL_STORAGE_PRE_IMPORT_INVOICES_KEY);

    let consolidatedCompanyDetails: CompanyDetails | null = currentCompanyJson ? JSON.parse(currentCompanyJson) : null;
    let consolidatedCustomers: CustomerDetails[] = currentCustomersJson ? JSON.parse(currentCustomersJson) : [];
    let consolidatedInvoices: Invoice[] = currentInvoicesJson ? JSON.parse(currentInvoicesJson) : [];

    let companyUpdatedThisImport = false;
    let customersAddedCount = 0;
    let customersMergedCount = 0;
    let invoicesAddedCount = 0;
    const localMessages: string[] = ["Procesando archivos..."];

    for (const file of Array.from(files)) {
      localMessages.push(`--- Procesando archivo: ${file.name} ---`);
      try {
        const fileContent = await file.text();
        const data = JSON.parse(fileContent) as BackupData;

        if (!data || (data.appName && data.appName !== "FacturaFacil")) {
          localMessages.push(`Error: El archivo ${file.name} no parece ser un respaldo válido de FacturaFacil.`);
          continue;
        }

        if (data.companyDetails) {
          if (data.companyDetails.name && data.companyDetails.rif) {
            consolidatedCompanyDetails = { ...data.companyDetails, id: DEFAULT_COMPANY_ID };
            companyUpdatedThisImport = true;
            localMessages.push(`- Detalles de la empresa actualizados desde ${file.name}.`);
          } else {
            localMessages.push(`- Detalles de la empresa en ${file.name} incompletos, omitidos.`);
          }
        }

        if (data.customers && Array.isArray(data.customers)) {
          for (const importedCustomer of data.customers) {
            if (!importedCustomer.rif || !importedCustomer.name) {
              localMessages.push(`- Cliente sin RIF o nombre en ${file.name} omitido.`);
              continue;
            }
            const importedRifClean = importedCustomer.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '');

            const existingCustomerIndex = consolidatedCustomers.findIndex(
              c => c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === importedRifClean
            );

            if (existingCustomerIndex !== -1) {
              const existingCustomer = consolidatedCustomers[existingCustomerIndex];

              existingCustomer.name = importedCustomer.name || existingCustomer.name;
              existingCustomer.address = importedCustomer.address || existingCustomer.address;
              existingCustomer.phone = importedCustomer.phone || existingCustomer.phone;
              existingCustomer.email = importedCustomer.email || existingCustomer.email;
              if (importedCustomer.id && existingCustomer.id !== importedCustomer.id) {
                 localMessages.push(`  - Cliente RIF ${importedCustomer.rif}: ID local ${existingCustomer.id} actualizado a ${importedCustomer.id} desde archivo.`);
                existingCustomer.id = importedCustomer.id;
              }

              existingCustomer.outstandingBalance = (existingCustomer.outstandingBalance || 0) + (importedCustomer.outstandingBalance || 0);
              existingCustomer.creditBalance = (existingCustomer.creditBalance || 0) + (importedCustomer.creditBalance || 0);

              consolidatedCustomers[existingCustomerIndex] = existingCustomer;
              customersMergedCount++;
              localMessages.push(`  - Cliente RIF ${importedCustomer.rif} (${importedCustomer.name}) fusionado. Balances sumados.`);
            } else {
              const newCustId = importedCustomer.id || uuidv4();
              consolidatedCustomers.push({
                ...importedCustomer,
                id: newCustId,
                outstandingBalance: importedCustomer.outstandingBalance || 0,
                creditBalance: importedCustomer.creditBalance || 0,
              });
              customersAddedCount++;
              localMessages.push(`  - Nuevo cliente ${importedCustomer.name} (RIF: ${importedCustomer.rif}) añadido con sus balances.`);
            }
          }
        }

        if (data.invoices && Array.isArray(data.invoices)) {
          for (const importedInvoice of data.invoices) {
            if (!importedInvoice.id || !importedInvoice.invoiceNumber) {
               localMessages.push(`- Factura sin ID o número en ${file.name} omitida.`);
              continue;
            }
            const exists = consolidatedInvoices.some(inv => inv.id === importedInvoice.id);
            if (!exists) {
              consolidatedInvoices.push(importedInvoice);
              invoicesAddedCount++;
              localMessages.push(`  - Factura Nro. ${importedInvoice.invoiceNumber} (ID: ${importedInvoice.id}) añadida.`);
            } else {
              localMessages.push(`  - Factura Nro. ${importedInvoice.invoiceNumber} (ID: ${importedInvoice.id}) ya existe, omitida para evitar duplicados.`);
            }
          }
        }
      } catch (error) {
        console.error(`Error procesando el archivo ${file.name}:`, error);
        localMessages.push(`Error: No se pudo procesar el archivo ${file.name}. ¿Es un JSON válido?`);
      }
    }

    if (companyUpdatedThisImport && consolidatedCompanyDetails) {
        localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, JSON.stringify(consolidatedCompanyDetails));
    } else if (!consolidatedCompanyDetails && companyUpdatedThisImport) {
        localStorage.removeItem(LOCAL_STORAGE_COMPANY_KEY);
    }
    localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(consolidatedCustomers));
    localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify(consolidatedInvoices));

    localStorage.setItem(LOCAL_STORAGE_LAST_IMPORT_TIMESTAMP_KEY, new Date().toISOString());
    localStorage.setItem(LOCAL_STORAGE_LAST_IMPORT_REVERTED_KEY, 'false');
    updateStatusIndicators();

    localMessages.push("--- Resumen de Importación y Fusión ---");
    if (companyUpdatedThisImport) localMessages.push("Información de la empresa actualizada con el último archivo válido.");
    localMessages.push(`${customersAddedCount} cliente(s) nuevo(s) añadido(s).`);
    localMessages.push(`${customersMergedCount} cliente(s) existente(s) fusionado(s)/actualizado(s) (balances sumados).`);
    localMessages.push(`${invoicesAddedCount} factura(s)/nota(s) de crédito nueva(s) añadida(s).`);
    localMessages.push("------------------------------------");
    localMessages.push("Importación y fusión completada. Se recomienda recargar la página para ver todos los cambios.");

    setImportMessages(localMessages);
    setIsImporting(false);
    toast({
      title: "Importación y Fusión Finalizada",
      description: "Los datos han sido procesados. Revise los mensajes para detalles. Recargue la página.",
      duration: 10000,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRevertLastImport = () => {
    if (typeof window === 'undefined' || !canRevertImport) {
        toast({ title: "Error", description: "No hay importación previa para revertir o la acción no está disponible.", variant: "destructive"});
        return;
    }

    const backupCompany = localStorage.getItem(LOCAL_STORAGE_PRE_IMPORT_COMPANY_KEY);
    const backupCustomers = localStorage.getItem(LOCAL_STORAGE_PRE_IMPORT_CUSTOMERS_KEY);
    const backupInvoices = localStorage.getItem(LOCAL_STORAGE_PRE_IMPORT_INVOICES_KEY);

    if (backupCompany === null && backupCustomers === null && backupInvoices === null) {
        toast({ title: "Error", description: "No se encontró un respaldo válido de la importación anterior.", variant: "destructive"});
        return;
    }

    if (backupCompany) localStorage.setItem(LOCAL_STORAGE_COMPANY_KEY, backupCompany);
    else localStorage.removeItem(LOCAL_STORAGE_COMPANY_KEY);

    if (backupCustomers) localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, backupCustomers);
    else localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify([]));

    if (backupInvoices) localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, backupInvoices);
    else localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify([]));

    localStorage.setItem(LOCAL_STORAGE_LAST_IMPORT_REVERTED_KEY, 'true');
    localStorage.removeItem(LOCAL_STORAGE_PRE_IMPORT_COMPANY_KEY);
    localStorage.removeItem(LOCAL_STORAGE_PRE_IMPORT_CUSTOMERS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_PRE_IMPORT_INVOICES_KEY);

    updateStatusIndicators();

    toast({
        title: "Importación Revertida",
        description: "Los datos han sido restaurados al estado previo a la última importación. Se recomienda recargar la página.",
        duration: 7000,
    });
    setImportMessages(["La última importación ha sido revertida."]);
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    try {
      return format(new Date(timestamp), "PPPpp", { locale: es });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <ThemeInitializer /> {/* Ensures theme (dark/light) is set on load */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <SlidersHorizontal className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Ajustes del Entorno</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure la apariencia, modo de visualización, gestione datos, y consulte el manual de usuario.
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
            Cambie el modo de visualización y seleccione una paleta de colores para primario y acento. El fondo de página general y los colores de texto se controlan con el "Modo de Visualización".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Modo de Visualización:</h3>
              <Button onClick={handleToggleUiMode} variant="outline" className="w-full">
                {uiMode === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                Cambiar a Modo {uiMode === 'light' ? 'Oscuro' : 'Claro'}
              </Button>
            </div>
            {currentDisplayColors && (
              <div className="p-3 border rounded-md bg-muted/50">
                <h3 className="font-semibold text-foreground mb-2">Paleta Actual Aplicada: ({activePaletteName || "Desconocido"})</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li><strong>Fondo de Página (Actual):</strong> <code>{currentDisplayColors.actualPageBackground}</code></li>
                  <li><strong>Color Primario:</strong> <code>{currentDisplayColors.primary}</code></li>
                  <li><strong>Color de Acento:</strong> <code>{currentDisplayColors.accent}</code></li>
                </ul>
              </div>
            )}
          </div>

          <div className="p-4 rounded-md bg-accent/10 border border-accent/30 text-foreground">
            <p className="text-sm font-medium">
              Para cambiar la paleta de colores (primario y acento) de la aplicación, seleccione una de las opciones a continuación.
            </p>
             <p className="text-xs mt-1 text-muted-foreground">
              Si desea que una paleta específica sea la predeterminada para todos los usuarios (modificando <code>globals.css</code>), puede solicitarlo al asistente de IA.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mt-6 mb-4 text-lg">Paletas de Colores (Primario y Acento):</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedPalettes.map((palette) => {
                const titleColor = `hsl(${palette.primary})`;
                const cardBgPreview = `hsl(${palette.background})`; // background from palette is for this preview card only
                return (
                  <Card
                    key={palette.name}
                    className={`shadow-md hover:shadow-lg transition-shadow relative overflow-hidden ${activePaletteName === palette.name ? 'border-2 border-primary ring-2 ring-primary' : 'border'}`}
                    style={{ backgroundColor: cardBgPreview }}
                  >
                    {activePaletteName === palette.name && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full z-10">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg" style={{ color: titleColor }}>{palette.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center">
                        <div className="inline-block w-5 h-5 rounded-sm mr-2 border" style={{ backgroundColor: `hsl(${palette.primary})` }} />
                        <div>
                          <span className="font-semibold" style={{color: 'hsl(var(--card-foreground))'}}>Primario:</span>
                          <code className="ml-1 text-xs bg-muted p-1 rounded" style={{color: 'hsl(var(--card-foreground))'}}>{palette.primary}</code>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="inline-block w-5 h-5 rounded-sm mr-2 border" style={{ backgroundColor: `hsl(${palette.background})` }} />
                        <div>
                          <span className="font-semibold" style={{color: 'hsl(var(--card-foreground))'}}>Fondo (muestra):</span>
                          <code className="ml-1 text-xs bg-muted p-1 rounded" style={{color: 'hsl(var(--card-foreground))'}}>{palette.background}</code>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="inline-block w-5 h-5 rounded-sm mr-2 border" style={{ backgroundColor: `hsl(${palette.accent})` }} />
                        <div>
                          <span className="font-semibold" style={{color: 'hsl(var(--card-foreground))'}}>Acento:</span>
                          <code className="ml-1 text-xs bg-muted p-1 rounded" style={{color: 'hsl(var(--card-foreground))'}}>{palette.accent}</code>
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePaletteSelect(palette)}
                        variant="outline"
                        className="w-full mt-4"
                        disabled={activePaletteName === palette.name}
                      >
                        {activePaletteName === palette.name ? "Paleta Activa" : "Aplicar Paleta"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Server className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl text-primary">Gestión de Datos</CardTitle>
          </div>
          <CardDescription>
            Exporte o importe los datos de su aplicación. Es recomendable exportar sus datos actuales antes de una importación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 rounded-md border bg-card text-card-foreground">
                <h3 className="font-semibold text-lg mb-2 text-primary">Estado de Datos</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Última Exportación: <span className="font-medium text-foreground">{formatTimestamp(lastExportTimestamp)}</span></li>
                    <li>Última Importación: <span className="font-medium text-foreground">{formatTimestamp(lastImportTimestamp)}</span></li>
                    <li>
                        Estado Última Importación:
                        <span className={`font-medium ${isLastImportReverted ? 'text-destructive' : 'text-green-600'}`}>
                            {lastImportTimestamp ? (isLastImportReverted ? ' Revertida' : ' Aplicada') : ' N/A'}
                        </span>
                    </li>
                </ul>
            </div>

            <div className="p-4 rounded-md bg-accent/10 border border-accent/30">
                <h3 className="font-semibold text-lg mb-2 text-foreground">Exportar Datos</h3>
                <p className="text-sm text-foreground">
                Haga clic en el botón de abajo para descargar un archivo JSON que contiene la información de su empresa, clientes y todas las facturas y notas de crédito.
                Guarde este archivo en un lugar seguro. Este archivo puede ser usado para restaurar o fusionar datos.
                </p>
                <Button onClick={handleExportData} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground mt-2">
                    <Download className="mr-2 h-4 w-4" /> Exportar Datos de la Aplicación
                </Button>
            </div>

            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30">
                <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
                    <h3 className="font-semibold text-lg text-foreground">Importar y Fusionar Datos (¡Precaución!)</h3>
                </div>
                 <div className="text-sm mb-1 text-foreground">
                    <p>Seleccione uno o más archivos JSON de respaldo (<code>facturafacil_backup_*.json</code>) para importar y fusionar datos en esta instancia del navegador.
                    Esta función está diseñada para consolidar información de múltiples cajas o respaldos.</p>
                </div>
                 <div className="text-xs mb-2 text-foreground">
                    <p><strong>Advertencia Importante:</strong> Esta acción modificará los datos actuales.</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li><strong>RESPALDE PRIMERO:</strong> Siempre exporte sus datos actuales como respaldo antes de proceder con una importación. La importación actual reemplazará el respaldo pre-importación anterior.</li>
                      <li><strong>Clientes:</strong> Si un cliente importado (por RIF) ya existe, sus datos demográficos se actualizarán, y sus saldos (pendiente y a favor) se <strong>sumarán</strong> a los saldos existentes. Los clientes nuevos se añadirán.</li>
                      <li><strong>Facturas/Notas de Crédito:</strong> Las transacciones se añadirán si no existen por ID interno, evitando duplicados exactos.</li>
                      <li><strong>Empresa:</strong> La información de la empresa se tomará del último archivo procesado.</li>
                      <li><strong>Reversión:</strong> Puede revertir la *última* importación si el resultado no es el esperado, usando el botón "Revertir Última Importación".</li>
                    </ul>
                </div>
                <Input
                    type="file"
                    accept=".json"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImportFiles}
                    className="mb-2"
                    disabled={isImporting}
                />
                <Button onClick={handleRevertLastImport} className="w-full sm:w-auto mt-2" variant="outline" disabled={!canRevertImport || isImporting}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Revertir Última Importación
                </Button>
                 {isImporting && <p className="text-sm font-semibold mt-2 text-foreground">Importando y fusionando datos, por favor espere...</p>}
                {importMessages.length > 0 && (
                    <div className="mt-3 p-3 border rounded-md bg-background/50 max-h-60 overflow-y-auto text-xs">
                        <h4 className="font-semibold mb-1 text-foreground">Resultado de la Importación y Fusión:</h4>
                        {importMessages.map((msg, index) => (
                            <p key={index} className="whitespace-pre-wrap text-foreground">{msg}</p>
                        ))}
                    </div>
                )}
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
                  <li><strong><Link href="/returns" className="text-primary hover:underline">Procesar Devolución / Retiro de Saldo</Link> (<Undo className="inline h-4 w-4" />):</strong> Para generar notas de crédito basadas en facturas existentes o procesar retiros de saldo a favor del cliente.</li>
                  <li><strong><Link href="/company" className="text-primary hover:underline">Configuración de Empresa</Link> (<SettingsIcon className="inline h-4 w-4" />):</strong> Para actualizar los datos fiscales de su empresa que aparecen en los documentos.</li>
                  <li><strong><Link href="/settings" className="text-primary hover:underline">Ajustes del Entorno</Link> (<SlidersHorizontal className="inline h-4 w-4" />):</strong> Donde se encuentra ahora, para cambiar modo de visualización, paletas de colores, gestionar datos (exportar/importar/revertir), y este manual.</li>
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
                      <li>El <strong>Saldo Pendiente</strong> se incrementa si un cliente paga menos del total de una factura. Se reduce al registrar abonos.</li>
                      <li>El <strong>Saldo a Favor</strong> se incrementa si un cliente paga más del total de una factura (y se elige abonar a cuenta) o si realiza un depósito directo. Se reduce al usarlo en una compra o al procesar un retiro de saldo.</li>
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
                    <li><strong>Resumen Financiero:</strong> Total Gastado en Tienda, Saldo Pendiente (con botón para pagar), y Saldo a Favor (con botón para retirar). El "Total Gastado" se calcula sumando todas sus facturas (no abonos ni depósitos).</li>
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
                          <li>Si el cliente tiene <strong>Saldo a Favor</strong>, aparecerá como opción. Puede usarlo para cubrir parte o todo el monto de la factura.</li>
                           <li>Si el cliente paga <strong>de más</strong>, puede elegir si el excedente se abona al saldo a favor del cliente (predeterminado) o si se procesa el vuelto inmediatamente (registrando los métodos de pago para el vuelto).</li>
                        </ul>
                      </li>
                      <li>Configure descuento, IVA, mensaje de agradecimiento y notas.</li>
                      <li>Al guardar, se actualizarán los saldos del cliente si el pago fue menor (aumenta Saldo Pendiente) o mayor (aumenta Saldo a Favor, si esa fue la opción), o si se usó Saldo a Favor (reduce Saldo a Favor).</li>
                    </ul>
                  </li>
                  <li><strong>Registrar Abono a Deuda:</strong>
                     <ul className="list-disc pl-5">
                      <li>Se accede desde la lista de clientes (<DollarSign className="inline h-4 w-4" />), el resumen del cliente, o desde el editor de facturas si el cliente seleccionado tiene deuda.</li>
                      <li>El cliente y el monto de la deuda se precargan. El concepto es "Abono a Deuda Pendiente". No se añaden más artículos. IVA y descuento son cero.</li>
                      <li>Ingrese los detalles del pago. Al guardar, el Saldo Pendiente del cliente se reduce.</li>
                    </ul>
                  </li>
                  <li><strong>Registrar Depósito a Cuenta Cliente:</strong>
                    <ul className="list-disc pl-5">
                      <li>Se accede desde el editor de facturas (botón "Registrar Depósito a Cuenta") si hay un cliente seleccionado.</li>
                      <li>El cliente se precarga. El concepto es "Depósito a Cuenta Cliente", con cantidad 1 y precio unitario cero.</li>
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
                  <li>Ver el tipo de documento (con iconos distintivos para abonos/depósitos), cliente, y monto.</li>
                  <li>Hacer clic en el icono del ojo (<Eye className="inline h-4 w-4" />) para ver el detalle completo e imprimir.</li>
                  <li>Para facturas de venta que no sean abonos/depósitos y no tengan nota de crédito, un icono (<Undo className="inline h-4 w-4" />) permite procesar una devolución.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>Procesar Devoluciones y Retiros de Saldo</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>La sección "Procesar Devolución / Retiro de Saldo" (<Undo className="inline h-4 w-4" />) maneja dos escenarios:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong>Devolución de Factura (Nota de Crédito):</strong>
                    <ul className="list-disc pl-5">
                      <li>Acceda desde el <Link href="/invoices" className="text-primary hover:underline">Historial</Link> (<Undo className="inline h-4 w-4" />) o buscando la factura original en "Devoluciones".</li>
                      <li>Se previsualiza la factura original. Especifique los detalles del reembolso.</li>
                      <li>Al confirmar, se genera una Nota de Crédito por el total de la factura original y se guarda en el historial.</li>
                      <li>Si el reembolso se hace a "Crédito a Cuenta Cliente", el saldo a favor del cliente se incrementará. Otros métodos de reembolso no afectan directamente los saldos del cliente aquí.</li>
                    </ul>
                  </li>
                  <li><strong>Retiro de Saldo a Favor:</strong>
                    <ul className="list-disc pl-5">
                      <li>Acceda desde la lista de clientes (<Gift className="inline h-4 w-4" />), el resumen del cliente, o directamente en "Devoluciones" si conoce los datos.</li>
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
                <p>En la sección <Link href="/company" className="text-primary hover:underline">Empresa</Link> (<SettingsIcon className="inline h-4 w-4" />), puede configurar los datos de su negocio que aparecerán en todos los documentos emitidos. Asegúrese de que sean correctos y estén actualizados.</p>
                 <p>También puede subir un logo para su empresa. Este logo aparecerá en la parte superior de las facturas impresas.</p>
              </AccordionContent>
            </AccordionItem>

             <AccordionItem value="item-7">
              <AccordionTrigger>Impresión de Documentos</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>Todos los documentos (facturas, notas de crédito, abonos, depósitos) pueden ser impresos o guardados digitalmente:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Al visualizar un documento, encontrará un botón "Imprimir".</li>
                  <li>Esto abre el diálogo de impresión de su sistema, donde puede seleccionar una impresora física o "Guardar como PDF".</li>
                  <li>El formato está adaptado para impresoras térmicas de recibos (aprox. 78mm de ancho) y también funciona bien en impresoras de página completa.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>Almacenamiento y Gestión de Datos (Exportar/Importar/Revertir)</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                <p>FacturaFacil utiliza el almacenamiento local de su navegador (<code>localStorage</code>) para guardar la configuración de la empresa, lista de clientes, todos los documentos generados, su preferencia de tema de color y modo de visualización.</p>
                <p>En la sección <Link href="/settings" className="text-primary hover:underline">Ajustes del Entorno</Link> (<SlidersHorizontal className="inline h-4 w-4" />) &gt; "Gestión de Datos", encontrará opciones para:</p>
                <ul className="list-disc pl-5">
                    <li><strong className="text-foreground">Exportar Datos:</strong> Descarga un archivo JSON con toda la información de su aplicación. Es crucial para tener copias de seguridad o para transferir/fusionar datos.</li>
                    <li><strong className="text-foreground">Importar y Fusionar Datos:</strong> Permite seleccionar uno o más archivos JSON de respaldo para fusionarlos con los datos existentes.
                        <ul className="list-disc pl-5">
                            <li>La información de la empresa se tomará del último archivo procesado.</li>
                            <li>Los clientes se fusionan por RIF/Cédula: datos demográficos se actualizan y sus saldos (pendiente y a favor) se <strong>suman</strong>. Clientes nuevos se añaden.</li>
                            <li>Las facturas/notas de crédito se añaden si no existen por ID interno.</li>
                        </ul>
                    </li>
                     <li><strong className="text-foreground">Revertir Última Importación:</strong> Si el resultado de una importación no es el esperado, puede usar esta opción para restaurar los datos al estado exacto en que se encontraban *antes* de la última operación de importación. Esta opción solo está disponible para la importación más reciente y si no ha sido ya revertida. Una nueva importación creará un nuevo punto de restauración.</li>
                </ul>
                 <div className="text-xs mb-2 text-foreground">
                    <p><strong>Advertencia Importante:</strong> Esta acción modificará los datos actuales.</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li><strong>RESPALDE PRIMERO:</strong> Siempre exporte sus datos actuales como respaldo antes de proceder con una importación. La importación actual reemplazará el respaldo pre-importación anterior.</li>
                      <li><strong>Clientes:</strong> Si un cliente importado (por RIF) ya existe, sus datos demográficos se actualizarán, y sus saldos (pendiente y a favor) se <strong>sumarán</strong> a los saldos existentes. Los clientes nuevos se añadirán.</li>
                      <li><strong>Facturas/Notas de Crédito:</strong> Las transacciones se añadirán si no existen por ID interno, evitando duplicados exactos.</li>
                      <li><strong>Empresa:</strong> La información de la empresa se tomará del último archivo procesado.</li>
                      <li><strong>Reversión:</strong> Puede revertir la *última* importación si el resultado no es el esperado, usando el botón "Revertir Última Importación".</li>
                    </ul>
                 </div>
                <p className="font-semibold text-destructive mt-2">Consideraciones Clave del Almacenamiento Local:</p>
                <ul className="list-disc pl-5">
                  <li>Los datos se guardan <strong>exclusivamente en el navegador y dispositivo</strong> que está utilizando.</li>
                  <li>Si limpia la caché o datos de navegación, <strong>perderá toda la información</strong> (a menos que tenga una copia exportada).</li>
                  <li>Se recomienda <strong>realizar exportaciones periódicas</strong> de sus datos y guardarlas en un lugar seguro, especialmente si opera en múltiples cajas.</li>
                  <li>Tras una importación o reversión, se recomienda recargar la aplicación para asegurar que todos los cambios se reflejen correctamente.</li>
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
            <span className="text-muted-foreground">1.6.0 (Modo Claro/Oscuro y Mejoras de UI)</span>
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
