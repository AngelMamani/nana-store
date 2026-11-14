import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import type { StoreVideoKey, StoreVideoSlot, StoreVideos } from "../../domain/catalog/entities.ts"
import { STORE_VIDEO_COPY, STORE_VIDEO_KEYS, normalizeStoreProfile } from "../../domain/catalog/store-media.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { confirmAdminAction, showAdminError } from "./admin-alerts.ts"

const MAX_VIDEO_MB = 80

function currentVideos(): StoreVideos {
  return normalizeStoreProfile(container.getStore()).videos
}

export function AdminVideosPage() {
  useCatalog()
  const videos = currentVideos()
  const [progress, setProgress] = useState<Partial<Record<StoreVideoKey, number>>>({})
  const [busyKey, setBusyKey] = useState<StoreVideoKey | null>(null)

  const enabled = STORE_VIDEO_KEYS.filter((key) => videos[key].enabled).length
  const custom = STORE_VIDEO_KEYS.filter((key) => Boolean(videos[key].url)).length

  async function persistSlot(key: StoreVideoKey, partial: Partial<StoreVideoSlot>, leftover: string | null = null) {
    const slot = { ...currentVideos()[key], ...partial }
    await container.saveStoreVideo(key, slot)
    if (leftover) await container.storage.deleteUrls([leftover]).catch(() => undefined)
  }

  async function patchAndSave(key: StoreVideoKey, partial: Partial<StoreVideoSlot>, leftover: string | null = null) {
    setBusyKey(key)
    try {
      await persistSlot(key, partial, leftover)
    } catch {
      await showAdminError("No se pudo guardar", "Revisa Firestore y Storage e inténtalo de nuevo.")
    } finally {
      setBusyKey(null)
    }
  }

  async function toggleEnabled(key: StoreVideoKey) {
    const slot = currentVideos()[key]
    const copy = STORE_VIDEO_COPY[key]
    if (slot.enabled) {
      const ok = await confirmAdminAction({
        title: `Ocultar ${copy.label.toLowerCase()}`,
        text: `Dejará de verse en ${copy.place}. Puedes volver a mostrarlo cuando quieras.`,
        confirmText: "Ocultar",
        icon: "warning",
      })
      if (!ok) return
      await patchAndSave(key, { enabled: false })
      return
    }
    await patchAndSave(key, { enabled: true })
  }

  async function upload(key: StoreVideoKey, file: File | undefined) {
    if (!file) return
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      await showAdminError("Archivo muy pesado", `Usa un video de ${MAX_VIDEO_MB} MB o menos.`)
      return
    }
    const previous = currentVideos()[key].url
    setProgress((current) => ({ ...current, [key]: 0 }))
    let url = ""
    try {
      url = await container.storage.uploadFileWithProgress(
        file,
        `store/videos/${key}-${Date.now()}-${file.name}`,
        (percent) => setProgress((current) => ({ ...current, [key]: percent })),
      )
      setProgress((current) => ({ ...current, [key]: 100 }))
    } catch {
      setProgress((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      await showAdminError("No se pudo subir", "Revisa Firebase Storage y el formato (MP4, WebM o MOV).")
      return
    }
    try {
      await persistSlot(key, { url, enabled: true }, previous)
    } catch {
      await showAdminError(
        "El archivo subió, pero no se guardó en la tienda",
        "Revisa las reglas de Firestore para catalog_store e inténtalo de nuevo.",
      )
    }
  }

  async function restoreOriginal(key: StoreVideoKey) {
    const slot = currentVideos()[key]
    if (!slot.url) return
    const ok = await confirmAdminAction({
      title: "Quitar video",
      text: `Se quitará “${STORE_VIDEO_COPY[key].label}” de la tienda. No hay video predeterminado.`,
      confirmText: "Quitar",
      danger: true,
    })
    if (!ok) return
    await patchAndSave(key, { url: null }, slot.url)
  }

  return (
    <div className="admin-screen admin-videos">
      <section className="admin-products-hero">
        <div>
          <p className="admin-kicker">Portada</p>
          <h1>Videos y reels</h1>
          <p>
            No hay botón de guardar: al terminar la barra, el video ya está en Inicio. El banner es la portada; la
            campaña va después del primer catálogo, la vitrina entre categorías y el reel en la burbuja.
          </p>
        </div>
        <Link className="btn btn--outline" to="/" target="_blank" rel="noreferrer">
          <Glyph name="eye" />
          Ver tienda
        </Link>
      </section>

      <section className="admin-videos-kpis" aria-label="Resumen de videos">
        <article className="admin-inventory-kpi is-mint">
          <span className="admin-home-stat__icon">
            <Glyph name="eye" />
          </span>
          <em>Visibles</em>
          <strong>{enabled}</strong>
          <span>de 3 espacios</span>
        </article>
        <article className="admin-inventory-kpi is-violet">
          <span className="admin-home-stat__icon">
            <Glyph name="film" />
          </span>
          <em>Propios</em>
          <strong>{custom}</strong>
          <span>subidos a Storage</span>
        </article>
        <article className="admin-inventory-kpi is-gold">
          <span className="admin-home-stat__icon">
            <Glyph name="spark" />
          </span>
          <em>Originales</em>
          <strong>{3 - custom}</strong>
          <span>video de la tienda</span>
        </article>
      </section>

      <div className="admin-videos-grid">
        {STORE_VIDEO_KEYS.map((key) => (
          <VideoStudio
            key={key}
            slotKey={key}
            slot={videos[key]}
            busy={busyKey === key}
            progress={progress[key] ?? null}
            onToggle={() => void toggleEnabled(key)}
            onUpload={(file) => void upload(key, file)}
            onRestore={() => void restoreOriginal(key)}
            onSaveText={(title, description) => void patchAndSave(key, { title, description })}
          />
        ))}
      </div>
    </div>
  )
}

function VideoStudio({
  slotKey,
  slot,
  busy,
  progress,
  onToggle,
  onUpload,
  onRestore,
  onSaveText,
}: {
  slotKey: StoreVideoKey
  slot: StoreVideoSlot
  busy: boolean
  progress: number | null
  onToggle: () => void
  onUpload: (file: File | undefined) => void
  onRestore: () => void
  onSaveText: (title: string, description: string) => void
}) {
  const copy = STORE_VIDEO_COPY[slotKey]
  const [title, setTitle] = useState(slot.title)
  const [description, setDescription] = useState(slot.description)
  const textDirty = title !== slot.title || description !== slot.description
  const uploading = progress !== null && progress < 100
  const percent = uploading ? progress : slot.url ? 100 : 0
  const barLabel = uploading
    ? `Subiendo ${percent}%`
    : slot.url
      ? "Carga completada · ya está en la tienda"
      : "Sin archivo propio"
  const source = slot.url ? "Archivo propio" : "Sin video"
  const state = slot.enabled ? (slot.url ? "En tienda" : "Sin archivo") : "Oculto"

  return (
    <article className={`admin-video-studio is-${slotKey} ${slot.enabled ? "is-on" : "is-off"}`}>
      <div className="admin-video-studio__media">
        {slot.url ? (
          <video src={slot.url} controls playsInline />
        ) : (
          <div className="admin-video-empty">
            <Glyph name="film" />
            <strong>Todavía no hay video</strong>
            <p>Sube un MP4, WebM o MOV para mostrarlo en este espacio.</p>
          </div>
        )}
        <b className={`admin-video-chip ${slot.enabled ? "is-on" : "is-off"}`}>{state}</b>
        <div className="admin-video-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={barLabel}>
          <span>
            <b style={{ width: `${percent}%` }} />
          </span>
          <em>{barLabel}</em>
        </div>
      </div>

      <div className="admin-video-studio__body admin-form">
        <p className="admin-kicker">{copy.place}</p>
        <h2>{copy.label}</h2>
        <p>{copy.hint}</p>

        <button type="button" className={`admin-switch ${slot.enabled ? "is-on" : ""}`} disabled={busy} onClick={onToggle}>
          <span />
          {slot.enabled ? "Visible en la tienda" : "Oculto en la tienda"}
        </button>

        <label>
          Título
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Texto
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>

        {textDirty && (
          <button type="button" className="btn" disabled={busy} onClick={() => onSaveText(title.trim(), description.trim())}>
            Guardar textos
          </button>
        )}

        <label className="admin-video-file">
          <Glyph name="upload" />
          <span>{uploading ? `Subiendo ${percent}%` : "Subir MP4, WebM o MOV"}</span>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            disabled={uploading || busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              onUpload(file)
            }}
          />
        </label>
        <p className="admin-form__hint">
          {source} · máximo {MAX_VIDEO_MB} MB
        </p>

        {slot.url && (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={onRestore}>
            Quitar este video
          </button>
        )}
      </div>
    </article>
  )
}

function Glyph({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    film: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 4v16" />
        <path d="M17 4v16" />
        <path d="M3 8h4" />
        <path d="M3 16h4" />
        <path d="M17 8h4" />
        <path d="M17 16h4" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3v4" />
        <path d="M12 17v4" />
        <path d="M3 12h4" />
        <path d="M17 12h4" />
        <path d="m5 5 2.5 2.5" />
        <path d="m16.5 16.5 2.5 2.5" />
        <path d="m19 5-2.5 2.5" />
        <path d="m7.5 16.5-2.5 2.5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V6" />
        <path d="m8 10 4-4 4 4" />
        <path d="M4 20h16" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
