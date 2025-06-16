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
