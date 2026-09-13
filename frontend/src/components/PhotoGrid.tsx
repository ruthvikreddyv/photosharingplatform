import { resolvePhotoUrl } from "../api/client";

export interface GridPhoto {
  id: string;
  storageLocation?: string;
  url?: string;
  filename: string;
  selected?: boolean;
}

export function PhotoGrid({
  photos,
  onToggle,
  emptyLabel = "No frames yet.",
}: {
  photos: GridPhoto[];
  onToggle?: (photo: GridPhoto) => void;
  emptyLabel?: string;
}) {
  if (photos.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--border-strong)",
          borderRadius: "var(--radius)",
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-faint)",
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 18,
      }}
    >
      {photos.map((photo, i) => {
        const src = resolvePhotoUrl(photo.url || photo.storageLocation || "");
        return (
          <figure
            key={photo.id}
            onClick={() => onToggle?.(photo)}
            style={{
              margin: 0,
              cursor: onToggle ? "pointer" : "default",
              position: "relative",
            }}
          >
            <div
              style={{
                aspectRatio: "4 / 3",
                overflow: "hidden",
                background: "var(--surface)",
                border: photo.selected ? "2px solid var(--selected)" : "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              <img
                src={src}
                alt={photo.filename}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: onToggle && !photo.selected ? 0.55 : 1,
                }}
              />
            </div>
            <figcaption
              className="mono"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.72rem",
                color: photo.selected ? "var(--selected)" : "var(--text-faint)",
                marginTop: 6,
              }}
            >
              <span>No. {String(i + 1).padStart(3, "0")}</span>
              {photo.selected && <span>SELECTED</span>}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
