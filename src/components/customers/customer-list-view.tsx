
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useLocalStorage from "@/hooks/use-local-storage";
import type { CustomerDetails } from "@/lib/types";
import { CustomerDialog } from "./customer-dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserRoundPlus, Users, Edit, DollarSign, Gift, Eye } from "lucide-react"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input"; // Ensure Input is imported

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export function CustomerListView() {
  const [customers, setCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSaveCustomer = (customer: CustomerDetails) => {
    setCustomers((prevCustomers) => {
      const existingIndex = prevCustomers.findIndex((c) => c.id === customer.id);
      const customerWithDefaults = { 
        ...customer,
        outstandingBalance: customer.outstandingBalance || 0,
        creditBalance: customer.creditBalance || 0,
      };
      if (existingIndex > -1) {
        const updatedCustomers = [...prevCustomers];
        updatedCustomers[existingIndex] = customerWithDefaults;
        toast({ title: "Cliente Actualizado", description: `El cliente ${customer.name} ha sido actualizado.` });
        return updatedCustomers;
      }
      toast({ title: "Cliente Añadido", description: `El cliente ${customer.name} ha sido añadido.` });
      return [...prevCustomers, customerWithDefaults];
    });
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prevCustomers) => prevCustomers.filter((c) => c.id !== customerId));
    toast({ title: "Cliente Eliminado", description: "El cliente ha sido eliminado.", variant: "destructive" });
  };
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.rif.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => a.name.localeCompare(b.name));


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle className="text-2xl text-primary flex items-center">
            <Users className="mr-2 h-6 w-6" />
            Gestión de Clientes
          </CardTitle>
          <CardDescription>Añada, edite o elimine clientes de su lista.</CardDescription>
        </div>
        <CustomerDialog onSave={handleSaveCustomer} 
          triggerButton={
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserRoundPlus className="mr-2 h-4 w-4" /> Añadir Nuevo Cliente
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Buscar por nombre o RIF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        {!isClient ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 animate-pulse" />
            <p className="text-lg font-semibold">Cargando clientes...</p>
            <p>Por favor espere.</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">No hay clientes</p>
            <p>Añada su primer cliente para empezar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / Razón Social</TableHead>
                  <TableHead>RIF / C.I.</TableHead>
                  <TableHead className="hidden md:table-cell">Dirección</TableHead>
                  <TableHead className="text-right">S. Pendiente</TableHead>
                  <TableHead className="text-right">S. a Favor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.rif}</TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-xs" title={customer.address}>{customer.address}</TableCell>
                    <TableCell className={cn("text-right", (customer.outstandingBalance ?? 0) > 0 ? "text-destructive font-semibold" : "text-muted-foreground")}>
                      {formatCurrency(customer.outstandingBalance)}
                      {(customer.outstandingBalance ?? 0) > 0 && (
                        <Button asChild variant="link" size="sm" className="text-xs h-auto p-0 ml-1 text-primary hover:text-primary/80" title="Saldar Deuda">
                          <Link href={`/invoice/new?customerId=${customer.id}&debtPayment=true&amount=${customer.outstandingBalance}`}>
                            <DollarSign className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-right", (customer.creditBalance ?? 0) > 0 ? "text-green-600 font-semibold" : "text-muted-foreground")}>
                      {formatCurrency(customer.creditBalance)}
                      {(customer.creditBalance ?? 0) > 0 && (
                         <Button 
                            variant="link" 
                            size="sm" 
                            className="text-xs h-auto p-0 ml-1 text-green-600 hover:text-green-700"
                            onClick={() => router.push(`/returns?mode=creditWithdrawal&customerId=${customer.id}&availableCredit=${customer.creditBalance}`)}
                            title="Retirar Saldo a Favor"
                          >
                           <Gift className="h-3 w-3" />
                         </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8 p-0" title="Ver Resumen Cliente">
                        <Link href={`/customers/${customer.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Resumen</span>
                        </Link>
                      </Button>
                      <CustomerDialog
                        customer={customer}
                        onSave={handleSaveCustomer}
                        triggerButton={
                           <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8 p-0" title="Editar Cliente">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 h-8 w-8 p-0" title="Eliminar Cliente">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente
                              <span className="font-semibold"> {customer.name}</span>.
                              Sus saldos pendientes o a favor no se verán afectados directamente aquí, pero el cliente será eliminado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
