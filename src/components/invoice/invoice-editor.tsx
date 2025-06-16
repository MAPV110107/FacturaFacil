
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CompanyDetails, CustomerDetails, InvoiceItem, PaymentDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types";
import { invoiceFormSchema } from "@/lib/schemas"; 
import { CURRENCY_SYMBOL, DEFAULT_THANK_YOU_MESSAGE, TAX_RATE } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoicePreview } from "./invoice-preview";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Users, FileText, DollarSign, Settings, Receipt, CalendarDays, Info, Save, Percent, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

const defaultCompany: CompanyDetails = { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" };
const defaultCustomer: CustomerDetails = { id: "", name: "", rif: "", address: "", phone: "", email: "" };

export function InvoiceEditor() {
  const [companyDetails] = useLocalStorage<CompanyDetails>("companyDetails", defaultCompany);
  const [customers, setCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const [savedInvoices, setSavedInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);

  const [customerRifInput, setCustomerRifInput] = useState("");
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchMessage, setCustomerSearchMessage] = useState<string | null>(null);
  const [showNewCustomerFields, setShowNewCustomerFields] = useState(false);
  const [selectedCustomerIdForDropdown, setSelectedCustomerIdForDropdown] = useState<string | undefined>(undefined);

  const initialLivePreviewState: Partial<Invoice> = {
    invoiceNumber: "",
    date: new Date(0).toISOString(), 
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
    type: 'sale',
  };

  const [liveInvoicePreview, setLiveInvoicePreview] = useState<Partial<Invoice>>(initialLivePreviewState);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "", 
      date: undefined, 
      type: 'sale',
      originalInvoiceId: undefined,
      cashierNumber: "",
      salesperson: "",
      customerDetails: { ...defaultCustomer },
      items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }],
      paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
      thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
      notes: "",
      taxRate: TAX_RATE,
      discountAmount: 0,
    },
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const resetFormAndState = useCallback(() => {
    const initialInvoiceNumber = `FACT-${Date.now().toString().slice(-6)}`;
    const initialDate = new Date();

    form.reset({
      invoiceNumber: initialInvoiceNumber,
      date: initialDate,
      type: 'sale',
      originalInvoiceId: undefined,
      cashierNumber: "",
      salesperson: "",
      customerDetails: { ...defaultCustomer },
      items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }],
      paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
      thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
      notes: "",
      taxRate: TAX_RATE,
      discountAmount: 0,
    });
    
    setCustomerRifInput("");
    setShowNewCustomerFields(false);
    setCustomerSearchMessage(null);
    setSelectedCustomerIdForDropdown(undefined);
    setLiveInvoicePreview({
      ...initialLivePreviewState,
      invoiceNumber: initialInvoiceNumber,
      date: initialDate.toISOString(),
    });

  }, [form]);


  useEffect(() => {
    if (isClient) {
      resetFormAndState();
    }
  }, [isClient, resetFormAndState]);


  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
    control: form.control,
    name: "paymentMethods",
  });

  const calculateTotals = useCallback((items: InvoiceItem[], taxRateValue: number, discountAmountValue: number) => {
    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const actualDiscountAmount = discountAmountValue || 0;
    const taxableAmount = Math.max(0, subTotal - actualDiscountAmount); // Ensure taxable amount is not negative
    const actualTaxRate = taxRateValue || 0;
    const taxAmount = taxableAmount * actualTaxRate;
    const totalAmount = taxableAmount + taxAmount;
    return { subTotal, discountAmount: actualDiscountAmount, taxAmount, totalAmount };
  }, []);
  
  const calculatePaymentSummary = useCallback((payments: PaymentDetails[], totalAmount: number) => {
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const amountDue = totalAmount - amountPaid; // Can be negative if overpaid (change/vuelto)
    return { amountPaid, amountDue };
  }, []);

  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      const currentItems = (values.items || []).map(item => ({
        ...item,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
      })) as InvoiceItem[];
      
      const currentTaxRate = values.taxRate ?? TAX_RATE;
      const currentDiscountAmount = values.discountAmount || 0;
      const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(currentItems, currentTaxRate, currentDiscountAmount);
      const { amountPaid, amountDue } = calculatePaymentSummary(values.paymentMethods || [], totalAmount);

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
        amountDue,
        thankYouMessage: values.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
        notes: values.notes,
        type: 'sale', 
      }));
    });
    return () => subscription.unsubscribe();
  }, [form, calculateTotals, calculatePaymentSummary]);

  const handleRifSearch = async () => {
    if (!customerRifInput.trim()) {
      setCustomerSearchMessage("Ingrese un RIF/Cédula para buscar.");
      setShowNewCustomerFields(false);
      form.reset({ ...form.getValues(), customerDetails: { ...defaultCustomer } });
      form.setValue("customerDetails.id", "");
      form.setValue("customerDetails.rif", "");
      setSelectedCustomerIdForDropdown(undefined);
      return;
    }
    setIsSearchingCustomer(true);
    setCustomerSearchMessage("Buscando cliente...");
  
    // Normalize search term: remove non-alphanumeric (except JVEPG for RIF prefixes), then uppercase.
    const searchTerm = customerRifInput.toUpperCase().replace(/[^A-Z0-9]/gi, '');
    
    let foundCustomer = customers.find(c => 
      c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === searchTerm
    );
  
    // If only numbers were entered, try prefixing with V- and E-
    if (!foundCustomer && /^[0-9]+$/.test(customerRifInput.trim())) { 
      const numericPart = customerRifInput.trim();
      const ciWithV = `V${numericPart}`; // Common for natural persons
      const ciWithE = `E${numericPart}`; // Common for foreigners
      foundCustomer = customers.find(c => c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === ciWithV || c.rif.toUpperCase().replace(/[^A-Z0-9]/gi, '') === ciWithE);
    }
  
    if (foundCustomer) {
      form.setValue("customerDetails", { ...foundCustomer }, { shouldValidate: true });
      setCustomerRifInput(foundCustomer.rif); // Update input field to show formatted RIF
      setCustomerSearchMessage(`Cliente encontrado: ${foundCustomer.name}`);
      setShowNewCustomerFields(false);
      setSelectedCustomerIdForDropdown(foundCustomer.id);
    } else {
      form.setValue("customerDetails.id", ""); 
      form.setValue("customerDetails.name", "");
      form.setValue("customerDetails.address", "");
      form.setValue("customerDetails.phone", "");
      form.setValue("customerDetails.email", "");
      form.setValue("customerDetails.rif", customerRifInput.toUpperCase()); // Keep the searched RIF
      setCustomerSearchMessage("Cliente no encontrado. Complete los datos para registrarlo.");
      setShowNewCustomerFields(true);
      setSelectedCustomerIdForDropdown(undefined);
    }
    setIsSearchingCustomer(false);
  };
  
  const handleCustomerSelectFromDropdown = (customerId: string) => {
    setSelectedCustomerIdForDropdown(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      form.setValue("customerDetails", { ...customer }, { shouldValidate: true });
      setCustomerRifInput(customer.rif); 
      setShowNewCustomerFields(false); 
      setCustomerSearchMessage(`Cliente seleccionado: ${customer.name}`);
    } else {
      form.reset({ ...form.getValues(), customerDetails: { ...defaultCustomer } });
      form.setValue("customerDetails.id","");
      form.setValue("customerDetails.rif","");
      setCustomerRifInput("");
      setShowNewCustomerFields(true);
      setCustomerSearchMessage("Ingrese los datos para un nuevo cliente o busque por RIF.");
    }
  };
  
  function onSubmit(data: InvoiceFormData) {
    let customerToSaveOnInvoice = data.customerDetails;

    if (showNewCustomerFields && !data.customerDetails.id) {
      if (data.customerDetails.name && data.customerDetails.rif && data.customerDetails.address) {
        const newCustomer: CustomerDetails = {
          ...data.customerDetails,
          id: uuidv4(), 
        };
        setCustomers(prevCustomers => [...prevCustomers, newCustomer]);
        customerToSaveOnInvoice = newCustomer; 
        toast({ title: "Nuevo Cliente Registrado", description: `Cliente ${newCustomer.name} añadido al sistema.` });
      } else {
        toast({ variant: "destructive", title: "Datos Incompletos del Cliente", description: "Por favor, complete nombre, RIF y dirección para el nuevo cliente." });
        form.setError("customerDetails.name", {type: "manual", message: "Nombre requerido"});
        form.setError("customerDetails.address", {type: "manual", message: "Dirección requerida"});
         if (!data.customerDetails.rif) {
          form.setError("customerDetails.rif", {type: "manual", message: "RIF/Cédula requerido"});
        }
        return; 
      }
    }
    
    if (!customerToSaveOnInvoice || !customerToSaveOnInvoice.rif) {
        toast({ variant: "destructive", title: "Cliente no especificado", description: "Por favor, busque o ingrese los datos del cliente."});
        form.setError("customerDetails.rif", {type: "manual", message: "RIF/Cédula del cliente es requerido"});
        return;
    }

    const finalItems = data.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));
    const currentDiscountAmount = data.discountAmount || 0;
    const currentTaxRate = data.taxRate;
    const { subTotal, discountAmount, taxAmount, totalAmount } = calculateTotals(finalItems, currentTaxRate, currentDiscountAmount);
    const { amountPaid, amountDue } = calculatePaymentSummary(data.paymentMethods, totalAmount);

    const fullInvoiceData: Invoice = {
      id: uuidv4(),
      invoiceNumber: data.invoiceNumber,
      date: data.date.toISOString(),
      type: 'sale', 
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
      amountDue,
      thankYouMessage: data.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
      notes: data.notes,
    };
    
    setSavedInvoices(prevInvoices => [...prevInvoices, fullInvoiceData]);
    setLiveInvoicePreview(fullInvoiceData); 
    
    toast({
      title: "Factura Guardada y Lista para Imprimir",
      description: `La factura Nro. ${data.invoiceNumber} ha sido guardada en el historial y generada.`,
    });

    if (isClient) {
      resetFormAndState();
    }
  }

  const previewCompanyDetails = companyDetails;

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 animate-pulse text-primary" />
        <p className="text-xl font-semibold">Cargando editor de facturas...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><FileText className="mr-2 h-5 w-5" />Detalles de la Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="invoiceNumber">Número de Factura</FormLabel>
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
                    <FormItem className="flex flex-col">
                      <FormLabel htmlFor="date">Fecha de Factura</FormLabel>
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
                            onSelect={field.onChange}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><Users className="mr-2 h-5 w-5" />Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 items-end">
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
                    />
                  </FormControl>
                </FormItem>
                <Button type="button" onClick={handleRifSearch} disabled={isSearchingCustomer} className="w-full sm:w-auto">
                  <Search className="mr-2 h-4 w-4" /> {isSearchingCustomer ? "Buscando..." : "Buscar"}
                </Button>
              </div>

              {customerSearchMessage && <p className={`text-sm mt-2 ${form.formState.errors.customerDetails ? 'text-destructive' : 'text-primary'}`}>{customerSearchMessage}</p>}
              
              <div className="space-y-3 pt-3 border-t mt-3">
                <FormField control={form.control} name="customerDetails.rif" render={({ field }) => (
                    <FormItem>
                        <FormLabel>RIF/CI (verificado/ingresado)</FormLabel>
                        <FormControl><Input {...field} readOnly={!showNewCustomerFields && !!form.getValues("customerDetails.id")} placeholder="RIF del cliente" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="customerDetails.name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre/Razón Social</FormLabel>
                        <FormControl><Input {...field} placeholder="Nombre del cliente" disabled={!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="customerDetails.address" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Dirección Fiscal</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Dirección del cliente" disabled={!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="customerDetails.phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono (Opcional)</FormLabel>
                        <FormControl><Input {...field} placeholder="Teléfono del cliente" disabled={!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="customerDetails.email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email (Opcional)</FormLabel>
                        <FormControl><Input {...field} type="email" placeholder="Email del cliente" disabled={!showNewCustomerFields && !!form.getValues("customerDetails.id") && !isSearchingCustomer && !selectedCustomerIdForDropdown} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>

              <FormItem className="mt-4">
                <FormLabel>O seleccionar de la lista:</FormLabel>
                <Select onValueChange={handleCustomerSelectFromDropdown} value={selectedCustomerIdForDropdown || ""}>
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
                 <FormMessage>{form.formState.errors.customerDetails && typeof form.formState.errors.customerDetails !== 'string' && form.formState.errors.customerDetails.message}</FormMessage>
              </FormItem>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><Receipt className="mr-2 h-5 w-5" />Artículos de la Factura</CardTitle>
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
                        <FormControl><Input {...f} placeholder="Artículo o Servicio" /></FormControl>
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
                        <FormControl><Input {...f} type="number" step="0.01" placeholder="1" 
                         onChange={e => f.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
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
                        <FormControl><Input {...f} type="number" step="0.01" placeholder="0.00" 
                         onChange={e => f.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
              <FormMessage>{form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) ? (form.formState.errors.items as any).message : null}</FormMessage>
               <FormMessage>{form.formState.errors.items && Array.isArray(form.formState.errors.items) && form.formState.errors.items.length ===0 && (form.formState.errors.items as any).message ? (form.formState.errors.items as any).message : null}</FormMessage>
              <Button type="button" variant="outline" onClick={() => appendItem({ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Artículo
              </Button>
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
                                    <Select onValueChange={f.onChange} defaultValue={f.value}>
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
                                    <FormControl><Input {...f} type="number" step="0.01" placeholder="0.00" 
                                     onChange={e => f.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)} className="text-destructive hover:text-destructive/80">
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
                            <FormControl><Input {...field} type="number" step="0.01" placeholder="0.00" 
                             onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
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
                            <FormControl><Input {...field} type="number" step="0.01" placeholder="0.16" 
                             onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
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
             <CardFooter>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Save className="mr-2 h-4 w-4" /> Guardar y Generar Factura
                </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      <div className="lg:col-span-1 space-y-4 sticky top-20 no-print">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-primary"><Info className="mr-2 h-5 w-5" />Previsualización de Factura</CardTitle>
            <CardDescription>Así se verá su factura. Use el botón de abajo para imprimir.</CardDescription>
          </CardHeader>
        </Card>
        <InvoicePreview invoice={liveInvoicePreview} companyDetails={previewCompanyDetails} className="print-receipt" />
      </div>
    </div>
  );
}
