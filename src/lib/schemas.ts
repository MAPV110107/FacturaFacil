
import { z } from "zod";

export const companyDetailsSchema = z.object({
  name: z.string().min(2, { message: "El nombre de la empresa debe tener al menos 2 caracteres." }),
  rif: z.string().min(5, { message: "El RIF debe tener un formato válido (ej. J-12345678-9)." }), // Basic validation, can be enhanced with regex
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  phone: z.string().optional(),
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }).optional().or(z.literal('')),
  logoUrl: z.string().url({ message: "Debe ser una URL válida."}).optional().or(z.literal('')),
});

export const customerDetailsSchema = z.object({
  id: z.string().optional(), // ID is generated or comes from existing customer
  name: z.string().min(2, { message: "El nombre del cliente debe tener al menos 2 caracteres." }),
  rif: z.string().min(5, { message: "El RIF debe tener un formato válido." }),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  phone: z.string().optional(),
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }).optional().or(z.literal('')),
});

export const invoiceItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, { message: "La descripción es requerida." }),
  quantity: z.number().min(0.01, { message: "La cantidad debe ser mayor que 0." }),
  unitPrice: z.number().min(0, { message: "El precio unitario no puede ser negativo." }),
});

export const paymentDetailsSchema = z.object({
  method: z.string().min(1, { message: "El método de pago es requerido." }),
  amount: z.number().min(0.01, { message: "El monto debe ser mayor que 0." }),
  reference: z.string().optional(),
});


export const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es requerido."),
  date: z.date({ required_error: "La fecha es requerida."}),
  cashierNumber: z.string().optional(),
  salesperson: z.string().optional(),
  customerDetails: customerDetailsSchema.refine(data => data.id || (data.name && data.rif && data.address), {
    message: "Debe seleccionar un cliente existente o ingresar los datos de un nuevo cliente.",
    path: ["name"],
  }),
  items: z.array(invoiceItemSchema).min(1, "Debe añadir al menos un artículo a la factura."),
  paymentMethods: z.array(paymentDetailsSchema).min(1, "Debe añadir al menos un método de pago."),
  thankYouMessage: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1).default(0.16), // Example: 0.16 for 16%
  discountAmount: z.number().min(0, "El descuento no puede ser negativo.").optional(),
});
