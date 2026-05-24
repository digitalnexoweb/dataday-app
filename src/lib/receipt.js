import { jsPDF } from "jspdf";
import { formatCurrency, MONTH_NAMES } from "./format";

function formatReceiptDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function downloadPaymentReceipt(payment, appSettings = null) {
  const doc = new jsPDF();
  const clubName = appSettings?.clubName?.trim() || "DataDay Cuotas";
  const clubAddress = appSettings?.clubAddress?.trim() || "";
  const clubPhone = appSettings?.clubPhone?.trim() || "";
  const receiptNumber = payment.id ? String(payment.id).padStart(6, "0") : "------";
  const monthLabel = payment.periodsLabel
    ?? (payment.month ? `${MONTH_NAMES[payment.month - 1]} ${payment.year}` : "Sin periodo");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const rightEdge = pageWidth - margin;

  // Franja superior de color
  doc.setFillColor(217, 109, 16);
  doc.rect(0, 0, pageWidth, 12, "F");

  // Nombre del club (header)
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(23, 49, 74);
  doc.text(clubName, margin, 28);

  // Datos de contacto del club
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(105, 130, 154);
  let contactY = 35;
  if (clubAddress) {
    doc.text(clubAddress, margin, contactY);
    contactY += 5;
  }
  if (clubPhone) {
    doc.text(clubPhone, margin, contactY);
  }

  // Titulo + numero de recibo (alineado a la derecha)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(23, 49, 74);
  doc.text("RECIBO DE PAGO", rightEdge, 28, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(105, 130, 154);
  doc.text(`N° ${receiptNumber}`, rightEdge, 35, { align: "right" });
  doc.text(`Fecha: ${formatReceiptDate(payment.paymentDate)}`, rightEdge, 41, { align: "right" });

  // Separador
  doc.setDrawColor(228, 237, 248);
  doc.setLineWidth(0.5);
  doc.line(margin, 52, rightEdge, 52);

  // Bloque del socio
  doc.setFontSize(9);
  doc.setTextColor(105, 130, 154);
  doc.text("SOCIO / ALUMNO", margin, 62);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(23, 49, 74);
  doc.text(payment.memberName, margin, 70);

  // Separador
  doc.setDrawColor(228, 237, 248);
  doc.line(margin, 78, rightEdge, 78);

  // Detalle del pago
  const rows = [
    ["Periodo cubierto", monthLabel],
    ["Forma de pago", payment.paymentMethod],
    ["Fecha de pago", formatReceiptDate(payment.paymentDate)],
  ];

  let rowY = 88;
  doc.setFont("helvetica", "normal");
  rows.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setTextColor(105, 130, 154);
    doc.text(label, margin, rowY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(23, 49, 74);
    doc.text(value, margin + 60, rowY);
    doc.setFont("helvetica", "normal");
    rowY += 9;
  });

  // Bloque de monto destacado
  doc.setFillColor(247, 251, 255);
  doc.setDrawColor(217, 232, 251);
  doc.roundedRect(margin, rowY + 4, rightEdge - margin, 22, 4, 4, "FD");
  doc.setFontSize(9);
  doc.setTextColor(105, 130, 154);
  doc.text("MONTO PAGADO", margin + 6, rowY + 13);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(217, 109, 16);
  doc.text(formatCurrency(payment.amount), rightEdge - 6, rowY + 15, { align: "right" });

  // Separador final
  doc.setDrawColor(228, 237, 248);
  doc.line(margin, rowY + 34, rightEdge, rowY + 34);

  // Pie de pagina
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(105, 130, 154);
  doc.text("Este documento es un comprobante de pago emitido por " + clubName + ".", margin, rowY + 42);

  const fileName = `recibo-${payment.memberName.replaceAll(" ", "-").toLowerCase()}-${payment.month}-${payment.year}.pdf`;
  doc.save(fileName);
}
