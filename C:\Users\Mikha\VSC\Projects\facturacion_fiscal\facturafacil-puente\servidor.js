
const express = require('express');
const cors = require('cors');
// const { SerialPort } = require('serialport'); // Descomentar para uso real

const app = express();
const PUERTO = 9876;

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
  console.log("\n--- Solicitud de Impresión Recibida ---");
  const invoiceData = req.body;

  if (!invoiceData || !invoiceData.invoiceNumber) {
    console.error("Error: Datos de factura inválidos.");
    return res.status(400).json({ success: false, message: "Datos de factura inválidos." });
  }

  console.log("Factura Nro:", invoiceData.invoiceNumber);
  console.log("Cliente:", invoiceData.customerDetails.name);
  console.log("Total:", invoiceData.totalAmount);
  
  // --- LÓGICA DE IMPRESIÓN FISCAL AQUÍ ---
  // Este es el lugar para "traducir" invoiceData a los comandos
  // específicos de tu modelo de impresora fiscal.
  console.log("...Simulando envío de comandos a la impresora...");
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
