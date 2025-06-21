
"use client";
import { Button } from "@/components/ui/button";
import { Printer, FileText as FileTextIcon, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { printFromElementId } from "@/lib/print";

interface FacturaPrintControlsProps {
  invoiceData?: any;
  containerId: string;
}

export default function FacturaPrintControls({ invoiceData, containerId }: FacturaPrintControlsProps) {
  const router = useRouter();

  const handleCompareFormats = () => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      localStorage.setItem('invoiceComparisonData', JSON.stringify(invoiceData));
    } else {
      localStorage.removeItem('invoiceComparisonData'); 
    }
    router.push('/print-preview-formats');
  };
  
  return (
    <div className="flex flex-col gap-2 mt-2 print-controls-container w-full">
      <Button
        variant={"outline"}
        onClick={() => printFromElementId(containerId, "a4")}
        className="w-full"
      >
        <FileTextIcon className="mr-2 h-4 w-4" />
        Imprimir en A4
      </Button>

      <Button
        variant={"default"}
        onClick={() => printFromElementId(containerId, "80mm")}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir en Rollo
      </Button>
      
      <Button onClick={handleCompareFormats} variant="outline" className="w-full mt-2">
        <Eye className="mr-2 h-4 w-4" />
        Comparar Formatos de Impresión
      </Button>
    </div>
  );
}
