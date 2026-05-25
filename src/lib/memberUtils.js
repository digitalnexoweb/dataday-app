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

  // Index payments by period for O(1) lookup
  const memberPaymentsByPeriod = new Map(memberPayments.map((p) => [`${p.month}-${p.year}`, p]));

  // A period is "fully paid" only when its recorded amount >= monthly fee
  const fullyPaidPeriods = new Set(
    memberPayments
      .filter((p) => monthlyFee <= 0 || Number(p.amount) >= monthlyFee)
      .map((p) => `${p.month}-${p.year}`),
  );

  const chargeablePeriods = getChargeablePeriods(member, { dueDay });
  const overduePeriods = chargeablePeriods.filter((p) => !fullyPaidPeriods.has(`${p.month}-${p.year}`));

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

  // Subtract any partial amounts already paid within the net overdue periods
  const partialPaidTotal = netOverduePeriods.reduce((sum, p) => {
    const pmt = memberPaymentsByPeriod.get(`${p.month}-${p.year}`);
    return sum + (pmt ? Math.min(Number(pmt.amount), monthlyFee) : 0);
  }, 0);

  const baseDebt = Math.max(0, monthlyFee * netOverduePeriods.length - partialPaidTotal);
  const surcharge = netOverduePeriods.length > 0 ? baseDebt * ((appSettings.lateFeePercent ?? 0) / 100) : 0;
  const pendingDebt = Math.max(0, baseDebt + surcharge - creditRemainder);

  const accountStatus = getCurrentFeeStatus(member, [...memberPayments, ...virtualPayments], { dueDay });
  const medicalRecord = indexes.medicalRecordByMemberId.get(String(member.id)) ?? null;
  const fmt = new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 });

  // Enrich each pending period with partial payment info for the Deuda tab
  const pendingPeriods = netOverduePeriods.map((p) => {
    const pmt = memberPaymentsByPeriod.get(`${p.month}-${p.year}`);
    const partialAmount = pmt ? Math.min(Number(pmt.amount), monthlyFee) : 0;
    return { ...p, partialAmount, remainingAmount: monthlyFee - partialAmount };
  });

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
    pendingPeriods,
    pendingMonths: netOverduePeriods.map(({ month, year }) => `${MONTH_NAMES[month - 1]} ${year}`),
    creditBalance: existingCredit,
    creditBalanceLabel: existingCredit > 0 ? fmt.format(existingCredit) : null,
  };
}

// Computes which periods a given payment amount will cover, taking into account
// accumulated credit, existing partial payments, and ordering: oldest pending first, then future months.
export function computePaymentPlan({ member, allPayments, allCredits, allCategories, appSettings, newAmount }) {
  const category = allCategories.find((c) => String(c.id) === String(member.categoryId));
  const monthlyFee = getMonthlyFee(category, appSettings.defaultMonthlyFee);
  const dueDay = appSettings.dueDay ?? 10;

  const memberPayments = allPayments.filter((p) => String(p.memberId) === String(member.id));

  const existingCredit = allCredits
    .filter((c) => String(c.memberId) === String(member.id))
    .reduce((sum, c) => sum + Number(c.amount), 0);

  // Only fully-paid periods exclude a period from being pending
  const fullyPaidPeriods = new Set(
    memberPayments
      .filter((p) => monthlyFee <= 0 || Number(p.amount) >= monthlyFee)
      .map((p) => `${p.month}-${p.year}`),
  );

  // Map of partial amounts already recorded per period
  const partialByPeriod = new Map(
    memberPayments
      .filter((p) => monthlyFee > 0 && Number(p.amount) < monthlyFee)
      .map((p) => [`${p.month}-${p.year}`, Number(p.amount)]),
  );

  const chargeablePeriods = getChargeablePeriods(member, { dueDay });
  const pendingPeriods = chargeablePeriods.filter((p) => !fullyPaidPeriods.has(`${p.month}-${p.year}`));

  // True remaining debt per pending period (accounting for any partial payments)
  const pendingTotal = pendingPeriods.reduce((sum, p) => {
    const partial = partialByPeriod.get(`${p.month}-${p.year}`) ?? 0;
    return sum + monthlyFee - partial;
  }, 0);

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

  // Sequential allocation: cover periods one by one, accounting for partial payments already made
  let remaining = totalEffective;
  const periodsToRegister = [];

  for (const period of pendingPeriods) {
    const partialAlreadyPaid = partialByPeriod.get(`${period.month}-${period.year}`) ?? 0;
    const needed = monthlyFee - partialAlreadyPaid;
    if (remaining >= needed) {
      remaining -= needed;
      periodsToRegister.push(period);
    } else {
      break;
    }
  }

  // Cover future months with any leftover
  if (remaining >= monthlyFee) {
    const futureDate = new Date();
    futureDate.setDate(1);
    futureDate.setMonth(futureDate.getMonth() + 1);
    for (let i = 0; i < 36 && remaining >= monthlyFee; i++) {
      const m = futureDate.getMonth() + 1;
      const y = futureDate.getFullYear();
      if (!fullyPaidPeriods.has(`${m}-${y}`)) {
        periodsToRegister.push({ month: m, year: y });
        remaining -= monthlyFee;
      }
      futureDate.setMonth(futureDate.getMonth() + 1);
    }
  }

  const monthsCovered = periodsToRegister.length;
  const creditRemainder = Math.round(remaining * 100) / 100;
  const isPartialPayment = monthsCovered === 0 && newAmount > 0;

  // For a partial payment, still target the oldest pending period so it appears in pagos
  if (isPartialPayment && pendingPeriods.length > 0) {
    periodsToRegister.push(pendingPeriods[0]);
  }

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
