
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

  const printFactura = async (printFormato: "a4" | "80mm") => {
    if (typeof window === 'undefined') return;
    setIsPrinting(true);

    const printClassName = printFormato === "80mm" ? "printing-80mm" : "printing-a4";
    const elementToPrint = document.getElementById(containerId);

    if (!elementToPrint) {
        console.error("Print Error: Could not find element with ID:", containerId);
        setIsPrinting(false);
        return;
    }

    document.documentElement.classList.add(printClassName);
    elementToPrint.classList.add('print-this-one');

    // Allow a brief moment for styles to apply before triggering print
    await new Promise(resolve => setTimeout(resolve, 300));

    window.print();

    // Cleanup: remove the class after printing dialog is closed or print job sent
    setTimeout(() => {
      document.documentElement.classList.remove(printClassName);
      elementToPrint.classList.remove('print-this-one');
      setIsPrinting(false);
    }, 500); // Adjust timeout if needed
  };

  const handleCompareFormats = () => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      localStorage.setItem('invoiceComparisonData', JSON.stringify(invoiceData));
      router.push('/print-preview-formats');
    } else {
      // If no specific invoice data, still go to comparison page (it will use sample data)
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
