
export interface CompanyDetails {
  id: string; // Typically a single instance, 'default' or a fixed ID
  name: string;
  rif: string; // Registro de Información Fiscal
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string; // Optional
  logoAlignment?: 'left' | 'center' | 'right'; // New field for logo alignment
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
  type: 'sale' | 'return'; // Distinguishes sales invoice and credit note
  originalInvoiceId?: string | null; // For returns, links to original sale invoice ID. Can be special string for withdrawals.
  isDebtPayment?: boolean; // Flag to identify debt payment invoices
  isCreditDeposit?: boolean; // Flag to identify credit deposit transactions OR credit withdrawal NCs
  
  companyDetails: CompanyDetails;
  customerDetails: CustomerDetails;
  
  items: InvoiceItem[];
  paymentMethods: PaymentDetails[];
  
  subTotal: number; // Sum of item.totalPrice
  discountPercentage?: number; // Optional discount percentage applied
  discountValue?: number; // Optional discount value applied (monetary)
  taxRate: number; // Tax rate applied (e.g., 0.16 for 16%)
  taxAmount: number; // Calculated on (subTotal - discountValue) * taxRate
  totalAmount: number; // (subTotal - discountValue) + taxAmount
  
  amountPaid: number; // Total amount received from customer for this invoice
  amountDue: number; // Final balance of THIS invoice: totalAmount - amountPaid (can be negative if overpaid and change processed)
                      // If overpayment was credited to account, this will be negative.
                      // If overpayment was refunded, this will be 0.

  cashierNumber?: string;
  salesperson?: string;
  notes?: string;
  thankYouMessage: string;
  warrantyText?: string; // Text for warranty notes

  // Fields for handling overpayment
  overpaymentAmount?: number; // The absolute value of the overpayment (amountPaid - totalAmount) if > 0
  overpaymentHandling?: 'creditedToAccount' | 'refunded'; // How the overpayment was handled
  changeRefundPaymentMethods?: PaymentDetails[]; // Details of how the change was given if 'refunded'
}

export const DEFAULT_COMPANY_ID = "main_company_details";
