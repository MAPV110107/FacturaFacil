
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CompanyDetails } from "@/lib/types";
import { DEFAULT_COMPANY_ID } from "@/lib/types";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, FileSearch } from "lucide-react";
import Link from "next/link";


export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter(); 
  const invoiceId = params?.id as string;

  const [allInvoices, setAllInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const [companyDetails] = useLocalStorage<CompanyDetails>(
    "companyDetails",
    { id: DEFAULT_COMPANY_ID, name: "", rif: "", address: "" } 
  );
  
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined); 
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && invoiceId) {
      
      const currentInvoices = JSON.parse(localStorage.getItem("invoices") || "[]") as Invoice[];
      const foundInvoice = currentInvoices.find((inv) => inv.id === invoiceId);
      setInvoice(foundInvoice || null);
    }
  }, [invoiceId, isClient, allInvoices]); 

  if (!isClient || invoice === undefined) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <FileSearch className="h-16 w-16 mb-4 animate-pulse text-primary" />
        <p className="text-xl font-semibold">Cargando factura...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card className="max-w-lg mx-auto text-center shadow-lg">
        <CardHeader>
           <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-2" />
          <CardTitle className="text-2xl text-destructive">Factura No Encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            La factura que está intentando ver no existe o ha sido eliminada.
          </CardDescription>
          <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Historial
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="no-print">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
       </Button>
      <InvoicePreview id="factura" invoice={invoice} companyDetails={companyDetails} />
    </div>
  );
}
