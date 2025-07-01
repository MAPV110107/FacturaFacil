
const express = require('express');
const cors = require('cors');
// const { SerialPort } = require('serialport'); // Descomentar para uso real

const app = express();
const PUERTO = 3000;

// Habilita CORS para permitir solicitudes desde el navegador
app.use(cors());

// Habilita el parseo de JSON para entender los datos de la factura
app.use(express.json());

// Endpoint para que el frontend verifique si el servidor está activo (ping)
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servicio de impresión fiscal activo.' });
});

// Endpoint principal para recibir los datos de la factura e imprimir
app.post('/print', (req, res) => {
  const timestamp = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
  console.log(`\n--- Solicitud de Impresión Recibida [${timestamp}] ---`);
  const invoiceData = req.body;
  const separator = "  ----------------------------------------";

  if (!invoiceData || !invoiceData.invoiceNumber) {
    console.error("Error: Datos de factura inválidos.");
    return res.status(400).json({ success: false, message: "Datos de factura inválidos." });
  }

  // Determine document type
  let documentType = "Factura";
  if (invoiceData.type === 'return') {
      documentType = 'Nota de Crédito';
  } else if (invoiceData.isDebtPayment) {
      documentType = 'Abono a Deuda';
  } else if (invoiceData.isCreditDeposit) {
      documentType = 'Depósito a Cuenta';
  }
  
  console.log("\n  SENIAT");
  console.log(separator);

  const c = invoiceData.companyDetails;
  console.log("  Nombre:", c.name);
  console.log("  RIF:", c.rif);
  console.log("  Dirección:", c.address);
  console.log(separator);

  console.log("  Tipo:", `${documentType} NRO: ${invoiceData.invoiceNumber}`);
  console.log("  Fecha y Hora:", new Date(invoiceData.date).toLocaleString('es-VE'));
  if (invoiceData.originalInvoiceId) {
      console.log("  Ref. Doc. Original:", invoiceData.originalInvoiceId);
  }
  console.log(separator);
  
  const cust = invoiceData.customerDetails;
  console.log("  Nombre:", cust.name);
  console.log("  RIF/CI:", cust.rif);
  console.log("  Dirección:", cust.address);
  console.log(separator);


  (invoiceData.items || []).forEach(item => {
    const itemTotal = (item.quantity * item.unitPrice).toFixed(2);
    console.log(`  - ${item.description} (Cant: ${item.quantity}, P.Unit: ${item.unitPrice.toFixed(2)}, Total: ${itemTotal})`);
  });
  console.log(separator);
  
  console.log("  Subtotal:", (invoiceData.subTotal || 0).toFixed(2));
  if (invoiceData.discountValue > 0) {
    console.log("  Descuento:", `-${(invoiceData.discountValue || 0).toFixed(2)}`);
  }
  console.log("  IVA:", (invoiceData.taxAmount || 0).toFixed(2));
  console.log("  TOTAL:", (invoiceData.totalAmount || 0).toFixed(2));
  console.log(separator);
  
  (invoiceData.paymentMethods || []).forEach(payment => {
    console.log(`  - ${payment.method}: ${(payment.amount || 0).toFixed(2)} ${payment.reference ? `(Ref: ${payment.reference})` : ''}`);
  });
  console.log("  Total Pagado:", (invoiceData.amountPaid || 0).toFixed(2));

  if (invoiceData.overpaymentHandling === 'refunded' && invoiceData.changeRefundPaymentMethods?.length > 0) {
      console.log("  Vuelto Procesado:");
      (invoiceData.changeRefundPaymentMethods || []).forEach(change => {
          console.log(`    - ${change.method}: ${(change.amount || 0).toFixed(2)}`);
      });
  }
  if (invoiceData.overpaymentHandling === 'creditedToAccount' && invoiceData.overpaymentAmount > 0) {
      console.log("  Sobrepago Abonado a Saldo Cliente:", (invoiceData.overpaymentAmount || 0).toFixed(2));
  }
  if (invoiceData.amountDue > 0) {
      console.log("  Monto Pendiente:", (invoiceData.amountDue || 0).toFixed(2));
  }
  console.log(separator);

  if (invoiceData.warrantyText) {
    console.log("  Nota de Garantía:", invoiceData.warrantyText);
  }
  if (invoiceData.notes) {
      console.log("  Nota Adicional:", invoiceData.notes);
  }
   if (invoiceData.thankYouMessage) {
      console.log("  Mensaje Final:", invoiceData.thankYouMessage);
  }


  // --- LÓGICA DE IMPRESIÓN FISCAL AQUÍ ---
  console.log("\n...Simulando envío de comandos a la impresora fiscal...");
  // Ejemplo: enviarComandosALaImpresora(invoiceData);

  console.log("--- Impresión Simulada con Éxito ---\n");

  res.status(200).json({ success: true, message: "Documento recibido por el servicio de impresión." });
});


app.listen(PUERTO, () => {
  console.log(`Servidor puente de FacturaFacil iniciado.`);
  console.log(`URL de Impresión: http://localhost:${PUERTO}/print`);
  console.log(`URL de Estado: http://localhost:${PUERTO}/status`);
  console.log('Escuchando... (deja esta ventana abierta)');
});
