import { jsPDF } from "jspdf";
import { MONTH_NAMES } from "./format";

export function downloadPaymentReceipt(payment) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Recibo de pago", 20, 20);

  doc.setFontSize(12);
  doc.text(`Socio: ${payment.memberName}`, 20, 40);
  doc.text(`Mes pagado: ${MONTH_NAMES[payment.month - 1]} ${payment.year}`, 20, 52);
  doc.text(`Monto: ${payment.amount}`, 20, 64);
  doc.text(`Forma de pago: ${payment.paymentMethod}`, 20, 76);
  doc.text(`Fecha: ${payment.paymentDate}`, 20, 88);

  doc.save(`recibo-${payment.memberName.replaceAll(" ", "-").toLowerCase()}.pdf`);
}
