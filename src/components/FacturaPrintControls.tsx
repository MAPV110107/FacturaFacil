
"use client";
import { Button } from "@/components/ui/button";
import { Printer, FileText as FileTextIcon, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { printFromElementId } from "@/lib/print";
import { printToFiscalPrinter } from "@/lib/fiscal-print";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, CompanyDetails } from "@/lib/types";

interface FacturaPrintControlsProps {
  invoiceData?: Partial<Invoice>;
  containerId: string;
  companyDetails?: CompanyDetails | null;
}

export default function FacturaPrintControls({ invoiceData, containerId, companyDetails }: FacturaPrintControlsProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleCompareFormats = () => {
    if (invoiceData && Object.keys(invoiceData).length > 0) {
      localStorage.setItem('invoiceComparisonData', JSON.stringify(invoiceData));
    } else {
      localStorage.removeItem('invoiceComparisonData'); 
    }
    router.push('/print-preview-formats');
  };

  const handleFiscalPrint = async () => {
    if (!companyDetails?.fiscalPrinterEnabled || !companyDetails.fiscalPrinterApiUrl) {
      toast({ variant: "destructive", title: "Impresora Fiscal no configurada", description: "Habilite y configure la URL de la impresora fiscal en los ajustes de la empresa." });
      return;
    }
    if (!invoiceData || Object.keys(invoiceData).length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay datos de factura para enviar." });
      return;
    }

    toast({ title: "Enviando a Impresora Fiscal...", description: `Enviando documento a ${companyDetails.fiscalPrinterApiUrl}` });
    const result = await printToFiscalPrinter(invoiceData as Invoice, companyDetails.fiscalPrinterApiUrl);

    if (result.success) {
      toast({ title: "Éxito", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Error de Impresión Fiscal", description: result.message });
    }
  };
  
  return (
    <div className="flex flex-col gap-2 mt-2 print-controls-container w-full">
      {companyDetails?.fiscalPrinterEnabled && (
        <Button
          variant={"default"}
          onClick={handleFiscalPrint}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Fiscal
        </Button>
      )}
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
