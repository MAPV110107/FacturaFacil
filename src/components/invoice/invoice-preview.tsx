
"use client";

import type { Invoice, InvoiceItem, CompanyDetails, CustomerDetails, PaymentDetails } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { SENIAT_TEXT, CURRENCY_SYMBOL, FISCAL_PRINTER_LINE_WIDTH } from "@/lib/constants";
import React from "react";
import { cn } from "@/lib/utils";

interface InvoicePreviewProps {
  invoice: Partial<Invoice>; 
  companyDetails: CompanyDetails | null;
  className?: string;
}

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL} 0.00`;
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
};

const formatLine = (left: string, right: string, width: number = FISCAL_PRINTER_LINE_WIDTH): string => {
  const sanitizedLeft = String(left || "").slice(0, width - Math.max(0, String(right || "").length) -1);
  const sanitizedRight = String(right || "");
  const spaces = Math.max(0, width - sanitizedLeft.length - sanitizedRight.length);
  return `${sanitizedLeft}${' '.repeat(spaces)}${sanitizedRight}`;
};

const DottedLine = () => <hr className="DottedLine border-t border-dashed border-foreground my-1" />;

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
  const discountValue = invoice.discountValue ?? 0;
  const discountPercentage = invoice.discountPercentage ?? 0;
  const taxAmount = invoice.taxAmount ?? 0;
  const totalAmount = invoice.totalAmount ?? 0;
  const taxRate = invoice.taxRate ?? 0;
  const amountPaid = invoice.amountPaid ?? 0;
  
  const finalAmountDueForDisplay = invoice.amountDue ?? 0;

  const taxableBase = subTotal - discountValue;
  const isReturn = invoice.type === 'return';
  const isDebtPayment = invoice.isDebtPayment ?? false;
  const isCreditDeposit = invoice.isCreditDeposit ?? false;
  
  let documentTitle = "FACTURA";
  let watermarkText = "";

  if (isReturn) {
    documentTitle = "NOTA DE CRÉDITO";
    watermarkText = "NOTA DE CRÉDITO";
  } else if (isDebtPayment) {
    documentTitle = "RECIBO DE PAGO DE DEUDA";
  } else if (isCreditDeposit) {
    documentTitle = "COMPROBANTE DE DEPÓSITO";
  }


  let originalInvoiceNumber = null;
  if (isReturn && invoice.originalInvoiceId && typeof window !== 'undefined') {
    try {
      const allInvoices: Invoice[] = JSON.parse(localStorage.getItem("invoices") || "[]");
      const originalInv = allInvoices.find(inv => inv.id === invoice.originalInvoiceId);
      if (originalInv) {
        originalInvoiceNumber = originalInv.invoiceNumber;
      }
    } catch (e) {
      console.error("Error reading invoices from localStorage for original invoice number", e);
    }
  }

  const overpaymentWasMade = (invoice.overpaymentAmount ?? 0) > 0;
  const overpaymentCredited = overpaymentWasMade && invoice.overpaymentHandling === 'creditedToAccount';
  const overpaymentRefunded = overpaymentWasMade && invoice.overpaymentHandling === 'refunded';

  return (
    <Card 
      className={cn("w-full shadow-xl relative", className)}
      data-invoice-preview-container 
    >
      {watermarkText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 watermark-container">
          <span 
            className="text-6xl sm:text-7xl md:text-8xl font-bold text-destructive/10 transform -rotate-45 opacity-70 select-none watermark-text"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.05)' }}
          >
            {watermarkText}
          </span>
        </div>
      )}
      <CardContent className={cn("p-4 text-xs relative z-10", "receipt-font")}>
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
          <p>{formatLine(`${documentTitle} NRO:`, invoice.invoiceNumber || "S/N")}</p>
          <p>{formatLine("FECHA:", actualInvoiceDate.toLocaleDateString('es-VE'))}</p>
          <p>{formatLine("HORA:", actualInvoiceDate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }))}</p>
          {invoice.cashierNumber && <p>{formatLine("CAJA NRO:", invoice.cashierNumber)}</p>}
          {invoice.salesperson && <p>{formatLine("VENDEDOR:", invoice.salesperson)}</p>}
          {isReturn && originalInvoiceNumber && (
            <p className="text-xs">{formatLine("REF. FACTURA:", originalInvoiceNumber)}</p>
          )}
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
          {discountValue > 0 && (
            <p>{formatLine(`DESCUENTO (${discountPercentage.toFixed(2)}%):`, `-${formatCurrency(discountValue)}`)}</p>
          )}
           {(taxAmount > 0 || isDebtPayment || isCreditDeposit) && ( 
            <p>{formatLine(`BASE IMPONIBLE:`, formatCurrency(taxableBase))}</p>
          )}
          {taxAmount > 0 && !isDebtPayment && !isCreditDeposit && ( 
            <p>{formatLine(`IVA (${(taxRate * 100).toFixed(0)}%):`, formatCurrency(taxAmount))}</p>
          )}
          <p className="font-bold text-sm">{formatLine(isReturn ? "TOTAL CRÉDITO:" : isDebtPayment ? "TOTAL ABONO:" : isCreditDeposit ? "TOTAL DEPÓSITO:" : "TOTAL A PAGAR:", formatCurrency(totalAmount))}</p>
        </div>
        
        {(payments.length > 0) && <DottedLine />}
        
        {payments.length > 0 && (
          <div className="mt-2 space-y-0.5">
            <p className="font-semibold">{isReturn ? "CRÉDITO EMITIDO VÍA:" : isCreditDeposit ? "DEPÓSITO REALIZADO VÍA:" : "FORMA DE PAGO:"}</p>
            {payments.map((p, idx) => (
              <p key={idx}>{formatLine(p.method.toUpperCase() + (p.reference ? ` (${p.reference.slice(0,10)})` : ''), formatCurrency(p.amount))}</p>
            ))}
          </div>
        )}

        
        {!isReturn && !isCreditDeposit && (
            <div className="mt-1">
                <DottedLine />
                <p className="font-semibold">{formatLine("TOTAL PAGADO:", formatCurrency(amountPaid))}</p>
                {overpaymentRefunded && invoice.changeRefundPaymentMethods && invoice.changeRefundPaymentMethods.length > 0 && (
                  <>
                    <p className="font-semibold mt-1">VUELTO PROCESADO:</p>
                    {invoice.changeRefundPaymentMethods.map((crpm, idx) => (
                       <p key={`change-${idx}`}>{formatLine(crpm.method.toUpperCase() + (crpm.reference ? ` (${crpm.reference.slice(0,10)})` : ''), formatCurrency(crpm.amount))}</p>
                    ))}
                  </>
                )}
                {overpaymentCredited && (
                    <p className="font-semibold">{formatLine("ABONADO A SALDO CLIENTE:", formatCurrency(invoice.overpaymentAmount))}</p>
                )}
                {finalAmountDueForDisplay > 0 && !overpaymentWasMade && ( 
                    <p className="font-semibold">{formatLine("MONTO PENDIENTE:", formatCurrency(finalAmountDueForDisplay))}</p>
                )}
            </div>
        )}
        
        <DottedLine />

        <div className="text-center mt-3">
          <p>{invoice.thankYouMessage || (isReturn ? "Devolución procesada." : isDebtPayment ? "Abono registrado." : isCreditDeposit ? "Depósito registrado." : "¡Gracias por su compra!")}</p>
          {invoice.notes && <p className="text-xs italic mt-1">{invoice.notes}</p>}
        </div>

      </CardContent>
      <div className="p-4 border-t no-print flex justify-end">
        <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir {documentTitle}
        </Button>
      </div>
    </Card>
  );
}

