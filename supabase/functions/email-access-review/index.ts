import { corsHeaders, processAccessRequestReview, verifyActionToken } from "../_shared/access-request-review.ts";

// ---------------------------------------------------------------------------
// IMPORTANTE: el dominio de las Edge Functions de Supabase
// (`<ref>.supabase.co/functions/v1/...`) NO renderiza HTML: la plataforma
// fuerza `Content-Type: text/plain` + `X-Content-Type-Options: nosniff` +
// `Content-Security-Policy: sandbox` por seguridad (para que el dominio no
// se use para phishing). Por eso cualquier HTML que devolvamos se ve como
// codigo crudo en el navegador.
//
// Solucion: devolver TEXTO PLANO prolijo y legible (no HTML). Se usan solo
// caracteres ASCII (sin acentos ni simbolos multibyte) para evitar que el
// navegador los muestre rotos al decodificar como Latin-1.
// ---------------------------------------------------------------------------

const RULE = "====================================";
const THIN = "------------------------------------";
const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://dataday-app.pages.dev";

/** Arma el link wa.me para avisarle al cliente por WhatsApp que fue aprobado. */
function buildWhatsappUrl(phone?: string | null, fullName?: string, clubName?: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const nombre = fullName || "";
  const club = clubName ? ` para ${clubName}` : "";
  const msg = `Hola ${nombre}! Tu solicitud de acceso a DataDay${club} fue aprobada. Ya podes ingresar a la app: ${APP_URL}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

/** Arma el cuerpo de texto plano de la pagina de resultado. */
function buildText(
  title: string,
  message: string,
  options?: {
    activationUrl?: string;
    email?: string;
    emailSent?: boolean;
    whatsappUrl?: string;
  },
): string {
  const lines: string[] = [
    RULE,
    "   DATA DAY - Gestion de cuotas",
    RULE,
    "",
    `[ ${title} ]`,
    "",
    message,
  ];

  if (options?.whatsappUrl) {
    lines.push(
      "",
      THIN,
      "",
      "Avisale al cliente por WhatsApp (abri este link):",
      "",
      options.whatsappUrl,
    );
  }

  if (options?.activationUrl) {
    lines.push(
      "",
      THIN,
      "",
      `Enlace de activacion para ${options.email ?? "el cliente"}:`,
      "",
      options.activationUrl,
      "",
      options.emailSent
        ? "Tambien se lo enviamos por mail. Si no le llega, copia este enlace y compartiselo."
        : "El mail automatico pudo fallar. Copia este enlace y compartiselo al cliente.",
    );
  }

  lines.push("");
  return lines.join("\n");
}

/** Respuesta de texto plano. */
function textResponse(body: string, status = 200): Response {
  const headers = new Headers();
  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(body, { status, headers });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const requestId = url.searchParams.get("requestId") ?? "";
    const action = url.searchParams.get("action") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const approvalSecret = Deno.env.get("ADMIN_APPROVAL_SECRET") ?? "";

    if (!requestId || !action || !token || !approvalSecret) {
      return textResponse(
        buildText("ENLACE INVALIDO", "El enlace no es valido o ya no esta disponible."),
        400,
      );
    }

    const isValidToken = await verifyActionToken(approvalSecret, requestId, action, token);

    if (!isValidToken) {
      return textResponse(
        buildText("ENLACE INVALIDO", "No pudimos validar este enlace de revision."),
        403,
      );
    }

    const result = await processAccessRequestReview({
      requestId,
      action,
      reviewerId: null,
    });

    const isApproved = result.status === "approved";

    if (isApproved) {
      return textResponse(
        buildText(
          "SOLICITUD APROBADA",
          "El cliente ya puede iniciar sesion con la contrasena que eligio al solicitar el acceso.",
          {
            activationUrl: result.activationUrl,
            email: result.email,
            emailSent: result.emailSent,
            whatsappUrl: buildWhatsappUrl(result.phone, result.fullName, result.clubName),
          },
        ),
      );
    }

    return textResponse(
      buildText("SOLICITUD RECHAZADA", "La solicitud fue rechazada. El cliente no tendra acceso a la app."),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return textResponse(buildText("OCURRIO UN ERROR", detail), 500);
  }
});
