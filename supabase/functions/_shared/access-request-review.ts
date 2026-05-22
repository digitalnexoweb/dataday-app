import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPERADMIN_EMAIL = "digitalnexoweb@gmail.com";
const PRODUCTION_ORIGIN = "https://data-day-app367d.netlify.app";
const TOKEN_TTL_SECONDS = 72 * 60 * 60;

// C6: Restrict CORS to the configured frontend origin instead of wildcard.
export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_BASE_URL") ?? PRODUCTION_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// C10: Sanitize any user-supplied string before interpolating into HTML.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCredentialEmailHtml(payload: {
  fullName: string;
  clubName: string;
  email: string;
  activationUrl: string;
}) {
  const fullName = escapeHtml(payload.fullName);
  const clubName = escapeHtml(payload.clubName);
  const email = escapeHtml(payload.email);
  // activationUrl is generated server-side; escape as an extra precaution.
  const activationUrl = escapeHtml(payload.activationUrl);

  return `
    <div style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 18px; padding: 28px; border: 1px solid #e4edf8;">
        <p style="margin: 0 0 10px; color: #d96d10; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px;">
          DataDay Cuotas
        </p>
        <h1 style="margin: 0 0 12px; color: #17314a;">Tu acceso fue aprobado</h1>
        <p style="margin: 0 0 22px; color: #69829a;">
          ${clubName} ya tiene acceso activo a DataDay Cuotas.
        </p>

        <div style="padding: 18px; border-radius: 16px; background: #f7fbff; border: 1px solid #d9e8fb; margin-bottom: 18px;">
          <p style="margin: 0 0 10px; color: #69829a;">Usuario autorizado</p>
          <strong style="display: block; color: #17314a; font-size: 18px;">${email}</strong>
        </div>

        <p style="margin: 0 0 18px; color: #17314a;">
          Ya puedes entrar con la contrasena que elegiste al solicitar acceso. Si necesitas crearla de nuevo o cambiarla, usa este enlace:
        </p>
        <a href="${activationUrl}" style="display:inline-block; padding:14px 20px; border-radius:14px; background:linear-gradient(135deg, #ff8f32, #ffac59); color:#17263c; font-weight:700; text-decoration:none; margin-bottom:18px;">
          Crear o cambiar contrasena
        </a>
        <p style="margin: 0; color: #69829a;">Bienvenido a DataDay Cuotas, ${fullName}.</p>
      </div>
    </div>
  `;
}

function randomPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

async function sendCredentialEmail({
  resendApiKey,
  fromAddress,
  email,
  fullName,
  clubName,
  activationUrl,
}: {
  resendApiKey: string;
  fromAddress: string;
  email: string;
  fullName: string;
  clubName: string;
  activationUrl: string;
}) {
  if (!resendApiKey) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress, // C3: configurable sender
      to: [email],
      subject: "Tu acceso a DataDay Cuotas fue aprobado",
      html: buildCredentialEmailHtml({ fullName, clubName, email, activationUrl }),
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function ensureClub(adminClient: ReturnType<typeof createClient>, clubName: string) {
  const { data: existingClub } = await adminClient.from("clubs").select("*").eq("name", clubName).maybeSingle();

  if (existingClub) {
    return existingClub;
  }

  const { data: createdClub, error: clubError } = await adminClient
    .from("clubs")
    .insert({ name: clubName })
    .select("*")
    .single();

  if (clubError) {
    throw clubError;
  }

  return createdClub;
}

// C4: Paginate through auth users to avoid the 1000-user hard limit of a single listUsers() call.
export async function getUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email?: string } | null> {
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page++;
  }
}

async function ensureApprovedUserForRequest(
  adminClient: ReturnType<typeof createClient>,
  accessRequest: any,
  clubId: number,
) {
  // C4: Use paginated lookup instead of a single unbounded listUsers() call.
  const existingUser = await getUserByEmail(adminClient, accessRequest.email);
  const bootstrapPassword = randomPassword();
  let authUserId = existingUser?.id ?? null;

  if (existingUser) {
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true,
      user_metadata: {
        full_name: accessRequest.full_name,
      },
    });

    if (updateError) {
      throw updateError;
    }

    authUserId = updatedUser.user?.id ?? existingUser.id;
  } else {
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email: accessRequest.email,
      password: bootstrapPassword,
      email_confirm: true,
      user_metadata: {
        full_name: accessRequest.full_name,
      },
    });

    if (createUserError) {
      throw createUserError;
    }

    authUserId = createdUser.user?.id ?? null;
  }

  if (!authUserId) {
    throw new Error("No pudimos crear el usuario autenticado.");
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: authUserId,
    email: accessRequest.email,
    full_name: accessRequest.full_name,
    club_id: clubId,
    role: "admin",
    approved: true,
  });

  if (profileError) {
    throw profileError;
  }

  return authUserId;
}

export async function generateActivationLinkForRequest(requestId: string | number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173";
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: accessRequest, error: requestError } = await adminClient
    .from("access_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (requestError || !accessRequest) {
    throw requestError ?? new Error("Solicitud no encontrada.");
  }

  if (accessRequest.email === SUPERADMIN_EMAIL) {
    throw new Error("No puedes generar activacion para el correo superadmin.");
  }

  const club = await ensureClub(adminClient, accessRequest.club_name);
  await ensureApprovedUserForRequest(adminClient, accessRequest, club.id);

  const { data: recoveryLinkData, error: recoveryLinkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: accessRequest.email,
    options: {
      redirectTo: appBaseUrl,
    },
  });

  if (recoveryLinkError) {
    throw recoveryLinkError;
  }

  return {
    activationUrl: recoveryLinkData.properties?.action_link ?? appBaseUrl,
    email: accessRequest.email,
    clubId: club.id,
  };
}

// C5: Token embeds an issued-at timestamp (Unix seconds). Format: "<ts>.<hex-hmac>"
// This makes tokens self-expiring without needing to store them server-side.
export async function buildActionToken(
  secret: string,
  requestId: string | number,
  action: string,
  issuedAt?: number,
): Promise<string> {
  const ts = issuedAt ?? Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${requestId}:${action}:${ts}`),
  );
  const hex = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${ts}.${hex}`;
}

export async function verifyActionToken(
  secret: string,
  requestId: string | number,
  action: string,
  token: string,
): Promise<boolean> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const ts = parseInt(token.slice(0, dotIndex), 10);
  if (isNaN(ts)) return false;

  // C5: Reject tokens older than 72 hours.
  const now = Math.floor(Date.now() / 1000);
  if (now - ts > TOKEN_TTL_SECONDS) return false;

  const expectedToken = await buildActionToken(secret, requestId, action, ts);
  return expectedToken === token;
}

export async function processAccessRequestReview({
  requestId,
  action,
  reviewerId,
}: {
  requestId: string | number;
  action: string;
  reviewerId: string | null;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  // C3: Sender address is configurable via env var instead of hardcoded.
  const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") ?? "DataDay Cuotas <onboarding@resend.dev>";
  const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "http://localhost:5173";
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: accessRequest, error: requestError } = await adminClient
    .from("access_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (requestError || !accessRequest) {
    throw requestError ?? new Error("Solicitud no encontrada.");
  }

  if (action === "reject") {
    const { error } = await adminClient
      .from("access_requests")
      .update({
        status: "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      throw error;
    }

    return { status: "rejected" };
  }

  if (accessRequest.email === SUPERADMIN_EMAIL) {
    throw new Error("No puedes aprobar una solicitud usando el correo superadmin.");
  }

  const club = await ensureClub(adminClient, accessRequest.club_name);
  await ensureApprovedUserForRequest(adminClient, accessRequest, club.id);

  const { error: approvalError } = await adminClient
    .from("access_requests")
    .update({
      status: "approved",
      club_id: club.id,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (approvalError) {
    throw approvalError;
  }

  let activationUrl = appBaseUrl;
  let emailSent = false;

  try {
    const activationResult = await generateActivationLinkForRequest(requestId);
    activationUrl = activationResult.activationUrl;

    await sendCredentialEmail({
      resendApiKey,
      fromAddress,
      email: accessRequest.email,
      fullName: accessRequest.full_name,
      clubName: accessRequest.club_name,
      activationUrl,
    });
    emailSent = true;
  } catch (emailError) {
    console.error("No se pudo enviar el email de credenciales.", emailError);
  }

  return { status: "approved", clubId: club.id, activationUrl, emailSent, email: accessRequest.email };
}
