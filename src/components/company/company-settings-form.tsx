
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, XCircle, Upload, Trash2, Printer } from "lucide-react";
import React, { useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const defaultCompanyDetails: CompanyDetails = {
  id: DEFAULT_COMPANY_ID,
  name: "",
  rif: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "",
  logoAlignment: "center",
  fiscalPrinterEnabled: false,
  fiscalPrinterApiUrl: "",
};

export function CompanySettingsForm() {
  const [companyDetails, setCompanyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    defaultCompanyDetails
  );
  const { toast } = useToast();
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof companyDetailsSchema>>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: companyDetails || defaultCompanyDetails,
  });

  React.useEffect(() => {
    const currentStoredDetails = companyDetails || {};
    const effectiveDefaults = {
      ...defaultCompanyDetails,
      ...currentStoredDetails,
      logoAlignment: currentStoredDetails.logoAlignment || defaultCompanyDetails.logoAlignment,
    };
    form.reset(effectiveDefaults);
  }, [companyDetails, form]);


  function onSubmit(values: z.infer<typeof companyDetailsSchema>) {
    setCompanyDetails({ ...companyDetails, ...values, id: DEFAULT_COMPANY_ID });
    toast({
      title: "Guardado",
      description: "La información de la empresa ha sido actualizada.",
    });
  }

  function handleCancel() {
    const currentStoredDetails = companyDetails || {};
    const effectiveDefaults = {
      ...defaultCompanyDetails,
      ...currentStoredDetails,
      logoAlignment: currentStoredDetails.logoAlignment || defaultCompanyDetails.logoAlignment,
    };
    form.reset(effectiveDefaults);
    toast({
      title: "Cancelado",
      description: "Los cambios no guardados han sido descartados.",
      variant: "default",
    });
  }

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Max 2MB
        toast({
          variant: "destructive",
          title: "Archivo muy grande",
          description: "El logo no debe exceder los 2MB.",
        });
        if (logoFileInputRef.current) {
          logoFileInputRef.current.value = "";
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("logoUrl", reader.result as string, { shouldValidate: true, shouldDirty: true });
        toast({
          title: "Logo Cargado",
          description: "El logo se ha cargado y se mostrará en la previsualización. Guarde los cambios para aplicarlo.",
        });
      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error al leer archivo",
          description: "No se pudo procesar el archivo del logo.",
        });
      };
      reader.readAsDataURL(file);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = ""; // Reset file input
      }
    }
  };

  const handleRemoveLogo = () => {
    form.setValue("logoUrl", "", { shouldValidate: true, shouldDirty: true });
    toast({
      title: "Logo Eliminado",
      description: "El logo ha sido eliminado de la configuración. Guarde los cambios para aplicarlo.",
    });
  };
  
  const fiscalPrinterEnabled = form.watch("fiscalPrinterEnabled");

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
                  <FormLabel>Logo de la Empresa</FormLabel>
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <FormControl className="flex-grow">
                      <Input placeholder="URL del logo o suba un archivo" {...field} value={field.value || ""} />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => logoFileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="mr-2 h-4 w-4" /> Subir Logo
                    </Button>
                     <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleRemoveLogo}
                      className="w-full sm:w-auto"
                      disabled={!field.value || field.value.trim() === ''}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar Logo
                    </Button>
                    <input 
                      type="file"
                      accept="image/png, image/jpeg, image/gif, image/svg+xml"
                      ref={logoFileInputRef}
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </div>
                  {field.value && field.value.trim() !== '' ? (
                      <div className="mt-2 p-2 border rounded-md bg-muted aspect-video max-w-[200px] flex items-center justify-center">
                          <img src={field.value} alt="Previsualización del logo" className="max-h-full max-w-full object-contain" data-ai-hint="company logo" />
                      </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No hay logo configurado.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoAlignment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alineación del Logo en Factura</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione alineación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="left">Izquierda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Derecha</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Printer className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-primary">Integración con Impresora Fiscal</h3>
              </div>
              <FormField
                control={form.control}
                name="fiscalPrinterEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Habilitar Impresión Fiscal</FormLabel>
                      <FormDescription>
                        Permite enviar documentos a una impresora fiscal a través de una API local.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {fiscalPrinterEnabled && (
                <FormField
                  control={form.control}
                  name="fiscalPrinterApiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL del Servicio de Impresora Fiscal</FormLabel>
                      <FormControl>
                        <Input placeholder="http://localhost:9876/print" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        La dirección de la API local que se comunica con su impresora fiscal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>


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
