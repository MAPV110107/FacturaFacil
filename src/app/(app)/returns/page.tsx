
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Undo2, Search, History, AlertTriangle, FileCheck2, ArrowRight, DollarSign, UserCog, Gift } from 'lucide-react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { Invoice, CompanyDetails, CustomerDetails } from '@/lib/types';
import { InvoicePreview } from '@/components/invoice/invoice-preview';
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_COMPANY_ID } from '@/lib/types';
import { CURRENCY_SYMBOL } from '@/lib/constants';
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

type EditorMode = 'invoiceReturn' | 'creditWithdrawal';

export default function ReturnsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [editorMode, setEditorMode] = useState<EditorMode>('invoiceReturn');
  const [invoiceIdInput, setInvoiceIdInput] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null); // This can be an original sale or a synthetic invoice for withdrawal
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const [customers, setCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const [companyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" }
  );
  const { toast } = useToast();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // State for new return details (applies to both modes)
  const [returnPaymentMethod, setReturnPaymentMethod] = useState('Efectivo');
  const [returnPaymentReference, setReturnPaymentReference] = useState('');
  const [returnCashier, setReturnCashier] = useState('');
  const [returnSalesperson, setReturnSalesperson] = useState('');


  const prepareForCreditWithdrawal = useCallback((customerId: string, amountStr: string | null) => {
    setEditorMode('creditWithdrawal');
    setErrorMessage(null);
    setFoundInvoice(null);

    const amount = parseFloat(amountStr || '0');
    if (!customerId || amount <= 0) {
      setErrorMessage("ID de cliente o monto inválido para el retiro de saldo.");
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      setErrorMessage(`Cliente con ID ${customerId} no encontrado.`);
      return;
    }
    if ((customer.creditBalance ?? 0) < amount) {
        setErrorMessage(`El cliente ${customer.name} no tiene suficiente saldo a favor (${formatCurrency(customer.creditBalance)}) para retirar ${formatCurrency(amount)}.`);
        return;
    }

    // Create a synthetic "original invoice" for the withdrawal
    const syntheticInvoice: Invoice = {
      id: `SYNTHETIC-${uuidv4()}`,
      invoiceNumber: `RETIRO-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: 'sale', // It's like we are "returning" from this conceptual sale of credit
      companyDetails: companyDetails,
      customerDetails: customer,
      items: [{ id: uuidv4(), description: "Retiro de Saldo a Favor", quantity: 1, unitPrice: amount, totalPrice: amount }],
      subTotal: amount,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: amount,
      paymentMethods: [{ method: "Saldo a Favor", amount: amount, reference: `Retiro de crédito cliente ${customer.name}` }],
      amountPaid: amount,
      amountDue: 0,
      thankYouMessage: "Procesando retiro de saldo a favor.",
      notes: `Preparando Nota de Crédito para retiro de saldo a favor por ${formatCurrency(amount)} para ${customer.name}.`,
      isCreditDeposit: true, // Mark it as related to credit balance
    };
    setFoundInvoice(syntheticInvoice);
    setInvoiceIdInput(syntheticInvoice.invoiceNumber); // For display consistency, though not searchable
  }, [customers, companyDetails]);


  const handleSearchInvoice = useCallback(() => {
    setEditorMode('invoiceReturn'); // Default to invoice return when searching manually
    setErrorMessage(null);
    setFoundInvoice(null);
    if (!invoiceIdInput.trim()) {
      setErrorMessage("Por favor, ingrese un número de factura o ID.");
      return;
    }
    
    const validInvoices = Array.isArray(invoices) ? invoices : [];
    let invoice = validInvoices.find(inv => inv.invoiceNumber.toLowerCase() === invoiceIdInput.trim().toLowerCase() && inv.type === 'sale');
    if (!invoice) {
        invoice = validInvoices.find(inv => inv.id === invoiceIdInput.trim() && inv.type === 'sale');
    }

    if (invoice) {
      if (invoice.type === 'return') {
        setErrorMessage(`La factura ${invoice.invoiceNumber} ya es una nota de crédito y no puede ser devuelta.`);
        return;
      }
       if (invoice.isDebtPayment || invoice.isCreditDeposit) {
        setErrorMessage(`El documento ${invoice.invoiceNumber} es un ${invoice.isDebtPayment ? 'pago de deuda' : 'depósito a cuenta'} y no puede ser devuelto directamente. Ajuste manualmente si es necesario.`);
        return;
      }
      const existingReturn = validInvoices.find(inv => inv.originalInvoiceId === invoice?.id && inv.type === 'return');
      if (existingReturn) {
        setErrorMessage(`Ya existe una nota de crédito (${existingReturn.invoiceNumber}) para la factura ${invoice.invoiceNumber}.`);
        setFoundInvoice(null);
        return;
      }
      setFoundInvoice(invoice);
      setReturnPaymentMethod('Efectivo');
      setReturnPaymentReference('');
      setReturnCashier('');
      setReturnSalesperson('');
    } else {
      setErrorMessage(`No se encontró ninguna factura de venta con el identificador "${invoiceIdInput}".`);
    }
  }, [invoiceIdInput, invoices]);


  useEffect(() => {
    setIsClient(true);
    const modeParam = searchParams.get('mode') as EditorMode | null;
    const customerIdParam = searchParams.get('customerId');
    const amountParam = searchParams.get('amount');
    const invoiceIdQueryParam = searchParams.get('invoiceId');

    if (modeParam === 'creditWithdrawal' && customerIdParam && amountParam) {
      prepareForCreditWithdrawal(customerIdParam, amountParam);
    } else if (invoiceIdQueryParam) {
      setInvoiceIdInput(invoiceIdQueryParam);
      // Let the next effect trigger the search if invoiceIdInput was set by query
    }
  }, [searchParams, prepareForCreditWithdrawal]);

  useEffect(() => {
    // This effect runs if invoiceIdInput changes, e.g. from query param or user typing
    if (isClient && invoiceIdInput && invoices.length > 0 && !foundInvoice && !errorMessage && editorMode === 'invoiceReturn') {
      const queryInvoiceId = searchParams.get('invoiceId');
      if (invoiceIdInput === queryInvoiceId || !queryInvoiceId) { // Search if input matches query OR if no query (manual search)
        handleSearchInvoice();
      }
    }
  }, [invoiceIdInput, invoices, isClient, foundInvoice, errorMessage, searchParams, handleSearchInvoice, editorMode]);


  const triggerProcessReturn = () => {
    if (!foundInvoice) {
        toast({
            title: "Error",
            description: `No hay ${editorMode === 'creditWithdrawal' ? 'retiro preparado' : 'factura seleccionada'} para procesar.`,
            variant: "destructive",
        });
        return;
    }
    if (editorMode === 'invoiceReturn') { // Only check for existing returns for actual invoice returns
      const existingReturn = invoices.find(inv => inv.originalInvoiceId === foundInvoice.id && inv.type === 'return');
      if (existingReturn) {
          setErrorMessage(`Ya existe una nota de crédito (${existingReturn.invoiceNumber}) para la factura ${foundInvoice.invoiceNumber}.`);
          setFoundInvoice(null);
          return;
      }
    }
    setIsConfirmDialogOpen(true);
  };

  const confirmedProcessReturn = () => {
    if (!foundInvoice) return;

    if (editorMode === 'invoiceReturn') {
        const existingReturnCheck = invoices.find(inv => inv.originalInvoiceId === foundInvoice.id && inv.type === 'return');
        if (existingReturnCheck) {
            toast({
                title: "Devolución ya procesada",
                description: `Ya existe una nota de crédito (${existingReturnCheck.invoiceNumber}) para esta factura.`,
                variant: "destructive",
            });
            setIsConfirmDialogOpen(false);
            setFoundInvoice(null);
            setInvoiceIdInput("");
            return;
        }
    }
    
    const newReturnInvoiceNumber = `NC-${editorMode === 'creditWithdrawal' ? 'RETIRO-' : ''}${Date.now().toString().slice(-6)}`;

    const returnInvoice: Invoice = {
      ...foundInvoice, 
      id: uuidv4(),
      invoiceNumber: newReturnInvoiceNumber,
      date: new Date().toISOString(),
      type: 'return',
      originalInvoiceId: editorMode === 'creditWithdrawal' ? `CW-${foundInvoice.customerDetails.id}-${Date.now()}` : foundInvoice.id,
      cashierNumber: returnCashier,
      salesperson: returnSalesperson,
      paymentMethods: [{ 
        method: returnPaymentMethod,
        amount: foundInvoice.totalAmount, 
        reference: returnPaymentReference,
      }],
      amountPaid: foundInvoice.totalAmount, 
      amountDue: 0,  
      thankYouMessage: editorMode === 'creditWithdrawal' ? `Retiro de Saldo Procesado. Ref. Factura Original: ${foundInvoice.invoiceNumber}` : `Nota de Crédito aplicada a Factura Nro. ${foundInvoice.invoiceNumber}`,
      notes: editorMode === 'creditWithdrawal' ? `Nota de crédito por retiro de saldo a favor de ${foundInvoice.customerDetails.name}.` : `Esta nota de crédito anula o rectifica la factura Nro. ${foundInvoice.invoiceNumber}. ${foundInvoice.notes ? `Notas Originales: ${foundInvoice.notes}` : ''}`.trim(),
      subTotal: foundInvoice.subTotal,
      discountAmount: foundInvoice.discountAmount,
      taxAmount: foundInvoice.taxAmount,
      totalAmount: foundInvoice.totalAmount,
      isCreditDeposit: editorMode === 'creditWithdrawal' ? true : foundInvoice.isCreditDeposit, // Mark the NC if it's from a withdrawal
      isDebtPayment: false, // NCs are not debt payments
    };

    setInvoices(prevInvoices => [...prevInvoices, returnInvoice]);

    // Update customer's credit balance if it's a credit withdrawal
    if (editorMode === 'creditWithdrawal') {
      setCustomers(prevCustomers => 
        prevCustomers.map(cust => 
          cust.id === foundInvoice.customerDetails.id 
          ? { ...cust, creditBalance: (cust.creditBalance ?? 0) - foundInvoice.totalAmount }
          : cust
        )
      );
    }
    
    toast({
      title: editorMode === 'creditWithdrawal' ? "Retiro de Saldo Procesado" : "Nota de Crédito Generada",
      description: `La Nota de Crédito Nro. ${returnInvoice.invoiceNumber} ha sido creada y guardada.`,
      action: (
        <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${returnInvoice.id}`)}>
          Ver Nota de Crédito <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    });
    setFoundInvoice(null); 
    setInvoiceIdInput(""); 
    setIsConfirmDialogOpen(false);
    router.replace('/returns', {scroll: false}); // Clear URL params
  };

  const pageTitle = editorMode === 'creditWithdrawal' ? "Procesar Retiro de Saldo a Favor" : "Procesar Devolución (Generar Nota de Crédito)";
  const pageDescription = editorMode === 'creditWithdrawal' 
    ? "Confirme los detalles para generar una nota de crédito por el retiro de saldo del cliente."
    : "Ingrese el número de la factura de venta original para generar una nota de crédito.";

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <Undo2 className="h-16 w-16 mb-4 animate-pulse text-primary" />
        <p className="text-xl font-semibold">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            {editorMode === 'creditWithdrawal' ? <Gift className="h-8 w-8 text-primary" /> : <Undo2 className="h-8 w-8 text-primary" />}
            <div>
              <CardTitle className="text-2xl font-bold text-primary">{pageTitle}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {pageDescription}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {editorMode === 'invoiceReturn' && (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-grow">
                <Label htmlFor="invoiceIdInput" className="block text-sm font-medium text-foreground mb-1">
                  Número de Factura Original o ID Interno
                </Label>
                <Input
                  id="invoiceIdInput"
                  placeholder="Ej: FACT-123456 o ID interno"
                  value={invoiceIdInput}
                  onChange={(e) => {
                    setInvoiceIdInput(e.target.value);
                    if (foundInvoice) setFoundInvoice(null); // Clear found invoice if input changes
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </div>
              <Button onClick={handleSearchInvoice} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Search className="mr-2 h-4 w-4" /> Buscar Factura Original
              </Button>
            </div>
          )}
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
        <>
          <Card className="mt-8 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-primary">
                {editorMode === 'creditWithdrawal' 
                  ? `Retiro de Saldo para: ${foundInvoice.customerDetails.name}` 
                  : `Factura Original Encontrada: ${foundInvoice.invoiceNumber}`}
              </CardTitle>
              <CardDescription>
                {editorMode === 'creditWithdrawal' 
                  ? `Se generará una nota de crédito por ${formatCurrency(foundInvoice.totalAmount)}.`
                  : `Revise los detalles de la factura original.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InvoicePreview invoice={foundInvoice} companyDetails={companyDetails} />
            </CardContent>
          </Card>

          <Card className="mt-8 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl text-primary">
                  {editorMode === 'creditWithdrawal' ? "Detalles del Reembolso del Retiro" : "Detalles de la Devolución"}
                </CardTitle>
              </div>
              <CardDescription>Especifique cómo se procesa el reembolso al cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="returnPaymentMethod">Método de Reembolso del Dinero</Label>
                <Select value={returnPaymentMethod} onValueChange={setReturnPaymentMethod}>
                  <SelectTrigger id="returnPaymentMethod">
                    <SelectValue placeholder="Seleccione método de devolución" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia Bancaria">Transferencia Bancaria</SelectItem>
                    <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                    <SelectItem value="Reverso Tarjeta Débito/Crédito">Reverso Tarjeta Débito/Crédito</SelectItem>
                    {editorMode === 'invoiceReturn' && <SelectItem value="Crédito a Cuenta Cliente">Crédito a Cuenta Cliente</SelectItem>}
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="returnPaymentReference">Referencia de Reembolso (Opcional)</Label>
                <Input
                  id="returnPaymentReference"
                  value={returnPaymentReference}
                  onChange={(e) => setReturnPaymentReference(e.target.value)}
                  placeholder="Ej: ID de transferencia, Nro. de reverso"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="returnCashier" className="flex items-center">
                    <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
                    Cajero que procesa (Opcional)
                  </Label>
                  <Input
                    id="returnCashier"
                    value={returnCashier}
                    onChange={(e) => setReturnCashier(e.target.value)}
                    placeholder="Nombre del cajero"
                  />
                </div>
                <div>
                  <Label htmlFor="returnSalesperson" className="flex items-center">
                    <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
                    Vendedor que asiste (Opcional)
                  </Label>
                  <Input
                    id="returnSalesperson"
                    value={returnSalesperson}
                    onChange={(e) => setReturnSalesperson(e.target.value)}
                    placeholder="Nombre del vendedor"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-8 shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl text-primary">Confirmar y Generar Nota de Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-md bg-muted/50">
                  <h3 className="font-semibold text-lg mb-2 text-center text-primary">
                    {editorMode === 'creditWithdrawal' ? "Procesar Retiro de Saldo" : "Procesar Devolución Total"}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                      Al hacer clic en "Generar Nota de Crédito", se creará un documento de Nota de Crédito
                      por el valor total de {editorMode === 'creditWithdrawal' ? "este retiro" : "esta factura"} ({CURRENCY_SYMBOL}{foundInvoice.totalAmount.toFixed(2)}). Este nuevo documento se guardará en el historial.
                  </p>
                  {editorMode === 'invoiceReturn' && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        Actualmente, no se admite la selección de artículos para devoluciones parciales.
                        La devolución procesada será por la totalidad de la factura original.
                    </p>
                  )}
              </div>
              <Button onClick={triggerProcessReturn} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4" disabled={!foundInvoice}>
                <FileCheck2 className="mr-2 h-4 w-4" /> Generar Nota de Crédito
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Generación de Nota de Crédito</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea generar una nota de crédito para 
              {editorMode === 'creditWithdrawal' 
                ? ` el retiro de saldo de ${foundInvoice?.customerDetails.name}` 
                : ` la factura ${foundInvoice?.invoiceNumber}`}?
              Esta acción generará una nota de crédito por {CURRENCY_SYMBOL}{foundInvoice?.totalAmount.toFixed(2)}.
              Los detalles del reembolso (método, referencia, cajero, vendedor) serán los que acaba de ingresar.
              {editorMode === 'creditWithdrawal' && ` El saldo a favor del cliente ${foundInvoice?.customerDetails.name} se reducirá en este monto.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmedProcessReturn} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Confirmar y Generar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
