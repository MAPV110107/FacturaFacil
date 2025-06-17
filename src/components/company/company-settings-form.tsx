
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import useLocalStorage from "@/hooks/use-local-storage";
import type { CompanyDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types";
import { companyDetailsSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, XCircle } from "lucide-react";
import React from "react";

const defaultCompanyDetails: CompanyDetails = {
  id: DEFAULT_COMPANY_ID,
  name: "",
  rif: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "https://placehold.co/150x50.png",
};

export function CompanySettingsForm() {
  const [companyDetails, setCompanyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    defaultCompanyDetails
  );
  const { toast } = useToast();

  const form = useForm<z.infer<typeof companyDetailsSchema>>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: companyDetails || defaultCompanyDetails,
  });

  React.useEffect(() => {
    // Ensure form is reset if companyDetails from localStorage changes (e.g., initial load)
    form.reset(companyDetails || defaultCompanyDetails);
  }, [companyDetails, form]);


  function onSubmit(values: z.infer<typeof companyDetailsSchema>) {
    setCompanyDetails({ ...companyDetails, ...values, id: DEFAULT_COMPANY_ID });
    toast({
      title: "Guardado",
      description: "La información de la empresa ha sido actualizada.",
    });
  }

  function handleCancel() {
    form.reset(companyDetails || defaultCompanyDetails); // Reset to last saved/loaded values
    toast({
      title: "Cancelado",
      description: "Los cambios no guardados han sido descartados.",
      variant: "default",
    });
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Información de la Empresa</CardTitle>
        <CardDescription>
          Estos datos aparecerán en sus facturas. Asegúrese de que sean correctos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Mi Empresa C.A." {...field} />
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
                    <FormLabel>RIF</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: J-12345678-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección Fiscal</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Av. Principal, Edificio Central, Piso 1, Oficina 101, Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 0212-555-1234" {...field} />
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
                      <Input placeholder="Ej: contacto@miempresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del Logo (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: https://ejemplo.com/logo.png" {...field} />
                    </FormControl>
                    {field.value && (
                        <div className="mt-2 p-2 border rounded-md bg-muted aspect-video max-w-[200px] flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={field.value} alt="Previsualización del logo" className="max-h-full max-w-full object-contain" data-ai-hint="company logo" />
                        </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Save className="mr-2 h-4 w-4" /> Guardar Cambios
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <XCircle className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
