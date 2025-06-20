
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CompanyDetails, CustomerDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, FileSearch, XCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const invoiceId = params?.id as string;

  const [allInvoices, setAllInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const [customers, setCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const [companyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" }
  );

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && invoiceId) {
      // Always read from localStorage directly when component mounts or invoiceId/allInvoices changes
      // to ensure the freshest data is displayed, especially if localStorage was updated in another tab/component.
      const currentInvoices = JSON.parse(localStorage.getItem("invoices") || "[]") as Invoice[];
      const foundInvoice = currentInvoices.find((inv) => inv.id === invoiceId);
      setInvoice(foundInvoice || null);
    }
  }, [invoiceId, isClient, allInvoices]); // Depend on allInvoices to re-fetch if it changes externally

  const canCancelThisInvoice = () => {
    if (!invoice) return false;
    return invoice.type === 'sale' &&
           invoice.status === 'active' && // Only active invoices
           !invoice.isDebtPayment &&
           !invoice.isCreditDeposit;
  };

  const handleCancelInvoice = () => {
    if (!invoice || !canCancelThisInvoice()) {
      toast({ variant: "destructive", title: "Error", description: "Esta factura no se puede anular." });
      setIsCancelConfirmOpen(false);
      return;
    }

    const customerToUpdateIdx = customers.findIndex(c => c.id === invoice.customerDetails.id);
    if (customerToUpdateIdx === -1) {
      toast({ variant: "destructive", title: "Error de Cliente", description: "Cliente asociado no encontrado para revertir saldos." });
      setIsCancelConfirmOpen(false);
      return;
    }

    let customerToUpdate = { ...customers[customerToUpdateIdx] };
    let updatedOutstandingBalance = customerToUpdate.outstandingBalance || 0;
    let updatedCreditBalance = customerToUpdate.creditBalance || 0;

    // Revert financial impact
    if (invoice.isDebtPayment) { // Should not happen due to canCancelThisInvoice, but good for completeness
        updatedOutstandingBalance += invoice.amountPaid;
        if ((invoice.totalAmount ?? 0) < invoice.amountPaid) { // Overpayment during debt payment went to credit
            updatedCreditBalance -= (invoice.amountPaid - (invoice.totalAmount ?? 0));
        }
    } else if (invoice.isCreditDeposit) { // Should not happen
        const depositAmount = invoice.amountPaid;
        // This is tricky: if deposit covered debt first, that part of debt needs to be "re-instated".
        // For simplicity now, assume direct deposit to credit. A more robust solution would track debt payment portion of a deposit.
        updatedCreditBalance -= depositAmount;
    } else { // Standard sale invoice
        if ((invoice.amountDue ?? 0) > 0) {
            updatedOutstandingBalance -= invoice.amountDue;
        }
        (invoice.paymentMethods || []).forEach(pm => {
            if (pm.method === "Saldo a Favor" || pm.method === "Saldo a Favor (Auto)") {
                updatedCreditBalance += pm.amount;
            }
        });
        if (invoice.overpaymentAmount && invoice.overpaymentAmount > 0 && invoice.overpaymentHandling === 'creditedToAccount') {
            updatedCreditBalance -= invoice.overpaymentAmount;
        }
    }
    
    // Ensure balances are not negative
    customerToUpdate.outstandingBalance = Math.max(0, updatedOutstandingBalance);
    customerToUpdate.creditBalance = Math.max(0, updatedCreditBalance);

    const updatedCustomers = [...customers];
    updatedCustomers[customerToUpdateIdx] = customerToUpdate;
    setCustomers(updatedCustomers);

    const invoiceToCancelIdx = allInvoices.findIndex(inv => inv.id === invoice.id);
    const updatedInvoice = { ...invoice, status: 'cancelled' as const, cancelledAt: new Date().toISOString() };
    
    const updatedInvoices = [...allInvoices];
    if (invoiceToCancelIdx !== -1) {
        updatedInvoices[invoiceToCancelIdx] = updatedInvoice;
    } else {
        // This case should ideally not happen if invoice was found initially
        updatedInvoices.push(updatedInvoice);
    }
    setAllInvoices(updatedInvoices);
    setInvoice(updatedInvoice); // Update local state for immediate UI reflection

    toast({ title: "Factura Anulada", description: `La factura Nro. ${invoice.invoiceNumber} ha sido anulada.` });
    setIsCancelConfirmOpen(false);
  };


  if (!isClient || invoice === undefined) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <FileSearch className="h-16 w-16 mb-4 animate-pulse text-primary" />
        <p className="text-xl font-semibold">Cargando factura...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card className="max-w-lg mx-auto text-center shadow-lg">
        <CardHeader>
           <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-2" />
          <CardTitle className="text-2xl text-destructive">Factura No Encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            La factura que está intentando ver no existe o ha sido eliminada.
          </CardDescription>
          <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Historial
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center justify-between no-print">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
        </Button>
        {canCancelThisInvoice() && (
            <Button variant="destructive" onClick={() => setIsCancelConfirmOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Anular Factura
            </Button>
        )}
      </div>
      <InvoicePreview
        id="factura"
        invoice={invoice}
        companyDetails={companyDetails}
        isSavedInvoice={true}
        invoiceStatus={invoice.status || 'active'}
      />
      <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Factura Nro. <span className="font-semibold">{invoice?.invoiceNumber}</span>.
              Los saldos del cliente (<span className="font-semibold">{invoice?.customerDetails.name}</span>) serán revertidos.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvoice} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Sí, anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

