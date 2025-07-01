
"use client";
import { Button } from "@/components/ui/button";
import { Printer, FileText as FileTextIcon, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { printFromElementId } from "@/lib/print";
import { printToFiscalPrinter } from "@/lib/fiscal-print";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, CompanyDetails } from "@/lib/types";
import FiscalPrinterStatus from "./FiscalPrinterStatus";

interface FacturaPrintControlsProps {
  invoiceData?: Partial<Invoice>;
  containerId: string;
  companyDetails?: CompanyDetails | null;
  isSavedInvoice?: boolean;
}

export default function FacturaPrintControls({ invoiceData, containerId, companyDetails, isSavedInvoice = false }: FacturaPrintControlsProps) {
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
    if (!invoiceData || !isSavedInvoice) {
      toast({ variant: "destructive", title: "Factura no guardada", description: "Debe guardar la factura antes de enviarla a la impresora fiscal." });
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
         <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
            <p className="text-sm font-medium text-foreground">Estado Impresora Fiscal</p>
            <FiscalPrinterStatus />
        </div>
      )}

      {companyDetails?.fiscalPrinterEnabled && (
        <Button
          variant="default"
          onClick={handleFiscalPrint}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={!isSavedInvoice}
          title={!isSavedInvoice ? "Guarde la factura para habilitar la impresión fiscal" : "Imprimir en impresora fiscal"}
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Fiscal
        </Button>
      )}
      
      <Button
        variant={"outline"}
        onClick={() => printFromElementId(containerId)}
        className="w-full"
        disabled={!isSavedInvoice}
        title={!isSavedInvoice ? "Guarde la factura para imprimir en A4" : "Imprimir en A4"}
      >
        <FileTextIcon className="mr-2 h-4 w-4" />
        Imprimir en A4
      </Button>

      <Button onClick={handleCompareFormats} variant="outline" className="w-full mt-2">
        <Eye className="mr-2 h-4 w-4" />
        Comparar Formatos de Impresión
      </Button>
    </div>
  );
}
