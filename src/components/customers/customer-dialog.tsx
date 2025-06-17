
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { CustomerDetails } from "@/lib/types";
import { customerDetailsSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Save } from "lucide-react";
import React, { useState } from "react";

interface CustomerDialogProps {
  customer?: CustomerDetails | null;
  onSave: (customer: CustomerDetails) => void;
  triggerButton?: React.ReactNode;
}

const defaultCustomerValues: Partial<CustomerDetails> = {
  name: "",
  rif: "",
  address: "",
  phone: "",
  email: "",
  outstandingBalance: 0,
  creditBalance: 0,
};

export function CustomerDialog({ customer, onSave, triggerButton }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!customer;

  const form = useForm<z.infer<typeof customerDetailsSchema>>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: customer ? { ...defaultCustomerValues, ...customer } : defaultCustomerValues,
  });
  
  React.useEffect(() => {
    if (open) {
      form.reset(customer ? { ...defaultCustomerValues, ...customer } : defaultCustomerValues);
    }
  }, [open, customer, form]);


  function onSubmit(values: z.infer<typeof customerDetailsSchema>) {
    const customerToSave: CustomerDetails = {
      id: customer?.id || uuidv4(), // Use uuidv4 for new customers
      ...defaultCustomerValues, 
      ...values,
      outstandingBalance: customer?.outstandingBalance || values.outstandingBalance || 0,
      creditBalance: customer?.creditBalance || values.creditBalance || 0,
    };
    onSave(customerToSave);
    setOpen(false);
    form.reset(defaultCustomerValues);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton ? (
          triggerButton
        ) : (
          <Button variant={isEditing ? "ghost" : "default"} size={isEditing ? "icon" : "default"} className={isEditing ? "h-8 w-8 p-0" : ""}>
            {isEditing ? <Edit className="h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isEditing ? <span className="sr-only">Editar Cliente</span> : "Añadir Cliente"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary">{isEditing ? "Editar Cliente" : "Añadir Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifique los detalles del cliente." : "Ingrese los detalles del nuevo cliente."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo o Razón Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Pérez o Inversiones XYZ C.A." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RIF / Cédula de Identidad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: V-12345678, E-87654321, J-12345678-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección Fiscal</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Calle Falsa 123, Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 0412-555-9876" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: cliente@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Balance fields are not typically edited directly in this dialog */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Guardar Cambios" : "Añadir Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
