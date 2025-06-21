
'use client';

export function printFromElementId(elementId: string, printFormat: 'a4' | '80mm' = 'a4') {
  const invoiceElement = document.getElementById(elementId);
  if (!invoiceElement) {
    console.error("Print Error: Could not find the invoice element with ID:", elementId);
    alert("Error de impresión: No se encontró el elemento de la factura.");
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1,height=1,left=0,top=0');
  if (!printWindow) {
    alert("No se pudo abrir la ventana de impresión. Por favor, deshabilite el bloqueador de pop-ups para este sitio.");
    return;
  }

  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');
  
  const invoiceHTML = invoiceElement.innerHTML;
  
  const printClass = printFormat === 'a4' ? 'printing-a4' : 'printing-80mm';

  printWindow.document.open();
  printWindow.document.write(`
    <html class="${printClass}">
      <head>
        <title>Imprimir Factura</title>
        ${styles}
      </head>
      <body>
        ${invoiceHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.error("Error during printing:", e);
      } finally {
        setTimeout(() => printWindow.close(), 100);
      }
    }, 500); // 500ms delay to ensure styles are applied
  };
}
