
"use client";
// No static import of html2pdf here
import { useState } from "react";
import { Button } from "@/components/ui/button"; // Using ShadCN Button for consistency
import { Printer, FileText } from "lucide-react";

export default function FacturaPrintControls() {
  const [formato, setFormato] = useState<"a4" | "80mm">("a4");
  const [isPrinting, setIsPrinting] = useState(false);

  const printFactura = async () => { // Made async
    const element = document.getElementById("factura");
    if (!element) {
      console.error("Elemento #factura no encontrado.");
      alert("Error: No se encontró el contenido de la factura para imprimir.");
      return;
    }

    setIsPrinting(true);

    try {
      // Dynamically import html2pdf.js
      const { default: html2pdf } = await import('html2pdf.js');

      const commonOptions = {
        filename: `factura_${formato}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          logging: true,
          useCORS: true,
          scrollX: 0,
          scrollY: -window.scrollY
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any[] }
      };

      let specificOptions;

      if (formato === "a4") {
        specificOptions = {
          margin: [10, 10, 10, 10], // top, left, bottom, right in mm
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
          }
        };
      } else { // 80mm
        specificOptions = {
          margin: [2, 2, 2, 2], // Minimal margin for thermal printers
          jsPDF: {
            unit: "mm",
            format: [80, 297], // Width 80mm, height can be auto or a large value like 297 (A4 height)
            orientation: "portrait"
          }
        };
      }

      const options = { ...commonOptions, ...specificOptions };

      // html2pdf().set().from().save() returns a Promise
      await html2pdf().from(element).set(options).save();

    } catch (error) {
      console.error("Error al cargar o generar el PDF:", error);
      alert("Hubo un error al generar el PDF. Revise la consola para más detalles.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-4 p-4 border rounded-lg shadow items-center bg-card print-controls-container">
      <Button
        variant={formato === "a4" ? "default" : "outline"}
        onClick={() => { setFormato("a4"); printFactura(); }}
        disabled={isPrinting}
        className="w-full sm:w-auto"
      >
        <FileText className="mr-2 h-4 w-4" />
        {isPrinting && formato === "a4" ? "Generando A4..." : "Imprimir en A4"}
      </Button>

      <Button
        variant={formato === "80mm" ? "default" : "outline"}
        onClick={() => { setFormato("80mm"); printFactura(); }}
        disabled={isPrinting}
        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white data-[variant=outline]:bg-transparent data-[variant=outline]:text-green-600 data-[variant=outline]:border-green-600"
      >
        <Printer className="mr-2 h-4 w-4" />
        {isPrinting && formato === "80mm" ? "Generando 80mm..." : "Imprimir en 80mm"}
      </Button>
    </div>
  );
}
