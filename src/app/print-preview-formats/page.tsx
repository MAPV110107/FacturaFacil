
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard } from "lucide-react"; // FileText as FileTextIcon removed as it's not used directly here
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import type { Invoice, CompanyDetails, CustomerDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types"; 
import { TAX_RATE } from "@/lib/constants";
import useLocalStorage from "@/hooks/use-local-storage";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const defaultCompany: CompanyDetails = {
  id: DEFAULT_COMPANY_ID,
  name: "Su Empresa Aquí C.A.",
  rif: "J-00000000-0",
  address: "Av. Ejemplo, Edif. Modelo, Piso 1, Ciudad",
  phone: "0212-123-4567",
  logoUrl: "https://placehold.co/200x100.png",
  logoAlignment: "center",
};

const sampleInvoiceData: Partial<Invoice> = {
  id: "sample-inv-123",
  invoiceNumber: "FACT-MUESTRA-001",
  date: new Date().toISOString(),
  type: 'sale',
  status: 'active',
  customerDetails: {
    id: "cust-sample-456",
    name: "Cliente de Muestra S.A.",
    rif: "J-01234567-8",
    address: "Av. Ficticia 123, Edif. Prueba, Apto. 1, Ciudad Ejemplo",
    phone: "0212-555-1234",
    email: "cliente.muestra@example.com",
    outstandingBalance: 0,
    creditBalance: 0,
  },
  items: [
    { id: "item-1", description: "Producto de Ejemplo Alfa", quantity: 2, unitPrice: 75.50, totalPrice: 151.00 },
    { id: "item-2", description: "Servicio de Muestra Beta con Texto Más Largo para Probar Ajuste", quantity: 1, unitPrice: 120.00, totalPrice: 120.00 },
    { id: "item-3", description: "Otro Artículo Gamma", quantity: 3, unitPrice: 25.00, totalPrice: 75.00 },
  ],
  paymentMethods: [
    { method: "Efectivo", amount: 200.00, reference: "" },
    { method: "Tarjeta de Débito", amount: 146.00 + ( (346.00 * TAX_RATE) - ( (346.00 * TAX_RATE) % 0.01 ) ) , reference: "Ref 456789" },
  ],
  subTotal: 346.00,
  discountValue: 0,
  discountPercentage: 0,
  taxRate: TAX_RATE,
  taxAmount: 346.00 * TAX_RATE,
  totalAmount: 346.00 * (1 + TAX_RATE),
  amountPaid: (346.00 * (1 + TAX_RATE)) - ((346.00 * (1 + TAX_RATE)) % 0.01),
  amountDue: 0,
  thankYouMessage: "Gracias por revisar esta factura de muestra.",
  notes: "Esta es una factura de demostración para pruebas de impresión.",
};

export default function GeneralPrintPreviewPage() {
  const [companyData, setCompanyData] = useLocalStorage<CompanyDetails>("companyDetails", defaultCompany);
  const [invoiceToPreview, setInvoiceToPreview] = useState<Partial<Invoice>>(sampleInvoiceData);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedInvoiceData = localStorage.getItem('invoiceComparisonData');
      if (storedInvoiceData) {
        try {
          const parsedData = JSON.parse(storedInvoiceData);
          const itemsSubtotal = parsedData.items?.reduce((acc:number, item:any) => acc + (item.totalPrice || (item.quantity * item.unitPrice)), 0) || 0;
          const tax = itemsSubtotal * (parsedData.taxRate || TAX_RATE); // Use parsed taxRate or default
          const total = itemsSubtotal + tax - (parsedData.discountValue || 0);

          setInvoiceToPreview({
            ...parsedData,
            date: parsedData.date || new Date().toISOString(),
            subTotal: itemsSubtotal,
            taxAmount: tax,
            totalAmount: total,
            amountPaid: parsedData.amountPaid !== undefined ? parsedData.amountPaid : total,
            amountDue: parsedData.amountDue !== undefined ? parsedData.amountDue : 0,
          });
          // Do not remove 'invoiceComparisonData' from localStorage here,
          // it will be overwritten when "Comparar Formatos" is clicked again.
        } catch (error) {
          console.error("Error parsing invoice data from localStorage:", error);
          // Fallback to sample data if parsing fails
          const itemsSubtotal = sampleInvoiceData.items?.reduce((acc, item) => acc + item.totalPrice, 0) || 0;
          const tax = itemsSubtotal * (sampleInvoiceData.taxRate || TAX_RATE);
          const total = itemsSubtotal + tax - (sampleInvoiceData.discountValue || 0);
          setInvoiceToPreview({
              ...sampleInvoiceData,
              date: sampleInvoiceData.date || new Date().toISOString(),
              subTotal: itemsSubtotal,
              taxAmount: tax,
              totalAmount: total,
              amountPaid: sampleInvoiceData.amountPaid !== undefined ? sampleInvoiceData.amountPaid : total,
              amountDue: sampleInvoiceData.amountDue !== undefined ? sampleInvoiceData.amountDue : 0,
          });
        }
      } else {
        // Fallback to sample data if nothing in localStorage
        const itemsSubtotal = sampleInvoiceData.items?.reduce((acc, item) => acc + item.totalPrice, 0) || 0;
        const tax = itemsSubtotal * (sampleInvoiceData.taxRate || TAX_RATE);
        const total = itemsSubtotal + tax - (sampleInvoiceData.discountValue || 0);
        setInvoiceToPreview({
            ...sampleInvoiceData,
            date: sampleInvoiceData.date || new Date().toISOString(),
            subTotal: itemsSubtotal,
            taxAmount: tax,
            totalAmount: total,
            amountPaid: sampleInvoiceData.amountPaid !== undefined ? sampleInvoiceData.amountPaid : total,
            amountDue: sampleInvoiceData.amountDue !== undefined ? sampleInvoiceData.amountDue : 0,
        });
      }
    }
    if (isClient && !companyData?.name) { 
        setCompanyData(defaultCompany);
    }
  }, [isClient, companyData, setCompanyData]); 


  if (!isClient || !invoiceToPreview.customerDetails) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        Cargando vista previa general de impresión...
      </div>
    );
  }
  
  // Ensure the invoice object passed to InvoicePreview is complete as per Invoice type
  const finalInvoiceForPreview: Invoice = {
    id: invoiceToPreview.id || "preview-id",
    invoiceNumber: invoiceToPreview.invoiceNumber || "PREVIEW-001",
    date: invoiceToPreview.date || new Date().toISOString(),
    type: invoiceToPreview.type || 'sale',
    status: invoiceToPreview.status || 'active',
    companyDetails: companyData || defaultCompany, 
    customerDetails: invoiceToPreview.customerDetails as CustomerDetails, 
    items: invoiceToPreview.items || [],
    paymentMethods: invoiceToPreview.paymentMethods || [],
    subTotal: invoiceToPreview.subTotal || 0,
    taxRate: invoiceToPreview.taxRate || TAX_RATE,
    taxAmount: invoiceToPreview.taxAmount || 0,
    totalAmount: invoiceToPreview.totalAmount || 0,
    amountPaid: invoiceToPreview.amountPaid || 0,
    amountDue: invoiceToPreview.amountDue || 0,
    thankYouMessage: invoiceToPreview.thankYouMessage || "Gracias",
    discountPercentage: invoiceToPreview.discountPercentage,
    discountValue: invoiceToPreview.discountValue,
    cashierNumber: invoiceToPreview.cashierNumber,
    salesperson: invoiceToPreview.salesperson,
    notes: invoiceToPreview.notes,
    warrantyText: invoiceToPreview.warrantyText,
    overpaymentAmount: invoiceToPreview.overpaymentAmount,
    overpaymentHandling: invoiceToPreview.overpaymentHandling,
    changeRefundPaymentMethods: invoiceToPreview.changeRefundPaymentMethods,
    isDebtPayment: invoiceToPreview.isDebtPayment,
    isCreditDeposit: invoiceToPreview.isCreditDeposit,
    originalInvoiceId: invoiceToPreview.originalInvoiceId,
  };


  return (
    <div className="p-4 flex flex-col items-center min-h-screen bg-muted/40 no-print">
      <div className="w-full max-w-7xl mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button variant="outline" asChild>
            <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Ir al Dashboard
            </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-8 text-primary text-center">Vista Previa General de Formatos de Impresión</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
        <div>
          <h2 className="text-xl font-semibold mb-2 text-center text-muted-foreground">Formato A4 (Referencia)</h2>
          <div className="preview-a4-wrapper">
            <InvoicePreview 
              invoice={finalInvoiceForPreview} 
              companyDetails={companyData || defaultCompany}
              isSavedInvoice={false} // No print controls here, just visual comparison
              invoiceStatus={finalInvoiceForPreview.status}
              id="invoice-comparison-a4" // Unique ID for this instance
              className="a4-preview-styling" 
            />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2 text-center text-muted-foreground">Formato Rollo (Referencia)</h2>
          <div className="preview-80mm-wrapper">
            <InvoicePreview 
              invoice={finalInvoiceForPreview} 
              companyDetails={companyData || defaultCompany} 
              isSavedInvoice={false} // No print controls here, just visual comparison
              invoiceStatus={finalInvoiceForPreview.status}
              id="invoice-comparison-80mm" // Unique ID for this instance
              className="thermal-preview-styling" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
