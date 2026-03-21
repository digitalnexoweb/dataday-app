import { categories, medicalRecords, members, payments } from "../data/mockData";
import { getCurrentFeeStatus } from "./format";
import { supabase, supabaseEnabled } from "./supabase";

const DEFAULT_PHOTO_URL =
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=300&q=80";

function isMissingLogoColumnError(error) {
  const message = error?.message || "";
  return (
    message.includes("logo_url") &&
    (message.includes("does not exist") || message.includes("Could not find"))
  );
}

function hydrateMembers(rawMembers, allPayments) {
  return rawMembers.map((member) => ({
    ...member,
    accountStatus: getCurrentFeeStatus(member, allPayments, { dueDay: 10 }),
  }));
}

function sortMembersByName(items) {
  return items.sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
}

function sortCategoriesByName(items) {
  return items.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function normalizeMemberRecord(member, allCategories) {
  const categoryId = member.categoryId ?? member.category_id ?? null;
  const category = allCategories.find((item) => String(item.id) === String(categoryId));

  return {
    id: member.id,
    clubId: member.clubId ?? member.club_id ?? null,
    fullName: member.fullName ?? member.full_name ?? "",
    birthDate: member.birthDate ?? member.birth_date ?? "",
    address: member.address ?? "",
    phone: member.phone ?? "",
    email: member.email ?? "",
    enrollmentDate: member.enrollmentDate ?? member.enrollment_date ?? "",
    categoryId,
    categoryName: member.categoryName ?? member.categorias?.name ?? category?.name ?? "Sin categoria",
    notes: member.notes ?? "",
    photoUrl: member.photoUrl ?? member.photo_url ?? DEFAULT_PHOTO_URL,
  };
}

function normalizeMedicalRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    memberId: record.memberId ?? record.member_id,
    clubId: record.clubId ?? record.club_id ?? null,
    restrictions: record.restrictions ?? record.restricciones_medicas ?? "",
    conditions: record.conditions ?? record.enfermedades ?? "",
    allergies: record.allergies ?? record.alergias ?? "",
    currentMedication: record.currentMedication ?? record.medicacion_actual ?? "",
    medicalHistory: record.medicalHistory ?? record.antecedentes_medicos ?? "",
    injuries: record.injuries ?? record.lesiones ?? "",
    emergencyContact: record.emergencyContact ?? record.contacto_emergencia ?? "",
    emergencyPhone: record.emergencyPhone ?? record.telefono_emergencia ?? "",
    medicalNotes: record.medicalNotes ?? record.observaciones_medicas ?? "",
    hasPhysicalClearance: Boolean(record.hasPhysicalClearance ?? record.apto_fisico ?? false),
    physicalClearanceDueDate:
      record.physicalClearanceDueDate ?? record.vencimiento_apto_fisico ?? record.vencimiento_certificado_medico ?? "",
    createdAt: record.createdAt ?? record.created_at ?? null,
    updatedAt: record.updatedAt ?? record.updated_at ?? null,
  };
}

async function getSupabaseData(clubId, isSuperAdmin = false) {
  const membersQuery = supabase
    .from("socios")
    .select(
      "id, full_name, birth_date, address, phone, email, enrollment_date, notes, photo_url, category_id, club_id, categorias(name)",
    )
    .order("full_name");
  const categoriesQuery = supabase.from("categorias").select("*").order("name");
  const paymentsQuery = supabase
    .from("pagos")
    .select("id, member_id, month, year, amount, payment_method, payment_date, notes, club_id, socios(full_name)")
    .order("payment_date", { ascending: false });
  const medicalRecordsQuery = supabase
    .from("medical_records")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!isSuperAdmin && clubId) {
    membersQuery.eq("club_id", clubId);
    categoriesQuery.eq("club_id", clubId);
    paymentsQuery.eq("club_id", clubId);
    medicalRecordsQuery.eq("club_id", clubId);
  }

  const [{ data: membersData }, { data: categoriesData }, { data: paymentsData }, { data: medicalRecordsData }] =
    await Promise.all([membersQuery, categoriesQuery, paymentsQuery, medicalRecordsQuery]);

  const formattedPayments = (paymentsData ?? []).map((payment) => ({
    id: payment.id,
    memberId: payment.member_id,
    memberName: payment.socios?.full_name ?? "Sin socio",
    month: payment.month,
    year: payment.year,
    amount: payment.amount,
    paymentMethod: payment.payment_method,
    paymentDate: payment.payment_date,
    notes: payment.notes ?? "",
  }));

  const formattedMembers = hydrateMembers(
    (membersData ?? []).map((member) => normalizeMemberRecord(member, categoriesData ?? [])),
    formattedPayments,
  );

  return {
    members: formattedMembers,
    categories: categoriesData ?? [],
    payments: formattedPayments,
    medicalRecords: (medicalRecordsData ?? []).map((record) => normalizeMedicalRecord(record)),
  };
}

async function getLocalData() {
  return {
    members: hydrateMembers(members, payments),
    categories,
    payments,
    medicalRecords,
  };
}

export const dataApi = {
  async getClubs() {
    if (!supabaseEnabled) {
      return [];
    }

    let { data, error } = await supabase.from("clubs").select("id, name, logo_url").order("name");

    if (error && isMissingLogoColumnError(error)) {
      ({ data, error } = await supabase.from("clubs").select("id, name").order("name"));
      if (!error) {
        data = (data ?? []).map((club) => ({ ...club, logo_url: "" }));
      }
    }

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async saveClubBranding(payload, clubId) {
    if (!supabaseEnabled || !clubId) {
      return payload;
    }

    let { data, error } = await supabase
      .from("clubs")
      .update({
        name: payload.clubName?.trim() || "Club activo",
        logo_url: payload.clubLogo?.trim() || null,
      })
      .eq("id", clubId)
      .select("id, name, logo_url")
      .single();

    if (error && isMissingLogoColumnError(error)) {
      ({ data, error } = await supabase
        .from("clubs")
        .update({
          name: payload.clubName?.trim() || "Club activo",
        })
        .eq("id", clubId)
        .select("id, name")
        .single());

      if (!error) {
        data = {
          ...data,
          logo_url: "",
        };
      }
    }

    if (error) {
      throw error;
    }

    return data;
  },

  async getAppData(clubId = null, options = {}) {
    const { isSuperAdmin = false } = options;

    if (supabaseEnabled && (clubId || isSuperAdmin)) {
      try {
        return await getSupabaseData(clubId, isSuperAdmin);
      } catch (error) {
        console.error("Fallo al cargar Supabase, se usan mocks locales.", error);
      }
    }

    return getLocalData();
  },

  async saveMedicalRecord(payload, currentMedicalRecords, clubId = null) {
    const dbPayload = {
      member_id: payload.memberId,
      club_id: clubId,
      restricciones_medicas: payload.restrictions || null,
      enfermedades: payload.conditions || null,
      alergias: payload.allergies || null,
      medicacion_actual: payload.currentMedication || null,
      antecedentes_medicos: payload.medicalHistory || null,
      lesiones: payload.injuries || null,
      contacto_emergencia: payload.emergencyContact || null,
      telefono_emergencia: payload.emergencyPhone || null,
      observaciones_medicas: payload.medicalNotes || null,
      apto_fisico: Boolean(payload.hasPhysicalClearance),
      vencimiento_apto_fisico: payload.physicalClearanceDueDate || null,
    };

    if (supabaseEnabled && clubId) {
      const { data, error } = await supabase
        .from("medical_records")
        .upsert(dbPayload, { onConflict: "member_id" })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const normalized = normalizeMedicalRecord(data);
      const nextMedicalRecords = [
        normalized,
        ...currentMedicalRecords.filter((record) => String(record.memberId) !== String(payload.memberId)),
      ];

      return {
        medicalRecord: normalized,
        medicalRecords: nextMedicalRecords,
      };
    }

    const existing = currentMedicalRecords.find((record) => String(record.memberId) === String(payload.memberId));
    const normalized = normalizeMedicalRecord({
      ...existing,
      ...payload,
      id: existing?.id ?? Math.max(0, ...currentMedicalRecords.map((record) => Number(record.id) || 0)) + 1,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });

    return {
      medicalRecord: normalized,
      medicalRecords: [
        normalized,
        ...currentMedicalRecords.filter((record) => String(record.memberId) !== String(payload.memberId)),
      ],
    };
  },

  async registerPayment(payload, currentPayments, clubId = null) {
    const nextPayment = {
      id: currentPayments.length + 1,
      ...payload,
    };

    if (supabaseEnabled && clubId) {
      await supabase.from("pagos").insert({
        member_id: payload.memberId,
        club_id: clubId,
        month: payload.month,
        year: payload.year,
        amount: payload.amount,
        payment_method: payload.paymentMethod,
        payment_date: payload.paymentDate,
        notes: payload.notes,
      });
    }

    return [nextPayment, ...currentPayments];
  },

  async registerPaymentAndRefresh(payload, currentData, clubId = null) {
    const payments = await this.registerPayment(payload, currentData.payments, clubId);
    const members = sortMembersByName(hydrateMembers([...currentData.members], payments));

    return {
      payments,
      members,
    };
  },

  async saveCategory(payload, currentCategories, clubId = null) {
    const normalizedName = payload.name.trim();
    const alreadyExists = currentCategories.some(
      (category) => category.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );

    if (alreadyExists) {
      throw new Error("La categoria ya existe.");
    }

    if (supabaseEnabled && clubId) {
      const { data, error } = await supabase
        .from("categorias")
        .insert({
          name: normalizedName,
          description: payload.description || null,
          monthly_fee: Number(payload.monthlyFee || 0),
          club_id: clubId,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return {
        category: data,
        categories: sortCategoriesByName([...currentCategories, data]),
      };
    }

    const nextCategory = {
      id: Math.max(0, ...currentCategories.map((category) => Number(category.id))) + 1,
      name: normalizedName,
      description: payload.description || "",
      monthlyFee: Number(payload.monthlyFee || 0),
    };

    return {
      category: nextCategory,
      categories: sortCategoriesByName([...currentCategories, nextCategory]),
    };
  },

  async saveMember(payload, currentData, clubId = null) {
    const dbPayload = {
      full_name: payload.fullName,
      birth_date: payload.birthDate || null,
      address: payload.address || null,
      phone: payload.phone || null,
      email: payload.email || null,
      enrollment_date: payload.enrollmentDate,
      category_id: payload.categoryId ? Number(payload.categoryId) : null,
      notes: payload.notes || null,
      photo_url: payload.photoUrl || null,
      active: true,
      club_id: clubId,
    };

    if (supabaseEnabled && clubId) {
      const query = payload.id
        ? supabase.from("socios").update(dbPayload).eq("id", payload.id).eq("club_id", clubId)
        : supabase.from("socios").insert(dbPayload);

      const { data, error } = await query
        .select(
          "id, full_name, birth_date, address, phone, email, enrollment_date, notes, photo_url, category_id, club_id, categorias(name)",
        )
        .single();

      if (error) {
        throw error;
      }

      const normalized = normalizeMemberRecord(data, currentData.categories);
      const nextMembers = sortMembersByName(
        hydrateMembers(
          payload.id
            ? currentData.members.map((member) => (member.id === payload.id ? normalized : member))
            : [...currentData.members, normalized],
          currentData.payments,
        ),
      );

      return {
        members: nextMembers,
        memberId: normalized.id,
      };
    }

    const nextMember = normalizeMemberRecord(
      {
        ...payload,
        id: payload.id ?? Math.max(0, ...currentData.members.map((member) => Number(member.id))) + 1,
      },
      currentData.categories,
    );

    const nextMembers = sortMembersByName(
      hydrateMembers(
        payload.id
          ? currentData.members.map((member) => (member.id === payload.id ? nextMember : member))
          : [...currentData.members, nextMember],
        currentData.payments,
      ),
    );

    return {
      members: nextMembers,
      memberId: nextMember.id,
    };
  },
};
