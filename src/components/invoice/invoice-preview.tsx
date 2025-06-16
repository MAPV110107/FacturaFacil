
"use client";

import type { Invoice, InvoiceItem, CompanyDetails, CustomerDetails, PaymentDetails } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { SENIAT_TEXT, CURRENCY_SYMBOL, FISCAL_PRINTER_LINE_WIDTH } from "@/lib/constants";
import React from "react";

interface InvoicePreviewProps {
  invoice: Partial<Invoice>; 
  companyDetails: CompanyDetails | null;
  className?: string;
}

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL} 0.00`;
  return `${CURRENCY_SYMBOL} ${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

const formatLine = (left: string, right: string, width: number = FISCAL_PRINTER_LINE_WIDTH): string => {
  const spaces = Math.max(0, width - left.length - right.length);
  return `${left}${' '.repeat(spaces)}${right}`;
};

const DottedLine = () => <div className="border-t border-dashed border-foreground my-1"></div>;

export function InvoicePreview({ invoice, companyDetails, className }: InvoicePreviewProps) {
  
  const handlePrint = () => {
    window.print();
  };

  const c = companyDetails;
  const cust = invoice.customerDetails;
  const items = invoice.items || [];
  const payments = invoice.paymentMethods || [];

  const actualInvoiceDate = invoice.date ? new Date(invoice.date) : new Date();
  const subTotal = invoice.subTotal ?? 0;
  const discountAmount = invoice.discountAmount ?? 0;
  const taxAmount = invoice.taxAmount ?? 0;
  const totalAmount = invoice.totalAmount ?? 0;
  const taxRate = invoice.taxRate ?? 0;

  const taxableBase = subTotal - discountAmount;

  return (
    <Card className={`w-full max-w-md mx-auto shadow-xl print-receipt ${className}`} data-invoice-preview-container>
      <CardContent className="p-4 receipt-font text-xs">
        <div className="text-center mb-1">
          <p className="font-bold text-lg my-1">{SENIAT_TEXT}</p>
        </div>
        <DottedLine />

        <div className="text-center my-2">
          {c?.logoUrl && c.logoUrl !== 'https://placehold.co/150x50.png' && (
            <img src={c.logoUrl} alt={`${c.name} logo`} className="max-h-12 mx-auto mb-2 object-contain print-only" data-ai-hint="company logo"/>
          )}
          <p className="font-bold text-sm">{c?.name || "Nombre de Empresa"}</p>
          <p>RIF: {c?.rif || "J-00000000-0"}</p>
          <p className="truncate" title={c?.address}>{c?.address || "Dirección de la Empresa"}</p>
          {c?.phone && <p>Telf: {c.phone}</p>}
        </div>

        <DottedLine />

        <div className="mb-2">
          <p>{formatLine("FACTURA NRO:", invoice.invoiceNumber || "S/N")}</p>
          <p>{formatLine("FECHA:", actualInvoiceDate.toLocaleDateString('es-VE'))}</p>
          <p>{formatLine("HORA:", actualInvoiceDate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }))}</p>
          {invoice.cashierNumber && <p>{formatLine("CAJA NRO:", invoice.cashierNumber)}</p>}
          {invoice.salesperson && <p>{formatLine("VENDEDOR:", invoice.salesperson)}</p>}
        </div>
        
        <DottedLine />

        <div className="mb-2">
          <p className="font-semibold">CLIENTE:</p>
          <p>{cust?.name || "Consumidor Final"}</p>
          <p>RIF/CI: {cust?.rif || "V-00000000-0"}</p>
          <p className="truncate" title={cust?.address}>{cust?.address || "N/A"}</p>
        </div>

        <DottedLine />

        <div className="mb-1">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-x-1 font-semibold border-b border-dashed pb-0.5 mb-0.5">
            <div className="text-left">Descrip.</div>
            <div className="text-right">Cant.</div>
            <div className="text-right">P.Unit</div>
            <div className="text-right">Total</div>
          </div>
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-x-1 leading-tight">
              <div className="text-left truncate">{item.description}</div>
              <div className="text-right">{item.quantity.toFixed(2)}</div>
              <div className="text-right">{item.unitPrice.toFixed(2)}</div>
              <div className="text-right">{(item.quantity * item.unitPrice).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <DottedLine />

        <div className="mt-2 space-y-0.5">
          <p className="font-semibold">{formatLine("SUBTOTAL:", formatCurrency(subTotal))}</p>
          {discountAmount > 0 && (
            <p>{formatLine("DESCUENTO:", `-${formatCurrency(discountAmount)}`)}</p>
          )}
           {taxAmount > 0 && (
            <p>{formatLine(`BASE IMPONIBLE:`, formatCurrency(taxableBase))}</p>
          )}
          {taxAmount > 0 && (
            <p>{formatLine(`IVA (${(taxRate * 100).toFixed(0)}%):`, formatCurrency(taxAmount))}</p>
          )}
          <p className="font-bold text-sm">{formatLine("TOTAL A PAGAR:", formatCurrency(totalAmount))}</p>
        </div>
        
        {(payments.length > 0 || (invoice.amountPaid ?? 0) > 0) && <DottedLine />}
        
        {payments.length > 0 && (
          <div className="mt-2 space-y-0.5">
            <p className="font-semibold">FORMA DE PAGO:</p>
            {payments.map((p, idx) => (
              <p key={idx}>{formatLine(p.method.toUpperCase() + (p.reference ? ` (${p.reference})` : ''), formatCurrency(p.amount))}</p>
            ))}
          </div>
        )}
         {(invoice.amountPaid ?? 0) > 0 && !payments.length && ( 
            <div className="mt-2 space-y-0.5">
                 <p className="font-semibold">{formatLine("TOTAL PAGADO:", formatCurrency(invoice.amountPaid))}</p>
            </div>
        )}

        { (invoice.amountDue ?? 0) > 0 && (
            <div className="mt-1">
                 <p className="font-semibold">{formatLine("MONTO PENDIENTE:", formatCurrency(invoice.amountDue))}</p>
            </div>
        )}

        <DottedLine />

        <div className="text-center mt-3">
          <p>{invoice.thankYouMessage || "¡Gracias por su compra!"}</p>
          {invoice.notes && <p className="text-xs italic mt-1">{invoice.notes}</p>}
        </div>

      </CardContent>
      <div className="p-4 border-t no-print flex justify-end">
        <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Factura
        </Button>
      </div>
    </Card>
  );
}
