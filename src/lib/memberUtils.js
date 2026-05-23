import { getCurrentFeeStatus, MONTH_NAMES } from "./format";
import { getMonthlyFee } from "./utils";

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildNextDueDate(status, appSettings) {
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), appSettings.dueDay ?? 10);
  if (status === "current") {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  return toLocalIsoDate(dueDate);
}

export function buildDataIndexes(payments, categories, medicalRecords) {
  const paymentsByMemberId = new Map();
  for (const payment of payments) {
    const key = String(payment.memberId);
    if (!paymentsByMemberId.has(key)) paymentsByMemberId.set(key, []);
    paymentsByMemberId.get(key).push(payment);
  }
  const categoryById = new Map(categories.map((c) => [String(c.id), c]));
  const medicalRecordByMemberId = new Map(medicalRecords.map((r) => [String(r.memberId), r]));
  return { paymentsByMemberId, categoryById, medicalRecordByMemberId };
}

export function buildMemberSummary(member, indexes, appSettings) {
  const memberPayments = (indexes.paymentsByMemberId.get(String(member.id)) ?? [])
    .slice()
    .sort((left, right) => new Date(right.paymentDate) - new Date(left.paymentDate));
  const lastPayment = memberPayments[0] ?? null;
  const category = indexes.categoryById.get(String(member.categoryId));
  const monthlyFee = getMonthlyFee(category, appSettings.defaultMonthlyFee);
  const today = new Date();
  const dueDay = appSettings.dueDay ?? 10;
  const paidPeriods = new Set(memberPayments.map((payment) => `${payment.month}-${payment.year}`));
  const enrollmentDate = member.enrollmentDate ? new Date(`${member.enrollmentDate}T00:00:00`) : null;
  const enrollmentYear = enrollmentDate?.getFullYear() ?? today.getFullYear();
  const enrollmentMonth = (enrollmentDate?.getMonth() ?? 0) + 1;
  const currentYear = today.getFullYear();
  const lastChargeableMonth = today.getDate() <= dueDay ? today.getMonth() : today.getMonth() + 1;

  const overduePeriods = [];
  for (let year = enrollmentYear; year <= currentYear; year++) {
    const startMonth = year === enrollmentYear ? enrollmentMonth : 1;
    const endMonth = year === currentYear ? lastChargeableMonth : 12;
    if (endMonth <= 0) continue;
    for (let month = startMonth; month <= endMonth; month++) {
      if (!paidPeriods.has(`${month}-${year}`)) {
        overduePeriods.push({ month, year });
      }
    }
  }

  const baseDebt = monthlyFee * overduePeriods.length;
  const surcharge = overduePeriods.length > 0 ? baseDebt * ((appSettings.lateFeePercent ?? 0) / 100) : 0;
  const pendingDebt = baseDebt + surcharge;
  const medicalRecord = indexes.medicalRecordByMemberId.get(String(member.id)) ?? null;
  const currencyFormatter = new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  });

  return {
    ...member,
    payments: memberPayments,
    medicalRecord,
    accountStatus: getCurrentFeeStatus(member, memberPayments, { dueDay }),
    lastPaymentLabel: lastPayment?.paymentDate
      ? new Intl.DateTimeFormat("es-UY").format(new Date(`${lastPayment.paymentDate}T00:00:00`))
      : "Sin registro",
    nextDueLabel: new Intl.DateTimeFormat("es-UY").format(
      new Date(`${buildNextDueDate(member.accountStatus, appSettings)}T00:00:00`),
    ),
    monthlyFee,
    monthlyFeeLabel: monthlyFee > 0 ? currencyFormatter.format(monthlyFee) : "Sin definir",
    pendingDebt,
    pendingDebtLabel: pendingDebt > 0 ? currencyFormatter.format(pendingDebt) : "Sin deuda",
    pendingMonths: overduePeriods.map(({ month, year }) => `${MONTH_NAMES[month - 1]} ${year}`),
  };
}
