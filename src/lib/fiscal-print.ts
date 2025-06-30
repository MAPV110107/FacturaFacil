
'use client';

import type { Invoice } from './types';

/**
 * Sends invoice data to a local fiscal printer service.
 * @param invoice The full invoice object to be sent.
 * @param apiUrl The URL of the local fiscal printer service.
 * @returns An object with success status and a message.
 */
export async function printToFiscalPrinter(
  invoice: Invoice,
  apiUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoice),
      // Use 'no-cors' mode if the local service doesn't handle CORS, 
      // but be aware this makes the response opaque.
      // mode: 'no-cors', 
    });

    // If using 'no-cors', you can't check response.ok. We assume success if no network error.
    // If your local service *does* support CORS, you can use the more robust check below.
    if (!response.ok) {
        try {
            const errorText = await response.text();
            // Try to parse as JSON if the error is structured
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
