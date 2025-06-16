
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
import { PlusCircle, Trash2, Users, FileText, DollarSign, Settings, Receipt, CalendarDays, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormField, FormItem } from "@/components/ui/form"; // Added Form import
import { format } from "date-fns";
import { es } from "date-fns/locale";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es requerido."),
  date: z.date({ required_error: "La fecha es requerida."}),
  customerDetails: partialCustomerSchema.refine(data => data.id || (data.name && data.rif && data.address), {
    message: "Debe seleccionar un cliente existente o ingresar los datos de un nuevo cliente.",
    path: ["name"], // Attach error to a common field if new customer is incomplete
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
  const { toast } = useToast();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  
  // State for the invoice preview, separate from form state for easier updates
  const [liveInvoicePreview, setLiveInvoicePreview] = useState<Partial<Invoice>>({
    items: [],
    paymentMethods: [],
    thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
    date: new Date().toISOString(),
    invoiceNumber: `FACT-${Date.now().toString().slice(-6)}`
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: liveInvoicePreview.invoiceNumber,
      date: new Date(),
      customerDetails: { name: "", rif: "", address: "" },
      items: [{ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 }],
      paymentMethods: [{ method: "Efectivo", amount: 0, reference: "" }],
      thankYouMessage: DEFAULT_THANK_YOU_MESSAGE,
      notes: "",
      taxRate: TAX_RATE,
    },
  });

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

  // Effect to update live preview when form values change
  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      const currentItems = (values.items || []).map(item => ({
        ...item,
        totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
      })) as InvoiceItem[];
      
      const { subTotal, taxAmount, totalAmount } = calculateTotals(currentItems, values.taxRate ?? TAX_RATE);
      const { amountPaid, amountDue } = calculatePaymentSummary(values.paymentMethods || [], totalAmount);

      setLiveInvoicePreview(prev => ({
        ...prev,
        invoiceNumber: values.invoiceNumber,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
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


  // Effect to update totals in live preview when items or tax rate initially load or change
   useEffect(() => {
    const items = form.getValues("items").map(item => ({
        ...item,
        totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
    })) as InvoiceItem[];
    const taxRate = form.getValues("taxRate");
    const { subTotal, taxAmount, totalAmount } = calculateTotals(items, taxRate);
    const payments = form.getValues("paymentMethods");
    const {amountPaid, amountDue} = calculatePaymentSummary(payments, totalAmount);

    setLiveInvoicePreview(prev => ({ ...prev, items, subTotal, taxAmount, totalAmount, amountPaid, amountDue }));
  }, [form, calculateTotals, calculatePaymentSummary]); // Removed itemFields dependency to avoid loop


  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      form.setValue("customerDetails", customer, { shouldValidate: true });
    } else {
      // Clear customer details if "new" or invalid selection
      form.setValue("customerDetails", { name: "", rif: "", address: "", phone: "", email: "" }, { shouldValidate: true });
    }
  };
  
  function onSubmit(data: InvoiceFormData) {
    // In a real app, you would save this invoice data
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
      companyDetails: companyDetails || defaultCompany,
      customerDetails: data.customerDetails as CustomerDetails, // Cast, validated by schema
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
    
    // For now, we just update the preview and toast.
    setLiveInvoicePreview(fullInvoiceData);
    console.log("Invoice Data:", fullInvoiceData);
    toast({
      title: "Factura Lista para Imprimir",
      description: `La factura Nro. ${data.invoiceNumber} ha sido generada.`,
    });
    // To save invoices: useLocalStorage("invoices", (prev = []) => [...prev, fullInvoiceData]);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="lg:col-span-2 space-y-8">
          {/* Invoice Meta Section */}
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
                      <Label htmlFor="invoiceNumber">Número de Factura</Label>
                      <Input id="invoiceNumber" {...field} />
                      {form.formState.errors.invoiceNumber && <p className="text-sm text-destructive">{form.formState.errors.invoiceNumber.message}</p>}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <Label htmlFor="date">Fecha de Factura</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                           <Button
                            id="date"
                            variant={"outline"}
                            className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center text-primary"><Users className="mr-2 h-5 w-5" />Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={handleCustomerSelect} value={selectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente existente o ingresar nuevo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_customer">--- Ingresar Nuevo Cliente ---</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.rif})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.customerDetails?.name && <p className="text-sm text-destructive">{form.formState.errors.customerDetails.name.message}</p>}

              {(selectedCustomerId === "new_customer" || !selectedCustomerId || customers.length === 0) && (
                <div className="space-y-3 pt-3 border-t mt-3">
                    <FormField control={form.control} name="customerDetails.name" render={({ field }) => (
                        <FormItem><Label>Nombre/Razón Social</Label><Input {...field} placeholder="Nombre del nuevo cliente" />{form.formState.errors.customerDetails?.name && <p className="text-sm text-destructive">{form.formState.errors.customerDetails.name.message}</p>}</FormItem>
                    )} />
                    <FormField control={form.control} name="customerDetails.rif" render={({ field }) => (
                        <FormItem><Label>RIF/CI</Label><Input {...field} placeholder="RIF del nuevo cliente" />{form.formState.errors.customerDetails?.rif && <p className="text-sm text-destructive">{form.formState.errors.customerDetails.rif.message}</p>}</FormItem>
                    )} />
                    <FormField control={form.control} name="customerDetails.address" render={({ field }) => (
                        <FormItem><Label>Dirección</Label><Textarea {...field} placeholder="Dirección del nuevo cliente" />{form.formState.errors.customerDetails?.address && <p className="text-sm text-destructive">{form.formState.errors.customerDetails.address.message}</p>}</FormItem>
                    )} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Section */}
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
                        <Label>Descripción</Label>
                        <Input {...f} placeholder="Artículo o Servicio" />
                        {form.formState.errors.items?.[index]?.description && <p className="text-sm text-destructive">{form.formState.errors.items[index]?.description?.message}</p>}
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field: f }) => (
                      <FormItem>
                        <Label>Cantidad</Label>
                        <Input {...f} type="number" step="0.01" placeholder="1" 
                         onChange={e => f.onChange(parseFloat(e.target.value) || 0)} />
                        {form.formState.errors.items?.[index]?.quantity && <p className="text-sm text-destructive">{form.formState.errors.items[index]?.quantity?.message}</p>}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field: f }) => (
                      <FormItem>
                        <Label>Precio Unit. ({CURRENCY_SYMBOL})</Label>
                        <Input {...f} type="number" step="0.01" placeholder="0.00" 
                         onChange={e => f.onChange(parseFloat(e.target.value) || 0)} />
                        {form.formState.errors.items?.[index]?.unitPrice && <p className="text-sm text-destructive">{form.formState.errors.items[index]?.unitPrice?.message}</p>}
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
              {form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) && <p className="text-sm text-destructive">{ (form.formState.errors.items as any).message }</p>}
              <Button type="button" variant="outline" onClick={() => appendItem({ id: uuidv4(), description: "", quantity: 1, unitPrice: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Artículo
              </Button>
            </CardContent>
          </Card>
          
          {/* Payment Section */}
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
                                    <Label>Método</Label>
                                     <Select onValueChange={f.onChange} defaultValue={f.value}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione método" /></SelectTrigger>
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
                                    {form.formState.errors.paymentMethods?.[index]?.method && <p className="text-sm text-destructive">{form.formState.errors.paymentMethods[index]?.method?.message}</p>}
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`paymentMethods.${index}.amount`}
                            render={({ field: f }) => (
                                <FormItem>
                                    <Label>Monto ({CURRENCY_SYMBOL})</Label>
                                    <Input {...f} type="number" step="0.01" placeholder="0.00" 
                                     onChange={e => f.onChange(parseFloat(e.target.value) || 0)} />
                                     {form.formState.errors.paymentMethods?.[index]?.amount && <p className="text-sm text-destructive">{form.formState.errors.paymentMethods[index]?.amount?.message}</p>}
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`paymentMethods.${index}.reference`}
                            render={({ field: f }) => (
                                <FormItem>
                                    <Label>Referencia (Opcional)</Label>
                                    <Input {...f} placeholder="Nro. de confirmación" />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    </div>
                ))}
                {form.formState.errors.paymentMethods && typeof form.formState.errors.paymentMethods === 'object' && !Array.isArray(form.formState.errors.paymentMethods) && <p className="text-sm text-destructive">{ (form.formState.errors.paymentMethods as any).message }</p>}
                <Button type="button" variant="outline" onClick={() => appendPayment({ method: "Efectivo", amount: 0, reference: "" })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Método de Pago
                </Button>
            </CardContent>
          </Card>

          {/* Additional Settings */}
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
                            <Label>Tasa de IVA (ej. 0.16 para 16%)</Label>
                            <Input {...field} type="number" step="0.01" placeholder="0.16" 
                             onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                            {form.formState.errors.taxRate && <p className="text-sm text-destructive">{form.formState.errors.taxRate.message}</p>}
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="thankYouMessage"
                    render={({ field }) => (
                        <FormItem>
                            <Label>Mensaje de Agradecimiento</Label>
                            <Input {...field} placeholder="¡Gracias por su compra!" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <Label>Notas Adicionales (Opcional)</Label>
                            <Textarea {...field} placeholder="Ej: Garantía válida por 30 días." />
                        </FormItem>
                    )}
                />
            </CardContent>
             <CardFooter>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    <FileText className="mr-2 h-4 w-4" /> Generar Factura para Imprimir
                </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      {/* Invoice Preview Section */}
      <div className="lg:col-span-1 space-y-4 sticky top-20 no-print"> {/* Added no-print here */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-primary"><Info className="mr-2 h-5 w-5" />Previsualización de Factura</CardTitle>
            <CardDescription>Así se verá su factura. Use el botón de abajo para imprimir.</CardDescription>
          </CardHeader>
        </Card>
        <InvoicePreview invoice={liveInvoicePreview} companyDetails={companyDetails} className="print-receipt" />
      </div>
    </div>
  );
}

    