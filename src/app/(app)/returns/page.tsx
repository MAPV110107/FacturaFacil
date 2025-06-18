
import { Suspense } from 'react';
import { ReturnsManager } from '@/components/returns/returns-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Undo2, RefreshCw } from "lucide-react";

function ReturnsLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground space-y-4">
      <RefreshCw className="h-12 w-12 animate-spin text-primary" />
      <p className="text-xl font-semibold">Cargando gestor de devoluciones...</p>
      <p>Esto puede tomar un momento.</p>
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <div className="space-y-8">
       <Card className="shadow-lg no-print">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Undo2 className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Gestionar Devoluciones y Retiros</CardTitle>
              <CardDescription className="text-muted-foreground">
                Procese devoluciones de facturas o retiros de saldo a favor de clientes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Suspense fallback={<ReturnsLoadingSkeleton />}>
        <ReturnsManager />
      </Suspense>
    </div>
  );
}
