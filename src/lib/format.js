export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("es-UY").format(new Date(`${value}T00:00:00`));
}

function getEnrollmentParts(enrollmentDate) {
  if (!enrollmentDate) {
    return null;
  }

  const [year, month] = enrollmentDate.split("-").map(Number);
  if (!year || !month) {
    return null;
  }

  return { year, month };
}

export function getChargeablePeriods(member, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const dueDay = options.dueDay ?? 10;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const lastChargeableMonth = now.getDate() <= dueDay ? currentMonth - 1 : currentMonth;
  const enrollment = getEnrollmentParts(member?.enrollmentDate ?? member?.enrollment_date ?? "");

  if (enrollment && enrollment.year > currentYear) {
    return [];
  }

  const enrollmentYear = enrollment?.year ?? currentYear;
  const enrollmentMonth = enrollment?.month ?? 1;

  const periods = [];

  for (let year = enrollmentYear; year <= currentYear; year++) {
    const startMonth = year === enrollmentYear ? enrollmentMonth : 1;
    const endMonth = year === currentYear ? lastChargeableMonth : 12;

    if (endMonth <= 0) {
      continue;
    }

    for (let month = startMonth; month <= endMonth; month++) {
      periods.push({ month, year });
    }
  }

  return periods;
}

export function getStatusLabel(status) {
  if (status === "current") return "Al dia";
  if (status === "pending") return "Proximo a vencer";
  return "Atrasado";
}

export function getCurrentFeeStatus(member, payments, options = {}) {
  const dueDay = options.dueDay ?? 10;
  const chargeablePeriods = getChargeablePeriods(member, options);
  const paidKeys = new Set(
    payments
      .filter((item) => item.memberId === member.id)
      .map((item) => `${item.month}-${item.year}`),
  );

  const pendingPeriods = chargeablePeriods.filter((item) => !paidKeys.has(`${item.month}-${item.year}`));

  if (pendingPeriods.length === 0) {
    return "current";
  }

  const now = options.now ? new Date(options.now) : new Date();
  return now.getDate() <= dueDay ? "pending" : "late";
}
