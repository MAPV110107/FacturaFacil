
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CompanyDetails, CustomerDetails, InvoiceItem, PaymentDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types";
import { invoiceItemSchema, paymentDetailsSchema, customerDetailsSchema as partialCustomerSchema } from "@/lib/schemas";
import { CURRENCY_SYMBOL, DEFAULT_THANK_YOU_MESSAGE, TAX_RATE } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoicePreview } from "./invoice-preview";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Users, FileText, DollarSign, Settings, Receipt, CalendarDays, Info, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es requerido."),
  date: z.date({ required_error: "La fecha es requerida."}),
  customerDetails: partialCustomerSchema.refine(data => data.id || (data.name && data.rif && data.address), {
    message: "Debe seleccionar un cliente existente o ingresar los datos de un nuevo cliente.",
    path: ["name"], 
  }),
  items: z.array(invoiceItemSchema).min(1, "Debe añadir al menos un artículo a la factura."),
  paymentMethods: z.array(paymentDetailsSchema).min(1, "Debe añadir al menos un método de pago."),
  thankYouMessage: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1).default(TAX_RATE),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

const defaultCompany: CompanyDetails = { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" };

export function InvoiceEditor() {
  const [companyDetails] = useLocalStorage<CompanyDetails>("companyDetails", defaultCompany);
  const [customers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const [savedInvoices, setSavedInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const { toast } = useToast();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [liveInvoicePreview, setLiveInvoicePreview] = useState<Partial<Invoice>>({
    items: [],
    paymentMethods: [],
    thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
    date: new Date(0).toISOString(), // SSR-safe: Use a fixed epoch date
    invoiceNumber: "" // SSR-safe: Initialize as empty
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "", // SSR-safe
      date: undefined, // SSR-safe, Calendar will show placeholder
      customerDetails: { name: "", rif: "", address: "" },
      items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }],
      paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
      thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
      notes: "",
      taxRate: TAX_RATE,
    },
  });

  useEffect(() => {
    if (isClient) {
      const initialInvoiceNumber = `FACT-${Date.now().toString().slice(-6)}`;
      const initialDate = new Date();

      form.setValue("invoiceNumber", initialInvoiceNumber, { shouldDirty: false, shouldValidate: false });
      form.setValue("date", initialDate, { shouldDirty: false, shouldValidate: false });
      
      // Update preview state immediately after setting form values for client
      setLiveInvoicePreview(prev => ({
        ...prev,
        invoiceNumber: initialInvoiceNumber,
        date: initialDate.toISOString(),
      }));
    }
  }, [isClient, form]);


  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
    control: form.control,
    name: "paymentMethods",
  });

  const calculateTotals = useCallback((items: InvoiceItem[], taxRate: number) => {
    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subTotal * taxRate;
    const totalAmount = subTotal + taxAmount;
    return { subTotal, taxAmount, totalAmount };
  }, []);
  
  const calculatePaymentSummary = useCallback((payments: PaymentDetails[], totalAmount: number) => {
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const amountDue = totalAmount - amountPaid;
    return { amountPaid, amountDue };
  }, []);

  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      // Ensure values are defined before processing
      const currentItems = (values.items || []).map(item => ({
        ...item,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
      })) as InvoiceItem[];
      
      const { subTotal, taxAmount, totalAmount } = calculateTotals(currentItems, values.taxRate ?? TAX_RATE);
      const { amountPaid, amountDue } = calculatePaymentSummary(values.paymentMethods || [], totalAmount);

      setLiveInvoicePreview(prev => ({
        ...prev,
        invoiceNumber: values.invoiceNumber,
        date: values.date ? values.date.toISOString() : (prev.date || new Date(0).toISOString()),
        customerDetails: values.customerDetails as CustomerDetails,
        items: currentItems,
        paymentMethods: values.paymentMethods as PaymentDetails[],
        subTotal,
        taxAmount,
        totalAmount,
        amountPaid,
        amountDue,
        thankYouMessage: values.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
        notes: values.notes,
      }));
    });
    return () => subscription.unsubscribe();
  }, [form, calculateTotals, calculatePaymentSummary]);


   useEffect(() => {
    // This effect ensures liveInvoicePreview is updated when form values (potentially from localStorage via selected customer) are ready.
    // Run only on client after initial hydration and form setup.
    if (isClient) {
        const values = form.getValues();
        const currentItems = (values.items || []).map(item => ({
            ...item,
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
        })) as InvoiceItem[];
        const taxRate = values.taxRate ?? TAX_RATE;
        const { subTotal, taxAmount, totalAmount } = calculateTotals(currentItems, taxRate);
        const payments = values.paymentMethods || [];
        const {amountPaid, amountDue} = calculatePaymentSummary(payments, totalAmount);

        setLiveInvoicePreview(prev => ({ 
            ...prev, 
            invoiceNumber: values.invoiceNumber || prev.invoiceNumber,
            date: values.date ? values.date.toISOString() : (prev.date || new Date(0).toISOString()),
            customerDetails: values.customerDetails as CustomerDetails,
            items: currentItems, 
            paymentMethods: payments as PaymentDetails[],
            subTotal, taxAmount, totalAmount, amountPaid, amountDue,
            thankYouMessage: values.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
            notes: values.notes,
        }));
    }
  }, [isClient, form, calculateTotals, calculatePaymentSummary, companyDetails, customers]); // Add relevant dependencies


  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      form.setValue("customerDetails", customer, { shouldValidate: true });
    } else {
      // Reset to new customer input fields, keeping other form data
      form.setValue("customerDetails", { id: undefined, name: "", rif: "", address: "", phone: "", email: "" }, { shouldValidate: true });
    }
  };
  
  function onSubmit(data: InvoiceFormData) {
    const finalItems = data.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));
    const { subTotal, taxAmount, totalAmount } = calculateTotals(finalItems, data.taxRate);
    const { amountPaid, amountDue } = calculatePaymentSummary(data.paymentMethods, totalAmount);

    const fullInvoiceData: Invoice = {
      id: uuidv4(),
      invoiceNumber: data.invoiceNumber,
      date: data.date.toISOString(),
      companyDetails: companyDetails || defaultCompany, // companyDetails from useLocalStorage
      customerDetails: data.customerDetails as CustomerDetails, 
      items: finalItems,
      paymentMethods: data.paymentMethods,
      subTotal,
      taxAmount,
      totalAmount,
      amountPaid,
      amountDue,
      thankYouMessage: data.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
      notes: data.notes,
    };
    
    setSavedInvoices(prevInvoices => [...prevInvoices, fullInvoiceData]);
    // Set liveInvoicePreview to the saved invoice to ensure preview matches what was saved
    setLiveInvoicePreview(fullInvoiceData); 
    
    toast({
      title: "Factura Guardada y Lista para Imprimir",
      description: `La factura Nro. ${data.invoiceNumber} ha sido guardada en el historial y generada.`,
    });

    // Reset form for next invoice, ensuring client-side values are re-initialized
    const newInvoiceNumber = isClient ? `FACT-${Date.now().toString().slice(-6)}` : "";
    const newDate = isClient ? new Date() : undefined;

    form.reset({
      invoiceNumber: newInvoiceNumber,
      date: newDate,
      customerDetails: { name: "", rif: "", address: "" },
      items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }],
      paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
      thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
      notes: "",
      taxRate: TAX_RATE,
    });
    setSelectedCustomerId(undefined); 
    // also reset live preview for the new form
     if(isClient) {
        setLiveInvoicePreview({
            items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0, totalPrice: 0}],
            paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
            thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
            date: newDate?.toISOString() || new Date(0).toISOString(),
            invoiceNumber: newInvoiceNumber,
            subTotal: 0, taxAmount: 0, totalAmount: 0, amountPaid: 0, amountDue: 0,
            customerDetails: { name: "", rif: "", address: "" },
        });
     }
  }

  // Determine company details for preview, ensuring it's SSR-safe initially.
  // The updated useLocalStorage hook should handle this, so companyDetails is initialValue on SSR.
  const previewCompanyDetails = companyDetails;


  if (!isClient) {
    // Render a loading state or minimal version for SSR / pre-hydration
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><Users className="mr-2 h-5 w-5" />Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="customerDetails.id" // Not directly used in schema but helps manage selection
                render={({ field }) => (
                  <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={handleCustomerSelect} value={selectedCustomerId || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente existente o ingresar nuevo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new_customer">--- Ingresar Nuevo Cliente ---</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.rif})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage /> {/* For general customer selection error if any */}
                  </FormItem>
                )}
              />
              
              {(selectedCustomerId === "new_customer" || !selectedCustomerId || customers.length === 0) && (
                <div className="space-y-3 pt-3 border-t mt-3">
                    <FormField control={form.control} name="customerDetails.name" render={({ field }) => (
                        <FormItem><FormLabel>Nombre/Razón Social</FormLabel><FormControl><Input {...field} placeholder="Nombre del nuevo cliente" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="customerDetails.rif" render={({ field }) => (
                        <FormItem><FormLabel>RIF/CI</FormLabel><FormControl><Input {...field} placeholder="RIF del nuevo cliente" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="customerDetails.address" render={({ field }) => (
                        <FormItem><FormLabel>Dirección</FormLabel><FormControl><Textarea {...field} placeholder="Dirección del nuevo cliente" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
              )}
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
        {/* Pass previewCompanyDetails which is hydration-safe */}
        <InvoicePreview invoice={liveInvoicePreview} companyDetails={previewCompanyDetails} className="print-receipt" />
      </div>
    </div>
  );
}

