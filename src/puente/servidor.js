
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

  if (!invoiceData || !invoiceData.invoiceNumber) {
    console.error("Error: Datos de factura inválidos.");
    return res.status(400).json({ success: false, message: "Datos de factura inválidos." });
  }

  // Log de detalles de la factura
  const documentType = invoiceData.type === 'return' ? 'Nota de Crédito' : 
                       invoiceData.isDebtPayment ? 'Abono a Deuda' : 
                       invoiceData.isCreditDeposit ? 'Depósito a Cuenta' : 'Factura';
  
  console.log("\n  *** INICIO DEL DOCUMENTO ***");
  console.log("  SENIAT");

  console.log("\n  --- Detalles del Negocio ---");
  const c = invoiceData.companyDetails;
  console.log("  Nombre:", c.name);
  console.log("  RIF:", c.rif);
  console.log("  Dirección:", c.address);

  console.log("\n  --- Información del Documento ---");
  console.log("  Tipo:", `${documentType} NRO: ${invoiceData.invoiceNumber}`);
  console.log("  Fecha:", new Date(invoiceData.date).toLocaleDateString('es-VE'));
  
  console.log("\n  --- Cliente ---");
  console.log("  Nombre:", invoiceData.customerDetails.name);
  console.log("  RIF/CI:", invoiceData.customerDetails.rif);
  console.log("  Dirección:", invoiceData.customerDetails.address);


  console.log("\n  --- Artículos ---");
  (invoiceData.items || []).forEach(item => {
    const itemTotal = (item.quantity * item.unitPrice).toFixed(2);
    console.log(`  - ${item.description} (Cant: ${item.quantity}, P.Unit: ${item.unitPrice.toFixed(2)}, Total: ${itemTotal})`);
  });

  console.log("\n  --- Totales ---");
  console.log("  Subtotal:", (invoiceData.subTotal || 0).toFixed(2));
  if (invoiceData.discountValue > 0) {
    console.log("  Descuento:", `-${(invoiceData.discountValue || 0).toFixed(2)}`);
  }
  console.log("  IVA:", (invoiceData.taxAmount || 0).toFixed(2));
  console.log("  TOTAL:", (invoiceData.totalAmount || 0).toFixed(2));

  console.log("\n  --- Pagos ---");
  (invoiceData.paymentMethods || []).forEach(payment => {
    console.log(`  - ${payment.method}: ${(payment.amount || 0).toFixed(2)} ${payment.reference ? `(Ref: ${payment.reference})` : ''}`);
  });
  console.log("  Total Pagado:", (invoiceData.amountPaid || 0).toFixed(2));

  if (invoiceData.warrantyText) {
    console.log("\n  --- Nota de Garantía ---");
    console.log(" ", invoiceData.warrantyText);
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
