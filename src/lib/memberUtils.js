import { getChargeablePeriods, getCurrentFeeStatus, MONTH_NAMES } from "./format";
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

export function buildDataIndexes(payments, categories, medicalRecords, credits = []) {
  const paymentsByMemberId = new Map();
  for (const payment of payments) {
    const key = String(payment.memberId);
    if (!paymentsByMemberId.has(key)) paymentsByMemberId.set(key, []);
    paymentsByMemberId.get(key).push(payment);
  }
  const categoryById = new Map(categories.map((c) => [String(c.id), c]));
  const medicalRecordByMemberId = new Map(medicalRecords.map((r) => [String(r.memberId), r]));
  const creditByMemberId = new Map();
  for (const credit of credits) {
    const key = String(credit.memberId);
    creditByMemberId.set(key, (creditByMemberId.get(key) ?? 0) + Number(credit.amount));
  }
  return { paymentsByMemberId, categoryById, medicalRecordByMemberId, creditByMemberId };
}

export function buildMemberSummary(member, indexes, appSettings) {
  const memberPayments = (indexes.paymentsByMemberId.get(String(member.id)) ?? [])
    .slice()
    .sort((left, right) => new Date(right.paymentDate) - new Date(left.paymentDate));
  const lastPayment = memberPayments[0] ?? null;
  const category = indexes.categoryById.get(String(member.categoryId));
  const monthlyFee = getMonthlyFee(category, appSettings.defaultMonthlyFee);
  const dueDay = appSettings.dueDay ?? 10;
  const paidPeriods = new Set(memberPayments.map((p) => `${p.month}-${p.year}`));

  const chargeablePeriods = getChargeablePeriods(member, { dueDay });
  const overduePeriods = chargeablePeriods.filter((p) => !paidPeriods.has(`${p.month}-${p.year}`));

  // Apply accumulated credit: cover oldest pending periods first
  const existingCredit = indexes.creditByMemberId?.get(String(member.id)) ?? 0;
  const creditMonthsCovered = monthlyFee > 0 ? Math.floor(existingCredit / monthlyFee) : 0;
  const creditRemainder = monthlyFee > 0 ? existingCredit % monthlyFee : 0;

  // Virtual payments for credit-covered periods (used only for accountStatus calc)
  const virtualPayments = overduePeriods.slice(0, creditMonthsCovered).map((p) => ({
    memberId: member.id,
    month: p.month,
    year: p.year,
  }));
  const netOverduePeriods = overduePeriods.slice(creditMonthsCovered);

  const baseDebt = monthlyFee * netOverduePeriods.length;
  const surcharge = netOverduePeriods.length > 0 ? baseDebt * ((appSettings.lateFeePercent ?? 0) / 100) : 0;
  const pendingDebt = Math.max(0, baseDebt + surcharge - creditRemainder);

  const accountStatus = getCurrentFeeStatus(member, [...memberPayments, ...virtualPayments], { dueDay });
  const medicalRecord = indexes.medicalRecordByMemberId.get(String(member.id)) ?? null;
  const fmt = new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 });

  return {
    ...member,
    payments: memberPayments,
    medicalRecord,
    accountStatus,
    lastPaymentLabel: lastPayment?.paymentDate
      ? new Intl.DateTimeFormat("es-UY").format(new Date(`${lastPayment.paymentDate}T00:00:00`))
      : "Sin registro",
    nextDueLabel: new Intl.DateTimeFormat("es-UY").format(
      new Date(`${buildNextDueDate(accountStatus, appSettings)}T00:00:00`),
    ),
    monthlyFee,
    monthlyFeeLabel: monthlyFee > 0 ? fmt.format(monthlyFee) : "Sin definir",
    pendingDebt,
    pendingDebtLabel: pendingDebt > 0 ? fmt.format(pendingDebt) : "Sin deuda",
    pendingMonths: netOverduePeriods.map(({ month, year }) => `${MONTH_NAMES[month - 1]} ${year}`),
    creditBalance: existingCredit,
    creditBalanceLabel: existingCredit > 0 ? fmt.format(existingCredit) : null,
  };
}

// Computes which periods a given payment amount will cover, taking into account
// accumulated credit and ordering: oldest pending first, then future months.
export function computePaymentPlan({ member, allPayments, allCredits, allCategories, appSettings, newAmount }) {
  const category = allCategories.find((c) => String(c.id) === String(member.categoryId));
  const monthlyFee = getMonthlyFee(category, appSettings.defaultMonthlyFee);
  const dueDay = appSettings.dueDay ?? 10;

  const memberPayments = allPayments.filter((p) => String(p.memberId) === String(member.id));
  const paidPeriods = new Set(memberPayments.map((p) => `${p.month}-${p.year}`));

  const existingCredit = allCredits
    .filter((c) => String(c.memberId) === String(member.id))
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const chargeablePeriods = getChargeablePeriods(member, { dueDay });
  const pendingPeriods = chargeablePeriods.filter((p) => !paidPeriods.has(`${p.month}-${p.year}`));
  const pendingTotal = pendingPeriods.length * monthlyFee;

  const totalEffective = newAmount + existingCredit;

  // Free-tier member: no monthly fee defined
  if (monthlyFee <= 0) {
    const now = new Date();
    return {
      monthlyFee: 0,
      existingCredit,
      totalEffective,
      pendingCount: pendingPeriods.length,
      pendingTotal: 0,
      monthsCovered: newAmount > 0 ? 1 : 0,
      periodsToRegister: newAmount > 0 ? [{ month: now.getMonth() + 1, year: now.getFullYear() }] : [],
      creditRemainder: 0,
      isPartialPayment: false,
    };
  }

  const monthsCovered = Math.floor(totalEffective / monthlyFee);
  const creditRemainder = Math.round((totalEffective % monthlyFee) * 100) / 100;
  const isPartialPayment = monthsCovered === 0 && newAmount > 0;

  // Future periods (up to 36 months ahead), skipping already-paid ones
  const futurePeriods = [];
  const futureDate = new Date();
  futureDate.setDate(1);
  futureDate.setMonth(futureDate.getMonth() + 1);
  for (let i = 0; i < 36; i++) {
    const m = futureDate.getMonth() + 1;
    const y = futureDate.getFullYear();
    if (!paidPeriods.has(`${m}-${y}`)) {
      futurePeriods.push({ month: m, year: y });
    }
    futureDate.setMonth(futureDate.getMonth() + 1);
  }

  const periodsToRegister = [...pendingPeriods, ...futurePeriods].slice(0, monthsCovered);

  return {
    monthlyFee,
    existingCredit,
    totalEffective,
    pendingCount: pendingPeriods.length,
    pendingTotal,
    monthsCovered,
    periodsToRegister,
    creditRemainder,
    isPartialPayment,
  };
}
