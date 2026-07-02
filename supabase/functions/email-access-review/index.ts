import { corsHeaders, processAccessRequestReview, verifyActionToken } from "../_shared/access-request-review.ts";

/** Escapa texto dinamico para insertarlo de forma segura en el HTML. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type Tone = "success" | "neutral" | "danger";

/** Icono SVG (trazo) segun el estado. */
function toneIcon(tone: Tone): string {
  if (tone === "success") {
    return '<path d="M20 6 9 17l-5-5" />';
  }
  if (tone === "danger") {
    return '<path d="M12 8v5" /><circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />';
  }
  // neutral (rechazo procesado correctamente)
  return '<path d="M5 12h14" />';
}

function buildPage(
  title: string,
  message: string,
  tone: Tone,
  options?: {
    activationUrl?: string;
    email?: string;
    emailSent?: boolean;
    appUrl?: string;
  },
) {
  // Paleta on-brand (DATA DAY: naranja #FF5F20 sobre fondo oscuro).
  const toneColor =
    tone === "success" ? "#3EE08F" : tone === "danger" ? "#FF5D7A" : "#96A2B6";

  const activationBlock =
    tone === "success" && options?.activationUrl
      ? `
        <div class="activation">
          <p class="activation__label">Enlace de activacion para el cliente</p>
          <p class="activation__help">
            ${
              options.emailSent
                ? `Ya lo enviamos automaticamente a <strong>${esc(options.email ?? "el cliente")}</strong>. Si no le llega, copialo y compartiselo directamente.`
                : `El envio automatico del mail pudo haber fallado. Copia este enlace y compartiselo a <strong>${esc(options.email ?? "el cliente")}</strong>.`
            }
          </p>
          <div class="activation__row">
            <input id="activation-link" class="activation__input" type="text" readonly value="${esc(options.activationUrl)}" />
            <button id="copy-btn" class="btn btn--copy" type="button">Copiar</button>
          </div>
          <p class="activation__note">Con ese enlace el cliente crea su contrasena y entra a la app.</p>
        </div>
      `
      : "";

  const backLink = options?.appUrl
    ? `<a class="back" href="${esc(options.appUrl)}">Volver a DATA DAY &rarr;</a>`
    : "";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${esc(title)} — DATA DAY</title>
        <style>
          :root {
            --accent: #FF5F20;
            --bg: #0B0B13;
            --surface: #141926;
            --line: rgba(255,255,255,0.08);
            --text: #F5F7FA;
            --dim: #96A2B6;
            --tone: ${toneColor};
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            background:
              radial-gradient(900px 500px at 50% -10%, rgba(255,95,32,0.16), transparent 60%),
              var(--bg);
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: var(--text);
            -webkit-font-smoothing: antialiased;
          }
          .card {
            max-width: 520px;
            width: 100%;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 24px;
            padding: 40px 36px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.45);
            text-align: center;
          }
          .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 28px;
          }
          .brand__mark {
            width: 34px; height: 34px;
            border-radius: 9px;
            background: var(--accent);
            display: grid; place-items: center;
            font-weight: 800; color: #fff; font-size: 18px;
          }
          .brand__name { font-weight: 800; letter-spacing: 0.14em; font-size: 14px; }
          .brand__sub {
            display: block; font-weight: 600; letter-spacing: 0.16em;
            font-size: 9px; color: var(--dim); text-align: left; margin-top: 1px;
          }
          .badge {
            width: 76px; height: 76px;
            border-radius: 50%;
            margin: 4px auto 22px;
            display: grid; place-items: center;
            color: var(--tone);
            background: color-mix(in srgb, var(--tone) 14%, transparent);
            border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent);
          }
          .badge svg { width: 38px; height: 38px; }
          h1 { margin: 0 0 10px; font-size: 25px; letter-spacing: -0.01em; }
          .msg { margin: 0 auto; max-width: 40ch; color: var(--dim); font-size: 15.5px; line-height: 1.55; }
          .activation {
            margin-top: 26px;
            padding: 20px;
            border-radius: 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--line);
            text-align: left;
          }
          .activation__label {
            margin: 0 0 8px; font-weight: 700; font-size: 12px;
            letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent);
          }
          .activation__help { margin: 0 0 14px; color: var(--dim); font-size: 14px; line-height: 1.5; }
          .activation__help strong { color: var(--text); }
          .activation__row { display: flex; gap: 10px; }
          .activation__input {
            flex: 1; min-width: 0;
            padding: 12px 14px;
            border-radius: 11px;
            border: 1px solid var(--line);
            background: var(--bg);
            color: var(--text);
            font-size: 13px;
            font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
            text-overflow: ellipsis;
          }
          .btn {
            border: 0; cursor: pointer;
            border-radius: 11px;
            font-weight: 700; font-size: 14px;
            padding: 12px 18px;
            transition: transform .06s ease, background .15s ease;
          }
          .btn:active { transform: translateY(1px); }
          .btn--copy { background: var(--accent); color: #fff; white-space: nowrap; }
          .btn--copy.copied { background: #3EE08F; }
          .activation__note { margin: 14px 0 0; color: #5B6478; font-size: 12.5px; }
          .back {
            display: inline-block; margin-top: 26px;
            color: var(--dim); text-decoration: none; font-weight: 600; font-size: 14px;
          }
          .back:hover { color: var(--text); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">
            <span class="brand__mark">D</span>
            <span>
              <span class="brand__name">DATA DAY</span>
              <span class="brand__sub">GESTION DE CUOTAS</span>
            </span>
          </div>
          <div class="badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              ${toneIcon(tone)}
            </svg>
          </div>
          <h1>${esc(title)}</h1>
          <p class="msg">${esc(message)}</p>
          ${activationBlock}
          ${backLink}
        </div>
        <script>
          (function () {
            var btn = document.getElementById("copy-btn");
            var input = document.getElementById("activation-link");
            if (!btn || !input) return;
            btn.addEventListener("click", function () {
              var done = function () {
                btn.textContent = "¡Copiado!";
                btn.classList.add("copied");
                setTimeout(function () {
                  btn.textContent = "Copiar";
                  btn.classList.remove("copied");
                }, 2000);
              };
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(input.value).then(done).catch(function () {
                  input.select(); document.execCommand("copy"); done();
                });
              } else {
                input.select(); document.execCommand("copy"); done();
              }
            });
          })();
        </script>
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

    const appUrl = Deno.env.get("APP_BASE_URL") ?? "https://dataday-app.pages.dev";
    const isApproved = result.status === "approved";

    const title = isApproved ? "Solicitud aprobada" : "Solicitud rechazada";
    const message = isApproved
      ? "El cliente ya puede iniciar sesion con la contrasena que eligio al solicitar el acceso."
      : "La solicitud fue rechazada. El cliente no tendra acceso a la app.";

    return new Response(
      buildPage(title, message, isApproved ? "success" : "neutral", {
        activationUrl: result.activationUrl,
        email: result.email,
        emailSent: result.emailSent,
        appUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return new Response(buildPage("Ocurrio un error", detail, "danger"), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
