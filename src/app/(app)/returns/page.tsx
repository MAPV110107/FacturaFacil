
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Undo2, Search, History, AlertTriangle, FileCheck2, ArrowRight } from 'lucide-react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { Invoice, CompanyDetails } from '@/lib/types';
import { InvoicePreview } from '@/components/invoice/invoice-preview';
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_COMPANY_ID } from '@/lib/types';

export default function ReturnsPage() {
  const [invoiceIdInput, setInvoiceIdInput] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>("invoices", []);
   const [companyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" }
  );
  const { toast } = useToast();
  const router = useRouter();

  const handleSearchInvoice = () => {
    setErrorMessage(null);
    setFoundInvoice(null);
    if (!invoiceIdInput.trim()) {
      setErrorMessage("Por favor, ingrese un número de factura o ID.");
      return;
    }
    let invoice = invoices.find(inv => inv.invoiceNumber.toLowerCase() === invoiceIdInput.trim().toLowerCase() && inv.type === 'sale');
    if (!invoice) {
        invoice = invoices.find(inv => inv.id === invoiceIdInput.trim() && inv.type === 'sale');
    }

    if (invoice) {
      if (invoice.type === 'return') {
        setErrorMessage(`La factura ${invoice.invoiceNumber} ya es una nota de crédito y no puede ser devuelta.`);
        return;
      }
      // Check if a return already exists for this invoice
      const existingReturn = invoices.find(inv => inv.originalInvoiceId === invoice?.id && inv.type === 'return');
      if (existingReturn) {
        setErrorMessage(`Ya existe una nota de crédito (${existingReturn.invoiceNumber}) para la factura ${invoice.invoiceNumber}.`);
        setFoundInvoice(null); // Clear foundInvoice if return exists
        return;
      }
      setFoundInvoice(invoice);
    } else {
      setErrorMessage(`No se encontró ninguna factura de venta con el identificador "${invoiceIdInput}".`);
    }
  };

  const handleProcessReturn = () => {
    if (!foundInvoice) return;

    const existingReturn = invoices.find(inv => inv.originalInvoiceId === foundInvoice.id && inv.type === 'return');
    if (existingReturn) {
        toast({
            title: "Devolución ya procesada",
            description: `Ya existe una nota de crédito (${existingReturn.invoiceNumber}) para esta factura.`,
            variant: "destructive",
        });
        return;
    }

    const newReturnInvoiceNumber = `NC-${Date.now().toString().slice(-6)}`;

    const returnInvoice: Invoice = {
      ...foundInvoice, 
      id: uuidv4(),
      invoiceNumber: newReturnInvoiceNumber,
      date: new Date().toISOString(),
      type: 'return',
      originalInvoiceId: foundInvoice.id,
      paymentMethods: [{
        method: 'Nota de Crédito Aplicada',
        amount: foundInvoice.totalAmount, // The full amount of the original invoice
        reference: `Ref. Factura Nro. ${foundInvoice.invoiceNumber}`,
      }],
      amountPaid: foundInvoice.totalAmount, 
      amountDue: 0,  
      thankYouMessage: `Nota de Crédito aplicada a Factura Nro. ${foundInvoice.invoiceNumber}`,
      notes: `Esta nota de crédito anula o rectifica la factura Nro. ${foundInvoice.invoiceNumber}. ${foundInvoice.notes ? `Notas Originales: ${foundInvoice.notes}` : ''}`.trim(),
      subTotal: foundInvoice.subTotal,
      discountAmount: foundInvoice.discountAmount,
      taxAmount: foundInvoice.taxAmount,
      totalAmount: foundInvoice.totalAmount,
    };

    setInvoices(prevInvoices => [...prevInvoices, returnInvoice]);
    toast({
      title: "Nota de Crédito Generada",
      description: `La Nota de Crédito Nro. ${returnInvoice.invoiceNumber} ha sido creada y guardada.`,
      action: (
        <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${returnInvoice.id}`)}>
          Ver Nota de Crédito <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    });
    setFoundInvoice(null); 
    setInvoiceIdInput(""); 
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Undo2 className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Procesar Devolución (Generar Nota de Crédito)</CardTitle>
              <CardDescription className="text-muted-foreground">
                Ingrese el número de la factura de venta original para generar una nota de crédito.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow">
              <label htmlFor="invoiceIdInput" className="block text-sm font-medium text-foreground mb-1">
                Número de Factura Original o ID Interno
              </label>
              <Input
                id="invoiceIdInput"
                placeholder="Ej: FACT-123456 o ID interno"
                value={invoiceIdInput}
                onChange={(e) => setInvoiceIdInput(e.target.value)}
              />
            </div>
            <Button onClick={handleSearchInvoice} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Search className="mr-2 h-4 w-4" /> Buscar Factura Original
            </Button>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/invoices">
              <History className="mr-2 h-4 w-4" /> Ver Historial (Facturas y Notas de Crédito)
            </Link>
          </Button>

          {errorMessage && (
            <div className="flex items-center p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {foundInvoice && (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Factura Original Encontrada: {foundInvoice.invoiceNumber}</CardTitle>
            <CardDescription>Revise los detalles de la factura original. Al procesar, se generará una Nota de Crédito por el monto total.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InvoicePreview invoice={foundInvoice} companyDetails={companyDetails} />
            <div className="mt-6 p-4 border rounded-md bg-muted/50">
                <h3 className="font-semibold text-lg mb-2 text-center text-primary">Procesar Devolución Total</h3>
                <p className="text-sm text-muted-foreground text-center">
                    Al hacer clic en "Generar Nota de Crédito", se creará un documento de Nota de Crédito
                    por el valor total de esta factura. Este nuevo documento se guardará en el historial.
                </p>
                <p className="text-xs text-muted-foreground text-center mt-2">
                    Actualmente, no se admite la selección de artículos para devoluciones parciales.
                    La devolución procesada será por la totalidad de la factura original.
                </p>
            </div>
            <Button onClick={handleProcessReturn} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4">
              <FileCheck2 className="mr-2 h-4 w-4" /> Generar Nota de Crédito
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

