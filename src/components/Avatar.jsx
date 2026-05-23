import { useMemo, useState } from "react";

export function Avatar({ name = "", src = "", size = 40 }) {
  const [error, setError] = useState(false);
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "SN",
    [name],
  );

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        className="avatar"
        style={{ width: size, height: size, borderRadius: "50%" }}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className="avatar avatar-placeholder"
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
