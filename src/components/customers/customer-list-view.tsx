
"use client";

import React, { useState, useEffect } from "react"; // Added useEffect
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
import { Trash2, UserRoundPlus, Users, Edit } from "lucide-react"; 
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

export function CustomerListView() {
  const [customers, setCustomers] = useLocalStorage<CustomerDetails[]>("customers", []);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false); // State to track client-side mount

  useEffect(() => {
    setIsClient(true); // Set to true once component is mounted on the client
  }, []);

  const handleSaveCustomer = (customer: CustomerDetails) => {
    setCustomers((prevCustomers) => {
      const existingIndex = prevCustomers.findIndex((c) => c.id === customer.id);
      if (existingIndex > -1) {
        const updatedCustomers = [...prevCustomers];
        updatedCustomers[existingIndex] = customer;
        toast({ title: "Cliente Actualizado", description: `El cliente ${customer.name} ha sido actualizado.` });
        return updatedCustomers;
      }
      toast({ title: "Cliente Añadido", description: `El cliente ${customer.name} ha sido añadido.` });
      return [...prevCustomers, customer];
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
                  <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.rif}</TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-xs">{customer.address}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer.phone || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <CustomerDialog
                        customer={customer}
                        onSave={handleSaveCustomer}
                        triggerButton={
                           <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80 h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 h-8 w-8 p-0">
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

// Minimal Input component, assuming shadcn/ui Input is available globally
// If not, this would need to be defined or imported from shadcn
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
});
Input.displayName = "Input";
    
    