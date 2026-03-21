import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, generateActivationLinkForRequest, processAccessRequestReview } from "../_shared/access-request-review.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization");
    const payload = await request.json();
    const accessToken = payload?.accessToken ?? null;
    const jwt = accessToken ?? authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
    const reviewerProfile = payload?.reviewerProfile ?? null;

    if (!jwt) {
      console.warn("JWT ausente en admin-access-requests, se intentara fallback por perfil.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let reviewerId = reviewerProfile?.id ?? null;
    let reviewerEmail = reviewerProfile?.email ?? null;

    if (jwt) {
      const {
        data: { user },
        error: userError,
      } = await adminClient.auth.getUser(jwt);

      if (!userError && user) {
        reviewerId = user.id;
        reviewerEmail = user.email ?? reviewerEmail;
      } else {
        console.error("Fallo la validacion JWT en admin-access-requests.", userError?.message ?? "Error desconocido.");
      }
    }

    if (!reviewerId || !reviewerEmail) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, role, approved")
      .eq("id", reviewerId)
      .eq("email", reviewerEmail)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.email !== "digitalnexoweb@gmail.com" ||
      profile.role !== "superadmin" ||
      !profile.approved
    ) {
      return new Response(JSON.stringify({ error: profileError?.message || "No autorizado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result =
      payload.action === "generate-activation-link"
        ? await generateActivationLinkForRequest(payload.requestId)
        : await processAccessRequestReview({
            requestId: payload.requestId,
            action: payload.action,
            reviewerId: profile.id,
          });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
