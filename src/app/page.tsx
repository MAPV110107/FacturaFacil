
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import FacturaPrintControls from "@/components/FacturaPrintControls";
import type { Invoice, CompanyDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID, TAX_RATE } from "@/lib/types";
import useLocalStorage from "@/hooks/use-local-storage";
import { useEffect, useState } from "react";

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
    { method: "Tarjeta de Débito", amount: 146.00 + ( (346.00 * TAX_RATE) - ( (346.00 * TAX_RATE) % 0.01 ) ) , reference: "Ref 456789" }, // Adjusted to match calculated total
  ],
  subTotal: 346.00,
  discountValue: 0,
  discountPercentage: 0,
  taxRate: TAX_RATE,
  taxAmount: 346.00 * TAX_RATE,
  totalAmount: 346.00 * (1 + TAX_RATE),
  amountPaid: (346.00 * (1 + TAX_RATE)) - ((346.00 * (1 + TAX_RATE)) % 0.01), // Ensure amountPaid matches totalAmount or slightly less due to rounding
  amountDue: 0,
  thankYouMessage: "Gracias por revisar esta factura de muestra.",
  notes: "Esta es una factura de demostración para pruebas de impresión.",
};

export default function Page() {
  const [companyData, setCompanyData] = useLocalStorage<CompanyDetails>("companyDetails", defaultCompany);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!companyData?.name) { // If no company data in local storage, use default
        setCompanyData(defaultCompany);
    }
  }, [companyData, setCompanyData]);

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        Cargando página de muestra...
      </div>
    );
  }
  
  // Recalculate totals for the preview based on items and taxRate from sampleInvoiceData
  const itemsSubtotal = sampleInvoiceData.items?.reduce((acc, item) => acc + item.totalPrice, 0) || 0;
  const tax = itemsSubtotal * (sampleInvoiceData.taxRate || 0);
  const total = itemsSubtotal + tax;

  const previewableInvoice: Invoice = {
    ...sampleInvoiceData,
    id: sampleInvoiceData.id || "sample-id",
    invoiceNumber: sampleInvoiceData.invoiceNumber || "SAMPLE-001",
    date: sampleInvoiceData.date || new Date().toISOString(),
    type: sampleInvoiceData.type || 'sale',
    companyDetails: companyData || defaultCompany,
    customerDetails: sampleInvoiceData.customerDetails || {id: "default-cust", name: "Cliente", rif: "J-000", address:"Direccion", outstandingBalance:0, creditBalance:0},
    items: sampleInvoiceData.items || [],
    paymentMethods: sampleInvoiceData.paymentMethods || [],
    subTotal: itemsSubtotal,
    taxRate: sampleInvoiceData.taxRate || 0,
    taxAmount: tax,
    totalAmount: total,
    amountPaid: total, 
    amountDue: 0,
    thankYouMessage: sampleInvoiceData.thankYouMessage || "Gracias",
  };


  return (
    <div className="p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6 flex justify-start">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-4 text-primary text-center">Factura de Muestra (Para Prueba de Impresión)</h1>
      
      {/* The InvoicePreview component itself will be the target for html2pdf */}
      <InvoicePreview 
        id="factura" 
        invoice={previewableInvoice} 
        companyDetails={companyData || defaultCompany} 
      />

      <div className="mt-8 flex justify-center print-controls-container">
        <FacturaPrintControls />
      </div>
    </div>
  );
}
