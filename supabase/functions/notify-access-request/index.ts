import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildActionToken, corsHeaders } from "../_shared/access-request-review.ts";

function buildHtml(payload: {
  requestId?: number | null;
  fullName: string;
  email: string;
  clubName: string;
  phone?: string | null;
  message?: string | null;
  createdAt?: string | null;
  approveUrl?: string;
  rejectUrl?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 18px; padding: 28px; border: 1px solid #e4edf8;">
        <p style="margin: 0 0 10px; color: #d96d10; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px;">
          DataDay Cuotas
        </p>
        <h1 style="margin: 0 0 12px; color: #17314a;">Nueva solicitud de acceso</h1>
        <p style="margin: 0 0 24px; color: #69829a;">Un club o academia envio una nueva solicitud para usar la plataforma.</p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; color: #69829a;">Nombre</td><td style="padding: 10px 0; color: #17314a; font-weight: 700;">${payload.fullName}</td></tr>
          <tr><td style="padding: 10px 0; color: #69829a;">Email</td><td style="padding: 10px 0; color: #17314a; font-weight: 700;">${payload.email}</td></tr>
          <tr><td style="padding: 10px 0; color: #69829a;">Club</td><td style="padding: 10px 0; color: #17314a; font-weight: 700;">${payload.clubName}</td></tr>
          <tr><td style="padding: 10px 0; color: #69829a;">Telefono</td><td style="padding: 10px 0; color: #17314a; font-weight: 700;">${payload.phone || "Sin telefono"}</td></tr>
          <tr><td style="padding: 10px 0; color: #69829a;">Mensaje</td><td style="padding: 10px 0; color: #17314a; font-weight: 700;">${payload.message || "Sin mensaje"}</td></tr>
          <tr><td style="padding: 10px 0; color: #69829a;">Fecha</td><td style="padding: 10px 0; color: #17314a; font-weight: 700;">${payload.createdAt || "Ahora"}</td></tr>
        </table>

        ${
          payload.approveUrl && payload.rejectUrl
            ? `
          <div style="margin-top: 28px; display: flex; gap: 12px; flex-wrap: wrap;">
            <a href="${payload.approveUrl}" style="display: inline-block; padding: 14px 20px; border-radius: 14px; background: linear-gradient(135deg, #ff8f32, #ffac59); color: #17263c; font-weight: 700; text-decoration: none;">
              Aprobar acceso
            </a>
            <a href="${payload.rejectUrl}" style="display: inline-block; padding: 14px 20px; border-radius: 14px; background: #eef5ff; color: #0b3d75; font-weight: 700; text-decoration: none;">
              Rechazar solicitud
            </a>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") ?? "digitalnexoweb@gmail.com";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const approvalSecret = Deno.env.get("ADMIN_APPROVAL_SECRET") ?? "";

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Falta configurar RESEND_API_KEY." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await request.json();
    let requestId = payload.requestId ?? null;

    if (!requestId && supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: latestRequest } = await adminClient
        .from("access_requests")
        .select("id")
        .eq("email", payload.email)
        .eq("club_name", payload.clubName)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      requestId = latestRequest?.id ?? null;
    }

    let approveUrl = "";
    let rejectUrl = "";

    if (requestId && approvalSecret && supabaseUrl) {
      const approveToken = await buildActionToken(approvalSecret, requestId, "approve");
      const rejectToken = await buildActionToken(approvalSecret, requestId, "reject");
      approveUrl = `${supabaseUrl}/functions/v1/email-access-review?requestId=${requestId}&action=approve&token=${approveToken}`;
      rejectUrl = `${supabaseUrl}/functions/v1/email-access-review?requestId=${requestId}&action=reject&token=${rejectToken}`;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DataDay Cuotas <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `Nueva solicitud de acceso - ${payload.clubName}`,
        html: buildHtml({
          ...payload,
          requestId,
          approveUrl,
          rejectUrl,
        }),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ error: errorBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
