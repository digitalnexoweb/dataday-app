import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/access-request-review.ts";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return data.users.find((item) => item.email?.toLowerCase() === email) ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const payload = await request.json();

    const fullName = String(payload.fullName ?? "").trim();
    const email = normalizeEmail(String(payload.email ?? ""));
    const clubName = String(payload.clubName ?? "").trim();
    const phone = String(payload.phone ?? "").trim();
    const message = String(payload.message ?? "").trim();
    const password = String(payload.password ?? "");

    if (!fullName || !email || !clubName || password.length < 6) {
      return new Response(JSON.stringify({ error: "Datos incompletos o contrasena invalida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("id, approved")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile?.approved) {
      return new Response(JSON.stringify({ error: "Este email ya tiene acceso aprobado." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingUser = await findUserByEmail(adminClient, email);
    let authUserId = existingUser?.id ?? null;

    if (existingUser) {
      const { error: updateUserError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (updateUserError) {
        throw updateUserError;
      }
    } else {
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createUserError) {
        throw createUserError;
      }

      authUserId = createdUser.user?.id ?? null;
    }

    if (!authUserId) {
      throw new Error("No pudimos preparar el acceso para este usuario.");
    }

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: authUserId,
      email,
      full_name: fullName,
      club_id: null,
      role: "admin",
      approved: false,
    });

    if (profileError) {
      throw profileError;
    }

    const { data: pendingRequest, error: pendingRequestError } = await adminClient
      .from("access_requests")
      .select("id, created_at")
      .eq("email", email)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingRequestError) {
      throw pendingRequestError;
    }

    let requestId = pendingRequest?.id ?? null;
    let createdAt = pendingRequest?.created_at ?? new Date().toISOString();

    if (pendingRequest) {
      const { error: updateRequestError } = await adminClient
        .from("access_requests")
        .update({
          full_name: fullName,
          email,
          club_name: clubName,
          phone: phone || null,
          message: message || null,
          club_id: null,
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq("id", pendingRequest.id);

      if (updateRequestError) {
        throw updateRequestError;
      }
    } else {
      const { data: createdRequest, error: createRequestError } = await adminClient
        .from("access_requests")
        .insert({
          full_name: fullName,
          email,
          club_name: clubName,
          phone: phone || null,
          message: message || null,
          status: "pending",
        })
        .select("id, created_at")
        .single();

      if (createRequestError) {
        throw createRequestError;
      }

      requestId = createdRequest.id;
      createdAt = createdRequest.created_at;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        requestId,
        createdAt,
        email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
