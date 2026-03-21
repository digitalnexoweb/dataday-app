import { useEffect, useState } from "react";
import { SectionCard } from "../../components/SectionCard";

function buildInitialState(selectedMember) {
  return {
    fullName: selectedMember?.fullName ?? "",
    birthDate: selectedMember?.birthDate ?? "",
    address: selectedMember?.address ?? "",
    phone: selectedMember?.phone ?? "",
    email: selectedMember?.email ?? "",
    enrollmentDate: selectedMember?.enrollmentDate ?? new Date().toISOString().slice(0, 10),
    categoryId: selectedMember?.categoryId ?? "",
    notes: selectedMember?.notes ?? "",
    photoUrl: selectedMember?.photoUrl ?? "",
  };
}

function buildCategoryState() {
  return {
    name: "",
    monthlyFee: "",
    description: "",
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

export function MemberFormPage({
  appData,
  selectedMember,
  onNavigate,
  onSaveMember,
  onSaveCategory,
  canManageClubScopedData,
  isAllClubsView,
}) {
  const [form, setForm] = useState(buildInitialState(selectedMember));
  const [categoryForm, setCategoryForm] = useState(buildCategoryState());
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [categoryStatus, setCategoryStatus] = useState({ type: "idle", message: "" });
  const isEditing = Boolean(selectedMember);

  useEffect(() => {
    setForm(buildInitialState(selectedMember));
    setStatus({ type: "idle", message: "" });
    setCategoryStatus({ type: "idle", message: "" });
  }, [selectedMember]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus({ type: "idle", message: "" });
  }

  function updateCategoryField(key, value) {
    setCategoryForm((current) => ({ ...current, [key]: value }));
    setCategoryStatus({ type: "idle", message: "" });
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Selecciona una imagen valida para la foto del socio." });
      return;
    }

    try {
      const photoUrl = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, photoUrl }));
      setStatus({ type: "idle", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }

    event.target.value = "";
  }

  async function handleCreateCategory(event) {
    event.preventDefault();

    try {
      const category = await onSaveCategory(categoryForm);
      setForm((current) => ({ ...current, categoryId: category.id }));
      setCategoryForm(buildCategoryState());
      setCategoryStatus({
        type: "success",
        message: `Categoria "${category.name}" creada y seleccionada.`,
      });
    } catch (error) {
      console.error("No se pudo guardar la categoria.", error);
      setCategoryStatus({
        type: "error",
        message: "No se pudo guardar la categoria. Si ya existe, usa la lista desplegable.",
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const memberId = await onSaveMember({
        id: selectedMember?.id,
        ...form,
      });

      setStatus({
        type: "success",
        message: isEditing ? "Datos actualizados correctamente." : "Socio creado correctamente.",
      });
      onNavigate({ section: "members", memberId });
    } catch (error) {
      console.error("No se pudo guardar el socio.", error);
      setStatus({
        type: "error",
        message: "No se pudo guardar el socio. Revisa la conexion y vuelve a intentar.",
      });
    }
  }

  return (
    <SectionCard
      title={isEditing ? "Editar socio" : "Nuevo socio"}
      subtitle="Alta y edicion de socios o alumnos con guardado en la fuente de datos activa."
    >
      {isAllClubsView ? (
        <p className="warning-banner">Selecciona un club activo desde el header para crear o editar socios.</p>
      ) : null}
      <form className="member-form" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Ej. Mateo Pereyra"
            required
          />
        </label>

        <label>
          Categoria
          <select
            value={form.categoryId}
            onChange={(event) => updateField("categoryId", event.target.value)}
            required
            disabled={!canManageClubScopedData}
          >
            <option value="">Seleccionar</option>
            {appData.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="full-span inline-create-card">
          <div className="inline-create-header">
            <div>
              <strong>Crear nueva categoria</strong>
              <p>Si el cliente necesita una categoria nueva, puedes crearla aqui y quedara guardada.</p>
            </div>
          </div>

          <div className="inline-create-grid">
            <label>
              Nombre
              <input
                type="text"
                value={categoryForm.name}
                onChange={(event) => updateCategoryField("name", event.target.value)}
                placeholder="Ej. Sub 15 avanzado"
                disabled={!canManageClubScopedData}
              />
            </label>

            <label>
              Cuota mensual
              <input
                type="number"
                min="0"
                value={categoryForm.monthlyFee}
                onChange={(event) => updateCategoryField("monthlyFee", event.target.value)}
                placeholder="Ej. 1800"
                disabled={!canManageClubScopedData}
              />
            </label>

            <label className="full-span">
              Descripcion
              <input
                type="text"
                value={categoryForm.description}
                onChange={(event) => updateCategoryField("description", event.target.value)}
                placeholder="Breve descripcion de la categoria"
                disabled={!canManageClubScopedData}
              />
            </label>
          </div>

          <div className="form-footer">
            <span className="helper-text">La categoria nueva quedara disponible para futuros socios.</span>
            <button
              className="secondary-button"
              type="button"
              onClick={handleCreateCategory}
              disabled={!canManageClubScopedData || !categoryForm.name.trim()}
            >
              Guardar categoria
            </button>
          </div>

          {categoryStatus.type === "success" ? <p className="success-banner">{categoryStatus.message}</p> : null}
          {categoryStatus.type === "error" ? <p className="error-banner">{categoryStatus.message}</p> : null}
        </div>

        <label>
          Fecha de nacimiento
          <input
            type="date"
            value={form.birthDate}
            onChange={(event) => updateField("birthDate", event.target.value)}
          />
        </label>

        <label>
          Fecha de inscripcion
          <input
            type="date"
            value={form.enrollmentDate}
            onChange={(event) => updateField("enrollmentDate", event.target.value)}
            required
          />
        </label>

        <label>
          Telefono
          <input
            type="text"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="Ej. 099 112 233"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="nombre@mail.com"
          />
        </label>

        <label className="full-span">
          Direccion
          <input
            type="text"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Calle, numero, ciudad"
          />
        </label>

        <div className="full-span crm-photo-upload">
          <div className="crm-photo-upload-preview">
            {form.photoUrl ? <img src={form.photoUrl} alt={form.fullName || "Vista previa"} className="crm-photo-upload-image" /> : <div className="crm-photo-upload-placeholder">Sin foto</div>}
          </div>
          <div className="crm-photo-upload-controls">
            <label>
              Foto del socio
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </label>
            <p className="helper-text">Puedes adjuntar una imagen desde tu equipo. No hace falta pegar una URL.</p>
            {form.photoUrl ? (
              <button className="secondary-button" type="button" onClick={() => updateField("photoUrl", "")}>
                Quitar foto
              </button>
            ) : null}
          </div>
        </div>

        <label className="full-span">
          Observaciones
          <textarea
            rows="4"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Notas administrativas, medicas o deportivas..."
          />
        </label>

        <div className="full-span form-footer">
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              onNavigate({
                section: "members",
                memberId: selectedMember?.id ?? null,
              })
            }
          >
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={!canManageClubScopedData}>
            {isEditing ? "Guardar cambios" : "Crear socio"}
          </button>
        </div>

        {status.type === "success" ? <p className="success-banner">{status.message}</p> : null}
        {status.type === "error" ? <p className="error-banner">{status.message}</p> : null}
      </form>
    </SectionCard>
  );
}
