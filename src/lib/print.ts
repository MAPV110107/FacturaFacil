
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

  // Copy all style and link tags from the main document's head to the new window
  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');
  
  const invoiceHTML = invoiceElement.innerHTML;
  
  // This class determines the paper size and is defined in globals.css
  const wrapperClass = printFormat === 'a4' ? 'preview-a4-wrapper' : 'preview-80mm-wrapper';

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Factura</title>
        ${styles}
      </head>
      <body>
        <div class="${wrapperClass}">
          ${invoiceHTML}
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => { // Keep a safe timeout to ensure rendering
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.error("Error during printing:", e);
      } finally {
        printWindow.close();
      }
    }, 300); // 300ms is a safe buffer
  };
}
