import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPERADMIN_EMAIL = "digitalnexoweb@gmail.com";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildCredentialEmailHtml(payload: {
  fullName: string;
  clubName: string;
  email: string;
  activationUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 18px; padding: 28px; border: 1px solid #e4edf8;">
        <p style="margin: 0 0 10px; color: #d96d10; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px;">
          DataDay Cuotas
        </p>
        <h1 style="margin: 0 0 12px; color: #17314a;">Tu acceso fue aprobado</h1>
        <p style="margin: 0 0 22px; color: #69829a;">
          ${payload.clubName} ya tiene acceso activo a DataDay Cuotas.
        </p>

        <div style="padding: 18px; border-radius: 16px; background: #f7fbff; border: 1px solid #d9e8fb; margin-bottom: 18px;">
          <p style="margin: 0 0 10px; color: #69829a;">Usuario autorizado</p>
          <strong style="display: block; color: #17314a; font-size: 18px;">${payload.email}</strong>
        </div>

        <p style="margin: 0 0 18px; color: #17314a;">
          Ya puedes entrar con la contrasena que elegiste al solicitar acceso. Si necesitas crearla de nuevo o cambiarla, usa este enlace:
        </p>
        <a href="${payload.activationUrl}" style="display:inline-block; padding:14px 20px; border-radius:14px; background:linear-gradient(135deg, #ff8f32, #ffac59); color:#17263c; font-weight:700; text-decoration:none; margin-bottom:18px;">
          Crear o cambiar contrasena
        </a>
        <p style="margin: 0; color: #69829a;">Bienvenido a DataDay Cuotas, ${payload.fullName}.</p>
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
  email,
  fullName,
  clubName,
  activationUrl,
}: {
  resendApiKey: string;
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
      from: "DataDay Cuotas <onboarding@resend.dev>",
      to: [email],
      subject: "Tu acceso a DataDay Cuotas fue aprobado",
      html: buildCredentialEmailHtml({
        fullName,
        clubName,
        email,
        activationUrl,
      }),
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

async function ensureApprovedUserForRequest(
  adminClient: ReturnType<typeof createClient>,
  accessRequest: any,
  clubId: number,
) {
  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers();
  if (usersError) {
    throw usersError;
  }

  const existingUser = usersData.users.find((item) => item.email === accessRequest.email);
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

export async function buildActionToken(secret: string, requestId: string | number, action: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${requestId}:${action}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyActionToken(secret: string, requestId: string | number, action: string, token: string) {
  const expectedToken = await buildActionToken(secret, requestId, action);
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
