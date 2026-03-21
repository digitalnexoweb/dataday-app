import { corsHeaders, processAccessRequestReview, verifyActionToken } from "../_shared/access-request-review.ts";

function buildPage(
  title: string,
  message: string,
  tone: "success" | "danger",
  options?: {
    activationUrl?: string;
    email?: string;
    emailSent?: boolean;
  },
) {
  const accent = tone === "success" ? "#118c59" : "#d85140";
  const activationBlock =
    tone === "success" && options?.activationUrl
      ? `
        <div style="margin-top:20px; padding:18px; border-radius:16px; background:#f7fbff; border:1px solid #d9e8fb;">
          <p style="margin:0 0 10px; color:#17314a; font-weight:700;">Enlace de activacion del cliente</p>
          <p style="margin:0 0 12px; color:#69829a;">
            ${
              options.emailSent
                ? `Tambien intentamos enviarlo automaticamente a ${options.email ?? "el cliente"}.`
                : `El envio automatico del mail puede haber fallado. Puedes copiar este enlace y compartirlo con ${options.email ?? "el cliente"}.`
            }
          </p>
          <a href="${options.activationUrl}" style="word-break:break-all; color:#0b3d75; font-weight:700;">${options.activationUrl}</a>
        </div>
      `
      : "";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0; font-family: Arial, sans-serif; background:#f4f7fb; display:grid; place-items:center; min-height:100vh; padding:24px;">
        <div style="max-width:560px; width:100%; background:white; border-radius:24px; padding:32px; border:1px solid #e4edf8; box-shadow:0 24px 60px rgba(12,50,92,0.12);">
          <p style="margin:0 0 12px; color:#d96d10; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; font-size:12px;">DataDay Cuotas</p>
          <h1 style="margin:0 0 12px; color:#17314a;">${title}</h1>
          <p style="margin:0; color:${accent}; font-weight:700;">${message}</p>
          ${activationBlock}
        </div>
      </body>
    </html>
  `;
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
      return new Response(buildPage("Acceso invalido", "El enlace no es valido o ya no esta disponible.", "danger"), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const isValidToken = await verifyActionToken(approvalSecret, requestId, action, token);

    if (!isValidToken) {
      return new Response(buildPage("Acceso invalido", "No pudimos validar este enlace de revision.", "danger"), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const result = await processAccessRequestReview({
      requestId,
      action,
      reviewerId: null,
    });

    const message =
      result.status === "approved"
        ? "La solicitud fue aprobada. El usuario ya puede entrar con la contrasena que eligio al solicitar acceso."
        : "La solicitud fue rechazada correctamente.";

    return new Response(
      buildPage("Revision completada", message, "success", {
        activationUrl: result.activationUrl,
        email: result.email,
        emailSent: result.emailSent,
      }),
      {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      },
    );
  } catch (error) {
    return new Response(buildPage("Ocurrio un error", error.message, "danger"), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
