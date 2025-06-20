
"use client";
// No static import of html2pdf here
import { useState } from "react";
import { Button } from "@/components/ui/button"; 
import { Printer, FileText } from "lucide-react";

export default function FacturaPrintControls() {
  const [formato, setFormato] = useState<"a4" | "80mm">("a4");
  const [isPrinting, setIsPrinting] = useState(false);

  const printFactura = async (printFormato: "a4" | "80mm") => { 
    const element = document.getElementById("factura");
    if (!element) {
      console.error("Elemento #factura no encontrado.");
      alert("Error: No se encontró el contenido de la factura para imprimir.");
      return;
    }

    setIsPrinting(true);
    setFormato(printFormato); // Set format right before printing

    const pdfClass = printFormato === "80mm" ? "printing-80mm" : "printing-a4";
    document.documentElement.classList.add(pdfClass);

    try {
      // Dynamically import html2pdf.js
      const { default: html2pdf } = await import('html2pdf.js');

      const commonOptions = {
        filename: `factura_${printFormato}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: printFormato === "a4" ? 2 : 3, 
          logging: true,
          useCORS: true,
          scrollX: 0,
          scrollY: -window.scrollY,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any[] }
      };

      let specificOptions;

      if (printFormato === "a4") {
        specificOptions = {
          margin: [10, 10, 10, 10], 
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
          }
        };
      } else { // 80mm
        specificOptions = {
          margin: [2, 2, 2, 2], 
          jsPDF: {
            unit: "mm",
            format: [80, 297], 
            orientation: "portrait"
          }
        };
      }

      const options = { ...commonOptions, ...specificOptions };
      
      await new Promise(resolve => setTimeout(resolve, 100));

      await html2pdf().from(element).set(options).save();

    } catch (error) {
      console.error("Error al cargar o generar el PDF:", error);
      alert("Hubo un error al generar el PDF. Revise la consola para más detalles.");
    } finally {
      document.documentElement.classList.remove(pdfClass);
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 mt-2 print-controls-container">
      <Button
        variant={formato === "a4" && isPrinting ? "secondary" : "outline"}
        onClick={() => printFactura("a4")}
        disabled={isPrinting}
        className="w-full sm:w-auto"
      >
        <FileText className="mr-2 h-4 w-4" />
        {isPrinting && formato === "a4" ? "Generando A4..." : "Imprimir en A4"}
      </Button>

      <Button
        variant={formato === "80mm" && isPrinting ? "secondary" : "default"}
        onClick={() => printFactura("80mm")}
        disabled={isPrinting}
        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white data-[variant=outline]:bg-transparent data-[variant=outline]:text-green-600 data-[variant=outline]:border-green-600"
      >
        <Printer className="mr-2 h-4 w-4" />
        {isPrinting && formato === "80mm" ? "Generando Rollo..." : "Imprimir en Rollo"}
      </Button>
    </div>
  );
}
