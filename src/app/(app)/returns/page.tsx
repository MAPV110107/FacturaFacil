
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Undo2, Search, History, AlertTriangle } from 'lucide-react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { Invoice } from '@/lib/types';
import { InvoicePreview } from '@/components/invoice/invoice-preview';

export default function ReturnsPage() {
  const [invoiceIdInput, setInvoiceIdInput] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invoices] = useLocalStorage<Invoice[]>("invoices", []);

  const handleSearchInvoice = () => {
    setErrorMessage(null);
    setFoundInvoice(null);
    if (!invoiceIdInput.trim()) {
      setErrorMessage("Por favor, ingrese un número de factura.");
      return;
    }
    // Search by invoiceNumber first, then by internal ID if no match
    let invoice = invoices.find(inv => inv.invoiceNumber.toLowerCase() === invoiceIdInput.trim().toLowerCase());
    if (!invoice) {
        invoice = invoices.find(inv => inv.id === invoiceIdInput.trim());
    }

    if (invoice) {
      setFoundInvoice(invoice);
    } else {
      setErrorMessage(`No se encontró ninguna factura con el identificador "${invoiceIdInput}".`);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Undo2 className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Procesar Devolución</CardTitle>
              <CardDescription className="text-muted-foreground">
                Ingrese el número de factura para iniciar una devolución o búsquela en el historial.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow">
              <label htmlFor="invoiceIdInput" className="block text-sm font-medium text-foreground mb-1">
                Número de Factura o ID Interno
              </label>
              <Input
                id="invoiceIdInput"
                placeholder="Ej: FACT-123456 o ID interno"
                value={invoiceIdInput}
                onChange={(e) => setInvoiceIdInput(e.target.value)}
              />
            </div>
            <Button onClick={handleSearchInvoice} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Search className="mr-2 h-4 w-4" /> Buscar Factura
            </Button>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/invoices">
              <History className="mr-2 h-4 w-4" /> Ver Historial de Facturas
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
            <CardTitle className="text-xl text-primary">Factura Encontrada: {foundInvoice.invoiceNumber}</CardTitle>
            <CardDescription>Revise los detalles de la factura y seleccione los artículos a devolver.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InvoicePreview invoice={foundInvoice} companyDetails={foundInvoice.companyDetails} />
            <div className="mt-6 p-4 border rounded-md bg-muted/50">
                <h3 className="font-semibold text-lg mb-2 text-center text-primary">Funcionalidad de Devolución</h3>
                <p className="text-sm text-muted-foreground text-center">
                    La selección de artículos para devolución y el procesamiento final de la misma
                    (generación de nota de crédito, ajuste de inventario, etc.)
                    es una funcionalidad avanzada que actualmente no está implementada.
                </p>
                <p className="text-sm text-muted-foreground text-center mt-2">
                    Por ahora, puede visualizar la factura para confirmar los detalles.
                </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
