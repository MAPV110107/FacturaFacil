
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, History, FileText as PageIcon, Undo2 as ReturnIcon, FileText as SaleIcon, Undo2, ShieldAlert, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL} ${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export default function InvoiceHistoryPage() {
  const [invoices] = useLocalStorage<Invoice[]>("invoices", []);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sortedInvoices = React.useMemo(() => {
    if (!isClient) return [];
    const validInvoices = Array.isArray(invoices) ? invoices : [];
    return [...validInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, isClient]);

  const canProcessReturn = (invoice: Invoice) => {
    if (!isClient || invoice.type !== 'sale' || invoice.status === 'cancelled' || invoice.status === 'return_processed') {
      return false;
    }
    const validInvoices = Array.isArray(invoices) ? invoices : [];
    // Check if a return already exists OR if the original invoice is a debt/credit payment
    return !validInvoices.some(inv => inv.type === 'return' && inv.originalInvoiceId === invoice.id) &&
           !invoice.isDebtPayment && !invoice.isCreditDeposit;
  };

  const getInvoiceTypeAndStatus = (invoice: Invoice) => {
    if (invoice.status === 'cancelled') {
      return { text: 'Factura (Anulada)', icon: <ShieldAlert className="h-3 w-3 mr-1.5 text-destructive" />, className: "bg-destructive/10 text-destructive" };
    }
    if (invoice.type === 'return') {
      return { text: 'Nota de Crédito', icon: <ReturnIcon className="h-3 w-3 mr-1.5" />, className: "bg-red-100 text-red-800" };
    }
    if (invoice.isDebtPayment) {
      return { text: 'Abono Deuda', icon: <DollarSign className="h-3 w-3 mr-1.5" />, className: "bg-blue-100 text-blue-800" };
    }
    if (invoice.isCreditDeposit) {
      return { text: 'Depósito Cuenta', icon: <PageIcon className="h-3 w-3 mr-1.5" />, className: "bg-purple-100 text-purple-800" };
    }
    if (invoice.status === 'return_processed') {
         return { text: 'Factura (NC Procesada)', icon: <ShieldCheck className="h-3 w-3 mr-1.5 text-amber-700" />, className: "bg-amber-100 text-amber-700" };
    }
    return { text: 'Factura', icon: <SaleIcon className="h-3 w-3 mr-1.5" />, className: "bg-green-100 text-green-800" };
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <History className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-2xl font-bold text-primary">Historial de Documentos</CardTitle>
            <CardDescription className="text-muted-foreground">
              Consulte y gestione las facturas y notas de crédito emitidas.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isClient ? (
          <div className="text-center py-10 text-muted-foreground">
            <PageIcon className="mx-auto h-12 w-12 mb-4 animate-pulse" />
            <p className="text-lg font-semibold">Cargando historial...</p>
            <p>Por favor espere.</p>
          </div>
        ) : sortedInvoices.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <PageIcon className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">No hay documentos en el historial</p>
            <p>Cree su primera factura para verla aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro. Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => {
                  const typeInfo = getInvoiceTypeAndStatus(invoice);
                  return (
                    <TableRow key={invoice.id} className={cn(
                        invoice.status === 'cancelled' && "bg-destructive/5 hover:bg-destructive/10 opacity-70",
                        invoice.type === 'return' && invoice.status !== 'cancelled' && "bg-destructive/5 hover:bg-destructive/10",
                        invoice.status === 'return_processed' && "bg-amber-50 hover:bg-amber-100/80"
                    )}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          typeInfo.className
                        )}>
                          {typeInfo.icon}
                          {typeInfo.text}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.date), "PPP", { locale: es })}</TableCell>
                      <TableCell>{format(new Date(invoice.date), "p", { locale: es })}</TableCell>
                      <TableCell className="truncate max-w-xs" title={invoice.customerDetails.name}>{invoice.customerDetails.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8 p-0" title="Ver Documento">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Documento</span>
                          </Link>
                        </Button>
                        {canProcessReturn(invoice) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-amber-600 hover:text-amber-700 h-8 w-8 p-0"
                            onClick={() => router.push(`/returns?invoiceId=${invoice.id}`)}
                            title="Procesar Devolución"
                          >
                            <Undo2 className="h-4 w-4" />
                            <span className="sr-only">Procesar Devolución</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
