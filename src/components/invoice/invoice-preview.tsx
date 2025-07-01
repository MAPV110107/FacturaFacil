"use client";

import type { Invoice, CompanyDetails } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { SENIAT_TEXT, CURRENCY_SYMBOL, FISCAL_PRINTER_LINE_WIDTH, CANCELLED_WATERMARK_TEXT, CREDIT_NOTE_WATERMARK_TEXT } from "@/lib/constants";
import React from "react";
import { cn } from "@/lib/utils";
import FacturaPrintControls from "@/components/FacturaPrintControls";


interface InvoicePreviewProps {
  invoice: Partial<Invoice>;
  companyDetails: CompanyDetails | null;
  className?: string;
  containerId?: string;
  isSavedInvoice?: boolean;
  invoiceStatus?: Invoice['status'];
}

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL} 0.00`;
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) return `${CURRENCY_SYMBOL} 0.00`;
  return `${CURRENCY_SYMBOL}${numericAmount.toFixed(2)}`;
};

const formatLine = (left: string, right: string, width: number = FISCAL_PRINTER_LINE_WIDTH): string => {
  const sanitizedLeft = String(left || "").slice(0, width - Math.max(0, String(right || "").length) -1);
  const sanitizedRight = String(right || "");
  const spaces = Math.max(0, width - sanitizedLeft.length - sanitizedRight.length);
  return `${sanitizedLeft}${' '.repeat(spaces)}${sanitizedRight}`;
};

const DottedLine = () => <hr className="DottedLine my-1" />;

export function InvoicePreview({
  invoice,
  companyDetails,
  className,
  containerId = "factura-preview-card",
  isSavedInvoice = false,
  invoiceStatus = 'active',
}: InvoicePreviewProps) {

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
  let watermarkTextContent = "";

  if (invoiceStatus === 'cancelled') {
    documentTitle = `FACTURA (ANULADA)`;
    watermarkTextContent = CANCELLED_WATERMARK_TEXT;
  } else if (isReturn) { // This is a credit note
    documentTitle = "NOTA DE CRÉDITO";
    watermarkTextContent = CREDIT_NOTE_WATERMARK_TEXT;
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

  const logoAlignmentClass = () => {
    switch (c?.logoAlignment) {
      case 'left': return 'mr-auto';
      case 'right': return 'ml-auto';
      default: return 'mx-auto';
    }
  };

  const showPrintAndCompareControls = isSavedInvoice;

  return (
    <div id={containerId} className={cn("invoice-preview-wrapper", className)}>
        <Card
          className={cn("w-full relative shadow-xl", className)}
          data-invoice-preview-container
        >
          {watermarkTextContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 watermark-container">
              <span
                className="text-6xl sm:text-7xl md:text-8xl font-bold text-destructive/10 transform -rotate-45 opacity-70 select-none watermark-text"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.05)' }}
              >
                {watermarkTextContent}
              </span>
            </div>
          )}
          <CardContent className={cn("text-xs relative z-10 p-4 sm:p-6", "receipt-font")}>
            <div className="text-center mb-1">
              <p className="font-bold text-lg my-1">{SENIAT_TEXT}</p>
            </div>

            <DottedLine />

            <div className="my-2" data-company-details-block>
              {c?.logoUrl && c.logoUrl.trim() !== '' && (
                <img
                  src={c.logoUrl}
                  alt={`${c.name || 'Empresa'} logo`}
                  className={cn("object-contain mb-2", logoAlignmentClass())}
                  data-ai-hint="company logo"
                  data-logo-align={c.logoAlignment || 'center'}
                  style={{maxHeight: '50px'}}
                />
              )}
              <p className="font-bold text-sm text-center">{c?.name || "Nombre de Empresa"}</p>
              <p className="text-center">RIF: {c?.rif || "J-00000000-0"}</p>
              <p className="truncate text-center" title={c?.address}>{c?.address || "Dirección de la Empresa"}</p>
              {c?.phone && <p className="text-center">Telf: {c.phone}</p>}
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
              {cust?.phone && <p>{formatLine("TELF. CLIENTE:", cust.phone)}</p>}
              <p className="truncate" title={cust?.address}>{cust?.address || "N/A"}</p>
            </div>

            <DottedLine />

            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-x-1 font-semibold">
              <div className="text-left">Descrip.</div>
              <div className="text-right">Cant.</div>
              <div className="text-right">P.Unit</div>
              <div className="text-right">Total</div>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-x-1 leading-tight">
                <div className="text-left truncate">{item.description}</div>
                <div className="text-right">{Number(item.quantity).toFixed(2)}</div>
                <div className="text-right">{Number(item.unitPrice).toFixed(2)}</div>
                <div className="text-right">{Number(item.quantity * item.unitPrice).toFixed(2)}</div>
              </div>
            ))}

            <DottedLine />

            <div className="mt-2 space-y-0.5">
              <p className="font-semibold">{formatLine("SUBTOTAL:", formatCurrency(subTotal))}</p>
              {discountValue > 0 && (
                <p>{formatLine(`DESCUENTO (${Number(discountPercentage).toFixed(2)}%):`, `-${formatCurrency(discountValue)}`)}</p>
              )}
              {(taxAmount > 0 || isDebtPayment || isCreditDeposit || (taxRate === 0 && taxableBase > 0)) && (
                <p>{formatLine(`BASE IMPONIBLE:`, formatCurrency(taxableBase))}</p>
              )}
              {taxAmount > 0 && !isDebtPayment && !isCreditDeposit && (
                <p>{formatLine(`IVA (${(taxRate * 100).toFixed(0)}%):`, formatCurrency(taxAmount))}</p>
              )}
               {taxAmount === 0 && taxRate > 0 && !isDebtPayment && !isCreditDeposit && (
                <p>{formatLine(`IVA (${(taxRate * 100).toFixed(0)}%):`, formatCurrency(0))}</p>
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
                    {finalAmountDueForDisplay > 0.001 && !overpaymentWasMade && (
                        <p className="font-semibold">{formatLine("MONTO PENDIENTE:", formatCurrency(finalAmountDueForDisplay))}</p>
                    )}
                </div>
            )}

            <DottedLine />

            {invoice.warrantyText && (
              <>
                <div className="text-center mt-2 pt-1">
                  <p className="font-semibold">NOTA DE GARANTÍA:</p>
                  <p>{invoice.warrantyText}</p>
                </div>
                <DottedLine />
              </>
            )}

            <div className="text-center mt-3">
              <p>{invoice.thankYouMessage || (isReturn ? "Devolución procesada." : isDebtPayment ? "Abono registrado." : isCreditDeposit ? "Depósito registrado." : "¡Gracias por su compra!")}</p>
              {invoice.notes && <p className="text-xs italic mt-1">{invoice.notes}</p>}
            </div>

            {invoice.reasonForStatusChange && (invoiceStatus === 'cancelled' || isReturn) && (
              <>
                <DottedLine />
                <div className="text-center mt-2 pt-1">
                  <p className="font-semibold">MOTIVO {invoiceStatus === 'cancelled' ? 'DE ANULACIÓN' : 'DE NOTA DE CRÉDITO'}:</p>
                  <p className="text-xs">{invoice.reasonForStatusChange}</p>
                </div>
              </>
            )}

          </CardContent>

          {showPrintAndCompareControls && (
              <CardFooter className="p-4 border-t no-print flex flex-col items-stretch gap-2">
                  <FacturaPrintControls containerId={containerId} invoiceData={invoice} companyDetails={companyDetails} isSavedInvoice={isSavedInvoice} />
              </CardFooter>
          )}
        </Card>
    </div>
  );
}
