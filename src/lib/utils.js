// Detecta el error específico de columna logo_url faltante en Supabase,
// que ocurre cuando el schema no se ha actualizado en la instancia del cliente.
export function isMissingLogoColumnError(error) {
  const message = error?.message || "";
  return (
    message.includes("logo_url") &&
    (message.includes("does not exist") || message.includes("Could not find"))
  );
}

// Calcula la cuota mensual efectiva de un socio dada su categoria y el fallback configurado.
export function getMonthlyFee(category, fallbackFee) {
  return Number(category?.monthlyFee ?? category?.monthly_fee ?? fallbackFee ?? 0);
}
