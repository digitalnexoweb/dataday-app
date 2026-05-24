import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { MobileNav } from "../components/MobileNav";
import { Sidebar } from "../components/Sidebar";
import { AdminRequestsPage } from "../features/admin/AdminRequestsPage";
import { AuthPage } from "../features/auth/AuthPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { MembersPage } from "../features/members/MembersPage";
import { MemberDetailPage } from "../features/members/MemberDetailPage";
import { MemberFormPage } from "../features/members/MemberFormPage";
import { RegisterPaymentPage } from "../features/payments/RegisterPaymentPage";
import { PaymentsHistoryPage } from "../features/payments/PaymentsHistoryPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { loadAppSettings, saveAppSettings } from "../lib/appSettings";
import { authApi } from "../lib/authApi";
import { dataApi } from "../lib/dataApi";
import { supabaseEnabled } from "../lib/supabase";

const INITIAL_VIEW = { section: "dashboard", memberId: null };
const THEME_STORAGE_KEY = "dataday-theme";

function loadInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return "dark";
}

function getClubInitials(name) {
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "CL"
  );
}

export default function App() {
  const [view, setView] = useState(INITIAL_VIEW);
  const [theme, setTheme] = useState(() => loadInitialTheme());
  const [selectedClubId, setSelectedClubId] = useState("");
  const [availableClubs, setAvailableClubs] = useState([]);
  const [appData, setAppData] = useState({
    members: [],
    categories: [],
    payments: [],
    medicalRecords: [],
    credits: [],
    loading: true,
    error: "",
  });
  const [appSettings, setAppSettings] = useState(() => loadAppSettings());
  const [authState, setAuthState] = useState({
    loading: supabaseEnabled,
    session: null,
    profile: null,
    error: "",
    authEvent: "",
  });
  const isResetPasswordRoute = authApi.isResetPasswordRoute();

  useEffect(() => {
    let ignore = false;

    async function bootstrapAuth() {
      if (!supabaseEnabled) {
        setAuthState({ loading: false, session: null, profile: null, error: "", authEvent: "" });
        return;
      }

      try {
        const session = await authApi.getSession();
        if (!session) {
          if (!ignore) {
            setAuthState({ loading: false, session: null, profile: null, error: "", authEvent: "" });
          }
          return;
        }

        const profile = await authApi.getProfile(session.user.id);
        if (!ignore) {
          setAuthState({ loading: false, session, profile, error: "", authEvent: "" });
        }
      } catch (error) {
        if (!ignore) {
          setAuthState({ loading: false, session: null, profile: null, error: error.message, authEvent: "" });
        }
      }
    }

    bootstrapAuth();

    const { data } = authApi.onAuthStateChange(async (session, event) => {
      if (!session) {
        setAuthState({ loading: false, session: null, profile: null, error: "", authEvent: event ?? "" });
        return;
      }

      try {
        const profile = await authApi.getProfile(session.user.id);
        setAuthState({ loading: false, session, profile, error: "", authEvent: event ?? "" });
      } catch (error) {
        setAuthState({ loading: false, session, profile: null, error: error.message, authEvent: event ?? "" });
      }
    });

    return () => {
      ignore = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  useEffect(() => {
    if (!supabaseEnabled) {
      return;
    }

    authApi.redirectRecoveryToResetPassword();
  }, []);


  useEffect(() => {
    if (!supabaseEnabled || !authState.profile?.club_id || !authState.profile?.clubs) {
      return;
    }

    setAppSettings((current) => ({
      ...current,
      clubName: authState.profile.clubs.name || current.clubName,
      clubLogo: authState.profile.clubs.logo_url || "",
    }));
  }, [authState.profile]);

  const isSuperAdmin = authApi.isSuperAdmin(authState.profile);
  const effectiveClubId = isSuperAdmin ? Number(selectedClubId) || null : authState.profile?.club_id ?? null;
  const isAllClubsView = isSuperAdmin && !effectiveClubId;
  const activeClubName =
    (isSuperAdmin
      ? availableClubs.find((club) => String(club.id) === String(effectiveClubId))?.name
      : authState.profile?.clubs?.name) ??
    (isAllClubsView ? "Todos los clubes" : "Club activo");
  const activeClub = useMemo(() => {
    const selectedClub = availableClubs.find((club) => String(club.id) === String(effectiveClubId)) ?? null;
    const clubName = isSuperAdmin
      ? selectedClub?.name ?? (isAllClubsView ? "Todos los clubes" : "Club activo")
      : authState.profile?.clubs?.name || appSettings?.clubName?.trim() || "Club activo";

    return {
      id: effectiveClubId,
      name: clubName,
      logoSrc: isSuperAdmin
        ? selectedClub?.logo ?? selectedClub?.logoUrl ?? selectedClub?.logo_url ?? ""
        : authState.profile?.clubs?.logo_url || appSettings?.clubLogo?.trim() || "",
      initials: getClubInitials(clubName),
      isGlobal: isAllClubsView,
      canSwitch: Boolean(isSuperAdmin),
    };
  }, [
    appSettings?.clubLogo,
    appSettings?.clubName,
    authState.profile?.clubs?.logo_url,
    authState.profile?.clubs?.name,
    availableClubs,
    effectiveClubId,
    isAllClubsView,
    isSuperAdmin,
  ]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedClubId("");
      setAvailableClubs([]);
      return;
    }

    let ignore = false;

    async function loadClubs() {
      try {
        const clubs = await dataApi.getClubs();
        if (!ignore) {
          setAvailableClubs(clubs);
        }
      } catch (error) {
        console.error("No se pudo cargar la lista de clubes.", error);
        if (!ignore) {
          setAvailableClubs([]);
        }
      }
    }

    loadClubs();

    return () => {
      ignore = true;
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    async function loadData() {
      try {
        const [data, clubSettings] = await Promise.all([
          dataApi.getAppData(effectiveClubId, { isSuperAdmin: isAllClubsView }),
          dataApi.getClubSettings(effectiveClubId),
        ]);
        setAppData({ ...data, loading: false, error: "" });
        if (clubSettings) {
          setAppSettings((current) => ({ ...current, ...clubSettings }));
        }
      } catch (error) {
        setAppData({ members: [], categories: [], payments: [], medicalRecords: [], loading: false, error: error.message || "No se pudieron cargar los datos." });
      }
    }

    if (!supabaseEnabled || effectiveClubId || isAllClubsView) {
      loadData();
    } else if (supabaseEnabled && authState.profile && !authState.profile.club_id) {
      setAppData({ members: [], categories: [], payments: [], medicalRecords: [], loading: false, error: "" });
    }
  }, [authState.profile, effectiveClubId, isAllClubsView]);

  async function handleRegisterPayment(payload) {
    if (supabaseEnabled && !effectiveClubId) {
      throw new Error("Selecciona un club antes de registrar pagos.");
    }

    const result = await dataApi.registerPaymentAndRefresh(payload, appData, effectiveClubId);
    setAppData((current) => ({ ...current, ...result }));
  }

  async function handleSaveMember(payload) {
    if (supabaseEnabled && !effectiveClubId) {
      throw new Error("Selecciona un club antes de crear o editar socios.");
    }

    const result = await dataApi.saveMember(payload, appData, effectiveClubId);
    setAppData((current) => ({ ...current, members: result.members }));
    return result.memberId;
  }

  async function handleSaveCategory(payload) {
    if (supabaseEnabled && !effectiveClubId) {
      throw new Error("Selecciona un club antes de crear categorias.");
    }

    const result = await dataApi.saveCategory(payload, appData.categories, effectiveClubId);
    setAppData((current) => ({ ...current, categories: result.categories }));
    return result.category;
  }

  async function handleSaveMedicalRecord(payload) {
    const medicalClubId = effectiveClubId ?? payload.clubId ?? null;

    if (supabaseEnabled && !medicalClubId) {
      throw new Error("No encontramos el club asociado al socio para guardar la ficha medica.");
    }

    const result = await dataApi.saveMedicalRecord(payload, appData.medicalRecords, medicalClubId);
    setAppData((current) => ({ ...current, medicalRecords: result.medicalRecords }));
    return result.medicalRecord;
  }

  async function handleUpdateSettings(nextSettings) {
    setAppSettings(nextSettings);
    saveAppSettings(nextSettings);

    if (!supabaseEnabled || !authState.profile?.club_id || !authState.session?.user?.id) {
      return;
    }

    await dataApi.saveClubSettings(nextSettings, authState.profile.club_id);
    const updatedClub = await dataApi.saveClubBranding(nextSettings, authState.profile.club_id);
    const refreshedProfile = await authApi.getProfile(authState.session.user.id);

    setAuthState((current) => ({
      ...current,
      profile: refreshedProfile,
    }));
    setAvailableClubs((current) =>
      current.map((club) =>
        String(club.id) === String(updatedClub.id)
          ? { ...club, name: updatedClub.name, logo_url: updatedClub.logo_url }
          : club,
      ),
    );
  }

  async function handleToggleMemberActive(memberId, active) {
    if (supabaseEnabled && !effectiveClubId) {
      throw new Error("Selecciona un club antes de modificar socios.");
    }

    await dataApi.toggleMemberActive(memberId, active, effectiveClubId);
    setAppData((current) => ({
      ...current,
      members: current.members.map((m) => (m.id === memberId ? { ...m, active } : m)),
    }));
  }

  async function handleUpdateCategory(payload) {
    if (supabaseEnabled && !effectiveClubId) {
      throw new Error("Selecciona un club antes de editar categorias.");
    }

    const result = await dataApi.updateCategory(payload, appData.categories, effectiveClubId);
    setAppData((current) => ({ ...current, categories: result.categories }));
    return result.category;
  }

  async function handleDeleteCategory(categoryId) {
    if (supabaseEnabled && !effectiveClubId) {
      throw new Error("Selecciona un club antes de eliminar categorias.");
    }

    const categories = await dataApi.deleteCategory(categoryId, appData.categories, effectiveClubId);
    setAppData((current) => ({ ...current, categories }));
  }

  async function handleLogout() {
    await authApi.signOut();
  }

  function handleToggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  const selectedMember = useMemo(
    () => appData.members.find((member) => member.id === view.memberId) ?? null,
    [appData.members, view.memberId],
  );
  const screenProps = {
    view,
    appData,
    onNavigate: setView,
    onRegisterPayment: handleRegisterPayment,
    onSaveMember: handleSaveMember,
    onSaveCategory: handleSaveCategory,
    onSaveMedicalRecord: handleSaveMedicalRecord,
    onToggleMemberActive: handleToggleMemberActive,
    onUpdateCategory: handleUpdateCategory,
    onDeleteCategory: handleDeleteCategory,
    appSettings,
    onUpdateSettings: handleUpdateSettings,
    authState,
    selectedMember,
    availableClubs,
    selectedClubId,
    effectiveClubId,
    activeClubName,
    canManageClubScopedData: !isSuperAdmin || Boolean(effectiveClubId),
    isAllClubsView,
  };

  if (supabaseEnabled && authState.loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <strong>Cargando sesion...</strong>
          <p>Estamos preparando tu espacio de trabajo.</p>
        </div>
      </div>
    );
  }

  if (isResetPasswordRoute) {
    return (
      <ResetPasswordPage
        authError={authState.error}
        authEvent={authState.authEvent}
        hasSession={Boolean(authState.session)}
        loading={authState.loading}
      />
    );
  }

  if (supabaseEnabled && !authState.session) {
    return <AuthPage authError={authState.error} />;
  }

  if (supabaseEnabled && authState.session && !authState.profile) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <strong>No pudimos cargar el club asociado a tu usuario.</strong>
          <p>{authState.error || "Revisa la migracion de perfiles y vuelve a intentar."}</p>
          <button className="secondary-button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  if (supabaseEnabled && authState.session && authState.profile && !authState.profile.approved) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <strong>Tu acceso esta pendiente de aprobacion.</strong>
          <p>DigitalNexo debe habilitar tu cuenta antes de que puedas entrar a la plataforma.</p>
          <button className="secondary-button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-stage">
      <div className="app-shell">
        <Sidebar
          currentSection={view.section}
          onNavigate={setView}
          authState={authState}
          isSuperAdmin={isSuperAdmin}
          onLogout={handleLogout}
        />
        <main className="app-content">
          <Header
            currentSection={view.section}
            selectedMember={selectedMember}
            onNavigate={setView}
            appSettings={appSettings}
            authState={authState}
            availableClubs={availableClubs}
            selectedClubId={selectedClubId}
            onSelectClub={setSelectedClubId}
            activeClubName={activeClubName}
            activeClub={activeClub}
            isAllClubsView={isAllClubsView}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
          <section className="page-stage">
            {appData.error ? (
              <div className="auth-shell" style={{ minHeight: "auto", padding: "1.5rem" }}>
                <p className="error-banner">{appData.error}</p>
              </div>
            ) : null}
            {view.section === "dashboard" && <DashboardPage {...screenProps} />}
            {view.section === "members" && <MembersPage {...screenProps} />}
            {view.section === "member-detail" && <MemberDetailPage {...screenProps} />}
            {view.section === "member-form" && <MemberFormPage {...screenProps} />}
            {view.section === "register-payment" && <RegisterPaymentPage {...screenProps} />}
            {view.section === "payments-history" && <PaymentsHistoryPage {...screenProps} />}
            {view.section === "admin-requests" && <AdminRequestsPage {...screenProps} />}
            {view.section === "settings" && <SettingsPage {...screenProps} />}
          </section>
        </main>
        <MobileNav currentSection={view.section} onNavigate={setView} isSuperAdmin={isSuperAdmin} />
      </div>
    </div>
  );
}
