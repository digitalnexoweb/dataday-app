export const DEFAULT_APP_SETTINGS = {
  clubName: "DataDay Cuotas",
  clubLogo: "",
  clubPhone: "099 000 000",
  clubAddress: "Montevideo, Uruguay",
  defaultMonthlyFee: 1500,
  dueDay: 10,
  lateFeePercent: 10,
  paymentMethods: {
    cash: true,
    transfer: true,
    mercadoPago: true,
    other: true,
  },
};

export const SETTINGS_STORAGE_KEY = "dataday-settings";

export function loadAppSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return DEFAULT_APP_SETTINGS;
    }

    return {
      ...DEFAULT_APP_SETTINGS,
      ...JSON.parse(rawSettings),
      paymentMethods: {
        ...DEFAULT_APP_SETTINGS.paymentMethods,
        ...JSON.parse(rawSettings).paymentMethods,
      },
    };
  } catch (error) {
    console.error("No se pudieron cargar las configuraciones locales.", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export const PAYMENT_METHOD_OPTIONS = [
  { key: "cash", label: "Efectivo" },
  { key: "transfer", label: "Transferencia" },
  { key: "mercadoPago", label: "Mercado Pago" },
  { key: "other", label: "Otro" },
];
