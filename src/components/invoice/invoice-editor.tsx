

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CompanyDetails, CustomerDetails, InvoiceItem, PaymentDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types";
import { invoiceFormSchema } from "@/lib/schemas";
import { CURRENCY_SYMBOL, DEFAULT_THANK_YOU_MESSAGE, TAX_RATE } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InvoicePreview } from "./invoice-preview";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Users, FileText, DollarSign, Settings, Receipt, CalendarDays, Info, Save, Percent, Search, Ban, ArrowRight, HandCoins, PiggyBank, XCircle, WalletCards, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

const defaultCompany: CompanyDetails = { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" };
const defaultCustomer: CustomerDetails = { id: "", name: "", rif: "", address: "", phone: "", email: "", outstandingBalance: 0, creditBalance: 0 };

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      clearTimeout(timeout);
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
};

type EditorMode = 'normal' | 'debtPayment' | 'creditDeposit';

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export function InvoiceEditor() {
  const [companyDetails] = useLocalStorage<CompanyDetails>("companyDetails", defaultCompany);
  const [customers, setCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const [savedInvoices, setSavedInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [isClient, setIsClient] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('normal');
  const [currentDebtOrCreditAmount, setCurrentDebtOrCreditAmount] = useState(0);
  const [selectedCustomerIdForDropdown, setSelectedCustomerIdForDropdown] = useState<string | undefined>(undefined);
  const [selectedCustomerAvailableCredit, setSelectedCustomerAvailableCredit] = useState(0);

  const [customerRifInput, setCustomerRifInput] = useState("");
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchMessage, setCustomerSearchMessage] = useState<string | null>(null);
  const [showNewCustomerFields, setShowNewCustomerFields] = useState(false);
  
  const isInitializingDebtPaymentRef = useRef(false);
  // const initialNormalResetDoneRef = useRef(false); // This ref seems problematic, handled differently now.
  const initialCustomersLoadAttemptedRef = useRef(false);


  const initialLivePreviewState: Partial<Invoice> = {
    id: '',
    invoiceNumber: "",
    date: new Date(0).toISOString(),
    type: 'sale',
    companyDetails: companyDetails || defaultCompany,
    cashierNumber: "",
    salesperson: "",
    customerDetails: { ...defaultCustomer },
    items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0, totalPrice: 0}],
    paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
    subTotal: 0,
    discountAmount: 0,
    taxRate: TAX_RATE,
    taxAmount: 0,
    totalAmount: 0,
    amountPaid: 0,
    amountDue: 0,
    thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
    notes: "",
    isDebtPayment: false,
    isCreditDeposit: false,
    overpaymentAmount: 0,
    overpaymentHandling: 'creditToAccount',
    changeRefundPaymentMethods: [],
  };

  const [liveInvoicePreview, setLiveInvoicePreview] = useState<Partial<Invoice>>(initialLivePreviewState);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      date: new Date(),
      type: 'sale',
      originalInvoiceId: undefined,
      isDebtPayment: false,
      isCreditDeposit: false,
      cashierNumber: "",
      salesperson: "",
      customerDetails: { ...defaultCustomer },
      items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }],
      paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
      thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
      notes: "",
      taxRate: TAX_RATE,
      discountAmount: 0,
      overpaymentHandlingChoice: 'creditToAccount',
      changeRefundPaymentMethods: [],
    },
  });

  const calculateTotals = useCallback((items: InvoiceItem[], taxRateValue: number, discountAmountValue: number) => {
    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const actualDiscountAmount = discountAmountValue || 0;
    const taxableAmount = Math.max(0, subTotal - actualDiscountAmount);
    const actualTaxRate = taxRateValue || 0;
    const taxAmount = taxableAmount * actualTaxRate;
    const totalAmount = taxableAmount + taxAmount;
    return { subTotal, discountAmount: actualDiscountAmount, taxAmount, totalAmount };
  }, []);
  
  const calculatePaymentSummary = useCallback((payments: PaymentDetails[], totalAmount: number) => {
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const amountDue = totalAmount - amountPaid;
    return { amountPaid, amountDue };
  }, []);

  const resetFormAndState = useCallback((params: { mode?: EditorMode, customerId?: string, amount?: number, callingEffectRef?: React.MutableRefObject<boolean> } = {}) => {
    const { mode = 'normal', customerId, amount = 0, callingEffectRef } = params;
    
    let initialInvoiceNumber = `FACT-${Date.now().toString().slice(-6)}`;
    const initialDate = new Date();
    let initialItemsArr = [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }];
    let initialCustomerState = { ...defaultCustomer };
    let thankYouMsg = DEFAULT_THANK_YOU_MESSAGE;
    let notesMsg = "";
    let formTaxRate = TAX_RATE;
    let formIsDebtPayment = false;
    let formIsCreditDeposit = false;
    
    const targetCustomer = customers.find(c => c.id === customerId);

    if (mode === 'debtPayment' && targetCustomer && amount > 0) {
      initialCustomerState = { ...targetCustomer };
      initialInvoiceNumber = `PAGO-${Date.now().toString().slice(-6)}`;
      initialItemsArr = [{ id: uuidv4(), description: "Abono a Deuda Pendiente", quantity: 1, unitPrice: amount }];
      thankYouMsg = "Gracias por su abono.";
      notesMsg = `Abono a deuda pendiente por ${formatCurrency(amount)}`;
      formTaxRate = 0;
      formIsDebtPayment = true;
    } else if (mode === 'creditDeposit' && targetCustomer) {
      initialCustomerState = { ...targetCustomer };
      initialInvoiceNumber = `DEP-${Date.now().toString().slice(-6)}`;
      initialItemsArr = [{ id: uuidv4(), description: "Depósito a Cuenta Cliente", quantity: 1, unitPrice: 0 }]; // Unit price 0 for deposit, actual amount from payments
      thankYouMsg = "Gracias por su depósito.";
      notesMsg = `Depósito a cuenta cliente. El monto se define en los métodos de pago.`;
      formTaxRate = 0;
      formIsCreditDeposit = true;
    } else { // mode === 'normal' or fallback
      if (targetCustomer) {
        initialCustomerState = {...targetCustomer};
      }
    }
    
    const formValuesToReset: InvoiceFormData = {
      invoiceNumber: initialInvoiceNumber,
      date: initialDate,
      type: 'sale',
      isDebtPayment: formIsDebtPayment,
      isCreditDeposit: formIsCreditDeposit,
      originalInvoiceId: undefined,
      cashierNumber: "",
      salesperson: "",
      customerDetails: initialCustomerState,
      items: initialItemsArr,
      paymentMethods: [{ method: "Efectivo", amount: (mode === 'debtPayment' ? amount : 0) , reference: "" }],
      thankYouMessage: thankYouMsg,
      notes: notesMsg,
      taxRate: formTaxRate,
      discountAmount: 0,
      overpaymentHandlingChoice: 'creditToAccount',
      changeRefundPaymentMethods: [],
    };
    form.reset(formValuesToReset);
        
    const currentItems = (formValuesToReset.items || []).map(item => ({
        ...item,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
      })) as InvoiceItem[];
    const currentTaxRate = formValuesToReset.taxRate ?? TAX_RATE;
    const currentDiscountAmount = formValuesToReset.discountAmount || 0;
    const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(currentItems, currentTaxRate, currentDiscountAmount);
    const { amountPaid, amountDue } = calculatePaymentSummary(formValuesToReset.paymentMethods || [], totalAmount);

    setLiveInvoicePreview({
      ...initialLivePreviewState,
      id: '',
      invoiceNumber: formValuesToReset.invoiceNumber,
      date: formValuesToReset.date ? formValuesToReset.date.toISOString() : new Date().toISOString(),
      type: 'sale',
      companyDetails: companyDetails || defaultCompany,
      cashierNumber: formValuesToReset.cashierNumber,
      salesperson: formValuesToReset.salesperson,
      customerDetails: formValuesToReset.customerDetails as CustomerDetails,
      items: currentItems,
      paymentMethods: formValuesToReset.paymentMethods as PaymentDetails[],
      subTotal,
      discountAmount,
      taxRate: currentTaxRate,
      taxAmount,
      totalAmount,
      amountPaid,
      amountDue,
      thankYouMessage: formValuesToReset.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
      notes: formValuesToReset.notes,
      isDebtPayment: !!formValuesToReset.isDebtPayment,
      isCreditDeposit: !!formValuesToReset.isCreditDeposit,
      overpaymentAmount: amountDue < 0 ? Math.abs(amountDue) : 0,
      overpaymentHandling: formValuesToReset.overpaymentHandlingChoice,
      changeRefundPaymentMethods: formValuesToReset.changeRefundPaymentMethods as PaymentDetails[],
    });
    
    if (callingEffectRef) {
        callingEffectRef.current = false;
    }
    // if (mode === 'normal' && !customerId) {
    //   initialNormalResetDoneRef.current = true;
    // }

  }, [form, customers, companyDetails, calculateTotals, calculatePaymentSummary]);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (searchParams.get('customerId') && customers.length === 0 && !initialCustomersLoadAttemptedRef.current) {
        initialCustomersLoadAttemptedRef.current = true; // Mark attempt to prevent re-entry if customers load late
        return; // Wait for customers to potentially load
    }

    const customerIdParam = searchParams.get('customerId');
    const debtPaymentParam = searchParams.get('debtPayment') === 'true';
    const amountStrParam = searchParams.get('amount');
    const amountParam = parseFloat(amountStrParam || '0');

    if (debtPaymentParam && customerIdParam && amountParam > 0) {
        if (isInitializingDebtPaymentRef.current) return; // Prevent re-entry while initializing
        isInitializingDebtPaymentRef.current = true;

        const targetCustomer = customers.find(c => c.id === customerIdParam);
        if (targetCustomer) {
            setEditorMode('debtPayment');
            setCurrentDebtOrCreditAmount(amountParam);
            setSelectedCustomerIdForDropdown(customerIdParam);
            setCustomerRifInput(targetCustomer.rif);
            setCustomerSearchMessage(`Pagando deuda de: ${targetCustomer.name}`);
            setShowNewCustomerFields(false);
            resetFormAndState({ mode: 'debtPayment', customerId: customerIdParam, amount: amountParam, callingEffectRef: isInitializingDebtPaymentRef });
        } else {
            toast({ variant: "destructive", title: "Cliente no encontrado", description: "No se pudo encontrar el cliente para el pago de deuda." });
            setEditorMode('normal'); // Fallback to normal if customer not found
            resetFormAndState({ mode: 'normal', callingEffectRef: isInitializingDebtPaymentRef });
        }
         // Clean up URL params only after successful initialization
        if (pathname === '/invoice/new' && searchParams.has('debtPayment')) {
             router.replace('/invoice/new', { scroll: false });
        }
        return; // Exit after handling debt payment mode
    }
    
    // If not initializing debt payment, ensure the flag is false
    isInitializingDebtPaymentRef.current = false;
    
    // Only perform the initial "normal" reset if no specific mode is active AND form hasn't been initialized by user/other modes.
    // Check if form is still on default values or values from a special mode that's no longer active.
    const currentInvoiceNumber = form.getValues('invoiceNumber');
    const isDefaultOrSpecialModeNumber = !currentInvoiceNumber || currentInvoiceNumber.startsWith("PAGO-") || currentInvoiceNumber.startsWith("DEP-");

    if (editorMode === 'normal' && isDefaultOrSpecialModeNumber && !selectedCustomerIdForDropdown) {
       resetFormAndState({ mode: 'normal' });
    }

}, [
    isClient, searchParams, customers, editorMode, selectedCustomerIdForDropdown,
    resetFormAndState, toast, pathname, router, form // form added as dependency
]);


  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment } = useFieldArray({
    control: form.control,
    name: "paymentMethods",
  });

  const { fields: changePaymentFields, append: appendChangePayment, remove: removeChangePayment, update: updateChangePayment, replace: replaceChangePayments } = useFieldArray({
    control: form.control,
    name: "changeRefundPaymentMethods",
  });
  
  useEffect(() => {
    const updatePreview = (values: InvoiceFormData) => {
        const currentItems = (values.items || []).map(item => ({
            ...item,
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
        })) as InvoiceItem[];
        
        const currentTaxRate = values.isDebtPayment || values.isCreditDeposit ? 0 : (values.taxRate ?? TAX_RATE);
        const currentDiscountAmount = values.isDebtPayment || values.isCreditDeposit ? 0 : (values.discountAmount || 0);
        const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(currentItems, currentTaxRate, currentDiscountAmount);
        const { amountPaid, amountDue } = calculatePaymentSummary(values.paymentMethods || [], totalAmount);

        let overpaymentAmt = 0;
        let finalAmountDueForInvoice = amountDue;

        if (amountDue < 0) { // Overpayment occurred
            overpaymentAmt = Math.abs(amountDue);
            if (values.overpaymentHandlingChoice === 'refundNow') {
                finalAmountDueForInvoice = 0; // Invoice considered settled if change is given
            }
            // If 'creditToAccount', finalAmountDueForInvoice remains negative to reflect credit.
        }

        setLiveInvoicePreview(prev => ({
            ...prev,
            invoiceNumber: values.invoiceNumber,
            date: values.date ? values.date.toISOString() : (prev.date || new Date(0).toISOString()),
            cashierNumber: values.cashierNumber,
            salesperson: values.salesperson,
            customerDetails: values.customerDetails as CustomerDetails,
            items: currentItems,
            paymentMethods: values.paymentMethods as PaymentDetails[],
            subTotal,
            discountAmount,
            taxRate: currentTaxRate,
            taxAmount,
            totalAmount,
            amountPaid,
            amountDue: finalAmountDueForInvoice,
            thankYouMessage: values.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
            notes: values.notes,
            type: 'sale',
            isDebtPayment: !!values.isDebtPayment,
            isCreditDeposit: !!values.isCreditDeposit,
            overpaymentAmount: overpaymentAmt,
            overpaymentHandling: values.overpaymentHandlingChoice,
            changeRefundPaymentMethods: values.changeRefundPaymentMethods as PaymentDetails[] || [],
        }));
    };
    
    const debouncedUpdatePreview = debounce(updatePreview, 300);

    const subscription = form.watch((values) => {
        debouncedUpdatePreview(values as InvoiceFormData);
    });
    return () => {
        subscription.unsubscribe();
    };
  }, [form, calculateTotals, calculatePaymentSummary]);


  useEffect(() => {
    const watchedOverpaymentHandlingChoice = form.watch("overpaymentHandlingChoice");
    const actualOverpaymentAmount = liveInvoicePreview.overpaymentAmount || 0;

    if (watchedOverpaymentHandlingChoice === 'refundNow' && actualOverpaymentAmount > 0) {
        if (changePaymentFields.length === 0) {
            // Ensure method is set, default to Efectivo
            appendChangePayment({ method: "Efectivo", amount: actualOverpaymentAmount, reference: "" });
        } else if (changePaymentFields.length === 1) {
             const currentChangePayment = changePaymentFields[0];
            if (currentChangePayment.amount !== actualOverpaymentAmount || !currentChangePayment.method) {
                 updateChangePayment(0, { 
                    method: currentChangePayment.method || "Efectivo", 
                    amount: actualOverpaymentAmount, 
                    reference: currentChangePayment.reference || "" 
                });
            }
        }
    } else if (watchedOverpaymentHandlingChoice === 'creditToAccount') {
        if (changePaymentFields.length > 0) {
            replaceChangePayments([]);
        }
    }
  }, [
    form.watch("overpaymentHandlingChoice"),
    liveInvoicePreview.overpaymentAmount,
    changePaymentFields,
    appendChangePayment,
    replaceChangePayments,
    updateChangePayment,
    form // Added form as dependency
]);


  const handleRifSearch = async () => {
    if (editorMode !== 'normal') return;
    if (!customerRifInput.trim()) {
      setCustomerSearchMessage("Ingrese un RIF/Cédula para buscar.");
      setShowNewCustomerFields(false); // Do not show new customer fields if input is empty
      // Reset only customer details part of the form, keep other invoice details
      form.reset({ 
        ...form.getValues(), 
        customerDetails: { ...defaultCustomer, rif: "" } 
      });
      setSelectedCustomerIdForDropdown(undefined); // Clear selection from dropdown
      setSelectedCustomerAvailableCredit(0);
      return;
    }
    setIsSearchingCustomer(true);
    setCustomerSearchMessage("Buscando cliente...");
  
    // Debounce or delay search if needed in a real API scenario
    // For local search, direct is fine.
    const searchTerm = customerRifInput.toUpperCase().replace(/[^A-Z0-9]/gi, '');
    let foundCustomer = customers.find(c => c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === searchTerm);
  
    // If not found by exact RIF, try common CI prefixes (V, E) if input is purely numeric
    if (!foundCustomer && /^[0-9]+$/.test(customerRifInput.trim())) {
      const numericPart = customerRifInput.trim();
      const ciWithV = `V${numericPart}`; // Common for Venezolano
      const ciWithE = `E${numericPart}`; // Common for Extranjero
      foundCustomer = customers.find(c => 
        c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === ciWithV || 
        c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === ciWithE
      );
    }
  
    if (foundCustomer) {
      form.setValue("customerDetails", { ...foundCustomer }, { shouldValidate: true });
      setCustomerRifInput(foundCustomer.rif); // Update input field to reflect the stored RIF format
      setCustomerSearchMessage(`Cliente encontrado: ${foundCustomer.name}`);
      setShowNewCustomerFields(false);
      setSelectedCustomerIdForDropdown(foundCustomer.id); // Sync dropdown
      setSelectedCustomerAvailableCredit(foundCustomer.creditBalance || 0);
    } else {
      // Prepare form for new customer entry, keeping entered RIF
      form.setValue("customerDetails.id", ""); // Clear ID for new customer
      form.setValue("customerDetails.name", "");
      form.setValue("customerDetails.address", "");
      form.setValue("customerDetails.phone", "");
      form.setValue("customerDetails.email", "");
      form.setValue("customerDetails.rif", customerRifInput.toUpperCase(), { shouldValidate: true }); // Use entered RIF
      setCustomerSearchMessage("Cliente no encontrado. Complete los datos para registrarlo.");
      setShowNewCustomerFields(true);
      setSelectedCustomerIdForDropdown(undefined); // Clear dropdown selection
      setSelectedCustomerAvailableCredit(0);
    }
    setIsSearchingCustomer(false);
  };
  
  const handleCustomerSelectFromDropdown = (customerId: string) => {
    if (editorMode !== 'normal') {
        toast({title: "Modo especial activo", description: "Cancele el modo especial actual para cambiar de cliente.", variant: "destructive"});
        return;
    }
    setSelectedCustomerIdForDropdown(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      form.setValue("customerDetails", { ...customer }, { shouldValidate: true });
      setCustomerRifInput(customer.rif); // Sync RIF input field
      setShowNewCustomerFields(false);
      setCustomerSearchMessage(`Cliente seleccionado: ${customer.name}`);
      setSelectedCustomerAvailableCredit(customer.creditBalance || 0);
    } else {
      // Should not happen if customerId comes from the list of customers
      // Reset to a clean state for new customer entry if it somehow does
      form.reset({ 
        ...form.getValues(), 
        customerDetails: { ...defaultCustomer, rif: "" } 
      });
      setCustomerRifInput("");
      setShowNewCustomerFields(true);
      setCustomerSearchMessage("Ingrese los datos para un nuevo cliente o busque por RIF.");
      setSelectedCustomerAvailableCredit(0);
    }
  };

  const handlePaymentMethodChange = (index: number, newMethod: string) => {
    const paymentMethods = form.getValues("paymentMethods");
    const currentPayment = paymentMethods[index];
    
    // Update only the method, keep amount and reference unless specific logic dictates otherwise
    updatePayment(index, { ...currentPayment, method: newMethod, amount: currentPayment.amount });

    // If "Saldo a Favor" is selected in normal mode and customer has credit
    if (newMethod === "Saldo a Favor" && editorMode === 'normal' && selectedCustomerAvailableCredit > 0) {
        // Calculate amount needed to cover the invoice from other payments
        const invoiceTotal = liveInvoicePreview.totalAmount || 0;
        let otherPaymentsTotal = 0;
        paymentMethods.forEach((pm, i) => {
            if (i !== index && pm.method !== "Saldo a Favor") { // Exclude current and other "Saldo a Favor" entries for this calculation
                otherPaymentsTotal += pm.amount || 0;
            }
        });
        const amountDueOnInvoice = Math.max(0, invoiceTotal - otherPaymentsTotal);
        const amountToApplyFromCredit = Math.min(selectedCustomerAvailableCredit, amountDueOnInvoice);
        
        // Update the current payment method's amount to what can be applied from credit
        updatePayment(index, { ...currentPayment, method: newMethod, amount: amountToApplyFromCredit });
    }
  };

  const handleEnterDebtPaymentMode = () => {
    const customer = form.getValues("customerDetails");
    if (customer && customer.id && (customer.outstandingBalance ?? 0) > 0) {
      setEditorMode('debtPayment');
      setCurrentDebtOrCreditAmount(customer.outstandingBalance ?? 0);
      setSelectedCustomerIdForDropdown(customer.id);
      setCustomerRifInput(customer.rif);
      setCustomerSearchMessage(`Pagando deuda de: ${customer.name}`);
      setShowNewCustomerFields(false);
      resetFormAndState({ mode: 'debtPayment', customerId: customer.id, amount: customer.outstandingBalance ?? 0 });
    } else {
      toast({ variant: "destructive", title: "Sin Deuda Pendiente", description: "El cliente seleccionado no tiene deuda pendiente o no hay cliente seleccionado." });
    }
  };

  const handleEnterCreditDepositMode = () => {
    const customer = form.getValues("customerDetails");
    if (customer && customer.id) {
      setEditorMode('creditDeposit');
      setCurrentDebtOrCreditAmount(0); // For credit deposit, amount comes from payment methods
      setSelectedCustomerIdForDropdown(customer.id);
      setCustomerRifInput(customer.rif);
      setCustomerSearchMessage(`Registrando depósito para: ${customer.name}`);
      setShowNewCustomerFields(false);
      resetFormAndState({ mode: 'creditDeposit', customerId: customer.id });
    } else {
      toast({ variant: "destructive", title: "Cliente no seleccionado", description: "Por favor, seleccione o busque un cliente primero." });
    }
  };
  
  function onSubmit(data: InvoiceFormData) {
    let customerToSaveOnInvoice = data.customerDetails;
    let customerWasModified = false;
    let newCustomerJustAdded: CustomerDetails | null = null;

    // Handle new customer creation if fields are shown and no ID exists (normal mode only)
    if (showNewCustomerFields && !data.customerDetails.id && editorMode === 'normal') {
      // Validate required fields for new customer
      if (data.customerDetails.name && data.customerDetails.rif && data.customerDetails.address) {
        const newCustomer: CustomerDetails = {
          ...data.customerDetails, // Includes RIF, name, address, phone, email from form
          id: uuidv4(),
          outstandingBalance: 0, // New customers start with 0 balances
          creditBalance: 0,
        };
        customerToSaveOnInvoice = newCustomer;
        customerWasModified = true; // Flag that customers list needs update
        newCustomerJustAdded = newCustomer; // Keep track of the newly added customer
        toast({ title: "Nuevo Cliente Registrado", description: `Cliente ${newCustomer.name} añadido al sistema.` });
      } else {
        toast({ variant: "destructive", title: "Datos Incompletos del Cliente", description: "Por favor, complete nombre, RIF y dirección para el nuevo cliente." });
        if (!data.customerDetails.name) form.setError("customerDetails.name", {type: "manual", message: "Nombre requerido"});
        if (!data.customerDetails.address) form.setError("customerDetails.address", {type: "manual", message: "Dirección requerida"});
        // RIF validation is handled by schema, but ensure it was indeed entered
        if (!data.customerDetails.rif) form.setError("customerDetails.rif", {type: "manual", message: "RIF/Cédula requerido"});
        return;
      }
    }
    
    // Ensure a customer is effectively selected or created
    if (!customerToSaveOnInvoice || !customerToSaveOnInvoice.rif) { // Check RIF as a key identifier
        toast({ variant: "destructive", title: "Cliente no especificado", description: "Por favor, busque o ingrese los datos del cliente."});
        form.setError("customerDetails.rif", {type: "manual", message: "RIF/Cédula del cliente es requerido"});
        return;
    }

    // Validate "Saldo a Favor" usage
    let totalCreditUsedInTransaction = 0;
    let creditUsageError = false;
    if (editorMode === 'normal') { // Only applies to normal sales
        data.paymentMethods.forEach((pm, index) => {
            if (pm.method === "Saldo a Favor") {
                if (pm.amount < 0) { // Amount should not be negative
                     form.setError(`paymentMethods.${index}.amount`, { type: "manual", message: `Monto de saldo a favor no puede ser negativo.`});
                     creditUsageError = true;
                }
                const currentCust = customers.find(c => c.id === customerToSaveOnInvoice.id);
                const availableCredit = currentCust?.creditBalance || 0;

                if (pm.amount > availableCredit) {
                    form.setError(`paymentMethods.${index}.amount`, { type: "manual", message: `No puede usar más de ${formatCurrency(availableCredit)} de saldo.`});
                    creditUsageError = true;
                }
                totalCreditUsedInTransaction += pm.amount;
            }
        });

        // Double check total credit used against actual available, in case multiple "Saldo a Favor" entries were made
        const currentCustForTotalCheck = customers.find(c => c.id === customerToSaveOnInvoice.id);
        const totalAvailableCreditForCheck = currentCustForTotalCheck?.creditBalance || 0;

        if (totalCreditUsedInTransaction > totalAvailableCreditForCheck) {
             toast({ variant: "destructive", title: "Error de Saldo a Favor", description: `El total de saldo a favor utilizado (${formatCurrency(totalCreditUsedInTransaction)}) excede el disponible (${formatCurrency(totalAvailableCreditForCheck)}).` });
             creditUsageError = true;
        }
        if (creditUsageError) return;
    }

    const finalItems = data.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));

    // For debt payment or credit deposit, tax and discount are forced to 0
    const currentTaxRate = data.isDebtPayment || data.isCreditDeposit ? 0 : (data.taxRate ?? TAX_RATE);
    const currentDiscountAmount = data.isDebtPayment || data.isCreditDeposit ? 0 : (data.discountAmount || 0);
    
    const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(finalItems, currentTaxRate, currentDiscountAmount);
    const { amountPaid, amountDue: rawAmountDue } = calculatePaymentSummary(data.paymentMethods, totalAmount);

    // Handle overpayment logic
    let finalInvoiceAmountDue = rawAmountDue;
    let overpaymentAmountToStore = 0;
    let overpaymentHandlingToStore: 'creditedToAccount' | 'refunded' | undefined = undefined;
    let changeRefundPaymentMethodsToStore: PaymentDetails[] | undefined = undefined;

    if (rawAmountDue < 0) { // Customer overpaid
        overpaymentAmountToStore = Math.abs(rawAmountDue);
        if (data.overpaymentHandlingChoice === 'refundNow') {
            const totalChangeRefunded = (data.changeRefundPaymentMethods || []).reduce((sum, pm) => sum + pm.amount, 0);
            // Use a small tolerance for floating point comparisons
            if (Math.abs(totalChangeRefunded - overpaymentAmountToStore) > 0.001) { // Check if sum of change matches overpayment
                toast({ variant: "destructive", title: "Error en Vuelto", description: `El monto del vuelto procesado (${formatCurrency(totalChangeRefunded)}) no coincide con el sobrepago (${formatCurrency(overpaymentAmountToStore)}).` });
                form.setError("changeRefundPaymentMethods", {type: "manual", message: "El total del vuelto debe igualar el sobrepago."});
                return;
            }
            overpaymentHandlingToStore = 'refunded';
            changeRefundPaymentMethodsToStore = data.changeRefundPaymentMethods;
            finalInvoiceAmountDue = 0; // Invoice is settled
        } else { // 'creditToAccount'
            overpaymentHandlingToStore = 'creditedToAccount';
            // finalInvoiceAmountDue remains negative, this amount will be added to customer's credit balance later
        }
    }


    const fullInvoiceData: Invoice = {
      id: uuidv4(),
      invoiceNumber: data.invoiceNumber,
      date: data.date.toISOString(),
      type: 'sale', // All documents created here are 'sale' type initially. Returns are handled elsewhere.
      isDebtPayment: editorMode === 'debtPayment',
      isCreditDeposit: editorMode === 'creditDeposit',
      companyDetails: companyDetails || defaultCompany,
      customerDetails: customerToSaveOnInvoice,
      cashierNumber: data.cashierNumber,
      salesperson: data.salesperson,
      items: finalItems,
      paymentMethods: data.paymentMethods,
      subTotal,
      discountAmount,
      taxRate: currentTaxRate,
      taxAmount,
      totalAmount,
      amountPaid,
      amountDue: finalInvoiceAmountDue, // This is the final amount due FOR THIS INVOICE after overpayment handling
      thankYouMessage: data.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
      notes: data.notes,
      overpaymentAmount: overpaymentAmountToStore > 0 ? overpaymentAmountToStore : undefined,
      overpaymentHandling: overpaymentHandlingToStore,
      changeRefundPaymentMethods: changeRefundPaymentMethodsToStore,
    };
    
    // Add new invoice to the list
    setSavedInvoices(prevInvoices => [...prevInvoices, fullInvoiceData]);
    
    // Update customer balances
    let currentCustomersList = [...customers];
    if (customerWasModified && newCustomerJustAdded) { // If a new customer was added during this transaction
        currentCustomersList.push(newCustomerJustAdded);
    }

    const customerIndex = currentCustomersList.findIndex(c => c.id === customerToSaveOnInvoice.id);
    if (customerIndex !== -1) {
        const StoredCustomer = {...currentCustomersList[customerIndex]};
        // Ensure balances are numbers
        StoredCustomer.outstandingBalance = StoredCustomer.outstandingBalance || 0;
        StoredCustomer.creditBalance = StoredCustomer.creditBalance || 0;

        // 1. If "Saldo a Favor" was used to pay for a normal sale, deduct from creditBalance
        if (totalCreditUsedInTransaction > 0 && editorMode === 'normal') {
            StoredCustomer.creditBalance -= totalCreditUsedInTransaction;
        }

        // 2. Handle main transaction type effect on balances
        if (editorMode === 'debtPayment') {
            StoredCustomer.outstandingBalance = Math.max(0, StoredCustomer.outstandingBalance - amountPaid);
        } else if (editorMode === 'creditDeposit') {
            // Apply new rule: If depositing and there's outstanding debt, pay debt first
            if (StoredCustomer.outstandingBalance > 0) {
                const amountToPayDebt = Math.min(amountPaid, StoredCustomer.outstandingBalance);
                StoredCustomer.outstandingBalance -= amountToPayDebt;
                const remainingDeposit = amountPaid - amountToPayDebt;
                StoredCustomer.creditBalance += remainingDeposit;
            } else {
                StoredCustomer.creditBalance += amountPaid; // No debt, all deposit goes to credit
            }
        } else { // editorMode === 'normal'
            // For normal sales, update balances based on underpayment or overpayment (if credited)
            if (rawAmountDue > 0) { // Customer underpaid for this normal sale
                StoredCustomer.outstandingBalance += rawAmountDue;
            } else if (rawAmountDue < 0) { // Customer overpaid for this normal sale
                if (overpaymentHandlingToStore === 'creditedToAccount') {
                    StoredCustomer.creditBalance += overpaymentAmountToStore;
                }
                // If 'refundNow', balances are not affected by the overpayment itself, as change was given.
            }
        }
        currentCustomersList[customerIndex] = StoredCustomer;
    } else if (newCustomerJustAdded) { // This block handles a NEW customer created during this transaction.
                                     // (customerIndex was -1, but newCustomerJustAdded exists)
        // This is the first transaction for this new customer.
        // Initialize their balances and apply transaction effects.
        let newCustWithBalance = {...newCustomerJustAdded}; // Already has ID, RIF, name, etc.
        newCustWithBalance.outstandingBalance = 0; // Start with 0
        newCustWithBalance.creditBalance = 0;   // Start with 0

        if (editorMode === 'creditDeposit') {
            // New customer, no pre-existing debt. All deposit goes to credit.
            newCustWithBalance.creditBalance += amountPaid;
        } else if (editorMode === 'normal') {
             if (rawAmountDue > 0) { // Underpaid their first purchase
                newCustWithBalance.outstandingBalance += rawAmountDue;
             } else if (rawAmountDue < 0 && overpaymentHandlingToStore === 'creditedToAccount') { // Overpaid and credited
                newCustWithBalance.creditBalance += overpaymentAmountToStore;
             }
        }
        // 'debtPayment' mode is not applicable for a brand new customer's first transaction.
        
        // Find the newly added customer in the list (if it was pushed earlier) and update it
        const newCustIndexInList = currentCustomersList.findIndex(c => c.id === newCustWithBalance.id);
        if (newCustIndexInList !== -1) {
            currentCustomersList[newCustIndexInList] = newCustWithBalance;
        } else {
            // This case should ideally not happen if newCustomerJustAdded was pushed correctly
            // But as a fallback, add it.
            currentCustomersList.push(newCustWithBalance);
        }
    }
    
    setCustomers(currentCustomersList);
    
    // Toast notification
    let toastTitle = "Factura Guardada";
    if (editorMode === 'debtPayment') toastTitle = "Abono a Deuda Registrado";
    if (editorMode === 'creditDeposit') toastTitle = "Depósito a Cuenta Registrado";

    toast({
      title: toastTitle,
      description: `El documento Nro. ${data.invoiceNumber} ha sido guardado.`,
       action: (
        <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${fullInvoiceData.id}`)}>
          Ver Documento <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    });
    
    // Reset editor to normal mode and clear fields for new invoice
    setEditorMode('normal');
    setCurrentDebtOrCreditAmount(0);
    setSelectedCustomerIdForDropdown(undefined); // Clear customer selection
    setCustomerRifInput(""); // Clear RIF input
    setCustomerSearchMessage(null); // Clear search message
    setShowNewCustomerFields(false); // Hide new customer fields
    resetFormAndState({ mode: 'normal' }); // Reset form to clean slate for a normal invoice
    
    // Clean up URL if it had params
    if (pathname === '/invoice/new' && searchParams.toString()) { // Check if any search params exist
        router.replace('/invoice/new', { scroll: false });
    }
  }
  
  const handleCancelInvoice = () => {
    // Reset everything to a clean "normal" invoice state
    setEditorMode('normal');
    setCurrentDebtOrCreditAmount(0);
    setSelectedCustomerIdForDropdown(undefined);
    setCustomerRifInput("");
    setCustomerSearchMessage(null);
    setShowNewCustomerFields(false);
    resetFormAndState({ mode: 'normal' });
    toast({
        title: "Creación Cancelada",
        description: "El documento ha sido descartado.",
    });
    // Clean up URL if it had params
    if (pathname === '/invoice/new' && searchParams.toString()) {
        router.replace('/invoice/new', { scroll: false });
    }
    router.push('/dashboard'); // Optionally redirect or just clear form
  };

  const previewCompanyDetails = companyDetails; // Use the one from localStorage
  const getEditorTitle = () => {
    if (editorMode === 'debtPayment') return "Registrar Abono a Deuda";
    if (editorMode === 'creditDeposit') return "Registrar Depósito a Cuenta Cliente";
    return "Crear Nueva Factura";
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 animate-pulse text-primary" />
        <p className="text-xl font-semibold">Cargando editor...</p>
      </div>
    );
  }

  // Determine if debt payment or credit deposit buttons should be shown for the currently selected/entered customer
  const currentCustomerForActions = form.getValues("customerDetails");
  const showOverpaymentSection = liveInvoicePreview.overpaymentAmount && liveInvoicePreview.overpaymentAmount > 0.001 && editorMode === 'normal';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <form onSubmit={form.handleSubmit(onSubmit)} className="lg:col-span-2 space-y-8 no-print">
        <Form {...form}> {/* Ensure Form context wraps everything */}
            {/* Invoice Header Card: Number, Date, Cashier, Salesperson */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center text-primary">
                  <FileText className="mr-2 h-5 w-5" />
                  {getEditorTitle()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="invoiceNumber">Número de Documento</FormLabel>
                        <FormControl>
                          <Input id="invoiceNumber" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="date">Fecha</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                              id="date"
                              variant={"outline"}
                              className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                            </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                  // Ensure a date is selected, then update.
                                  // The field.onChange from RHF expects a Date object or null.
                                  if (date) field.onChange(date);
                              }}
                              initialFocus
                              locale={es}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:items-start">
                  <FormField
                    control={form.control}
                    name="cashierNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="cashierNumber">Número de Caja (Opcional)</FormLabel>
                        <FormControl>
                          <Input id="cashierNumber" {...field} placeholder="Ej: 01" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salesperson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="salesperson">Vendedor (Opcional)</FormLabel>
                        <FormControl>
                          <Input id="salesperson" {...field} placeholder="Ej: Ana Pérez" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center text-primary"><Users className="mr-2 h-5 w-5" />Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* RIF Search and Select Dropdown */}
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                  <FormItem className="flex-grow">
                    <FormLabel htmlFor="customerRifInput">RIF/Cédula del Cliente</FormLabel>
                    <FormControl>
                      <Input
                        id="customerRifInput"
                        placeholder="Ingrese RIF/Cédula y presione Enter o Busque"
                        value={customerRifInput}
                        onChange={(e) => setCustomerRifInput(e.target.value)}
                        onBlur={handleRifSearch} // Search on blur
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRifSearch(); }}} // Search on Enter
                        disabled={editorMode !== 'normal'} // Disable if not in normal invoice mode
                      />
                    </FormControl>
                  </FormItem>
                  <Button type="button" onClick={handleRifSearch} disabled={isSearchingCustomer || editorMode !== 'normal'} className="w-full sm:w-auto">
                    <Search className="mr-2 h-4 w-4" /> {isSearchingCustomer ? "Buscando..." : "Buscar"}
                  </Button>
                </div>

                {/* Customer Search Message */}
                {customerSearchMessage && <p className={`text-sm mt-1 ${form.formState.errors.customerDetails?.rif || form.formState.errors.customerDetails?.name ? 'text-destructive' : 'text-muted-foreground'}`}>{customerSearchMessage}</p>}
                
                {/* Customer Detail Fields (potentially for new customer) */}
                <div className="space-y-3 pt-3 border-t mt-3">
                  <FormField control={form.control} name="customerDetails.rif" render={({ field }) => (
                      <FormItem>
                          <FormLabel>RIF/CI (verificado/ingresado)</FormLabel>
                          <FormControl><Input {...field} readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id"))} placeholder="RIF del cliente" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.name" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Nombre/Razón Social</FormLabel>
                          <FormControl><Input {...field} placeholder="Nombre del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown)} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.address" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Dirección Fiscal</FormLabel>
                          <FormControl><Textarea {...field} placeholder="Dirección del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown)} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.phone" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Teléfono (Opcional)</FormLabel>
                          <FormControl><Input {...field} placeholder="Teléfono del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown)} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.email" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Email (Opcional)</FormLabel>
                          <FormControl><Input {...field} type="email" placeholder="Email del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown)} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>

                {/* Customer Select Dropdown */}
                <FormItem className="mt-4">
                  <FormLabel>O seleccionar de la lista:</FormLabel>
                  <Select onValueChange={handleCustomerSelectFromDropdown} value={selectedCustomerIdForDropdown || ""} disabled={editorMode !== 'normal'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente existente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.rif})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage>{form.formState.errors.customerDetails && typeof form.formState.errors.customerDetails !== 'string' && (form.formState.errors.customerDetails as any)?.message}</FormMessage>
                </FormItem>

                {/* Buttons for Debt Payment / Credit Deposit */}
                {editorMode === 'normal' && currentCustomerForActions?.id && (
                  <div className="pt-4 mt-4 border-t space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                    {(currentCustomerForActions.outstandingBalance ?? 0) > 0 && (
                      <Button type="button" variant="outline" onClick={handleEnterDebtPaymentMode} className="w-full sm:w-auto">
                          <HandCoins className="mr-2 h-4 w-4" /> Cobrar Deuda Pendiente ({formatCurrency(currentCustomerForActions.outstandingBalance ?? 0)})
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={handleEnterCreditDepositMode} className="w-full sm:w-auto">
                          <PiggyBank className="mr-2 h-4 w-4" /> Registrar Depósito a Cuenta
                      </Button>
                  </div>
                )}
                {/* Button to cancel special mode */}
                {editorMode !== 'normal' && (
                  <div className="pt-4 mt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => {
                        setEditorMode('normal');
                        setCurrentDebtOrCreditAmount(0);
                        // Reset form to normal, potentially keeping selected customer if valid
                        resetFormAndState({mode: 'normal', customerId: selectedCustomerIdForDropdown });
                      }} className="w-full">
                          <Ban className="mr-2 h-4 w-4" /> Cancelar Modo Especial / Nueva Factura
                      </Button>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Invoice Items Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center text-primary"><Receipt className="mr-2 h-5 w-5" />Artículos del Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {itemFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end p-3 border rounded-md">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Input 
                              {...f} 
                              placeholder="Artículo o Servicio" 
                              readOnly={editorMode === 'debtPayment' || editorMode === 'creditDeposit'} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input 
                              {...f} 
                              type="number" 
                              step="0.01" 
                              placeholder="1" 
                              onChange={e => f.onChange(parseFloat(e.target.value) || 0)} 
                              readOnly={editorMode === 'debtPayment' || editorMode === 'creditDeposit'} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Precio Unit. ({CURRENCY_SYMBOL})</FormLabel>
                          <FormControl>
                            <Input 
                              {...f} 
                              value={(editorMode === 'creditDeposit' && f.value === 0) ? '' : (f.value === 0 ? '' : f.value)} // Clear '0' for non-credit-deposit unit price
                              onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              readOnly={editorMode === 'debtPayment' || (editorMode === 'creditDeposit' && f.name === `items.${index}.unitPrice`)} // Unit price fixed for credit deposit
                            />
                          </FormControl> 
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(index)} 
                      className="text-destructive hover:text-destructive/80" 
                      disabled={editorMode !== 'normal' || itemFields.length <= 1} // Can't remove if not normal mode or only one item
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
                <FormMessage>{form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) ? (form.formState.errors.items as any).message : null}</FormMessage>
                <FormMessage>{form.formState.errors.items && Array.isArray(form.formState.errors.items) && form.formState.errors.items.length ===0 && (form.formState.errors.items as any)?.message ? (form.formState.errors.items as any).message : null}</FormMessage>
                {editorMode === 'normal' && (
                  <Button type="button" variant="outline" onClick={() => appendItem({ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Artículo
                  </Button>
                )}
                {editorMode !== 'normal' && (
                  <div className="flex items-center p-3 rounded-md bg-accent/10 text-foreground border border-accent/30">
                    <Info className="h-5 w-5 mr-2" />
                    <p className="text-sm">
                      {editorMode === 'debtPayment' 
                        ? "Está registrando un abono a una deuda. No se pueden modificar los artículos." 
                        : "Está registrando un depósito a cuenta. Los detalles del artículo son fijos. Ingrese el monto del depósito en 'Detalles del Pago'."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Details Card */}
            <Card>
              <CardHeader>
                  <CardTitle className="text-xl flex items-center text-primary"><DollarSign className="mr-2 h-5 w-5" />Detalles del Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {paymentFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 border rounded-md">
                          <FormField
                              control={form.control}
                              name={`paymentMethods.${index}.method`}
                              render={({ field: f }) => (
                                  <FormItem>
                                      <FormLabel>Método</FormLabel>
                                      <Select 
                                        onValueChange={(value) => handlePaymentMethodChange(index, value)} 
                                        value={f.value}
                                        // Disable "Saldo a Favor" if not applicable or in special modes where it's not the primary payment
                                        disabled={editorMode !== 'normal' && f.value === 'Saldo a Favor'}
                                      >
                                        <FormControl>
                                          <SelectTrigger><SelectValue placeholder="Seleccione método" /></SelectTrigger>
                                        </FormControl>
                                          <SelectContent>
                                              <SelectItem value="Efectivo">Efectivo</SelectItem>
                                              <SelectItem value="Tarjeta de Débito">Tarjeta de Débito</SelectItem>
                                              <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                                              <SelectItem value="Transferencia">Transferencia</SelectItem>
                                              <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                                              <SelectItem value="Zelle">Zelle</SelectItem>
                                              {/* Show "Saldo a Favor" only in normal mode and if customer has credit */}
                                              {selectedCustomerAvailableCredit > 0 && editorMode === 'normal' && (
                                                <SelectItem value="Saldo a Favor">
                                                  Saldo a Favor (Disp: {formatCurrency(selectedCustomerAvailableCredit)})
                                                </SelectItem>
                                              )}
                                              <SelectItem value="Otro">Otro</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name={`paymentMethods.${index}.amount`}
                              render={({ field: f }) => (
                                  <FormItem>
                                      <FormLabel>Monto ({CURRENCY_SYMBOL})</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...f} 
                                          value={f.value === 0 ? '' : f.value} // Display empty string for 0
                                          onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                                          type="number" 
                                          step="0.01" 
                                          placeholder="0.00"
                                          // ReadOnly if using Saldo a Favor and it auto-fills, or not in normal credit deposit mode for amount input
                                          readOnly={form.getValues(`paymentMethods.${index}.method`) === 'Saldo a Favor' && editorMode === 'normal' && (liveInvoicePreview.totalAmount || 0) <= selectedCustomerAvailableCredit && (liveInvoicePreview.totalAmount || 0) > 0} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name={`paymentMethods.${index}.reference`}
                              render={({ field: f }) => (
                                  <FormItem>
                                      <FormLabel>Referencia (Opcional)</FormLabel>
                                      <FormControl><Input {...f} placeholder="Nro. de confirmación" /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)} className="text-destructive hover:text-destructive/80" disabled={paymentFields.length <=1}>
                              <Trash2 className="h-5 w-5" />
                          </Button>
                      </div>
                  ))}
                  <FormMessage>{form.formState.errors.paymentMethods && typeof form.formState.errors.paymentMethods === 'object' && !Array.isArray(form.formState.errors.paymentMethods) ? (form.formState.errors.paymentMethods as any).message : null}</FormMessage>
                  <Button type="button" variant="outline" onClick={() => appendPayment({ method: "Efectivo", amount: 0, reference: "" })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Método de Pago
                  </Button>
              </CardContent>
            </Card>

            {/* Overpayment Handling Card - only if overpayment occurred in normal mode */}
            {showOverpaymentSection && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center text-primary">
                            <WalletCards className="mr-2 h-5 w-5" />
                            Manejo de Sobrepago ({formatCurrency(liveInvoicePreview.overpaymentAmount)})
                        </CardTitle>
                        <CardDescription>El cliente ha pagado de más. Seleccione cómo proceder con el excedente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="overpaymentHandlingChoice"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>¿Qué hacer con el monto excedente de {formatCurrency(liveInvoicePreview.overpaymentAmount)}?</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="creditToAccount" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Abonar a Saldo a Favor del Cliente
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="refundNow" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Procesar Vuelto/Reembolso Ahora
                                        </FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Details for "Refund Now" choice */}
                        {form.watch("overpaymentHandlingChoice") === 'refundNow' && (
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-md font-semibold text-muted-foreground">Detalles del Vuelto/Reembolso:</h3>
                                {changePaymentFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 border rounded-md bg-muted/30">
                                        <FormField
                                            control={form.control}
                                            name={`changeRefundPaymentMethods.${index}.method`}
                                            render={({ field: f }) => (
                                                <FormItem>
                                                    <FormLabel>Método de Vuelto</FormLabel>
                                                    <Select onValueChange={f.onChange} defaultValue={f.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione método" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                                                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                                                            <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                                                            <SelectItem value="Otro">Otro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`changeRefundPaymentMethods.${index}.amount`}
                                            render={({ field: f }) => (
                                                <FormItem>
                                                    <FormLabel>Monto Vuelto ({CURRENCY_SYMBOL})</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            {...f}
                                                            value={f.value === 0 ? '' : f.value}
                                                            onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                                                            type="number" step="0.01" placeholder="0.00" 
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`changeRefundPaymentMethods.${index}.reference`}
                                            render={({ field: f }) => (
                                                <FormItem>
                                                    <FormLabel>Referencia Vuelto (Opc.)</FormLabel>
                                                    <FormControl><Input {...f} placeholder="Nro. de confirmación" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeChangePayment(index)} className="text-destructive hover:text-destructive/80" disabled={changePaymentFields.length <=1}>
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendChangePayment({ method: "Efectivo", amount: 0, reference: "" })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Método de Vuelto
                                </Button>
                                 <FormMessage>{form.formState.errors.changeRefundPaymentMethods && typeof form.formState.errors.changeRefundPaymentMethods === 'string' && (form.formState.errors.changeRefundPaymentMethods as any)?.message}</FormMessage>
                                 <FormMessage>{form.formState.errors.changeRefundPaymentMethods && Array.isArray(form.formState.errors.changeRefundPaymentMethods) && (form.formState.errors.changeRefundPaymentMethods as any)?.message}</FormMessage>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Additional Settings Card: Discount, Tax, Messages */}
            <Card>
              <CardHeader>
                  <CardTitle className="text-xl flex items-center text-primary"><Settings className="mr-2 h-5 w-5" />Configuración Adicional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <FormField
                      control={form.control}
                      name="discountAmount"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel className="flex items-center">
                                <Percent className="mr-2 h-4 w-4 text-muted-foreground" />
                                Monto de Descuento ({CURRENCY_SYMBOL}) (Opcional)
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  value={field.value === 0 ? '' : field.value} // Display empty for 0
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  readOnly={editorMode !== 'normal'} // Discount only in normal mode
                                />
                              </FormControl>
                              {editorMode !== 'normal' && <p className="text-xs text-muted-foreground mt-1">Los descuentos no aplican en este modo.</p>}
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Tasa de IVA (ej. 0.16 para 16%)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.16" 
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                                  readOnly={editorMode !== 'normal'} // Tax only in normal mode
                                />
                              </FormControl>
                              {editorMode !== 'normal' && <p className="text-xs text-muted-foreground mt-1">El IVA no aplica en este modo.</p>}
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="thankYouMessage"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Mensaje de Agradecimiento</FormLabel>
                              <FormControl><Input {...field} placeholder="¡Gracias por su compra!" /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                              <FormControl><Textarea {...field} placeholder="Ej: Garantía válida por 30 días." /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </CardContent>
              <CardFooter className="flex-col sm:flex-row items-stretch gap-3">
                  <Button type="submit" className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Save className="mr-2 h-4 w-4" /> 
                      {editorMode === 'debtPayment' && "Guardar Abono a Deuda"}
                      {editorMode === 'creditDeposit' && "Guardar Depósito a Cuenta"}
                      {editorMode === 'normal' && "Guardar y Generar Factura"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelInvoice} className="w-full sm:w-auto">
                      <XCircle className="mr-2 h-4 w-4" /> Cancelar Documento
                  </Button>
              </CardFooter>
            </Card>
        </Form>
      </form>
      
      {/* Invoice Preview Section */}
      <div className="lg:col-span-1 space-y-4 sticky top-20"> 
        <Card className="shadow-md no-print" data-invoice-preview-header>
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-primary">
              <Info className="mr-2 h-5 w-5" />
              Previsualización de {editorMode === 'debtPayment' ? "Abono" : editorMode === 'creditDeposit' ? "Depósito" : "Factura"}
            </CardTitle>
            <CardDescription>Así se verá su documento. Use el botón de abajo para imprimir.</CardDescription>
          </CardHeader>
        </Card>
        <InvoicePreview invoice={liveInvoicePreview} companyDetails={previewCompanyDetails} className="print-receipt" />
      </div>
    </div>
  );
}
