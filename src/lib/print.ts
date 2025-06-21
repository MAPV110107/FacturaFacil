'use client';

export function printFromElementId(elementId: string, printFormat: 'a4' | '80mm' = 'a4') {
  const invoiceElement = document.getElementById(elementId);
  if (!invoiceElement) {
    console.error("Print Error: Could not find the invoice element with ID:", elementId);
    alert("Error de impresión: No se encontró el elemento de la factura.");
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("No se pudo abrir la ventana de impresión. Por favor, deshabilite el bloqueador de pop-ups para este sitio.");
    return;
  }

  // Copy all style and link tags from the main document to the new window
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');
  
  const invoiceHTML = invoiceElement.innerHTML;

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Factura</title>
        ${styles}
      </head>
      <body>
        ${invoiceHTML}
      </body>
    </html>
  `);

  // Add the appropriate class to the html element for print styling
  printWindow.document.documentElement.classList.add(`printing-${printFormat}`);

  printWindow.document.close();

  // Wait for the content to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.error("Error during printing:", e);
      } finally {
        printWindow.close();
      }
    }, 500); // Increased timeout for rendering safety
  };
}
