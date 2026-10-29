import { Fragment, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { container } from "../../infrastructure/composition/container.ts"
import storeVideo from "../../video/fb1.mp4"
import { ProductCard } from "../components/ProductCard.tsx"
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
  VolumeIcon,
  VolumeMuteIcon,
  WhatsAppIcon,
} from "../components/Icons.tsx"

export function HomePage() {
  const store = container.getStore()
  const sections = container.getHomeSections()

  const [heroMuted, setHeroMuted] = useState(true)
  const [heroPlaying, setHeroPlaying] = useState(true)
  const [showcaseMuted, setShowcaseMuted] = useState(true)
  const [showcasePlaying, setShowcasePlaying] = useState(true)
  const [storyOpen, setStoryOpen] = useState(false)
  const [storyMuted, setStoryMuted] = useState(false)

  // Opciones de visualización de video
  const showHero = true
  const showShowcase = true
  const showStory = true

  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const showcaseVideoRef = useRef<HTMLVideoElement>(null)
  const storyVideoRef = useRef<HTMLVideoElement>(null)

  function toggleHeroPlay() {
    if (!heroVideoRef.current) return
    if (heroVideoRef.current.paused) {
      heroVideoRef.current.play()
      setHeroPlaying(true)
    } else {
      heroVideoRef.current.pause()
      setHeroPlaying(false)
    }
  }

  function toggleShowcasePlay() {
    if (!showcaseVideoRef.current) return
    if (showcaseVideoRef.current.paused) {
      showcaseVideoRef.current.play()
      setShowcasePlaying(true)
    } else {
      showcaseVideoRef.current.pause()
      setShowcasePlaying(false)
    }
  }

  return (
    <div className="page home-page">
      {/* Hero Banner Dinámico con Video */}
      {showHero && (
        <section className="hero-split">
          <div className="hero-split__content">
            <span className="hero-split__badge">
              <SparklesIcon />
              Nueva Colección 2026
            </span>
            <h1>Moda infantil con ternura, calidad y estilo</h1>
            <p>
              Prendas suaves y frescas para niñas, niños y bebés en Puerto Maldonado.
              Explora nuestra tienda o haz tu pedido directo por WhatsApp con entrega rápida.
            </p>
            <div className="hero-split__actions">
              <a
                className="btn btn--primary"
                href="#colecciones"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector(".home-section")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                Explorar catálogo
              </a>
              <a
                className="btn btn--whatsapp"
                href={`https://wa.me/${store.whatsapp}?text=Hola%2C%20quiero%20hacer%20un%20pedido%20en%20NaNa`}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon />
                <span>Pedir por WhatsApp</span>
              </a>
            </div>
            <div className="hero-split__features">
              <span>🏬 Tienda física en Jr. Amazonas 890</span>
              <span>🛵 Envíos a todo Puerto Maldonado</span>
            </div>
          </div>

          <div className="hero-split__media">
            <div className="video-card">
              <video
                ref={heroVideoRef}
                src={storeVideo}
                autoPlay
                loop
                muted={heroMuted}
                playsInline
                className="video-player"
              />
              <div className="video-card__badge">
                <span className="status-dot" />
                NaNa en Directo
              </div>
              <div className="video-card__controls">
                <button
                  type="button"
                  className="video-ctrl-btn"
                  onClick={toggleHeroPlay}
                  aria-label={heroPlaying ? "Pausar video" : "Reproducir video"}
                >
                  {heroPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button
                  type="button"
                  className="video-ctrl-btn"
                  onClick={() => setHeroMuted((prev) => !prev)}
                  aria-label={heroMuted ? "Activar sonido" : "Silenciar sonido"}
                >
                  {heroMuted ? <VolumeMuteIcon /> : <VolumeIcon />}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Si no está activo el hero, mostrar el banner tradicional */}
      {!showHero && (
        <img className="banner" src={store.banner} alt="NaNa, ropa infantil" />
      )}

      {/* Secciones de categorías y Opción 2 intercalada */}
      {sections.map((section, index) => (
        <Fragment key={section.category.id}>
          <section className="home-section">
            <header>
              <h2>{section.category.name}</h2>
              <Link to={`/c/${section.category.slug}`}>Ver todo ({section.total})</Link>
            </header>
            <div className="rail">
              {section.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Link className="see-all" to={`/c/${section.category.slug}`}>
              Ver todo de {section.category.name}
            </Link>
          </section>

          {/* Opción 2: Vitrina destacada entre las primeras secciones */}
          {showShowcase && index === 1 && (
            <section className="video-showcase-section">
              <div className="video-showcase-card">
                <div className="video-showcase-card__media">
                  <video
                    ref={showcaseVideoRef}
                    src={storeVideo}
                    autoPlay
                    loop
                    muted={showcaseMuted}
                    playsInline
                    className="video-player"
                  />
                  <div className="video-card__controls">
                    <button
                      type="button"
                      className="video-ctrl-btn"
                      onClick={toggleShowcasePlay}
                      aria-label={showcasePlaying ? "Pausar" : "Reproducir"}
                    >
                      {showcasePlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button
                      type="button"
                      className="video-ctrl-btn"
                      onClick={() => setShowcaseMuted((prev) => !prev)}
                      aria-label={showcaseMuted ? "Activar sonido" : "Silenciar"}
                    >
                      {showcaseMuted ? <VolumeMuteIcon /> : <VolumeIcon />}
                    </button>
                  </div>
                </div>

                <div className="video-showcase-card__info">
                  <span className="hero-split__badge">
                    <SparklesIcon />
                    Prendas Reales en Tienda
                  </span>
                  <h2>¡Mira cómo lucen nuestras prendas!</h2>
                  <p>
                    Telas 100% suaves, frescas y resistentes diseñadas especialmente para
                    la comodidad de los más pequeños en Puerto Maldonado.
                  </p>
                  <p className="video-showcase-card__tip">
                    ¿Te gustó alguna prenda del video? Escríbenos y te decimos la disponibilidad de talla al instante.
                  </p>
                  <div className="video-showcase-card__actions">
                    <a
                      className="btn btn--whatsapp"
                      href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
                        "Hola NaNa, vi el video de la web y quiero consultar disponibilidad de prendas.",
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <WhatsAppIcon />
                      <span>Consultar esta prenda por WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}
        </Fragment>
      ))}

      {/* Opción 3: Burbuja Flotante tipo Story / Reel */}
      {showStory && (
        <>
          <div
            className="story-bubble"
            onClick={() => setStoryOpen(true)}
            role="button"
            tabIndex={0}
            aria-label="Ver video en vivo de NaNa"
          >
            <div className="story-bubble__ring">
              <video
                src={storeVideo}
                autoPlay
                loop
                muted
                playsInline
                className="story-bubble__preview"
              />
            </div>
            <div className="story-bubble__label">
              <span className="live-dot" />
              <span>Ver Reel</span>
            </div>
          </div>

          {/* Modal Story */}
          {storyOpen && (
            <div className="story-modal" onClick={() => setStoryOpen(false)}>
              <div
                className="story-modal__dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="story-modal__header">
                  <div className="story-modal__brand">
                    <img src={store.logo} alt="" className="story-modal__logo" />
                    <div>
                      <strong>{store.name}</strong>
                      <small>Novedades en tienda</small>
                    </div>
                  </div>
                  <div className="story-modal__actions">
                    <button
                      type="button"
                      className="story-modal__btn"
                      onClick={() => setStoryMuted((prev) => !prev)}
                      aria-label="Sonido"
                    >
                      {storyMuted ? <VolumeMuteIcon /> : <VolumeIcon />}
                    </button>
                    <button
                      type="button"
                      className="story-modal__btn"
                      onClick={() => setStoryOpen(false)}
                      aria-label="Cerrar video"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                <div className="story-modal__body">
                  <video
                    ref={storyVideoRef}
                    src={storeVideo}
                    autoPlay
                    loop
                    muted={storyMuted}
                    playsInline
                    className="story-modal__video"
                  />
                </div>

                <div className="story-modal__footer">
                  <a
                    className="btn btn--whatsapp"
                    href={`https://wa.me/${store.whatsapp}?text=Hola%20NaNa%2C%20vi%20su%20Reel%20y%20quiero%20hacer%20un%20pedido`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WhatsAppIcon />
                    <span>Preguntar por este look en WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

