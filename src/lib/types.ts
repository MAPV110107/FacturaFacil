
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
  outstandingBalance?: number; // Saldo Pendiente
  creditBalance?: number; // Saldo a Favor
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
  type: 'sale' | 'return'; // Distinguishes between sales invoice and credit note
  originalInvoiceId?: string; // For returns, links to the original sale invoice ID
  isDebtPayment?: boolean; // Flag to identify debt payment invoices
  companyDetails: CompanyDetails;
  customerDetails: CustomerDetails;
  items: InvoiceItem[];
  subTotal: number; // Sum of item.totalPrice
  discountAmount?: number; // Optional discount amount
  taxRate: number; // Tax rate applied (e.g., 0.16 for 16%)
  taxAmount: number; // Calculated on (subTotal - discountAmount) * taxRate
  totalAmount: number; // (subTotal - discountAmount) + taxAmount
  amountPaid: number;
  amountDue: number;
  paymentMethods: PaymentDetails[];
  cashierNumber?: string;
  salesperson?: string;
  notes?: string;
  thankYouMessage: string;
}

export const DEFAULT_COMPANY_ID = "main_company_details";
