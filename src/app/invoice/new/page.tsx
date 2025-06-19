
import { Suspense } from 'react';
import { InvoiceEditor } from "@/components/invoice/invoice-editor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, RefreshCw } from "lucide-react"; // Added RefreshCw for loading state

function InvoiceLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground space-y-4 no-print">
      <RefreshCw className="h-12 w-12 animate-spin text-primary" />
      <p className="text-xl font-semibold">Cargando editor de facturas...</p>
      <p>Esto puede tomar un momento.</p>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <div className="space-y-8">
       <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-sm no-print">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <FilePlus2 className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Crear Nueva Factura</CardTitle>
              <CardDescription className="text-muted-foreground">
                Complete los campos a continuación para generar una nueva factura fiscal.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Suspense fallback={<InvoiceLoadingSkeleton />}>
        <InvoiceEditor />
      </Suspense>
    </div>
  );
}
