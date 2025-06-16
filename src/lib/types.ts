export interface CompanyDetails {
  id: string; // Typically a single instance, so 'default' or a fixed ID
  name: string;
  rif: string; // Registro de Información Fiscal
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string; // Optional
}

export interface CustomerDetails {
  id: string; // Unique ID for each customer
  name: string;
  rif: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface InvoiceItem {
  id: string; // Unique ID for each item row in an invoice
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // quantity * unitPrice
}

export interface PaymentDetails {
  method: string; // e.g., 'Efectivo', 'Tarjeta', 'Transferencia', 'Zelle', 'Pago Móvil'
  amount: number;
  reference?: string; // Optional reference for the payment
}

export interface Invoice {
  id: string; // Unique ID for the invoice (e.g., timestamp or sequential number)
  invoiceNumber: string; // User-defined or auto-generated invoice number
  date: string; // ISO string date
  companyDetails: CompanyDetails;
  customerDetails: CustomerDetails;
  items: InvoiceItem[];
  subTotal: number;
  taxAmount: number; // Could be 0 if not applicable or included in price
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentMethods: PaymentDetails[];
  notes?: string;
  thankYouMessage: string;
}

export const DEFAULT_COMPANY_ID = "main_company_details";
