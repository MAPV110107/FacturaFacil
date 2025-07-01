
'use client';

export function printFromElementId(elementId: string) {
  const invoiceElement = document.getElementById(elementId);
  if (!invoiceElement) {
    console.error("Print Error: Could not find the invoice element with ID:", elementId);
    alert("Error de impresión: No se encontró el elemento de la factura.");
    return;
  }

  const printFrame = document.getElementById('printFrame') as HTMLIFrameElement;
  if (!printFrame) {
    console.error("Print Error: Could not find the print iframe.");
    alert("Error de impresión: No se encontró el marco de impresión.");
    return;
  }

  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');
  
  const invoiceHTML = invoiceElement.innerHTML;
  const printClass = 'printing-a4'; // Always use A4 format for this function now

  const frameDoc = printFrame.contentWindow?.document;
  if (!frameDoc) {
      console.error("Could not get iframe document.");
      return;
  }

  frameDoc.open();
  frameDoc.write(`
    <html class="${printClass}">
      <head>
        <title>Imprimir Documento</title>
        ${styles}
      </head>
      <body>
        ${invoiceHTML}
      </body>
    </html>
  `);
  frameDoc.close();

  setTimeout(() => {
    try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
    } catch (e) {
        console.error("Error during printing from iframe:", e);
        alert("Ocurrió un error al intentar imprimir.");
    }
  }, 300); // A short delay to allow the iframe content to render.
}
