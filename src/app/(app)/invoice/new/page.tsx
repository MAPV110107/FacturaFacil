import { InvoiceEditor } from "@/components/invoice/invoice-editor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2 } from "lucide-react";

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
      <InvoiceEditor />
    </div>
  );
}
