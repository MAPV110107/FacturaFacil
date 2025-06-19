
import FacturaPrintControls from "@/components/FacturaPrintControls";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Placeholder invoice data - replace with your actual data source
const invoiceData = {
  invoiceNumber: "INV-2024-001",
  date: new Date().toLocaleDateString('es-VE'),
  customer: {
    name: "Juan Pérez",
    rif: "V-12345678-9",
    address: "Calle Falsa 123, Ciudad, Estado",
    phone: "0412-555-5555"
  },
  company: {
    name: "Mi Empresa C.A.",
    rif: "J-98765432-1",
    address: "Av. Principal, Edif. Torre, Piso 10, Caracas",
    phone: "0212-999-9999"
  },
  items: [
    { id: "1", description: "Producto A", quantity: 2, unitPrice: 100, totalPrice: 200 },
    { id: "2", description: "Servicio B", quantity: 1, unitPrice: 150, totalPrice: 150 },
    { id: "3", description: "Producto C con descripción muy larga para probar el ajuste de texto", quantity: 5, unitPrice: 20, totalPrice: 100 },
  ],
  subtotal: 450,
  taxRate: 0.16,
  tax: 72,
  total: 522,
};

export default function Page() {
  return (
    <div className="p-4">
      <div className="mb-6 flex justify-start">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-4 text-primary text-center">Factura de Muestra</h1>
      <div id="factura" className="border shadow-lg p-6 bg-white max-w-4xl mx-auto">
        {/* Encabezado de la Factura */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{invoiceData.company.name}</h2>
            <p className="text-sm text-gray-600">{invoiceData.company.address}</p>
            <p className="text-sm text-gray-600">RIF: {invoiceData.company.rif}</p>
            <p className="text-sm text-gray-600">Teléfono: {invoiceData.company.phone}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-semibold text-gray-700">FACTURA</h3>
            <p className="text-sm text-gray-600">Nº: <span className="font-medium">{invoiceData.invoiceNumber}</span></p>
            <p className="text-sm text-gray-600">Fecha: <span className="font-medium">{invoiceData.date}</span></p>
          </div>
        </div>

        {/* Detalles del Cliente */}
        <div className="mb-6 p-4 bg-slate-50 rounded-md">
          <h4 className="text-md font-semibold text-gray-700 mb-1">Cliente:</h4>
          <p className="text-sm text-gray-600 font-medium">{invoiceData.customer.name}</p>
          <p className="text-sm text-gray-600">RIF: {invoiceData.customer.rif}</p>
          <p className="text-sm text-gray-600">{invoiceData.customer.address}</p>
          <p className="text-sm text-gray-600">Teléfono: {invoiceData.customer.phone}</p>
        </div>

        {/* Tabla de Ítems */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left font-semibold text-gray-700">Descripción</th>
                <th className="p-2 text-right font-semibold text-gray-700">Cantidad</th>
                <th className="p-2 text-right font-semibold text-gray-700">Precio Unit.</th>
                <th className="p-2 text-right font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="p-2 text-gray-700">{item.description}</td>
                  <td className="p-2 text-right text-gray-700">{item.quantity}</td>
                  <td className="p-2 text-right text-gray-700">{item.unitPrice.toFixed(2)}</td>
                  <td className="p-2 text-right text-gray-700">{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-6">
          <div className="w-full max-w-xs text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-800 font-medium">{invoiceData.subtotal.toFixed(2)} Bs.</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">IVA ({invoiceData.taxRate * 100}%):</span>
              <span className="text-gray-800 font-medium">{invoiceData.tax.toFixed(2)} Bs.</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-1">
              <span className="text-lg font-bold text-gray-800">TOTAL:</span>
              <span className="text-lg font-bold text-gray-800">{invoiceData.total.toFixed(2)} Bs.</span>
            </div>
          </div>
        </div>

        {/* Pie de página de la factura */}
        <div className="text-center text-xs text-gray-500 mt-8">
          <p>Gracias por su compra.</p>
          <p>{invoiceData.company.name} - RIF: {invoiceData.company.rif}</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center print-controls-container">
        <FacturaPrintControls />
      </div>
    </div>
  );
}
