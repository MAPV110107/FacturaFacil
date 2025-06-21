
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileText as FileTextIcon, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface FacturaPrintControlsProps {
  invoiceData?: any; // Data of the current invoice for comparison page
  containerId: string; // The ID of the InvoicePreview container to print
}

export default function FacturaPrintControls({ invoiceData, containerId }: FacturaPrintControlsProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const router = useRouter();

  const printFactura = (printFormato: "a4" | "80mm") => {
    if (typeof window === 'undefined' || isPrinting) return;
    setIsPrinting(true);

    const invoiceElement = document.getElementById(containerId);
    if (!invoiceElement) {
        console.error("Print Error: Could not find the invoice element with ID:", containerId);
        setIsPrinting(false);
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("No se pudo abrir la ventana de impresión. Por favor, deshabilite el bloqueador de pop-ups para este sitio.");
      setIsPrinting(false);
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');
    
    const invoiceHTML = invoiceElement.innerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Factura</title>
          ${styles}
        </head>
        <body>
          ${invoiceHTML}
        </body>
      </html>
    `);

    printWindow.document.documentElement.classList.add(printFormato === '80mm' ? 'printing-80mm' : 'printing-a4');
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.error("Error during printing:", e);
        } finally {
          printWindow.close();
          setIsPrinting(false);
        }
      }, 500); // A generous timeout to ensure all styles and fonts are applied
    };
  };


  const handleCompareFormats = () => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      localStorage.setItem('invoiceComparisonData', JSON.stringify(invoiceData));
      router.push('/print-preview-formats');
    } else {
      localStorage.removeItem('invoiceComparisonData'); 
      router.push('/print-preview-formats');
    }
  };
  
  return (
    <div className="flex flex-col gap-2 mt-2 print-controls-container w-full">
      <Button
        variant={"outline"}
        onClick={() => printFactura("a4")}
        disabled={isPrinting}
        className="w-full"
      >
        <FileTextIcon className="mr-2 h-4 w-4" />
        {isPrinting ? "Preparando A4..." : "Imprimir en A4"}
      </Button>

      <Button
        variant={"default"}
        onClick={() => printFactura("80mm")}
        disabled={isPrinting}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Printer className="mr-2 h-4 w-4" />
        {isPrinting ? "Preparando Rollo..." : "Imprimir en Rollo"}
      </Button>
      
      <Button onClick={handleCompareFormats} variant="outline" className="w-full mt-2">
        <Eye className="mr-2 h-4 w-4" />
        Comparar Formatos de Impresión
      </Button>
    </div>
  );
}
