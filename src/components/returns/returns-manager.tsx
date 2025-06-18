
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Undo2, Search, History, AlertTriangle, FileCheck2, ArrowRight, DollarSign, UserCog, Gift, Info } from 'lucide-react';
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
type WithdrawalStep = 'enterAmount' | 'confirmDetails';

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export function ReturnsManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [editorMode, setEditorMode] = useState<EditorMode>('invoiceReturn');
  const [withdrawalStep, setWithdrawalStep] = useState<WithdrawalStep>('enterAmount');
  const [invoiceIdInput, setInvoiceIdInput] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
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

  const [returnPaymentMethod, setReturnPaymentMethod] = useState('Efectivo');
  const [returnPaymentReference, setReturnPaymentReference] = useState('');
  const [returnCashier, setReturnCashier] = useState('');
  const [returnSalesperson, setReturnSalesperson] = useState('');

  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState('');
  const [maxAvailableCredit, setMaxAvailableCredit] = useState(0);
  const [targetWithdrawalCustomer, setTargetWithdrawalCustomer] = useState<CustomerDetails | null>(null);


  const prepareForCreditWithdrawal = useCallback((customer: CustomerDetails, withdrawalAmount: number) => {
    setErrorMessage(null);
    setFoundInvoice(null);

    if ((customer.creditBalance ?? 0) < withdrawalAmount) {
        setErrorMessage(`El cliente ${customer.name} no tiene suficiente saldo a favor (${formatCurrency(customer.creditBalance)}) para retirar ${formatCurrency(withdrawalAmount)}.`);
        return;
    }
    if (withdrawalAmount <= 0) {
      setErrorMessage(`El monto a retirar debe ser mayor a cero.`);
      return;
    }

    const syntheticInvoice: Invoice = {
      id: `SYNTHETIC-${uuidv4()}`,
      invoiceNumber: `RETIRO-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      type: 'sale', // Internally, a withdrawal might be modeled as a 'sale' of credit back to the company
      companyDetails: companyDetails,
      customerDetails: customer,
      items: [{ id: uuidv4(), description: "Retiro de Saldo a Favor", quantity: 1, unitPrice: withdrawalAmount, totalPrice: withdrawalAmount }],
      subTotal: withdrawalAmount,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: withdrawalAmount,
      paymentMethods: [{ method: "Saldo a Favor", amount: withdrawalAmount, reference: `Retiro de crédito cliente ${customer.name}` }], // This is conceptual for the preview
      amountPaid: withdrawalAmount, // Effectively "paid" from their credit
      amountDue: 0,
      thankYouMessage: "Procesando retiro de saldo a favor.",
      notes: `Preparando Nota de Crédito para retiro de saldo a favor por ${formatCurrency(withdrawalAmount)} para ${customer.name}.`,
      isCreditDeposit: true, // This flag indicates it's a special type, related to credit balance.
    };
    setFoundInvoice(syntheticInvoice);
    setInvoiceIdInput(syntheticInvoice.invoiceNumber); // Keep a reference for UI if needed
    setWithdrawalStep('confirmDetails');
  }, [companyDetails, customers]);


  const handleSearchInvoice = useCallback(() => {
    setEditorMode('invoiceReturn'); // Explicitly set mode for search
    setErrorMessage(null);
    setFoundInvoice(null);
    if (!invoiceIdInput.trim()) {
      setErrorMessage("Por favor, ingrese un número de factura o ID.");
      return;
    }
    
    const validInvoices = Array.isArray(invoices) ? invoices : [];
    // Prioritize search by invoiceNumber, then by ID
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
      // Check if a return already exists for this invoice
      const existingReturn = validInvoices.find(inv => inv.originalInvoiceId === invoice?.id && inv.type === 'return');
      if (existingReturn) {
        setErrorMessage(`Ya existe una nota de crédito (${existingReturn.invoiceNumber}) para la factura ${invoice.invoiceNumber}.`);
        setFoundInvoice(null); // Clear found invoice if return exists
        return;
      }
      setFoundInvoice(invoice);
      // Reset return specific fields when a new invoice is found
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
    const availableCreditParam = searchParams.get('availableCredit');
    const invoiceIdQueryParam = searchParams.get('invoiceId');

    if (modeParam === 'creditWithdrawal' && customerIdParam && availableCreditParam) {
      const customer = customers.find(c => c.id === customerIdParam);
      const credit = parseFloat(availableCreditParam);
      if (customer && !isNaN(credit) && credit > 0) {
        setEditorMode('creditWithdrawal');
        setTargetWithdrawalCustomer(customer);
        setMaxAvailableCredit(credit);
        setWithdrawalAmountInput(credit.toFixed(2)); // Pre-fill with max, user can change
        setWithdrawalStep('enterAmount');
        setFoundInvoice(null); // Clear any previously found invoice
        setErrorMessage(null);
      } else {
        setErrorMessage("Datos inválidos para retiro de saldo. Regrese y reintente.");
        setEditorMode('invoiceReturn'); // Fallback to normal mode
      }
    } else if (invoiceIdQueryParam) {
      setInvoiceIdInput(invoiceIdQueryParam);
      setEditorMode('invoiceReturn'); // Ensure mode is set for invoice search
    } else {
      setEditorMode('invoiceReturn'); // Default mode
    }
  }, [searchParams, customers]); // Removed 'isClient' from dependencies as it's set once.

  // Effect to auto-search if invoiceId comes from query param
  useEffect(() => {
    // Only run on client after initial setup and if invoiceIdInput is set (likely from query)
    // and no invoice is currently found, and no error message is present,
    // and we are in 'invoiceReturn' mode.
    if (isClient && invoiceIdInput && invoices.length > 0 && !foundInvoice && !errorMessage && editorMode === 'invoiceReturn') {
      // Check if the current invoiceIdInput matches the one from query to avoid re-searching on unrelated input changes.
      const queryInvoiceId = searchParams.get('invoiceId');
      if (invoiceIdInput === queryInvoiceId || (!queryInvoiceId && editorMode === 'invoiceReturn')) { // also search if no query param but in return mode
        handleSearchInvoice();
      }
    }
  }, [invoiceIdInput, invoices, isClient, foundInvoice, errorMessage, searchParams, handleSearchInvoice, editorMode]);

  const handleProceedWithWithdrawalAmount = () => {
    if (!targetWithdrawalCustomer) {
      setErrorMessage("Cliente para retiro no definido.");
      return;
    }
    const amountToWithdraw = parseFloat(withdrawalAmountInput);
    if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
      setErrorMessage("El monto a retirar debe ser un número positivo.");
      return;
    }
    if (amountToWithdraw > maxAvailableCredit) {
      setErrorMessage(`No puede retirar más del saldo disponible (${formatCurrency(maxAvailableCredit)}).`);
      return;
    }
    prepareForCreditWithdrawal(targetWithdrawalCustomer, amountToWithdraw);
  };

  const triggerProcessReturn = () => {
    if (!foundInvoice) {
        toast({
            title: "Error",
            description: `No hay ${editorMode === 'creditWithdrawal' ? 'retiro preparado' : 'factura seleccionada'} para procesar.`,
            variant: "destructive",
        });
        return;
    }
    // Double check for existing return in 'invoiceReturn' mode just before opening dialog
    if (editorMode === 'invoiceReturn') { 
      const existingReturn = invoices.find(inv => inv.originalInvoiceId === foundInvoice.id && inv.type === 'return');
      if (existingReturn) {
          setErrorMessage(`Ya existe una nota de crédito (${existingReturn.invoiceNumber}) para la factura ${foundInvoice.invoiceNumber}.`);
          setFoundInvoice(null); // Clear found invoice
          return;
      }
    }
    setIsConfirmDialogOpen(true);
  };

  const confirmedProcessReturn = () => {
    if (!foundInvoice) return;

    // Re-check for existing return in 'invoiceReturn' mode inside the confirmation logic
    // This handles cases where state might change between triggering and confirming
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
            setInvoiceIdInput(""); // Clear input as the operation is now void
            return;
        }
    }
    
    // Generate new unique invoice number for the credit note
    const newReturnInvoiceNumber = `NC-${editorMode === 'creditWithdrawal' ? 'RETIRO-' : ''}${Date.now().toString().slice(-6)}`;

    // Construct the credit note (return invoice)
    const returnInvoice: Invoice = {
      ...foundInvoice, // Spread original/synthetic invoice details first
      id: uuidv4(), // New unique ID for the credit note
      invoiceNumber: newReturnInvoiceNumber,
      date: new Date().toISOString(),
      type: 'return',
      originalInvoiceId: editorMode === 'creditWithdrawal' ? `CW-${foundInvoice.customerDetails.id}-${Date.now()}` : foundInvoice.id, // Link to original or mark as withdrawal
      cashierNumber: returnCashier,
      salesperson: returnSalesperson,
      paymentMethods: [{ // How the money is being returned/credit applied
        method: returnPaymentMethod,
        amount: foundInvoice.totalAmount, // The full amount of the original/synthetic invoice
        reference: returnPaymentReference,
      }],
      amountPaid: foundInvoice.totalAmount, // This represents the amount "credited" back
      amountDue: 0,  // A credit note itself doesn't have an amount due from customer
      thankYouMessage: editorMode === 'creditWithdrawal' ? `Retiro de Saldo Procesado. Ref. Factura Original: ${foundInvoice.invoiceNumber}` : `Nota de Crédito aplicada a Factura Nro. ${foundInvoice.invoiceNumber}`,
      notes: editorMode === 'creditWithdrawal' ? `Nota de crédito por retiro de saldo a favor de ${foundInvoice.customerDetails.name}.` : `Esta nota de crédito anula o rectifica la factura Nro. ${foundInvoice.invoiceNumber}. ${foundInvoice.notes ? `Notas Originales: ${foundInvoice.notes}` : ''}`.trim(),
      // Ensure these critical financial fields are from the foundInvoice to represent the credit note accurately
      subTotal: foundInvoice.subTotal,
      discountAmount: foundInvoice.discountAmount,
      taxAmount: foundInvoice.taxAmount,
      totalAmount: foundInvoice.totalAmount,
      isCreditDeposit: editorMode === 'creditWithdrawal' ? true : foundInvoice.isCreditDeposit, // Mark NC for withdrawal
      isDebtPayment: false, // NC is not a debt payment
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
    // Logic for 'Crédito a Cuenta Cliente' on regular return:
    // This is typically handled by the invoice editor's overpayment logic for standard invoices
    // For returns, if 'Crédito a Cuenta Cliente' is selected as a refund method,
    // the customer's creditBalance should be increased.
    else if (editorMode === 'invoiceReturn' && returnPaymentMethod === 'Crédito a Cuenta Cliente') {
        setCustomers(prevCustomers =>
            prevCustomers.map(cust =>
                cust.id === foundInvoice.customerDetails.id
                ? { ...cust, creditBalance: (cust.creditBalance ?? 0) + foundInvoice.totalAmount }
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
    // Reset state after successful operation
    setFoundInvoice(null); 
    setInvoiceIdInput(""); 
    setIsConfirmDialogOpen(false);
    setTargetWithdrawalCustomer(null);
    setMaxAvailableCredit(0);
    setWithdrawalAmountInput('');
    setWithdrawalStep('enterAmount');
    // Consider resetting editorMode to default or clearing query params
    router.replace('/returns', {scroll: false}); // Clear query params by replacing current route
  };


  const pageTitle = editorMode === 'creditWithdrawal' ? "Procesar Retiro de Saldo a Favor" : "Procesar Devolución (Generar Nota de Crédito)";
  const pageDescription = editorMode === 'creditWithdrawal' 
    ? (withdrawalStep === 'enterAmount' ? "Especifique el monto a retirar del saldo a favor del cliente." : "Confirme los detalles para generar una nota de crédito por el retiro de saldo.")
    : "Ingrese el número de la factura de venta original para generar una nota de crédito.";

  // Render a basic loading state until client-side hydration completes
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
          {/* Section for Invoice Return Mode */}
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
                    if (foundInvoice) setFoundInvoice(null); // Clear previous search if input changes
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </div>
              <Button onClick={handleSearchInvoice} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Search className="mr-2 h-4 w-4" /> Buscar Factura Original
              </Button>
            </div>
          )}

          {/* Section for Credit Withdrawal Mode - Amount Input */}
          {editorMode === 'creditWithdrawal' && withdrawalStep === 'enterAmount' && targetWithdrawalCustomer && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <h3 className="text-lg font-semibold text-primary">Retirar Saldo de: {targetWithdrawalCustomer.name}</h3>
              <p className="text-sm text-muted-foreground">Saldo a favor disponible: <span className="font-bold">{formatCurrency(maxAvailableCredit)}</span></p>
              <div>
                <Label htmlFor="withdrawalAmountInput">Monto a Retirar ({CURRENCY_SYMBOL})</Label>
                <Input
                  id="withdrawalAmountInput"
                  type="number"
                  step="0.01"
                  value={withdrawalAmountInput}
                  onChange={(e) => setWithdrawalAmountInput(e.target.value)}
                  placeholder={`Max. ${maxAvailableCredit.toFixed(2)}`}
                />
              </div>
              <Button onClick={handleProceedWithWithdrawalAmount} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Continuar con Retiro de {formatCurrency(parseFloat(withdrawalAmountInput) || 0)}
              </Button>
            </div>
          )}

          {/* Link to History */}
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/invoices">
              <History className="mr-2 h-4 w-4" /> Ver Historial (Facturas y Notas de Crédito)
            </Link>
          </Button>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="flex items-center p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview and Return/Withdrawal Details - Shown when an invoice is found or withdrawal is being confirmed */}
      {foundInvoice && (editorMode === 'invoiceReturn' || (editorMode === 'creditWithdrawal' && withdrawalStep === 'confirmDetails')) && (
        <>
          {/* Original/Synthetic Invoice Preview */}
          <Card className="mt-8 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-primary">
                {editorMode === 'creditWithdrawal' 
                  ? `Confirmar Retiro de Saldo para: ${foundInvoice.customerDetails.name}` 
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

          {/* Refund/Return Details Input */}
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
                    {/* Only show "Crédito a Cuenta Cliente" for invoice returns, not for direct credit withdrawals */}
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
          
          {/* Confirmation and Action Button */}
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
                      por el valor total de {editorMode === 'creditWithdrawal' ? "este retiro" : "esta factura"} ({formatCurrency(foundInvoice.totalAmount)}). Este nuevo documento se guardará en el historial.
                  </p>
                  {editorMode === 'invoiceReturn' && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        {/* Information about partial returns if applicable */}
                        Actualmente, no se admite la selección de artículos para devoluciones parciales.
                        La devolución procesada será por la totalidad de la factura original.
                    </p>
                  )}
                  {editorMode === 'creditWithdrawal' && (
                    <div className="flex items-center p-3 mt-2 rounded-md bg-accent/10 border border-accent/30">
                        <Info className="h-5 w-5 mr-2 text-accent" />
                        <p className="text-sm text-foreground">
                            El saldo a favor del cliente <span className="font-semibold">{foundInvoice.customerDetails.name}</span> se reducirá en <span className="font-semibold">{formatCurrency(foundInvoice.totalAmount)}</span>.
                        </p>
                    </div>
                  )}
              </div>
              <Button onClick={triggerProcessReturn} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4" disabled={!foundInvoice}>
                <FileCheck2 className="mr-2 h-4 w-4" /> Generar Nota de Crédito
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Generación de Nota de Crédito</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea generar una nota de crédito para 
              {editorMode === 'creditWithdrawal' 
                ? ` el retiro de saldo de ${foundInvoice?.customerDetails.name}` 
                : ` la factura ${foundInvoice?.invoiceNumber}`}?
              Esta acción generará una nota de crédito por {formatCurrency(foundInvoice?.totalAmount)}.
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

