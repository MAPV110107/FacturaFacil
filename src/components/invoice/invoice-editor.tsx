
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CompanyDetails, CustomerDetails, InvoiceItem, PaymentDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID, defaultCustomer } from "@/lib/types";
import { invoiceFormSchema } from "@/lib/schemas";
import { CURRENCY_SYMBOL, DEFAULT_THANK_YOU_MESSAGE, TAX_RATE } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { InvoicePreview } from "./invoice-preview";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Users, FileText, DollarSign, Settings, Receipt, CalendarDays, Info, Save, Percent, Search, Ban, ArrowRight, HandCoins, PiggyBank, XCircle, WalletCards, RotateCcw, ShieldCheck, Clock, History, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { format, addDays, addMonths, addYears } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
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


type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
type InvoiceItemForm = InvoiceFormData['items'][number];


const defaultCompany: CompanyDetails = { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" };

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

const warrantyDurationOptions = [
  { value: "no_aplica", label: "No Aplica" },
  { value: "7_dias", label: "7 Días" },
  { value: "15_dias", label: "15 Días" },
  { value: "1_mes", label: "1 Mes" },
  { value: "3_meses", label: "3 Meses" },
  { value: "6_meses", label: "6 Meses" },
  { value: "1_anio", label: "1 Año" },
  { value: "personalizado", label: "Personalizado (detallar en texto)" },
];

const SESSION_STORAGE_DRAFT_KEY = "invoiceEditorDraft_v2";

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

  const [lastSavedInvoiceId, setLastSavedInvoiceId] = useState<string | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const internalNavigationRef = useRef(false);


  const initialLivePreviewState: Partial<Invoice> = {
    id: '', 
    invoiceNumber: "",
    date: new Date(0).toISOString(), 
    type: 'sale',
    status: 'active',
    companyDetails: companyDetails || defaultCompany,
    cashierNumber: "",
    salesperson: "",
    customerDetails: { ...defaultCustomer },
    items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0, totalPrice: 0}],
    paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
    subTotal: 0,
    discountPercentage: 0,
    discountValue: 0,
    taxRate: TAX_RATE,
    taxAmount: 0,
    totalAmount: 0,
    amountPaid: 0,
    amountDue: 0,
    thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
    notes: "",
    warrantyText: "",
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
      applyTax: true,
      taxRate: TAX_RATE * 100,
      applyDiscount: false,
      discountPercentage: 0,
      discountValue: 0,
      applyWarranty: false,
      warrantyDuration: "no_aplica",
      warrantyText: "",
      overpaymentHandlingChoice: 'creditToAccount',
      changeRefundPaymentMethods: [],
    },
  });

  const calculateTotals = useCallback((items: InvoiceItem[], taxRatePercentValue: number, discountValueFromForm: number, applyTaxFlag: boolean) => {
    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const actualDiscountValue = discountValueFromForm;
    const taxableAmount = Math.max(0, subTotal - actualDiscountValue);
    const actualTaxRateDecimal = applyTaxFlag ? (taxRatePercentValue || 0) / 100 : 0;
    const taxAmount = taxableAmount * actualTaxRateDecimal;
    const totalAmount = taxableAmount + taxAmount;
    return { subTotal, discountAmount: actualDiscountValue, taxAmount, totalAmount };
  }, []);

  const calculatePaymentSummary = useCallback((payments: PaymentDetails[], totalAmount: number) => {
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const amountDue = totalAmount - amountPaid;
    return { amountPaid, amountDue };
  }, []);

  const resetFormAndState = useCallback((params: { mode?: EditorMode, customerId?: string, amount?: number, resetToDefaultBlank?: boolean } = {}) => {
    const { mode = 'normal', customerId, amount = 0, resetToDefaultBlank = false } = params;

    let initialInvoiceNumber = `FACT-${Date.now().toString().slice(-6)}`;
    const initialDate = new Date();
    let initialItemsArr = [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }];
    let initialCustomerState = { ...defaultCustomer };
    let thankYouMsg = DEFAULT_THANK_YOU_MESSAGE;
    let notesMsg = "";

    let formTaxRatePercent = TAX_RATE * 100;
    let formApplyTax = true;
    let formApplyDiscount = false;
    let formDiscountPercentage = 0;
    let formDiscountValue = 0;
    let formIsDebtPayment = false;
    let formIsCreditDeposit = false;
    let formApplyWarranty = false;
    let formWarrantyDuration = "no_aplica";
    let formWarrantyText = "";

    const targetCustomer = customers.find(c => c.id === customerId);

    if (mode === 'debtPayment' && targetCustomer && amount > 0) {
      initialCustomerState = { ...targetCustomer };
      initialInvoiceNumber = `PAGO-${Date.now().toString().slice(-6)}`;
      initialItemsArr = [{ id: uuidv4(), description: "Abono a Deuda Pendiente", quantity: 1, unitPrice: amount }];
      thankYouMsg = "Gracias por su abono.";
      notesMsg = `Abono a deuda pendiente por ${formatCurrency(amount)}`;
      formTaxRatePercent = 0;
      formApplyTax = false;
      formApplyDiscount = false;
      formDiscountPercentage = 0;
      formDiscountValue = 0;
      formIsDebtPayment = true;
      formApplyWarranty = false;
    } else if (mode === 'creditDeposit' && targetCustomer) {
      initialCustomerState = { ...targetCustomer };
      initialInvoiceNumber = `DEP-${Date.now().toString().slice(-6)}`;
      initialItemsArr = [{ id: uuidv4(), description: "Depósito a Cuenta Cliente", quantity: 1, unitPrice: 0 }];
      thankYouMsg = "Gracias por su depósito.";
      notesMsg = `Depósito a cuenta cliente. El monto se define en los métodos de pago.`;
      formTaxRatePercent = 0;
      formApplyTax = false;
      formApplyDiscount = false;
      formDiscountPercentage = 0;
      formDiscountValue = 0;
      formIsCreditDeposit = true;
      formApplyWarranty = false;
    } else {
      if (targetCustomer && !resetToDefaultBlank) { 
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
      applyTax: formApplyTax,
      taxRate: formTaxRatePercent,
      applyDiscount: formApplyDiscount,
      discountPercentage: formDiscountPercentage,
      discountValue: formDiscountValue,
      applyWarranty: formApplyWarranty,
      warrantyDuration: formWarrantyDuration,
      warrantyText: formWarrantyText,
      overpaymentHandlingChoice: 'creditToAccount',
      changeRefundPaymentMethods: [],
    };
    form.reset(formValuesToReset);

    // If resetting to a truly blank state, also clear draft from sessionStorage
    if (resetToDefaultBlank && typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
    }

    const currentItems = (formValuesToReset.items || []).map(item => ({
        ...item,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
      })) as InvoiceItem[];
    const currentTaxRatePercent = formValuesToReset.taxRate ?? TAX_RATE * 100;
    const currentApplyTax = formValuesToReset.applyTax ?? true;
    const currentDiscountValue = formValuesToReset.discountValue || 0;
    const currentDiscountPercentage = formValuesToReset.discountPercentage || 0;


    const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(currentItems, currentTaxRatePercent, currentDiscountValue, currentApplyTax);
    const { amountPaid, amountDue } = calculatePaymentSummary(formValuesToReset.paymentMethods || [], totalAmount);

    setLiveInvoicePreview({
      ...initialLivePreviewState,
      id: '', 
      status: 'active', 
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
      discountPercentage: currentDiscountPercentage,
      discountValue: discountAmount,
      taxRate: currentApplyTax ? (currentTaxRatePercent / 100) : 0,
      taxAmount,
      totalAmount,
      amountPaid,
      amountDue,
      thankYouMessage: formValuesToReset.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
      notes: formValuesToReset.notes,
      warrantyText: formValuesToReset.applyWarranty ? formValuesToReset.warrantyText : undefined,
      isDebtPayment: !!formValuesToReset.isDebtPayment,
      isCreditDeposit: !!formValuesToReset.isCreditDeposit,
      overpaymentAmount: amountDue < 0 ? Math.abs(amountDue) : 0,
      overpaymentHandling: formValuesToReset.overpaymentHandlingChoice,
      changeRefundPaymentMethods: formValuesToReset.changeRefundPaymentMethods as PaymentDetails[],
    });
    
  }, [form, customers, companyDetails, calculateTotals, calculatePaymentSummary, initialLivePreviewState]);


  useEffect(() => {
    setIsClient(true);
  }, []);

  // Main effect for handling URL params and draft loading/initialization
  useEffect(() => {
    if (!isClient) return;

    if (internalNavigationRef.current) {
        internalNavigationRef.current = false;
        return;
    }

    const customerIdParam = searchParams.get('customerId');
    const debtPaymentParam = searchParams.get('debtPayment') === 'true';
    const creditDepositParam = searchParams.get('creditDeposit') === 'true';
    const amountStrParam = searchParams.get('amount');
    const amountParam = parseFloat(amountStrParam || '0');
    const newInvoiceParam = searchParams.get('new') === 'true';

    let actionTakenByUrl = false;

    // Priority 1: Explicit URL actions (clear draft and reset for action)
    if (newInvoiceParam) {
        if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
        setLastSavedInvoiceId(null);
        resetFormAndState({ mode: 'normal', resetToDefaultBlank: true });
        setEditorMode('normal');
        setSelectedCustomerIdForDropdown(undefined);
        setCustomerRifInput("");
        setCustomerSearchMessage(null);
        setShowNewCustomerFields(false);
        setSelectedCustomerAvailableCredit(0);
        internalNavigationRef.current = true;
        router.replace('/invoice/new', { scroll: false });
        actionTakenByUrl = true;
    } else if (debtPaymentParam && customerIdParam && amountParam > 0) {
        const targetCustomer = customers.find(c => c.id === customerIdParam);
        if (targetCustomer) {
            if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
            setLastSavedInvoiceId(null);
            resetFormAndState({ mode: 'debtPayment', customerId: customerIdParam, amount: amountParam });
            setEditorMode('debtPayment');
            setCurrentDebtOrCreditAmount(amountParam);
            setSelectedCustomerIdForDropdown(customerIdParam);
            setCustomerRifInput(targetCustomer.rif);
            setCustomerSearchMessage(`Pagando deuda de: ${targetCustomer.name}`);
            setShowNewCustomerFields(false);
            setSelectedCustomerAvailableCredit(targetCustomer.creditBalance || 0);
            internalNavigationRef.current = true;
            router.replace('/invoice/new', { scroll: false });
            actionTakenByUrl = true;
        } else {
            toast({ variant: "destructive", title: "Cliente no encontrado para pago de deuda." });
        }
    } else if (creditDepositParam && customerIdParam) {
        const targetCustomer = customers.find(c => c.id === customerIdParam);
        if (targetCustomer) {
            if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
            setLastSavedInvoiceId(null);
            resetFormAndState({ mode: 'creditDeposit', customerId: customerIdParam });
            setEditorMode('creditDeposit');
            setCurrentDebtOrCreditAmount(0);
            setSelectedCustomerIdForDropdown(customerIdParam);
            setCustomerRifInput(targetCustomer.rif);
            setCustomerSearchMessage(`Registrando depósito para: ${targetCustomer.name}`);
            setShowNewCustomerFields(false);
            setSelectedCustomerAvailableCredit(targetCustomer.creditBalance || 0);
            internalNavigationRef.current = true;
            router.replace('/invoice/new', { scroll: false });
            actionTakenByUrl = true;
        } else {
             toast({ variant: "destructive", title: "Cliente no encontrado para depósito a cuenta." });
        }
    }

    if (actionTakenByUrl) {
        return;
    }

    // Priority 2: Viewing a just-saved invoice
    if (lastSavedInvoiceId) {
        const savedInvoiceData = form.getValues();
        const custDetails = savedInvoiceData.customerDetails;
        if (custDetails) {
            setCustomerRifInput(custDetails.rif || "");
            setSelectedCustomerIdForDropdown(custDetails.id || undefined);
            const foundCust = customers.find(c => c.id === custDetails.id);
            setSelectedCustomerAvailableCredit(foundCust?.creditBalance || 0);
            setCustomerSearchMessage(custDetails.name ? `Cliente: ${custDetails.name}` : "Cliente no especificado");
            setShowNewCustomerFields(!custDetails.id && !!custDetails.rif);
        }
        return;
    }

    // Priority 3: Load draft from sessionStorage
    const draftDataJson = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_DRAFT_KEY) : null;
    if (draftDataJson) {
        try {
            const draftData: InvoiceFormData = JSON.parse(draftDataJson);
            if (draftData.date && typeof draftData.date === 'string') {
                draftData.date = new Date(draftData.date);
            }
            form.reset(draftData);

            const loadedCustomerDetails = draftData.customerDetails;
            if (loadedCustomerDetails) {
                form.setValue('customerDetails.id', loadedCustomerDetails.id || "", { shouldValidate: true });
                form.setValue('customerDetails.name', loadedCustomerDetails.name || "", { shouldValidate: true });
                form.setValue('customerDetails.rif', loadedCustomerDetails.rif || "", { shouldValidate: true });
                form.setValue('customerDetails.address', loadedCustomerDetails.address || "", { shouldValidate: true });
                form.setValue('customerDetails.phone', loadedCustomerDetails.phone || "", { shouldValidate: true });
                form.setValue('customerDetails.email', loadedCustomerDetails.email || "", { shouldValidate: true });
                form.setValue('customerDetails.outstandingBalance', loadedCustomerDetails.outstandingBalance || 0);
                form.setValue('customerDetails.creditBalance', loadedCustomerDetails.creditBalance || 0);


                setCustomerRifInput(loadedCustomerDetails.rif || "");
                if (loadedCustomerDetails.id) {
                    const existingCustomer = customers.find(c => c.id === loadedCustomerDetails.id);
                    setSelectedCustomerIdForDropdown(existingCustomer?.id);
                    setSelectedCustomerAvailableCredit(existingCustomer?.creditBalance || 0);
                    setCustomerSearchMessage(existingCustomer ? `Cliente cargado del borrador: ${existingCustomer.name}` : "Cliente del borrador (no encontrado).");
                    setShowNewCustomerFields(!existingCustomer);
                } else if (loadedCustomerDetails.rif) {
                    setSelectedCustomerIdForDropdown(undefined);
                    setSelectedCustomerAvailableCredit(0);
                    setCustomerSearchMessage("Nuevo cliente (desde borrador). Verifique/complete datos.");
                    setShowNewCustomerFields(true);
                } else {
                   setCustomerRifInput("");
                   setSelectedCustomerIdForDropdown(undefined);
                   setSelectedCustomerAvailableCredit(0);
                   setCustomerSearchMessage("Busque o ingrese datos del cliente.");
                   setShowNewCustomerFields(false);
                }
            } else {
                form.setValue('customerDetails', { ...defaultCustomer }, { shouldValidate: true });
                setCustomerRifInput("");
                setSelectedCustomerIdForDropdown(undefined);
                setSelectedCustomerAvailableCredit(0);
                setCustomerSearchMessage(null);
                setShowNewCustomerFields(false);
            }

            form.setValue('applyWarranty', draftData.applyWarranty || false, { shouldValidate: true });
            form.setValue('warrantyDuration', draftData.warrantyDuration || "no_aplica", { shouldValidate: true });
            form.setValue('warrantyText', draftData.warrantyText || "", { shouldValidate: true });

            const modeFromDraft = draftData.isDebtPayment ? 'debtPayment' : draftData.isCreditDeposit ? 'creditDeposit' : 'normal';
            setEditorMode(modeFromDraft);
            if (modeFromDraft === 'debtPayment' && draftData.items.length > 0) {
                setCurrentDebtOrCreditAmount(draftData.items[0].unitPrice);
            } else if (modeFromDraft === 'creditDeposit') {
                setCurrentDebtOrCreditAmount(0);
            } else {
                setCurrentDebtOrCreditAmount(0);
            }
            toast({ title: "Borrador Cargado", description: "Se restauró la información de la factura no guardada."});
        } catch (error) {
            console.error("Error parsing draft from sessionStorage:", error);
            if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
            setLastSavedInvoiceId(null);
            resetFormAndState({ resetToDefaultBlank: true });
            setEditorMode('normal');
        }
    } else {
        // Priority 4: Default blank state
        setLastSavedInvoiceId(null);
        resetFormAndState({ resetToDefaultBlank: true });
        setEditorMode('normal');
        setSelectedCustomerIdForDropdown(undefined);
        setCustomerRifInput("");
        setCustomerSearchMessage(null);
        setShowNewCustomerFields(false);
        setSelectedCustomerAvailableCredit(0);
    }
    
    // Clean up URL params if they were processed and no longer represent the current state
    if ((newInvoiceParam || (debtPaymentParam && customerIdParam) || (creditDepositParam && customerIdParam)) && !lastSavedInvoiceId) {
      if (pathname === '/invoice/new' && searchParams.toString()) {
           internalNavigationRef.current = true;
           router.replace('/invoice/new', { scroll: false });
      }
    }
  }, [isClient, searchParams, customers, router, pathname, resetFormAndState, toast, form, setLastSavedInvoiceId]);


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


  // Effect for saving draft to sessionStorage
  useEffect(() => {
    const debouncedSaveDraft = debounce((values: InvoiceFormData) => {
        if (isClient && !lastSavedInvoiceId) { // Only save draft if invoice is not yet finalized
            sessionStorage.setItem(SESSION_STORAGE_DRAFT_KEY, JSON.stringify(values));
        }
    }, 750); 

    const subscription = form.watch((valuesFromWatch) => {
        const watchedValues = valuesFromWatch as InvoiceFormData;
        debouncedSaveDraft(watchedValues);

        // Live Preview Update Logic
        const currentItems = (watchedValues.items || []).map(item => ({
            ...item,
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
        })) as InvoiceItem[];

        const currentTaxRatePercent = watchedValues.isDebtPayment || watchedValues.isCreditDeposit ? 0 : (watchedValues.taxRate ?? TAX_RATE * 100);
        const currentApplyTax = watchedValues.isDebtPayment || watchedValues.isCreditDeposit ? false : (watchedValues.applyTax ?? true);
        const currentDiscountValue = (watchedValues.isDebtPayment || watchedValues.isCreditDeposit || !watchedValues.applyDiscount) ? 0 : (watchedValues.discountValue || 0);
        const currentDiscountPercentage = (watchedValues.isDebtPayment || watchedValues.isCreditDeposit || !watchedValues.applyDiscount) ? 0 : (watchedValues.discountPercentage || 0);

        const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(currentItems, currentTaxRatePercent, currentDiscountValue, currentApplyTax);
        const { amountPaid, amountDue } = calculatePaymentSummary(watchedValues.paymentMethods || [], totalAmount);

        let overpaymentAmt = 0;
        let finalAmountDueForInvoice = amountDue;

        if (amountDue < 0) {
            overpaymentAmt = Math.abs(amountDue);
            if (watchedValues.overpaymentHandlingChoice === 'refundNow') {
                finalAmountDueForInvoice = 0;
            }
        }
        
        setLiveInvoicePreview(prev => ({
            ...prev,
            id: lastSavedInvoiceId || prev.id || '',
            status: prev.status || 'active',
            invoiceNumber: watchedValues.invoiceNumber,
            date: watchedValues.date ? (typeof watchedValues.date === 'string' ? watchedValues.date : watchedValues.date.toISOString()) : (prev.date || new Date(0).toISOString()),
            companyDetails: companyDetails || defaultCompany,
            cashierNumber: watchedValues.cashierNumber,
            salesperson: watchedValues.salesperson,
            customerDetails: watchedValues.customerDetails as CustomerDetails,
            items: currentItems,
            paymentMethods: watchedValues.paymentMethods as PaymentDetails[],
            subTotal,
            discountPercentage: currentDiscountPercentage,
            discountValue: discountAmount,
            taxRate: currentApplyTax ? (currentTaxRatePercent / 100) : 0,
            taxAmount,
            totalAmount,
            amountPaid,
            amountDue: finalAmountDueForInvoice,
            thankYouMessage: watchedValues.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
            notes: watchedValues.notes,
            warrantyText: watchedValues.applyWarranty ? watchedValues.warrantyText : undefined,
            type: 'sale',
            isDebtPayment: !!watchedValues.isDebtPayment,
            isCreditDeposit: !!watchedValues.isCreditDeposit,
            overpaymentAmount: overpaymentAmt,
            overpaymentHandling: watchedValues.overpaymentHandlingChoice,
            changeRefundPaymentMethods: watchedValues.changeRefundPaymentMethods as PaymentDetails[] || [],
        }));
    });
    return () => {
        subscription.unsubscribe();
    };
  }, [form.watch, isClient, lastSavedInvoiceId, companyDetails, calculateTotals, calculatePaymentSummary, setLiveInvoicePreview, form.formState.isDirty]); 


  useEffect(() => {
    const watchedOverpaymentHandlingChoice = form.watch("overpaymentHandlingChoice");
    const actualOverpaymentAmount = liveInvoicePreview.overpaymentAmount || 0;

    if (watchedOverpaymentHandlingChoice === 'refundNow' && actualOverpaymentAmount > 0) {
        if (changePaymentFields.length === 0) {
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
    updateChangePayment
  ]);

  useEffect(() => {
    const applyTaxValue = form.watch('applyTax');
    const currentTaxRateValue = form.watch('taxRate');

    if (editorMode !== 'normal') {
      if (form.getValues('applyTax') !== false) form.setValue('applyTax', false, { shouldValidate: true });
      if (form.getValues('taxRate') !== 0) form.setValue('taxRate', 0, { shouldValidate: true });
      return;
    }

    if (applyTaxValue === false && currentTaxRateValue !== 0) {
      form.setValue('taxRate', 0, { shouldValidate: true });
    } else if (applyTaxValue === true && currentTaxRateValue === 0) {
      form.setValue('taxRate', TAX_RATE * 100, { shouldValidate: true });
    }
  }, [form.watch('applyTax'), editorMode, form]); 


  const watchedItems = form.watch('items');
  const watchedApplyDiscount = form.watch('applyDiscount');

  const calculateSubTotal = useCallback((currentItems: InvoiceItemForm[] = []) => {
    return currentItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  }, []);

  useEffect(() => {
    if (!watchedApplyDiscount || editorMode !== 'normal') return;

    const percentage = form.getValues('discountPercentage');
    const subTotal = calculateSubTotal(watchedItems);

    if (subTotal > 0 && typeof percentage === 'number') {
        const calculatedValue = (percentage / 100) * subTotal;
        if (Math.abs((form.getValues('discountValue') || 0) - calculatedValue) > 0.001) {
            form.setValue('discountValue', parseFloat(calculatedValue.toFixed(2)), { shouldValidate: true });
        }
    } else if (subTotal === 0 && typeof percentage === 'number') {
        if (form.getValues('discountValue') !== 0) {
            form.setValue('discountValue', 0, { shouldValidate: true });
        }
    }
  }, [form.watch('discountPercentage'), watchedItems, watchedApplyDiscount, editorMode, form, calculateSubTotal]); 

  useEffect(() => {
    if (!watchedApplyDiscount || editorMode !== 'normal') return;

    const value = form.getValues('discountValue');
    const subTotal = calculateSubTotal(watchedItems);

    if (subTotal > 0 && typeof value === 'number') {
        const calculatedPercentage = (value / subTotal) * 100;
        if (Math.abs((form.getValues('discountPercentage') || 0) - calculatedPercentage) > 0.001) {
            form.setValue('discountPercentage', parseFloat(calculatedPercentage.toFixed(2)), { shouldValidate: true });
        }
    } else if (subTotal === 0 && typeof value === 'number' && value !== 0) {
        if (form.getValues('discountPercentage') !== 0) {
            form.setValue('discountPercentage', 0, { shouldValidate: true });
        }
    } else if (typeof value === 'number' && value === 0) {
        if (form.getValues('discountPercentage') !== 0) {
            form.setValue('discountPercentage', 0, { shouldValidate: true });
        }
    }
  }, [form.watch('discountValue'), watchedItems, watchedApplyDiscount, editorMode, form, calculateSubTotal]);

  useEffect(() => {
    if (!watchedApplyDiscount || editorMode !== 'normal') {
        const currentPercentage = form.getValues('discountPercentage');
        const currentValue = form.getValues('discountValue');
        let changed = false;
        if (currentPercentage !== 0) {
            form.setValue('discountPercentage', 0, { shouldValidate: true, shouldDirty: false });
            changed = true;
        }
        if (currentValue !== 0) {
            form.setValue('discountValue', 0, { shouldValidate: true, shouldDirty: false });
            changed = true;
        }
        if (changed && form.formState.dirtyFields.applyDiscount) {
            form.setValue('applyDiscount', form.getValues('applyDiscount'), {shouldDirty: true});
        }
    }
  }, [watchedApplyDiscount, editorMode, form]); 

  const watchedApplyWarranty = form.watch('applyWarranty');
  const watchedWarrantyDuration = form.watch('warrantyDuration');
  const watchedInvoiceDate = form.watch('date');

  useEffect(() => {
    if (editorMode !== 'normal') {
      if (form.getValues('applyWarranty')) form.setValue('applyWarranty', false, { shouldValidate: true });
      if (form.getValues('warrantyDuration') !== "no_aplica") form.setValue('warrantyDuration', 'no_aplica', { shouldValidate: true });
      if (form.getValues('warrantyText')) form.setValue('warrantyText', '', { shouldValidate: true });
      return;
    }

    if (!watchedApplyWarranty) {
      if (form.getValues('warrantyDuration') !== "no_aplica") form.setValue('warrantyDuration', 'no_aplica', { shouldValidate: true });
      if (form.getValues('warrantyText')) form.setValue('warrantyText', '', { shouldValidate: true });
    } else { 
      if (watchedWarrantyDuration === "no_aplica") {
         if (form.getValues('warrantyText')) form.setValue('warrantyText', '', { shouldValidate: true });
      } else if (watchedWarrantyDuration === "personalizado") {
        const currentText = form.getValues('warrantyText') || "";
        if (currentText.startsWith("Garantía válida hasta")) {
          const userText = currentText.substring(currentText.indexOf(".") + 1).trim();
          form.setValue('warrantyText', userText, { shouldValidate: true });
        }
      } else { 
        let endDate = new Date(watchedInvoiceDate || Date.now());
        const [value, unit] = watchedWarrantyDuration.split("_");
        const numValue = parseInt(value);

        if (unit === "dias") endDate = addDays(endDate, numValue);
        else if (unit === "mes") endDate = addMonths(endDate, numValue);
        else if (unit === "anio") endDate = addYears(endDate, numValue);

        const formattedEndDate = format(endDate, "PPP", { locale: es });
        const autoText = `Garantía válida hasta ${formattedEndDate}.`;

        const currentText = form.getValues('warrantyText') || "";
        let userSpecificText = "";
        if (currentText.startsWith("Garantía válida hasta")) {
            const dotIndex = currentText.indexOf(".");
            if (dotIndex !== -1 && currentText.length > dotIndex + 1) {
                userSpecificText = currentText.substring(dotIndex + 1).trim();
            }
        } else if (currentText.trim() !== "") { 
            userSpecificText = currentText;
        }

        const newWarrantyText = userSpecificText ? `${autoText} ${userSpecificText}` : `${autoText}`;
        if (form.getValues('warrantyText') !== newWarrantyText) {
          form.setValue('warrantyText', newWarrantyText, { shouldValidate: true });
        }
      }
    }
  }, [watchedApplyWarranty, watchedWarrantyDuration, watchedInvoiceDate, editorMode, form]); 


  const handleRifSearch = async () => {
    if (editorMode !== 'normal') return;
    if (!customerRifInput.trim()) {
      setCustomerSearchMessage("Ingrese un RIF/Cédula para buscar.");
      setShowNewCustomerFields(false);
      form.reset({
        ...form.getValues(),
        customerDetails: { ...defaultCustomer, rif: "" }
      });
      setSelectedCustomerIdForDropdown(undefined);
      setSelectedCustomerAvailableCredit(0);
      return;
    }
    setIsSearchingCustomer(true);
    setCustomerSearchMessage("Buscando cliente...");

    const searchTerm = customerRifInput.toUpperCase().replace(/[^A-Z0-9]/gi, '');
    let foundCustomer = customers.find(c => c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === searchTerm);

    if (!foundCustomer && /^[0-9]+$/.test(customerRifInput.trim())) {
      const numericPart = customerRifInput.trim();
      const ciWithV = `V${numericPart}`;
      const ciWithE = `E${numericPart}`;
      foundCustomer = customers.find(c =>
        c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === ciWithV ||
        c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === ciWithE
      );
    }

    if (foundCustomer) {
      form.setValue("customerDetails", { ...foundCustomer }, { shouldValidate: true });
      setCustomerRifInput(foundCustomer.rif);
      setCustomerSearchMessage(`Cliente encontrado: ${foundCustomer.name}`);
      setShowNewCustomerFields(false);
      setSelectedCustomerIdForDropdown(foundCustomer.id);
      setSelectedCustomerAvailableCredit(foundCustomer.creditBalance || 0);
    } else {
      form.setValue("customerDetails.id", ""); 
      form.setValue("customerDetails.name", "");
      form.setValue("customerDetails.address", "");
      form.setValue("customerDetails.phone", "");
      form.setValue("customerDetails.email", "");
      form.setValue("customerDetails.rif", customerRifInput.toUpperCase(), { shouldValidate: true }); 
      setCustomerSearchMessage("Cliente no encontrado. Complete los datos para registrarlo.");
      setShowNewCustomerFields(true);
      setSelectedCustomerIdForDropdown(undefined);
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
      setCustomerRifInput(customer.rif);
      setShowNewCustomerFields(false);
      setCustomerSearchMessage(`Cliente seleccionado: ${customer.name}`);
      setSelectedCustomerAvailableCredit(customer.creditBalance || 0);
    } else {
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

    updatePayment(index, { ...currentPayment, method: newMethod, amount: currentPayment.amount });

    if (newMethod === "Saldo a Favor" && editorMode === 'normal' && selectedCustomerAvailableCredit > 0) {
        const invoiceTotal = liveInvoicePreview.totalAmount || 0;
        let otherPaymentsTotal = 0;
        paymentMethods.forEach((pm, i) => {
            if (i !== index && pm.method !== "Saldo a Favor") {
                otherPaymentsTotal += pm.amount || 0;
            }
        });
        const amountDueOnInvoice = Math.max(0, invoiceTotal - otherPaymentsTotal);
        const amountToApplyFromCredit = Math.min(selectedCustomerAvailableCredit, amountDueOnInvoice);

        updatePayment(index, { ...currentPayment, method: newMethod, amount: amountToApplyFromCredit });
    }
  };

  const handleEnterDebtPaymentMode = () => {
    const customer = form.getValues("customerDetails");
    if (customer && customer.id && (customer.outstandingBalance ?? 0) > 0) {
      if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
      setLastSavedInvoiceId(null);
      resetFormAndState({ mode: 'debtPayment', customerId: customer.id, amount: customer.outstandingBalance ?? 0 });
      setEditorMode('debtPayment');
      setCurrentDebtOrCreditAmount(customer.outstandingBalance ?? 0);
      setSelectedCustomerIdForDropdown(customer.id);
      setCustomerRifInput(customer.rif);
      setCustomerSearchMessage(`Pagando deuda de: ${customer.name}`);
      setShowNewCustomerFields(false);
    } else {
      toast({ variant: "destructive", title: "Sin Deuda Pendiente", description: "El cliente seleccionado no tiene deuda pendiente o no hay cliente seleccionado." });
    }
  };

  const handleEnterCreditDepositMode = () => {
    const customer = form.getValues("customerDetails");
    if (customer && customer.id) {
      if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
      setLastSavedInvoiceId(null);
      resetFormAndState({ mode: 'creditDeposit', customerId: customer.id });
      setEditorMode('creditDeposit');
      setCurrentDebtOrCreditAmount(0);
      setSelectedCustomerIdForDropdown(customer.id);
      setCustomerRifInput(customer.rif);
      setCustomerSearchMessage(`Registrando depósito para: ${customer.name}`);
      setShowNewCustomerFields(false);
    } else {
      toast({ variant: "destructive", title: "Cliente no seleccionado", description: "Por favor, seleccione o busque un cliente primero." });
    }
  };

  function onSubmit(data: InvoiceFormData) {
    let customerToSaveOnInvoice = { ...data.customerDetails }; 
    let customerWasModified = false;
    let newCustomerJustAdded: CustomerDetails | null = null;
    
    if (showNewCustomerFields && !customerToSaveOnInvoice.id && editorMode === 'normal') {
      if (customerToSaveOnInvoice.name && customerToSaveOnInvoice.rif && customerToSaveOnInvoice.address) {
        const newCustomer: CustomerDetails = {
          ...customerToSaveOnInvoice,
          id: uuidv4(),
          outstandingBalance: 0,
          creditBalance: 0,
        };
        customerToSaveOnInvoice = newCustomer;
        customerWasModified = true;
        newCustomerJustAdded = newCustomer;
        toast({ title: "Nuevo Cliente Registrado", description: `Cliente ${newCustomer.name} añadido al sistema.` });
      } else {
        toast({ variant: "destructive", title: "Datos Incompletos del Cliente", description: "Por favor, complete nombre, RIF y dirección para el nuevo cliente." });
        if (!customerToSaveOnInvoice.name) form.setError("customerDetails.name", {type: "manual", message: "Nombre requerido"});
        if (!customerToSaveOnInvoice.address) form.setError("customerDetails.address", {type: "manual", message: "Dirección requerida"});
        if (!customerToSaveOnInvoice.rif) form.setError("customerDetails.rif", {type: "manual", message: "RIF/Cédula requerido"});
        return;
      }
    }

    if (!customerToSaveOnInvoice || !customerToSaveOnInvoice.rif) {
        toast({ variant: "destructive", title: "Cliente no especificado", description: "Por favor, busque o ingrese los datos del cliente."});
        form.setError("customerDetails.rif", {type: "manual", message: "RIF/Cédula del cliente es requerido"});
        return;
    }

    let totalExplicitCreditUsedInTransaction = 0;
    let creditUsageError = false;
    if (editorMode === 'normal') {
        data.paymentMethods.forEach((pm, index) => {
            if (pm.method === "Saldo a Favor") {
                if (pm.amount < 0) {
                     form.setError(`paymentMethods.${index}.amount`, { type: "manual", message: `Monto de saldo a favor no puede ser negativo.`});
                     creditUsageError = true;
                }
                const currentCustForCreditCheck = customerToSaveOnInvoice.id ? customers.find(c => c.id === customerToSaveOnInvoice.id) : null;
                const availableCredit = currentCustForCreditCheck?.creditBalance || 0;

                if (pm.amount > availableCredit) {
                    form.setError(`paymentMethods.${index}.amount`, { type: "manual", message: `No puede usar más de ${formatCurrency(availableCredit)} de saldo.`});
                    creditUsageError = true;
                }
                totalExplicitCreditUsedInTransaction += pm.amount;
            }
        });
        if (creditUsageError) return;
    }

    const finalItems = data.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const currentTaxRatePercent = data.isDebtPayment || data.isCreditDeposit ? 0 : (data.taxRate ?? TAX_RATE * 100);
    const currentApplyTax = data.isDebtPayment || data.isCreditDeposit ? false : (data.applyTax ?? true);

    const currentDiscountValue = (data.isDebtPayment || data.isCreditDeposit || !data.applyDiscount) ? 0 : (data.discountValue || 0);

    const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(finalItems, currentTaxRatePercent, currentDiscountValue, currentApplyTax);

    let currentCustomersList = [...customers];
    if (customerWasModified && newCustomerJustAdded) {
        currentCustomersList.push(newCustomerJustAdded);
    }

    const customerIndex = currentCustomersList.findIndex(c => c.id === customerToSaveOnInvoice.id);
    let StoredCustomer: CustomerDetails | undefined = customerIndex !== -1 ? {...currentCustomersList[customerIndex]} : (newCustomerJustAdded ? {...newCustomerJustAdded} : undefined) ;

    let finalInvoiceNotes = data.notes || "";
    let finalPaymentMethodsForInvoice = [...data.paymentMethods];
    let finalAmountPaidOnInvoice = data.paymentMethods.reduce((sum, p) => sum + p.amount, 0);
    let finalAmountDueForInvoiceRecord: number = totalAmount - finalAmountPaidOnInvoice; 

    if (StoredCustomer) {
        StoredCustomer.outstandingBalance = StoredCustomer.outstandingBalance || 0;
        StoredCustomer.creditBalance = StoredCustomer.creditBalance || 0;

        if (editorMode === 'normal') {
            StoredCustomer.creditBalance -= totalExplicitCreditUsedInTransaction;

            let amountPaidByCustomerExcludingExplicitCredit = 0;
            data.paymentMethods.forEach(pm => {
                if (pm.method !== "Saldo a Favor") {
                    amountPaidByCustomerExcludingExplicitCredit += pm.amount;
                }
            });
            const totalEffectivelyPaidByCustomer = amountPaidByCustomerExcludingExplicitCredit + totalExplicitCreditUsedInTransaction;
            let currentShortfall = totalAmount - totalEffectivelyPaidByCustomer;

            let autoCreditUsed = 0;
            if (currentShortfall > 0 && StoredCustomer.creditBalance > 0) {
                autoCreditUsed = Math.min(currentShortfall, StoredCustomer.creditBalance);
                StoredCustomer.creditBalance -= autoCreditUsed;

                const autoCreditPaymentEntry: PaymentDetails = {
                    method: "Saldo a Favor (Auto)",
                    amount: autoCreditUsed,
                    reference: "Uso automático para cubrir factura"
                };
                finalPaymentMethodsForInvoice.push(autoCreditPaymentEntry);

                finalInvoiceNotes += `${finalInvoiceNotes ? '\n' : ''}Se utilizaron ${formatCurrency(autoCreditUsed)} del saldo a favor (auto.) para cubrir el pago.`;
                currentShortfall -= autoCreditUsed;
            }
            finalAmountPaidOnInvoice += autoCreditUsed; 

            let overpaymentAmountToStore = 0;
            const netAmountDueAfterAllPayments = totalAmount - finalAmountPaidOnInvoice;

            if (netAmountDueAfterAllPayments < 0) { 
                overpaymentAmountToStore = Math.abs(netAmountDueAfterAllPayments);
                if (data.overpaymentHandlingChoice === 'refundNow') {
                    const totalChangeRefunded = (data.changeRefundPaymentMethods || []).reduce((sum, pm) => sum + pm.amount, 0);
                    if (Math.abs(totalChangeRefunded - overpaymentAmountToStore) > 0.001) {
                        toast({ variant: "destructive", title: "Error en Vuelto", description: `El monto del vuelto procesado (${formatCurrency(totalChangeRefunded)}) no coincide con el sobrepago (${formatCurrency(overpaymentAmountToStore)}).` });
                        form.setError("changeRefundPaymentMethods", {type: "manual", message: "El total del vuelto debe igualar el sobrepago."});
                        return;
                    }
                    finalAmountDueForInvoiceRecord = 0;
                } else { 
                    StoredCustomer.creditBalance += overpaymentAmountToStore;
                    finalAmountDueForInvoiceRecord = 0;
                }
            } else if (netAmountDueAfterAllPayments > 0) { 
                StoredCustomer.outstandingBalance += netAmountDueAfterAllPayments;
                finalAmountDueForInvoiceRecord = netAmountDueAfterAllPayments;
            } else { 
                finalAmountDueForInvoiceRecord = 0;
            }

        } else if (editorMode === 'debtPayment') {
            StoredCustomer.outstandingBalance = Math.max(0, StoredCustomer.outstandingBalance - finalAmountPaidOnInvoice);
            finalAmountDueForInvoiceRecord = totalAmount - finalAmountPaidOnInvoice; 
            if (finalAmountDueForInvoiceRecord < 0) { 
                StoredCustomer.creditBalance += Math.abs(finalAmountDueForInvoiceRecord);
                finalAmountDueForInvoiceRecord = 0; 
            }

        } else { // creditDeposit mode
            if (StoredCustomer.outstandingBalance > 0) {
                const amountToPayDebt = Math.min(finalAmountPaidOnInvoice, StoredCustomer.outstandingBalance);
                StoredCustomer.outstandingBalance -= amountToPayDebt;
                const remainingDeposit = finalAmountPaidOnInvoice - amountToPayDebt;
                StoredCustomer.creditBalance += remainingDeposit;
            } else {
                StoredCustomer.creditBalance += finalAmountPaidOnInvoice;
            }
            finalAmountDueForInvoiceRecord = 0; 
        }

        if (customerIndex !== -1) {
            currentCustomersList[customerIndex] = StoredCustomer;
        } else if (newCustomerJustAdded) { 
            const newCustIdx = currentCustomersList.findIndex(c => c.id === StoredCustomer!.id);
            if (newCustIdx !== -1) currentCustomersList[newCustIdx] = StoredCustomer!;
        }
        setCustomers(currentCustomersList);

    } else if (!StoredCustomer) {
        toast({ variant: "destructive", title: "Error de Cliente", description: "No se pudo procesar la transacción debido a un problema con los datos del cliente." });
        return;
    }

    const newInvoiceId = uuidv4();
    const fullInvoiceData: Invoice = {
      id: newInvoiceId,
      invoiceNumber: data.invoiceNumber,
      date: data.date.toISOString(),
      type: 'sale',
      status: 'active', 
      isDebtPayment: editorMode === 'debtPayment',
      isCreditDeposit: editorMode === 'creditDeposit',
      companyDetails: companyDetails || defaultCompany,
      customerDetails: customerToSaveOnInvoice,
      cashierNumber: data.cashierNumber,
      salesperson: data.salesperson,
      items: finalItems,
      paymentMethods: finalPaymentMethodsForInvoice,
      subTotal,
      discountPercentage: data.applyDiscount ? (data.discountPercentage || 0) : undefined,
      discountValue: data.applyDiscount ? (data.discountValue || 0) : undefined,
      taxRate: data.applyTax ? ((data.taxRate || 0) / 100) : 0,
      taxAmount,
      totalAmount,
      amountPaid: finalAmountPaidOnInvoice,
      amountDue: finalAmountDueForInvoiceRecord,
      thankYouMessage: data.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
      notes: finalInvoiceNotes,
      warrantyText: (data.applyWarranty && data.warrantyDuration !== "no_aplica") ? data.warrantyText : undefined,
      overpaymentAmount: (editorMode === 'normal' && (totalAmount - finalAmountPaidOnInvoice) < -0.001) ? Math.abs(totalAmount - finalAmountPaidOnInvoice) : undefined,
      overpaymentHandling: (editorMode === 'normal' && (totalAmount - finalAmountPaidOnInvoice) < -0.001) ? (data.overpaymentHandlingChoice === 'refundNow' ? 'refunded' : 'creditedToAccount') : undefined,
      changeRefundPaymentMethods: (editorMode === 'normal' && (totalAmount - finalAmountPaidOnInvoice) < -0.001 && data.overpaymentHandlingChoice === 'refundNow') ? data.changeRefundPaymentMethods : undefined,
    };

    setSavedInvoices(prevInvoices => [...prevInvoices, fullInvoiceData]);
    setLastSavedInvoiceId(newInvoiceId); 
    setLiveInvoicePreview(prev => ({...prev, id: newInvoiceId, status: 'active'})); 
    if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);


    let toastTitle = "Factura Guardada";
    if (editorMode === 'debtPayment') toastTitle = "Abono a Deuda Registrado";
    if (editorMode === 'creditDeposit') toastTitle = "Depósito a Cuenta Registrado";

    toast({
      title: toastTitle,
      description: `El documento Nro. ${data.invoiceNumber} ha sido guardado. Ahora puede imprimirla.`,
       action: (
        <Button variant="outline" size="sm" onClick={() => router.push(`/invoices/${fullInvoiceData.id}`)}>
          Ver Documento <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    });

    if (pathname === '/invoice/new' && searchParams.toString()) {
        internalNavigationRef.current = true;
        router.replace('/invoice/new', { scroll: false });
    }
  }

  const handleCleanAndExit = () => {
    if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
    setLastSavedInvoiceId(null);
    resetFormAndState({ mode: 'normal', resetToDefaultBlank: true }); 
    setEditorMode('normal');
    setCurrentDebtOrCreditAmount(0);
    setSelectedCustomerIdForDropdown(undefined);
    setCustomerRifInput("");
    setCustomerSearchMessage(null);
    setShowNewCustomerFields(false);
    toast({
        title: "Formulario Limpiado",
        description: "El documento ha sido descartado y el formulario reiniciado.",
    });
     if (pathname === '/invoice/new' && searchParams.toString()) {
        internalNavigationRef.current = true;
        router.replace('/invoice/new', { scroll: false });
    }
  };

  const handleCancelCreatedInvoice = () => {
    if (!lastSavedInvoiceId) return;

    const invoiceToCancelIdx = savedInvoices.findIndex(inv => inv.id === lastSavedInvoiceId);
    if (invoiceToCancelIdx === -1) {
        toast({ variant: "destructive", title: "Error", description: "No se encontró la factura guardada para anular." });
        return;
    }
    const invoiceToCancel = { ...savedInvoices[invoiceToCancelIdx] };


    if (invoiceToCancel.status === 'cancelled' || invoiceToCancel.status === 'return_processed' || invoiceToCancel.type === 'return') {
      toast({ variant: "destructive", title: "No se puede anular", description: "Esta factura no se puede anular o ya está anulada/procesada." });
      return;
    }

    const customerToUpdateIdx = customers.findIndex(c => c.id === invoiceToCancel.customerDetails.id);
    if (customerToUpdateIdx === -1) {
        toast({ variant: "destructive", title: "Error", description: "No se encontró el cliente asociado para revertir saldos." });
        return;
    }
    const customerToUpdate = { ...customers[customerToUpdateIdx] };


    let updatedOutstandingBalance = customerToUpdate.outstandingBalance || 0;
    let updatedCreditBalance = customerToUpdate.creditBalance || 0;

    if (invoiceToCancel.isDebtPayment) {
        updatedOutstandingBalance += invoiceToCancel.amountPaid; 
        if (invoiceToCancel.totalAmount < invoiceToCancel.amountPaid) {
            updatedCreditBalance -= (invoiceToCancel.amountPaid - invoiceToCancel.totalAmount);
        }
    } else if (invoiceToCancel.isCreditDeposit) {
        const depositAmount = invoiceToCancel.amountPaid; 
        let amountCreditedDirectly = depositAmount;
        updatedCreditBalance -= amountCreditedDirectly;

    } else { 
        if ((invoiceToCancel.amountDue ?? 0) > 0) { 
            updatedOutstandingBalance -= invoiceToCancel.amountDue;
        }

        (invoiceToCancel.paymentMethods || []).forEach(pm => {
            if (pm.method === "Saldo a Favor" || pm.method === "Saldo a Favor (Auto)") {
                updatedCreditBalance += pm.amount;
            }
        });

        if (invoiceToCancel.overpaymentAmount && invoiceToCancel.overpaymentAmount > 0 && invoiceToCancel.overpaymentHandling === 'creditedToAccount') {
            updatedCreditBalance -= invoiceToCancel.overpaymentAmount;
        }
    }
    
    updatedOutstandingBalance = Math.max(0, updatedOutstandingBalance);
    const updatedCustomers = [...customers];
    updatedCustomers[customerToUpdateIdx] = { ...customerToUpdate, outstandingBalance: updatedOutstandingBalance, creditBalance: updatedCreditBalance };
    setCustomers(updatedCustomers);

    const updatedInvoices = [...savedInvoices];
    updatedInvoices[invoiceToCancelIdx] = { ...invoiceToCancel, status: 'cancelled', cancelledAt: new Date().toISOString() };
    setSavedInvoices(updatedInvoices);

    setLiveInvoicePreview(prev => ({ ...prev, status: 'cancelled' }));
    
    toast({ title: "Factura Anulada", description: `La factura Nro. ${invoiceToCancel.invoiceNumber} ha sido anulada y los saldos del cliente ajustados (revisar si es necesario).` });
    setIsCancelConfirmOpen(false);
  };


  const previewCompanyDetails = companyDetails;
  const getEditorTitle = () => {
    if (editorMode === 'debtPayment') return "Registrar Abono a Deuda";
    if (editorMode === 'creditDeposit') return "Registrar Depósito a Cuenta Cliente";
    if (lastSavedInvoiceId && liveInvoicePreview.status === 'cancelled') return "Factura Anulada";
    if (lastSavedInvoiceId) return "Factura Guardada - Previsualización";
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

  const currentCustomerForActions = form.getValues("customerDetails");
  const showOverpaymentSection = liveInvoicePreview.overpaymentAmount && liveInvoicePreview.overpaymentAmount > 0.001 && editorMode === 'normal';

  const canCancelThisInvoice = lastSavedInvoiceId &&
                             liveInvoicePreview.id === lastSavedInvoiceId &&
                             liveInvoicePreview.type === 'sale' && 
                             liveInvoicePreview.status === 'active';


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <form onSubmit={form.handleSubmit(onSubmit)} className="lg:col-span-2 space-y-8 no-print">
        <Form {...form}>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center text-primary">
                  <FileText className="mr-2 h-5 w-5" />
                  {getEditorTitle()}
                </CardTitle>
                 {lastSavedInvoiceId && liveInvoicePreview.status !== 'cancelled' && (
                    <CardDescription>
                        Factura guardada con Nro: <span className="font-semibold text-primary">{liveInvoicePreview.invoiceNumber}</span>.
                         {liveInvoicePreview.status === 'active' ? "Ahora puede imprimirla o anularla." : ""}
                    </CardDescription>
                )}
                {lastSavedInvoiceId && liveInvoicePreview.status === 'cancelled' && (
                    <CardDescription className="text-destructive font-semibold">
                        Esta factura (Nro: {liveInvoicePreview.invoiceNumber}) ha sido ANULADA.
                    </CardDescription>
                )}
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
                          <Input id="invoiceNumber" {...field} readOnly={!!lastSavedInvoiceId} />
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
                              disabled={!!lastSavedInvoiceId}
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
                                  if (date) field.onChange(date);
                              }}
                              initialFocus
                              locale={es}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01") || !!lastSavedInvoiceId}
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
                          <Input id="cashierNumber" {...field} placeholder="Ej: 01" readOnly={!!lastSavedInvoiceId} />
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
                          <Input id="salesperson" {...field} placeholder="Ej: Ana Pérez" readOnly={!!lastSavedInvoiceId} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center text-primary"><Users className="mr-2 h-5 w-5" />Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <FormItem className="flex-grow">
                    <FormLabel htmlFor="customerRifInput">RIF/Cédula del Cliente</FormLabel>
                    <FormControl>
                      <Input
                        id="customerRifInput"
                        placeholder="Ingrese RIF/Cédula y presione Enter o Busque"
                        value={customerRifInput}
                        onChange={(e) => setCustomerRifInput(e.target.value)}
                        onBlur={handleRifSearch}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRifSearch(); }}}
                        disabled={editorMode !== 'normal' || !!lastSavedInvoiceId}
                      />
                    </FormControl>
                  </FormItem>
                  <Button type="button" onClick={handleRifSearch} disabled={isSearchingCustomer || editorMode !== 'normal' || !!lastSavedInvoiceId} className="w-full sm:w-auto">
                    <Search className="mr-2 h-4 w-4" /> {isSearchingCustomer ? "Buscando..." : "Buscar"}
                  </Button>
                </div>

                {customerSearchMessage && <p className={`text-sm mt-1 ${form.formState.errors.customerDetails?.rif || form.formState.errors.customerDetails?.name ? 'text-destructive' : 'text-muted-foreground'}`}>{customerSearchMessage}</p>}

                <div className="space-y-3 pt-3 border-t mt-3">
                  <FormField control={form.control} name="customerDetails.rif" render={({ field }) => (
                      <FormItem>
                          <FormLabel>RIF/CI (verificado/ingresado)</FormLabel>
                          <FormControl><Input {...field} readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id")) || !!lastSavedInvoiceId} placeholder="RIF del cliente" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.name" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Nombre/Razón Social</FormLabel>
                          <FormControl><Input {...field} placeholder="Nombre del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown) || !!lastSavedInvoiceId} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.address" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Dirección Fiscal</FormLabel>
                          <FormControl><Textarea {...field} placeholder="Dirección del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown) || !!lastSavedInvoiceId} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.phone" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Teléfono (Opcional)</FormLabel>
                          <FormControl><Input {...field} placeholder="Teléfono del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown) || !!lastSavedInvoiceId} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="customerDetails.email" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Email (Opcional)</FormLabel>
                          <FormControl><Input {...field} type="email" placeholder="Email del cliente" readOnly={editorMode !== 'normal' || (!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown) || !!lastSavedInvoiceId} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                </div>

                <FormItem className="mt-4">
                  <FormLabel>O seleccionar de la lista:</FormLabel>
                  <Select onValueChange={handleCustomerSelectFromDropdown} value={selectedCustomerIdForDropdown || ""} disabled={editorMode !== 'normal' || !!lastSavedInvoiceId}>
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

                {editorMode === 'normal' && currentCustomerForActions?.id && !lastSavedInvoiceId && (
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
                {editorMode !== 'normal' && !lastSavedInvoiceId && (
                  <div className="pt-4 mt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => {
                        if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_DRAFT_KEY);
                        setLastSavedInvoiceId(null);
                        resetFormAndState({mode: 'normal', customerId: selectedCustomerIdForDropdown, resetToDefaultBlank: true });
                        setEditorMode('normal');
                        setCurrentDebtOrCreditAmount(0);
                        setSelectedCustomerIdForDropdown(undefined);
                        setCustomerRifInput("");
                        setCustomerSearchMessage(null);
                        setShowNewCustomerFields(false);
                      }} className="w-full">
                          <Ban className="mr-2 h-4 w-4" /> Cancelar Modo Especial / Nueva Factura
                      </Button>
                  </div>
                )}

              </CardContent>
            </Card>

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
                              readOnly={editorMode === 'debtPayment' || editorMode === 'creditDeposit' || !!lastSavedInvoiceId}
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
                              readOnly={editorMode === 'debtPayment' || editorMode === 'creditDeposit' || !!lastSavedInvoiceId}
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
                              value={(editorMode === 'creditDeposit' && f.value === 0) ? '' : (f.value === 0 ? '' : f.value)}
                              onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              readOnly={editorMode === 'debtPayment' || (editorMode === 'creditDeposit' && f.name === `items.${index}.unitPrice`) || !!lastSavedInvoiceId}
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
                      disabled={editorMode !== 'normal' || itemFields.length <= 1 || !!lastSavedInvoiceId}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
                <FormMessage>{form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) ? (form.formState.errors.items as any).message : null}</FormMessage>
                <FormMessage>{form.formState.errors.items && Array.isArray(form.formState.errors.items) && form.formState.errors.items.length ===0 && (form.formState.errors.items as any)?.message ? (form.formState.errors.items as any).message : null}</FormMessage>
                {editorMode === 'normal' && !lastSavedInvoiceId && (
                  <Button type="button" variant="outline" onClick={() => appendItem({ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Artículo
                  </Button>
                )}
                {(editorMode === 'debtPayment' || editorMode === 'creditDeposit') && (
                  <div className="flex items-center p-3 rounded-md bg-accent/10 border border-accent/30">
                    <Info className="h-5 w-5 mr-2 text-accent" />
                    <p className="text-sm text-foreground">
                      {editorMode === 'debtPayment'
                        ? "Está registrando un abono a una deuda. No se pueden modificar los artículos."
                        : "Está registrando un depósito a cuenta. Los detalles del artículo son fijos. Ingrese el monto del depósito en 'Detalles del Pago'."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

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
                                        disabled={(editorMode !== 'normal' && f.value === 'Saldo a Favor') || !!lastSavedInvoiceId}
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
                                          value={f.value === 0 ? '' : f.value}
                                          onChange={e => f.onChange(parseFloat(e.target.value) || 0)}
                                          type="number"
                                          step="0.01"
                                          placeholder="0.00"
                                          readOnly={(form.getValues(`paymentMethods.${index}.method`) === 'Saldo a Favor' && editorMode === 'normal' && (liveInvoicePreview.totalAmount || 0) <= selectedCustomerAvailableCredit && (liveInvoicePreview.totalAmount || 0) > 0) || !!lastSavedInvoiceId}
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
                                      <FormControl><Input {...f} placeholder="Nro. de confirmación" readOnly={!!lastSavedInvoiceId} /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)} className="text-destructive hover:text-destructive/80" disabled={paymentFields.length <=1 || !!lastSavedInvoiceId}>
                              <Trash2 className="h-5 w-5" />
                          </Button>
                      </div>
                  ))}
                  <FormMessage>{form.formState.errors.paymentMethods && typeof form.formState.errors.paymentMethods === 'object' && !Array.isArray(form.formState.errors.paymentMethods) ? (form.formState.errors.paymentMethods as any).message : null}</FormMessage>
                  {!lastSavedInvoiceId && (
                    <Button type="button" variant="outline" onClick={() => appendPayment({ method: "Efectivo", amount: 0, reference: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Método de Pago
                    </Button>
                  )}
              </CardContent>
            </Card>

            {showOverpaymentSection && !lastSavedInvoiceId && (
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
                                    disabled={!!lastSavedInvoiceId}
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
                                                    <Select onValueChange={f.onChange} defaultValue={f.value} disabled={!!lastSavedInvoiceId}>
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
                                                            readOnly={!!lastSavedInvoiceId}
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
                                                    <FormControl><Input {...f} placeholder="Nro. de confirmación" readOnly={!!lastSavedInvoiceId} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeChangePayment(index)} className="text-destructive hover:text-destructive/80" disabled={changePaymentFields.length <=1 || !!lastSavedInvoiceId}>
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ))}
                                {!lastSavedInvoiceId && (
                                <Button type="button" variant="outline" size="sm" onClick={() => appendChangePayment({ method: "Efectivo", amount: 0, reference: "" })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Método de Vuelto
                                </Button>
                                )}
                                 <FormMessage>{form.formState.errors.changeRefundPaymentMethods && typeof form.formState.errors.changeRefundPaymentMethods === 'string' && (form.formState.errors.changeRefundPaymentMethods as any)?.message}</FormMessage>
                                 <FormMessage>{form.formState.errors.changeRefundPaymentMethods && Array.isArray(form.formState.errors.changeRefundPaymentMethods) && (form.formState.errors.changeRefundPaymentMethods as any)?.message}</FormMessage>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
              <CardHeader>
                  <CardTitle className="text-xl flex items-center text-primary"><Settings className="mr-2 h-5 w-5" />Configuración Adicional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div>
                    <FormField
                        control={form.control}
                        name="applyDiscount"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={editorMode !== 'normal' || !!lastSavedInvoiceId}
                                        id="applyDiscountCheckbox"
                                    />
                                </FormControl>
                                <FormLabel htmlFor="applyDiscountCheckbox" className="font-normal cursor-pointer !mt-0">
                                    Aplicar Descuento
                                </FormLabel>
                            </FormItem>
                        )}
                    />
                    {form.watch('applyDiscount') && editorMode === 'normal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pl-6">
                            <FormField
                                control={form.control}
                                name="discountPercentage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descuento (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value === 0 && !form.getFieldState('discountPercentage').isDirty ? '' : field.value}
                                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                readOnly={!!lastSavedInvoiceId}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="discountValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descuento ({CURRENCY_SYMBOL})</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value === 0 && !form.getFieldState('discountValue').isDirty ? '' : field.value}
                                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                readOnly={!!lastSavedInvoiceId}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                    {(!form.watch('applyDiscount') || editorMode !== 'normal') && <p className="text-xs text-muted-foreground mt-1">Los descuentos están desactivados o no aplican para este modo.</p>}
                  </div>

                  <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
                    <FormField
                      control={form.control}
                      name="applyTax"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2 md:pt-0 md:self-center">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={editorMode !== 'normal' || !!lastSavedInvoiceId}
                              id="applyTaxCheckbox"
                            />
                          </FormControl>
                          <FormLabel htmlFor="applyTaxCheckbox" className="font-normal cursor-pointer !mt-0">
                            Aplicar IVA
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormLabel>Tasa de IVA (%)</FormLabel>
                          <div className="flex items-center">
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder={(TAX_RATE * 100).toFixed(2)}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                disabled={!form.watch('applyTax') || editorMode !== 'normal' || !!lastSavedInvoiceId}
                                className="w-full"
                              />
                            </FormControl>
                          </div>
                          {(editorMode !== 'normal' || !form.watch('applyTax')) && <p className="text-xs text-muted-foreground mt-1">El IVA está desactivado o no aplica para este modo.</p>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name="applyWarranty"
                      render={({ field: checkboxField }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={checkboxField.value}
                              onCheckedChange={checkboxField.onChange}
                              disabled={editorMode !== 'normal' || !!lastSavedInvoiceId}
                              id="applyWarrantyCheckbox"
                            />
                          </FormControl>
                          <FormLabel htmlFor="applyWarrantyCheckbox" className="font-normal cursor-pointer !mt-0">
                            Aplicar Nota de Garantía
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    {form.watch('applyWarranty') && editorMode === 'normal' && (
                      <div className="space-y-3 mt-2 pl-6">
                        <FormField
                          control={form.control}
                          name="warrantyDuration"
                          render={({ field: selectField }) => (
                            <FormItem>
                              <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground" />Duración de la Garantía</FormLabel>
                              <Select
                                onValueChange={selectField.onChange}
                                value={selectField.value}
                                disabled={!form.watch('applyWarranty') || editorMode !== 'normal' || !!lastSavedInvoiceId}
                              >
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Seleccione duración" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {warrantyDurationOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch('warrantyDuration') !== "no_aplica" && (
                          <FormField
                            control={form.control}
                            name="warrantyText"
                            render={({ field: textareaField }) => (
                              <FormItem>
                                <FormLabel htmlFor="warrantyText">Texto Adicional de la Garantía</FormLabel>
                                <FormControl>
                                  <Textarea
                                    id="warrantyText"
                                    placeholder="Ej: contra defectos de fábrica."
                                    {...textareaField}
                                    disabled={!form.watch('applyWarranty') || editorMode !== 'normal' || !!lastSavedInvoiceId}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                    {(!form.watch('applyWarranty') || editorMode !== 'normal') && <p className="text-xs text-muted-foreground mt-1">La garantía está desactivada o no aplica para este modo.</p>}
                  </div>

                  <FormField
                      control={form.control}
                      name="thankYouMessage"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Mensaje de Agradecimiento</FormLabel>
                              <FormControl><Input {...field} placeholder="¡Gracias por su compra!" readOnly={!!lastSavedInvoiceId} /></FormControl>
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
                              <FormControl><Textarea {...field} placeholder="Ej: Sin derecho a nota de crédito fiscal." readOnly={!!lastSavedInvoiceId} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </CardContent>
              <CardFooter className="flex-col sm:flex-row items-stretch gap-3">
                  {!lastSavedInvoiceId && (
                    <Button type="submit" className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Save className="mr-2 h-4 w-4" />
                        {editorMode === 'debtPayment' && "Guardar Abono a Deuda"}
                        {editorMode === 'creditDeposit' && "Guardar Depósito a Cuenta"}
                        {editorMode === 'normal' && "Guardar y Generar Factura"}
                    </Button>
                  )}
                  
                  {canCancelThisInvoice ? (
                    <Button type="button" variant="destructive" onClick={() => setIsCancelConfirmOpen(true)} className="w-full sm:w-auto">
                        <XCircle className="mr-2 h-4 w-4" /> Anular Factura
                    </Button>
                  ) : liveInvoicePreview.status === 'cancelled' ? (
                     <Button type="button" variant="outline" disabled className="w-full sm:w-auto">
                        <ShieldCheck className="mr-2 h-4 w-4 text-destructive" /> Factura Ya Anulada
                    </Button>
                  ) : ( 
                    <Button type="button" variant="outline" onClick={handleCleanAndExit} className="w-full sm:w-auto">
                        <XCircle className="mr-2 h-4 w-4" /> {lastSavedInvoiceId ? "Nueva Factura / Salir" : "Limpiar y Salir"}
                    </Button>
                  )}
              </CardFooter>
            </Card>
        </Form>
      </form>

      <div className="lg:col-span-1 space-y-4 sticky top-20" data-invoice-preview-wrapper>
        <Card className="shadow-md no-print" data-invoice-preview-header>
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-primary">
              <Info className="mr-2 h-5 w-5" />
              Previsualización de {editorMode === 'debtPayment' ? "Abono" : editorMode === 'creditDeposit' ? "Depósito" : (liveInvoicePreview.status === 'cancelled' ? "Factura Anulada" : "Factura")}
            </CardTitle>
            <CardDescription>Así se verá su documento.</CardDescription>
          </CardHeader>
        </Card>
        <InvoicePreview
            invoice={liveInvoicePreview}
            companyDetails={previewCompanyDetails}
            className="print-receipt"
            isSavedInvoice={!!lastSavedInvoiceId}
            invoiceStatus={liveInvoicePreview.status || 'active'}
        />
      </div>
       <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de anular esta factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la factura Nro. <span className="font-semibold">{liveInvoicePreview.invoiceNumber}</span> como ANULADA.
              Los cambios en los saldos del cliente asociados a esta factura serán revertidos.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener factura</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelCreatedInvoice}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Sí, anular factura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
    
