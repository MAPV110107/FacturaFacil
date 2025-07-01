
'use client';

import type { Invoice, CompanyDetails } from './types';

/**
 * Sends invoice data to a local fiscal printer service.
 * @param invoice The full invoice object to be sent.
 * @param apiUrl The URL of the local fiscal printer service.
 * @returns An object with success status and a message.
 */
export async function printToFiscalPrinter(
  invoice: Invoice,
  companyDetails: CompanyDetails | null,
): Promise<{ success: boolean; message: string }> {
  const apiUrl = companyDetails?.fiscalPrinterApiUrl;
  if (!apiUrl) {
    return { success: false, message: 'La URL del servicio de impresora fiscal no está configurada.' };
  }

  let payload: any = invoice;

  // If simplified mode is enabled, create a smaller payload
  if (companyDetails?.useSimplifiedFiscalData) {
    payload = {
      // Document type info
      type: invoice.type,
      isDebtPayment: invoice.isDebtPayment,
      isCreditDeposit: invoice.isCreditDeposit,
      status: invoice.status,
      originalInvoiceId: invoice.originalInvoiceId,
      
      // Customer info
      customerDetails: {
          name: invoice.customerDetails.name,
          rif: invoice.customerDetails.rif,
          address: invoice.customerDetails.address,
      },
      
      // Sale details
      items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
      })),
      
      // Discount info
      discountValue: invoice.discountValue,
      discountPercentage: invoice.discountPercentage,

      // Payment info
      paymentMethods: invoice.paymentMethods,
      
      // Other relevant notes that might be printed
      notes: invoice.notes,
      warrantyText: invoice.warrantyText,
      thankYouMessage: invoice.thankYouMessage,
      
      // Include overpayment/change details if they exist
      overpaymentAmount: invoice.overpaymentAmount,
      overpaymentHandling: invoice.overpaymentHandling,
      changeRefundPaymentMethods: invoice.changeRefundPaymentMethods,
    };
  }


  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        try {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                return { success: false, message: `Error: ${errorJson.message || errorText}` };
            } catch {
                return { success: false, message: `Error del servicio fiscal: ${errorText}` };
            }
        } catch {
            return { success: false, message: `Error del servicio fiscal con código: ${response.status}` };
        }
    }

    return { success: true, message: 'Documento enviado a la impresora fiscal.' };

  } catch (error) {
    console.error('Error de conexión con la impresora fiscal:', error);
    let errorMessage = 'No se pudo conectar con el servicio local de la impresora fiscal. ¿Está en ejecución?';
    if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
             errorMessage += ' Verifique la URL y que no haya un firewall bloqueando la conexión.';
        }
    }
    return {
      success: false,
      message: errorMessage,
    };
  }
}
