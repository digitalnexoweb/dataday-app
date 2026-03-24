import { supabase, supabaseEnabled } from "./supabase";

const SUPERADMIN_EMAIL = "digitalnexoweb@gmail.com";

function getResetPasswordUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/reset-password`;
}

function hasRecoveryTokensInUrl() {
  if (typeof window === "undefined") {
    return false;
  }

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    hash.includes("access_token=") ||
    search.includes("access_token=")
  );
}

function isMissingLogoColumnError(error) {
  const message = error?.message || "";
  return (
    message.includes("logo_url") &&
    (message.includes("does not exist") || message.includes("Could not find"))
  );
}

export const authApi = {
  async getSession() {
    if (!supabaseEnabled) {
      return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    return data.session;
  },

  onAuthStateChange(callback) {
    if (!supabaseEnabled) {
      return { data: { subscription: { unsubscribe() {} } } };
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session, event);
    });
  },

  async signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  },

  async submitAccessRequest(payload) {
    const { data, error } = await supabase.functions.invoke("submit-access-request", {
      body: {
        fullName: payload.fullName,
        email: payload.email,
        clubName: payload.clubName,
        phone: payload.phone || null,
        message: payload.message || null,
        password: payload.password,
      },
    });

    if (error) {
      let detailedMessage = data?.error || "";

      if (!detailedMessage && error.context) {
        try {
          const payload = await error.context.json();
          detailedMessage = payload?.error || payload?.message || "";
        } catch {
          detailedMessage = "";
        }
      }

      throw new Error(detailedMessage || error.message || "No se pudo crear la solicitud de acceso.");
    }

    try {
      await supabase.functions.invoke("notify-access-request", {
        body: {
          requestId: data?.requestId ?? null,
          fullName: payload.fullName,
          email: data?.email ?? payload.email,
          clubName: payload.clubName,
          phone: payload.phone || null,
          message: payload.message || null,
          createdAt: data?.createdAt ?? new Date().toISOString(),
        },
      });
    } catch (notificationError) {
      console.warn("La solicitud se guardo, pero no se pudo enviar la notificacion por email.", notificationError);
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },

  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  },

  async requestPasswordSetup(email) {
    const redirectTo = getResetPasswordUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw error;
    }
  },

  isResetPasswordRoute() {
    if (typeof window === "undefined") {
      return false;
    }

    return window.location.pathname === "/reset-password";
  },

  hasRecoveryTokens() {
    return hasRecoveryTokensInUrl();
  },

  isPasswordRecoveryFlow() {
    return this.isResetPasswordRoute() && this.hasRecoveryTokens();
  },

  redirectRecoveryToResetPassword() {
    if (typeof window === "undefined" || this.isResetPasswordRoute() || !this.hasRecoveryTokens()) {
      return;
    }

    const targetUrl = `${getResetPasswordUrl()}${window.location.search || ""}${window.location.hash || ""}`;
    window.location.replace(targetUrl);
  },

  clearAuthRedirectUrl(nextPath = "/") {
    if (typeof window === "undefined") {
      return;
    }

    const cleanUrl = `${window.location.origin}${nextPath}`;
    window.history.replaceState({}, document.title, cleanUrl);
  },

  async getProfile(userId) {
    const profileQuery = supabase
      .from("profiles")
      .select("id, email, full_name, club_id, role, approved, clubs(id, name, logo_url)")
      .eq("id", userId);

    let { data, error } = await profileQuery.single();

    if (error && isMissingLogoColumnError(error)) {
      ({ data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, club_id, role, approved, clubs(id, name)")
        .eq("id", userId)
        .single());

      if (!error && data?.clubs) {
        data = {
          ...data,
          clubs: {
            ...data.clubs,
            logo_url: "",
          },
        };
      }
    }

    if (error) {
      throw error;
    }

    return data;
  },

  async listAccessRequests() {
    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async reviewAccessRequest(requestId, action, reviewerProfile = null) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke("admin-access-requests", {
      body: {
        requestId,
        action,
        accessToken: session?.access_token ?? null,
        reviewerProfile: reviewerProfile
          ? {
              id: reviewerProfile.id,
              email: reviewerProfile.email,
              role: reviewerProfile.role,
              approved: reviewerProfile.approved,
            }
          : null,
      },
      headers: session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
          }
        : undefined,
    });

    if (error) {
      let detailedMessage = data?.error || "";

      if (!detailedMessage && error.context) {
        try {
          const payload = await error.context.json();
          detailedMessage = payload?.error || payload?.message || "";
        } catch {
          detailedMessage = "";
        }
      }

      throw new Error(detailedMessage || error.message || "No se pudo procesar la solicitud.");
    }

    return data;
  },

  async generateActivationLink(requestId) {
    return this.reviewAccessRequest(requestId, "generate-activation-link");
  },

  isSuperAdmin(profile) {
    return profile?.role === "superadmin" && profile?.email === SUPERADMIN_EMAIL;
  },
};
