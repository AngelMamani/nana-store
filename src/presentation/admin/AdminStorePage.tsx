import { useRef, useState, type ReactNode } from "react"
import { Link, useOutletContext } from "react-router-dom"
import type { StoreProfile } from "../../domain/catalog/entities.ts"
import { isInPuertoMaldonado } from "../../domain/catalog/store-location.ts"
import { normalizeStoreProfile, storeMapLink } from "../../domain/catalog/store-media.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { showAdminError } from "./admin-alerts.ts"
import type { AdminShellContext } from "./AdminLayout.tsx"
import { PuertoMaldonadoMapPicker } from "./PuertoMaldonadoMapPicker.tsx"

const MAX_IMAGE_MB = 8

function liveStore(): StoreProfile {
  return normalizeStoreProfile(container.getStore())
}

function digits(value: string) {
  return value.replace(/\D/g, "")
}

export function AdminStorePage() {
  useCatalog()
  const { theme, themeLabel, toggleTheme } = useOutletContext<AdminShellContext>()
  const [form, setForm] = useState(() => liveStore())
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [progress, setProgress] = useState<{ logo: number | null; banner: number | null }>({
    logo: null,
    banner: null,
  })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function persist(next: StoreProfile) {
    setBusy(true)
    try {
      const pinned =
        next.mapLat !== null &&
        next.mapLng !== null &&
        isInPuertoMaldonado(next.mapLat, next.mapLng)
      await container.saveStore({
        ...normalizeStoreProfile(next),
        mapLat: pinned ? next.mapLat : null,
        mapLng: pinned ? next.mapLng : null,
        videos: liveStore().videos,
      })
      setSaved(true)
    } catch {
      await showAdminError("No se pudo guardar la tienda", "Revisa Firestore e inténtalo de nuevo.")
    } finally {
      setBusy(false)
    }
  }

  function saveSoon(next: StoreProfile) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persist(next)
    }, 450)
  }

  function change<K extends keyof StoreProfile>(key: K, value: StoreProfile[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    setSaved(false)
    saveSoon(next)
  }

  async function pickOnMap(lat: number, lng: number) {
    if (!isInPuertoMaldonado(lat, lng)) {
      await showAdminError("Fuera de la ciudad", "Elige un punto dentro de Puerto Maldonado.")
      return
    }
    let address = form.address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { Accept: "application/json", "Accept-Language": "es" } },
      )
      if (response.ok) {
        const data = (await response.json()) as { display_name?: string }
        if (data.display_name?.trim()) address = data.display_name.trim()
      }
    } catch {
      /* se guarda el pin aunque no llegue la calle */
    }
    const next = { ...form, mapLat: lat, mapLng: lng, address }
    setForm(next)
    setSaved(false)
    saveSoon(next)
  }

  async function upload(key: "logo" | "banner", file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      await showAdminError("Archivo inválido", "Sube una imagen (JPG, PNG o WEBP).")
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      await showAdminError("Imagen muy pesada", `Usa un archivo de ${MAX_IMAGE_MB} MB o menos.`)
      return
    }
    const previous = form[key]
    setProgress((current) => ({ ...current, [key]: 0 }))
    try {
      const url = await container.storage.uploadFileWithProgress(
        file,
        `store/${key}-${Date.now()}-${file.name}`,
        (percent) => setProgress((current) => ({ ...current, [key]: percent })),
      )
      setProgress((current) => ({ ...current, [key]: 100 }))
      const next = { ...form, [key]: url }
      setForm(next)
      await persist(next)
      if (previous && previous !== url) {
        await container.storage.deleteUrls([previous]).catch(() => undefined)
      }
    } catch {
      setProgress((current) => ({ ...current, [key]: null }))
      await showAdminError("No se pudo subir", "Revisa Firebase Storage e inténtalo de nuevo.")
    }
  }

  const mapsUrl = storeMapLink(form)
  const whatsappUrl = digits(form.whatsapp) ? `https://wa.me/${digits(form.whatsapp)}` : null
  const checks = {
    brand: Boolean(form.name.trim() && form.logo),
    media: Boolean(form.logo && form.banner),
    contact: Boolean(form.phone.trim() && form.whatsapp.trim() && form.email.trim()),
  }

  return (
    <div className="admin-screen admin-store">
      <section className="admin-store-hero">
        <div className="admin-store-hero__glow" aria-hidden="true" />
        <div>
          <p className="admin-kicker">Configuración pública</p>
          <h1>Ficha de la tienda</h1>
          <p>Lo que aparece en el menú, el pie y el contacto de WhatsApp. Se guarda al instante.</p>
          <div className="admin-store-hero__actions">
            <Link className="btn" to="/" target="_blank" rel="noreferrer">
              <Glyph name="eye" />
              Ver tienda
            </Link>
            <button
              type="button"
              className="btn btn--outline"
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              <Glyph name={theme === "dark" ? "sun" : "moon"} />
              {themeLabel}
            </button>
            <b className={`admin-store-status ${busy ? "is-busy" : saved ? "is-ok" : ""}`}>
              {busy ? "Guardando…" : saved ? "Cambios publicados" : "Listo para editar"}
            </b>
          </div>
        </div>
        <div className="admin-store-hero__badge">
          <span>PEN</span>
          <strong>Soles peruanos</strong>
        </div>
      </section>

      <section className="admin-store-kpis" aria-label="Completado">
        <article className={`admin-inventory-kpi is-pink ${checks.brand ? "is-active" : ""}`}>
          <span className="admin-home-stat__icon">
            <Glyph name="store" />
          </span>
          <em>Marca</em>
          <strong>{checks.brand ? "Lista" : "Falta"}</strong>
          <span>Nombre y logo</span>
        </article>
        <article className={`admin-inventory-kpi is-violet ${checks.media ? "is-active" : ""}`}>
          <span className="admin-home-stat__icon">
            <Glyph name="image" />
          </span>
          <em>Fotos</em>
          <strong>{checks.media ? "Lista" : "Falta"}</strong>
          <span>Logo y banner</span>
        </article>
        <article className={`admin-inventory-kpi is-mint ${checks.contact ? "is-active" : ""}`}>
          <span className="admin-home-stat__icon">
            <Glyph name="phone" />
          </span>
          <em>Contacto</em>
          <strong>{checks.contact ? "Listo" : "Falta"}</strong>
          <span>Teléfono, WhatsApp y correo</span>
        </article>
      </section>

      <section className="admin-store-preview" aria-label="Vista previa de vitrina">
        <div className="admin-store-preview__chrome">
          <span />
          <span />
          <span />
          <em>nana-store · inicio</em>
        </div>
        <div className="admin-store-preview__banner">
          {form.banner ? <img src={form.banner} alt="" /> : <p>Sube un banner para la portada</p>}
        </div>
        <div className="admin-store-preview__body">
          {form.logo ? (
            <img src={form.logo} alt="" />
          ) : (
            <span className="admin-store-preview__ph">{form.name.trim().slice(0, 1).toUpperCase() || "N"}</span>
          )}
          <div>
            <p className="admin-kicker">Vista previa</p>
            <h2>{form.name.trim() || "Sin nombre"}</h2>
            <p>{form.address.trim() || "Aún no hay dirección pública"}</p>
            <ul className="admin-store-chips">
              <li>
                <Glyph name="phone" />
                {form.phone.trim() || "Teléfono"}
              </li>
              <li>
                <Glyph name="wa" />
                {form.whatsapp.trim() || "WhatsApp"}
              </li>
              <li>
                <Glyph name="mail" />
                {form.email.trim() || "Correo"}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="admin-store-grid">
        <section className="admin-store-panel admin-form">
          <header>
            <div>
              <p className="admin-kicker">Identidad</p>
              <h2>Nombre y fotos</h2>
            </div>
          </header>
          <label>
            Nombre de la tienda
            <input value={form.name} onChange={(event) => change("name", event.target.value)} maxLength={80} />
          </label>
          <div className="admin-store-media-row">
            <MediaField
              label="Logo"
              hint="Menú y pie de página"
              src={form.logo}
              kind="logo"
              progress={progress.logo}
              busy={busy}
              onUpload={(file) => void upload("logo", file)}
            />
            <MediaField
              label="Banner"
              hint="Portada de presentación"
              src={form.banner}
              kind="banner"
              progress={progress.banner}
              busy={busy}
              onUpload={(file) => void upload("banner", file)}
            />
          </div>
        </section>

        <section className="admin-store-panel admin-form">
          <header>
            <div>
              <p className="admin-kicker">Contacto</p>
              <h2>Cómo te escriben</h2>
            </div>
          </header>
          <label className="admin-store-field">
            <Glyph name="phone" />
            <span>
              Teléfono
              <input value={form.phone} onChange={(event) => change("phone", event.target.value)} placeholder="+51 940 206 136" />
            </span>
          </label>
          <label className="admin-store-field">
            <Glyph name="wa" />
            <span>
              WhatsApp
              <input
                value={form.whatsapp}
                onChange={(event) => change("whatsapp", event.target.value)}
                placeholder="51940206136"
              />
            </span>
          </label>
          <p className="admin-form__hint">Código de país + número, sin espacios. Ejemplo: 51940206136</p>
          <label className="admin-store-field">
            <Glyph name="mail" />
            <span>
              Correo
              <input type="email" value={form.email} onChange={(event) => change("email", event.target.value)} />
            </span>
          </label>
          <div className="admin-store-quick">
            {form.phone.trim() && <a href={`tel:${digits(form.phone)}`}>Llamar</a>}
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                Abrir WhatsApp
              </a>
            )}
            {form.email.trim() && <a href={`mailto:${form.email}`}>Enviar correo</a>}
          </div>
        </section>
      </div>

      <section className="admin-store-panel admin-store-location admin-form">
        <header>
          <div>
            <p className="admin-kicker">Ubicación</p>
            <h2>Dirección en el mapa</h2>
          </div>
          {mapsUrl && (
            <a className="admin-store-maps" href={mapsUrl} target="_blank" rel="noreferrer">
              <Glyph name="pin" />
              Abrir en Maps
            </a>
          )}
        </header>
        <label className="admin-store-field">
          <Glyph name="pin" />
          <span>
            Dirección pública
            <input value={form.address} onChange={(event) => change("address", event.target.value)} />
          </span>
        </label>
        <p className="admin-form__hint">Pulsa un punto dentro de Puerto Maldonado. El mapa no sale de la ciudad.</p>
        <PuertoMaldonadoMapPicker lat={form.mapLat} lng={form.mapLng} onPick={(lat, lng) => void pickOnMap(lat, lng)} />
      </section>
    </div>
  )
}

function MediaField({
  label,
  hint,
  src,
  kind,
  progress,
  busy,
  onUpload,
}: {
  label: string
  hint: string
  src: string
  kind: "logo" | "banner"
  progress: number | null
  busy: boolean
  onUpload: (file: File | undefined) => void
}) {
  const uploading = progress !== null && progress < 100
  const percent = uploading ? progress : src ? 100 : 0
  const barLabel = uploading ? `${percent}%` : src ? "Listo" : "Vacío"

  return (
    <div className={`admin-store-media is-${kind}`}>
      <div className="admin-store-media__frame">
        {src ? <img src={src} alt="" /> : <span>{label}</span>}
        <div className="admin-video-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <span>
            <b style={{ width: `${percent}%` }} />
          </span>
          <em>{barLabel}</em>
        </div>
      </div>
      <div>
        <strong>{label}</strong>
        <p className="admin-form__hint">{hint}</p>
        <label className="admin-video-file">
          <Glyph name="upload" />
          <span>{uploading ? `Subiendo ${percent}%` : "Cambiar archivo"}</span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading || busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              onUpload(file)
            }}
          />
        </label>
      </div>
    </div>
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
    upload: (
      <>
        <path d="M12 16V6" />
        <path d="m8 10 4-4 4 4" />
        <path d="M4 20h16" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-4.4 7-10a7 7 0 1 0-14 0c0 5.6 7 10 7 10Z" />
        <circle cx="12" cy="11" r="2.2" />
      </>
    ),
    moon: <path d="M21 14.5A8.4 8.4 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.5a16 16 0 0 0 6.4 6.4l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    wa: (
      <>
        <path d="M20 11.5A8.5 8.5 0 0 1 7.6 18.8L4 20l1.3-3.5A8.5 8.5 0 1 1 20 11.5Z" />
        <path d="M9.5 9.5c.4 1.8 1.8 3.3 3.6 3.7" />
      </>
    ),
    store: (
      <>
        <path d="M3 9 5 4h14l2 5" />
        <path d="M3 9v11h18V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m21 15-5-5-11 9" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
