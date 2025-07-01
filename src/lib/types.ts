
export interface CompanyDetails {
  id: string; 
  name: string;
  rif: string; 
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string; 
  logoAlignment?: 'left' | 'center' | 'right'; 
  fiscalPrinterEnabled?: boolean;
  fiscalPrinterApiUrl?: string;
}

export interface CustomerDetails {
  id: string; 
  name: string;
  rif: string;
  address: string;
  phone?: string;
  email?: string;
  outstandingBalance?: number; 
  creditBalance?: number; 
}

export interface InvoiceItem {
  id: string; 
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; 
}

export interface PaymentDetails {
  method: string; 
  amount: number;
  reference?: string; 
}

export interface Invoice {
  id: string; 
  invoiceNumber: string; 
  date: string; 
  type: 'sale' | 'return'; 
  originalInvoiceId?: string | null; 
  isDebtPayment?: boolean; 
  isCreditDeposit?: boolean; 
  status?: 'active' | 'cancelled' | 'return_processed'; 

  companyDetails: CompanyDetails;
  customerDetails: CustomerDetails;

  items: InvoiceItem[];
  paymentMethods: PaymentDetails[];

  subTotal: number; 
  discountPercentage?: number; 
  discountValue?: number; 
  taxRate: number; 
  taxAmount: number; 
  totalAmount: number; 

  amountPaid: number; 
  amountDue: number; 
                      
  cashierNumber?: string;
  salesperson?: string;
  notes?: string;
  thankYouMessage: string;
  warrantyText?: string; 

  overpaymentAmount?: number; 
  overpaymentHandling?: 'creditedToAccount' | 'refunded'; 
  changeRefundPaymentMethods?: PaymentDetails[]; 

  cancelledAt?: string; 
  reasonForStatusChange?: string; // Added field for cancellation/return reason
}

export const DEFAULT_COMPANY_ID = "main_company_details";

export const defaultCompanyDetails: CompanyDetails = {
  id: DEFAULT_COMPANY_ID,
  name: "",
  rif: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "",
  logoAlignment: "center",
  fiscalPrinterEnabled: true,
  fiscalPrinterApiUrl: "http://localhost:3000/print",
};

export const defaultCustomer: CustomerDetails = { id: "", name: "", rif: "", address: "", phone: "", email: "", outstandingBalance: 0, creditBalance: 0 };
export const TAX_RATE = 0.16;
