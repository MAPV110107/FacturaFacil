
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CompanyDetails, CustomerDetails } from "@/lib/types";
import { defaultCompanyDetails } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { Label } from "@/components/ui/label"; // Import Label


export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const invoiceId = params?.id as string;

  const [allInvoices, setAllInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const [customers, setCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const [storedCompanyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    defaultCompanyDetails
  );

  const companyDetails = useMemo(() => ({
    ...defaultCompanyDetails,
    ...storedCompanyDetails,
  }), [storedCompanyDetails]);

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancellationReasonInput, setCancellationReasonInput] = useState(""); // State for cancellation reason

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && invoiceId) {
      const currentInvoices = JSON.parse(localStorage.getItem("invoices") || "[]") as Invoice[];
      const foundInvoice = currentInvoices.find((inv) => inv.id === invoiceId);
      setInvoice(foundInvoice || null);
    }
  }, [invoiceId, isClient, allInvoices]);

  const canCancelThisInvoice = () => {
    if (!invoice) return false;
    // Standard sales invoices that are active and not special types (debt/credit payments) can be cancelled.
    // Also, returns (credit notes) cannot be cancelled themselves.
    return invoice.type === 'sale' &&
           invoice.status === 'active' &&
           !invoice.isDebtPayment &&
           !invoice.isCreditDeposit;
  };

  const handleCancelInvoice = () => {
    if (!invoice || !canCancelThisInvoice()) {
      toast({ variant: "destructive", title: "Error", description: "Esta factura no se puede anular." });
      setIsCancelConfirmOpen(false);
      return;
    }
    if (!cancellationReasonInput.trim()) {
      toast({ variant: "destructive", title: "Motivo Requerido", description: "Por favor, ingrese el motivo de la anulación." });
      return; // Do not proceed if reason is empty
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

    // Revert financial impact - This logic should be accurate as it handles standard sales invoices
    if ((invoice.amountDue ?? 0) > 0) { // If there was an amount due (customer owed money)
        updatedOutstandingBalance -= invoice.amountDue;
    }
    // Revert any credit used from customer's account for this invoice
    (invoice.paymentMethods || []).forEach(pm => {
        if (pm.method === "Saldo a Favor" || pm.method === "Saldo a Favor (Auto)") {
            updatedCreditBalance += pm.amount;
        }
    });
    // If overpayment was credited to account, revert that credit
    if (invoice.overpaymentAmount && invoice.overpaymentAmount > 0 && invoice.overpaymentHandling === 'creditedToAccount') {
        updatedCreditBalance -= invoice.overpaymentAmount;
    }
    
    // Ensure balances are not negative after adjustments
    customerToUpdate.outstandingBalance = Math.max(0, updatedOutstandingBalance);
    customerToUpdate.creditBalance = Math.max(0, updatedCreditBalance);

    const updatedCustomers = [...customers];
    updatedCustomers[customerToUpdateIdx] = customerToUpdate;
    setCustomers(updatedCustomers);

    const invoiceToCancelIdx = allInvoices.findIndex(inv => inv.id === invoice.id);
    const updatedInvoice = { 
      ...invoice, 
      status: 'cancelled' as const, 
      cancelledAt: new Date().toISOString(),
      reasonForStatusChange: cancellationReasonInput.trim(), // Save the reason
    };
    
    const updatedInvoices = [...allInvoices];
    if (invoiceToCancelIdx !== -1) {
        updatedInvoices[invoiceToCancelIdx] = updatedInvoice;
    } else {
        updatedInvoices.push(updatedInvoice);
    }
    setAllInvoices(updatedInvoices);
    setInvoice(updatedInvoice); 

    toast({ title: "Factura Anulada", description: `La factura Nro. ${invoice.invoiceNumber} ha sido anulada.` });
    setIsCancelConfirmOpen(false);
    setCancellationReasonInput(""); // Reset reason input
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
            <Button variant="destructive" onClick={() => {
              setCancellationReasonInput(""); // Clear reason input when opening dialog
              setIsCancelConfirmOpen(true);
            }}>
                <XCircle className="mr-2 h-4 w-4" />
                Anular Factura
            </Button>
        )}
      </div>
      <InvoicePreview
        containerId="factura"
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
          <div className="space-y-2 my-4">
            <Label htmlFor="cancellationReason">Motivo de la Anulación (Obligatorio)</Label>
            <Textarea
              id="cancellationReason"
              value={cancellationReasonInput}
              onChange={(e) => setCancellationReasonInput(e.target.value)}
              placeholder="Ej: Error en los artículos, solicitud del cliente, etc."
              rows={3}
            />
             {!cancellationReasonInput.trim() && (
                <p className="text-xs text-destructive">El motivo es obligatorio.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancellationReasonInput("")}>No</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelInvoice} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={!cancellationReasonInput.trim()} // Disable if reason is empty
            >
                Sí, anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    