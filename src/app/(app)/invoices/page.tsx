
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
import { Eye, History, FileText as PageIcon } from "lucide-react"; 
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CURRENCY_SYMBOL } from "@/lib/constants";

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL}0.00`; // Ensure symbol is always prepended
  return `${CURRENCY_SYMBOL} ${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export default function InvoiceHistoryPage() {
  const [invoices] = useLocalStorage<Invoice[]>("invoices", []);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sortedInvoices = React.useMemo(() => {
    if (!isClient) return []; // Avoid sorting on server or before client hydration
    return [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, isClient]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <History className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-2xl font-bold text-primary">Historial de Facturas</CardTitle>
            <CardDescription className="text-muted-foreground">
              Consulte y gestione las facturas emitidas anteriormente.
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
            <p className="text-lg font-semibold">No hay facturas en el historial</p>
            <p>Cree su primera factura para verla aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro. Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{format(new Date(invoice.date), "PPP", { locale: es })}</TableCell>
                    <TableCell className="truncate max-w-xs" title={invoice.customerDetails.name}>{invoice.customerDetails.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8 p-0">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver Factura</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
