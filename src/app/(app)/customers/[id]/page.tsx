
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useLocalStorage from "@/hooks/use-local-storage";
import type { Invoice, CustomerDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, FileText, DollarSign, CreditCard, ShoppingBag, Eye, History, FileText as PageIcon, Undo2 as ReturnIcon, FileText as SaleIcon } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export default function CustomerSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [allInvoices] = useLocalStorage<Invoice[]>("invoices", []);
  const [allCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);

  const [customer, setCustomer] = useState<CustomerDetails | null | undefined>(undefined);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && customerId) {
      const foundCustomer = allCustomers.find(c => c.id === customerId);
      setCustomer(foundCustomer || null);

      if (foundCustomer) {
        const filteredInvoices = allInvoices
          .filter(inv => inv.customerDetails.id === customerId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCustomerInvoices(filteredInvoices);

        const spent = filteredInvoices.reduce((acc, inv) => {
          if (inv.type === 'sale' && !inv.isDebtPayment && !inv.isCreditDeposit) {
            return acc + (inv.totalAmount || 0);
          }
          return acc;
        }, 0);
        setTotalSpent(spent);
      }
    }
  }, [customerId, isClient, allCustomers, allInvoices]);

  if (!isClient || customer === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
        <User className="h-16 w-16 mb-4 animate-pulse text-primary" />
        <p className="text-xl font-semibold">Cargando resumen del cliente...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <Card className="max-w-lg mx-auto text-center shadow-lg">
        <CardHeader>
          <User className="h-12 w-12 mx-auto text-destructive mb-2" />
          <CardTitle className="text-2xl text-destructive">Cliente No Encontrado</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            El cliente que está intentando ver no existe o ha sido eliminado.
          </CardDescription>
          <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Clientes
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Clientes
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">{customer.name}</CardTitle>
              <CardDescription className="text-muted-foreground">
                RIF/C.I.: {customer.rif}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {customer.address && <p className="text-sm text-muted-foreground">Dirección: {customer.address}</p>}
            {customer.phone && <p className="text-sm text-muted-foreground">Teléfono: {customer.phone}</p>}
            {customer.email && <p className="text-sm text-muted-foreground">Email: {customer.email}</p>}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl text-primary">Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center text-muted-foreground mb-1">
              <ShoppingBag className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Total Gastado en Tienda</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center text-muted-foreground mb-1">
              <DollarSign className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Saldo Pendiente</span>
            </div>
            <p className={cn("text-2xl font-bold", (customer.outstandingBalance ?? 0) > 0 ? "text-destructive" : "text-primary")}>
                {formatCurrency(customer.outstandingBalance)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center text-muted-foreground mb-1">
              <CreditCard className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Saldo a Favor</span>
            </div>
            <p className={cn("text-2xl font-bold", (customer.creditBalance ?? 0) > 0 ? "text-green-600" : "text-primary")}>
                {formatCurrency(customer.creditBalance)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <History className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Historial de Transacciones</CardTitle>
              <CardDescription className="text-muted-foreground">
                Facturas y notas de crédito asociadas a este cliente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customerInvoices.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg font-semibold">No hay transacciones para este cliente</p>
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
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className={cn(invoice.type === 'return' && "bg-destructive/5 hover:bg-destructive/10")}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                           invoice.type === 'sale' && (invoice.isDebtPayment ? "bg-blue-100 text-blue-800" : invoice.isCreditDeposit ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"),
                           invoice.type === 'return' && "bg-red-100 text-red-800"
                        )}>
                           {invoice.type === 'sale' ? (invoice.isDebtPayment ? <DollarSign className="h-3 w-3 mr-1.5" /> : invoice.isCreditDeposit ? <CreditCard className="h-3 w-3 mr-1.5" /> : <SaleIcon className="h-3 w-3 mr-1.5" />) : <ReturnIcon className="h-3 w-3 mr-1.5" />}
                           {invoice.type === 'sale' ? (invoice.isDebtPayment ? 'Abono Deuda' : invoice.isCreditDeposit ? 'Depósito Cuenta' : 'Factura') : 'Nota de Crédito'}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.date), "PPP", { locale: es })}</TableCell>
                      <TableCell>{format(new Date(invoice.date), "p", { locale: es })}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8 p-0" title="Ver Documento">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Documento</span>
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
    </div>
  );
}
