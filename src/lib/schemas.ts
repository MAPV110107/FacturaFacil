
import { z } from "zod";

export const companyDetailsSchema = z.object({
  name: z.string().min(2, { message: "El nombre de la empresa debe tener al menos 2 caracteres." }),
  rif: z.string().min(5, { message: "El RIF debe tener un formato válido (ej. J-12345678-9)." }), // Basic validation, can be enhanced with regex
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  phone: z.string().optional(),
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }).optional().or(z.literal('')),
  logoUrl: z.string().url({ message: "Debe ser una URL válida o estar vacío."}).optional().or(z.literal('')),
  logoAlignment: z.enum(['left', 'center', 'right']).optional().default('center'),
  fiscalPrinterEnabled: z.boolean().optional().default(false),
  fiscalPrinterApiUrl: z.string().url({ message: "Debe ser una URL válida, ej: http://localhost:9876" }).optional().or(z.literal('')),
});

export const customerDetailsSchema = z.object({
  id: z.string().optional(), // ID is generated or comes from existing customer
  name: z.string().min(2, { message: "El nombre del cliente debe tener al menos 2 caracteres." }),
  rif: z.string().min(5, { message: "El RIF debe tener un formato válido." }),
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  phone: z.string().optional(),
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }).optional().or(z.literal('')),
  outstandingBalance: z.number().optional().default(0),
  creditBalance: z.number().optional().default(0),
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
  type: z.enum(['sale', 'return']).default('sale').optional(),
  originalInvoiceId: z.string().optional(),
  isDebtPayment: z.boolean().optional().default(false),
  isCreditDeposit: z.boolean().optional().default(false),
  cashierNumber: z.string().optional(),
  salesperson: z.string().optional(),
  customerDetails: customerDetailsSchema.refine(data => data.id || (data.name && data.rif && data.address), {
    message: "Debe seleccionar un cliente existente o ingresar los datos de un nuevo cliente.",
    path: ["name"],
  }),
  items: z.array(invoiceItemSchema).min(1, "Debe añadir al menos un artículo al documento."),
  paymentMethods: z.array(paymentDetailsSchema).min(1, "Debe añadir al menos un método de pago."),
  thankYouMessage: z.string().optional(),
  notes: z.string().optional(),
  
  applyTax: z.boolean().default(true).optional(),
  taxRate: z.number().min(0).max(100, "La tasa de IVA debe estar entre 0 y 100.").default(16),
  
  applyDiscount: z.boolean().default(false).optional(),
  discountPercentage: z.number().min(0, "El porcentaje de descuento no puede ser negativo.").max(100, "El porcentaje de descuento no puede ser mayor a 100.").optional().default(0),
  discountValue: z.number().min(0, "El descuento no puede ser negativo.").optional().default(0),

  applyWarranty: z.boolean().optional().default(false),
  warrantyDuration: z.string().optional().default("no_aplica"),
  warrantyText: z.string().optional(),

  overpaymentHandlingChoice: z.enum(['creditToAccount', 'refundNow']).default('creditToAccount').optional(),
  changeRefundPaymentMethods: z.array(paymentDetailsSchema).optional(),
}).refine(data => {
  if (data.overpaymentHandlingChoice === 'refundNow') {
    return data.changeRefundPaymentMethods && data.changeRefundPaymentMethods.length > 0;
  }
  return true;
}, {
  message: "Si se procesa el vuelto ahora, debe especificar al menos un método de pago para el vuelto.",
  path: ["changeRefundPaymentMethods"],
}).refine(data => {
    if (data.overpaymentHandlingChoice === 'refundNow' && data.changeRefundPaymentMethods) {
        return data.changeRefundPaymentMethods.every(pm => pm.amount > 0);
    }
    return true;
}, {
    message: "El monto del vuelto para cada método debe ser positivo.",
    path: ["changeRefundPaymentMethods"],
}).refine(data => {
  if (data.applyWarranty && data.warrantyDuration !== "no_aplica" && (!data.warrantyText || data.warrantyText.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "El texto de la garantía es requerido si se aplica una garantía y la duración no es 'No aplica'.",
  path: ["warrantyText"],
});
