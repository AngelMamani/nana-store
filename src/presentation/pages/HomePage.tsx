import { Fragment, useEffect, useRef, useState, type RefObject } from "react"
import { Link } from "react-router-dom"
import { container } from "../../infrastructure/composition/container.ts"
import { useCart } from "../cart/cart-context.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { normalizeStoreProfile } from "../../domain/catalog/store-media.ts"
import { ProductCarousel } from "../components/ProductCarousel.tsx"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
  VolumeIcon,
  VolumeMuteIcon,
  WhatsAppIcon,
} from "../components/Icons.tsx"

const BENEFITS_BANNER = "/images/beneficios-banner.png"

type HeroSlide = {
  src: string
  kind: "cover" | "benefits"
  alt: string
}

export function HomePage() {
  useCatalog()
  const cart = useCart()
  const store = normalizeStoreProfile(container.getStore())
  const sections = container.getHomeSections()
  const videos = store.videos
  const heroSrc = videos.hero.url
  const showcaseSrc = videos.showcase.url
  const storySrc = videos.story.url

  const slides: HeroSlide[] = [
    ...(store.banner
      ? [{ src: store.banner, kind: "cover" as const, alt: `Portada de ${store.name}` }]
      : []),
    {
      src: BENEFITS_BANNER,
      kind: "benefits",
      alt: "Beneficios: envío gratis desde S/150, envío nacional y compra segura",
    },
  ]

  const [slideIndex, setSlideIndex] = useState(0)
  const [heroMuted, setHeroMuted] = useState(true)
  const [heroPlaying, setHeroPlaying] = useState(true)
  const [showcaseMuted, setShowcaseMuted] = useState(true)
  const [showcasePlaying, setShowcasePlaying] = useState(true)
  const [storyOpen, setStoryOpen] = useState(false)
  const [storyMuted, setStoryMuted] = useState(false)

  const showHero = videos.hero.enabled && Boolean(heroSrc)
  const showShowcase = videos.showcase.enabled && Boolean(showcaseSrc)
  const showStory = videos.story.enabled && Boolean(storySrc)

  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const showcaseVideoRef = useRef<HTMLVideoElement>(null)
  const storyVideoRef = useRef<HTMLVideoElement>(null)
  const touchStartX = useRef<number | null>(null)
  const pauseAutoplay = useRef(false)

  const currentSlide = slides[slideIndex] ?? slides[0]
  const showCoverCopy = currentSlide?.kind === "cover"

  const whatsappHref = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
    `Hola ${store.name}, quiero hacer un pedido.`,
  )}`

  function goSlide(next: number) {
    const total = slides.length
    if (total === 0) return
    setSlideIndex((next + total) % total)
  }

  function togglePlay(ref: RefObject<HTMLVideoElement | null>, setPlaying: (value: boolean) => void) {
    const node = ref.current
    if (!node) return
    if (node.paused) {
      void node.play()
      setPlaying(true)
      return
    }
    node.pause()
    setPlaying(false)
  }

  function scrollToCatalog() {
    document.getElementById("colecciones")?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (slides.length < 2) return
    const timer = window.setInterval(() => {
      if (pauseAutoplay.current) return
      setSlideIndex((current) => (current + 1) % slides.length)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  const catalog = sections.map((section) => (
    <section key={section.category.id} className="home-section" id={section.category.slug}>
      <header>
        <h2>{section.category.name}</h2>
        <Link to={`/c/${section.category.slug}`}>Ver todo ({section.total})</Link>
      </header>
      <ProductCarousel products={section.products} />
      <Link className="see-all" to={`/c/${section.category.slug}`}>
        Ver todo de {section.category.name}
      </Link>
    </section>
  ))

  const campaignBlock = showHero ? (
    <section className="campaign-band" id="campana" aria-label="Campaña en video">
      <div className="campaign-band__copy">
        <span className="hero-split__badge">
          <SparklesIcon />
          {videos.hero.title || "Nueva colección"}
        </span>
        <h2>La temporada, en movimiento</h2>
        <p>
          {videos.hero.description ||
            "Mira las prendas en uso: texturas, caídas y colores reales de la tienda en Puerto Maldonado."}
        </p>
        <a className="btn btn--whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
          <WhatsAppIcon />
          <span>Pedir este look</span>
        </a>
      </div>
      <div className="campaign-band__stage">
        <video
          key={heroSrc}
          ref={heroVideoRef}
          src={heroSrc ?? undefined}
          autoPlay
          loop
          muted={heroMuted}
          playsInline
          className="video-player"
        />
        <div className="video-card__badge">
          <span className="status-dot" />
          Campaña
        </div>
        <VideoChrome
          playing={heroPlaying}
          muted={heroMuted}
          onPlay={() => togglePlay(heroVideoRef, setHeroPlaying)}
          onMute={() => setHeroMuted((value) => !value)}
        />
      </div>
    </section>
  ) : null

  const showcaseBlock = showShowcase ? (
    <section className="lookbook-band" id="vitrina" aria-label="Vitrina en video">
      <div className="lookbook-band__stage">
        <video
          key={showcaseSrc}
          ref={showcaseVideoRef}
          src={showcaseSrc ?? undefined}
          autoPlay
          loop
          muted={showcaseMuted}
          playsInline
          className="video-player"
        />
        <VideoChrome
          playing={showcasePlaying}
          muted={showcaseMuted}
          onPlay={() => togglePlay(showcaseVideoRef, setShowcasePlaying)}
          onMute={() => setShowcaseMuted((value) => !value)}
        />
      </div>
      <div className="lookbook-band__copy">
        <span className="hero-split__badge">
          <SparklesIcon />
          {videos.showcase.title || "Prendas reales en tienda"}
        </span>
        <h2>Así se ven en la vida real</h2>
        <p>
          {videos.showcase.description ||
            "Telas suaves, frescas y resistentes pensadas para el clima y el día a día de los más pequeños."}
        </p>
        <p className="lookbook-band__tip">
          ¿Viste una prenda? Escríbenos y te confirmamos talla y stock al instante.
        </p>
        <a
          className="btn btn--whatsapp"
          href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
            `Hola ${store.name}, vi el video de la vitrina y quiero consultar disponibilidad.`,
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <WhatsAppIcon />
          <span>Consultar por WhatsApp</span>
        </a>
      </div>
    </section>
  ) : null

  return (
    <div className="page home-page">
      <section
        className={`store-hero ${showCoverCopy ? "is-cover" : "is-benefits"}`}
        id="portada"
        onMouseEnter={() => {
          pauseAutoplay.current = true
        }}
        onMouseLeave={() => {
          pauseAutoplay.current = false
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null
          pauseAutoplay.current = true
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current
          touchStartX.current = null
          pauseAutoplay.current = false
          if (start == null) return
          const delta = event.changedTouches[0].clientX - start
          if (delta > 40) goSlide(slideIndex - 1)
          if (delta < -40) goSlide(slideIndex + 1)
        }}
      >
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            className={`store-hero__media ${slide.kind === "benefits" ? "is-contain" : ""} ${
              index === slideIndex ? "is-active" : ""
            }`}
            src={slide.src}
            alt={index === slideIndex ? slide.alt : ""}
            referrerPolicy="no-referrer"
          />
        ))}
        {showCoverCopy ? <div className="store-hero__veil" /> : null}
        {showCoverCopy ? (
          <div className="store-hero__copy">
            <h1>Moda infantil</h1>
            <p className="store-hero__tagline">Looks suaves que enamoran a primera vista</p>
            <div className="store-hero__actions">
              <button type="button" className="btn btn--primary" onClick={scrollToCatalog}>
                Ver catálogo
              </button>
            </div>
          </div>
        ) : null}

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              className="store-hero__arrow is-prev"
              aria-label="Banner anterior"
              onClick={() => goSlide(slideIndex - 1)}
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              className="store-hero__arrow is-next"
              aria-label="Siguiente banner"
              onClick={() => goSlide(slideIndex + 1)}
            >
              <ChevronRightIcon />
            </button>
            <div className="store-hero__dots" role="tablist" aria-label="Banners">
              {slides.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  role="tab"
                  aria-selected={index === slideIndex}
                  className={index === slideIndex ? "is-active" : ""}
                  aria-label={`Banner ${index + 1}`}
                  onClick={() => setSlideIndex(index)}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="store-benefits" aria-label="Beneficios de compra">
        <div className="store-benefits__head">
          <p>Comprar en {store.name}</p>
          <h2>Beneficios</h2>
        </div>
        <ul className="store-benefits__list">
          <li>
            <span>Envío gratis</span>
            <strong>¡Compras desde S/150 envío gratis!</strong>
          </li>
          <li>
            <span>Envío nacional</span>
            <strong>Cobertura a todo el Perú por Shalom.</strong>
          </li>
          <li>
            <span>Compra segura</span>
            <strong>Proceso rápido y 100% confiable.</strong>
          </li>
        </ul>
        <p className="store-benefits__store">
          También visita nuestra tienda física: {store.address || "Jr. Amazonas, Puerto Maldonado"}
        </p>
      </section>

      <div id="colecciones" className="home-feed">
        {catalog.length === 0 ? (
          <>
            {campaignBlock}
            {showcaseBlock}
          </>
        ) : (
          catalog.map((section, index) => (
            <Fragment key={sections[index].category.id}>
              {section}
              {index === 0 ? campaignBlock : null}
              {index === 1 ? showcaseBlock : null}
            </Fragment>
          ))
        )}
        {catalog.length === 1 ? showcaseBlock : null}
      </div>

      <div className={`home-floaters ${cart.isOpen ? "is-hidden" : ""}`}>
        <a
          className="whatsapp-bubble"
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-label="Escribir por WhatsApp"
        >
          <span className="whatsapp-bubble__ring">
            <WhatsAppIcon />
          </span>
          <span className="whatsapp-bubble__label">WhatsApp</span>
        </a>
        {showStory ? (
          <button
            type="button"
            className="story-bubble"
            onClick={() => setStoryOpen(true)}
            aria-label="Ver video en vivo de NaNa"
          >
            <div className="story-bubble__ring">
              <video
                key={storySrc}
                src={storySrc ?? undefined}
                autoPlay
                loop
                muted
                playsInline
                className="story-bubble__preview"
              />
            </div>
            <span className="story-bubble__label">
              <span className="live-dot" />
              {videos.story.title || "Ver Reel"}
            </span>
          </button>
        ) : null}
      </div>

      {showStory && storyOpen ? (
        <div className="story-modal" onClick={() => setStoryOpen(false)}>
          <div className="story-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <div className="story-modal__header">
              <div className="story-modal__brand">
                <img src={store.logo} alt="" className="story-modal__logo" />
                <div>
                  <strong>{store.name}</strong>
                  <small>{videos.story.description || "Novedades en tienda"}</small>
                </div>
              </div>
              <div className="story-modal__actions">
                <button
                  type="button"
                  className="story-modal__btn"
                  onClick={() => setStoryMuted((value) => !value)}
                  aria-label="Sonido"
                >
                  {storyMuted ? <VolumeMuteIcon /> : <VolumeIcon />}
                </button>
                <button type="button" className="story-modal__btn" onClick={() => setStoryOpen(false)} aria-label="Cerrar">
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div className="story-modal__body">
              <video
                key={storySrc}
                ref={storyVideoRef}
                src={storySrc ?? undefined}
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
                href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
                  `Hola ${store.name}, vi su reel y quiero hacer un pedido.`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon />
                <span>Preguntar por este look</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function VideoChrome({
  playing,
  muted,
  onPlay,
  onMute,
}: {
  playing: boolean
  muted: boolean
  onPlay: () => void
  onMute: () => void
}) {
  return (
    <div className="video-card__controls">
      <button type="button" className="video-ctrl-btn" onClick={onPlay} aria-label={playing ? "Pausar" : "Reproducir"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" className="video-ctrl-btn" onClick={onMute} aria-label={muted ? "Activar sonido" : "Silenciar"}>
        {muted ? <VolumeMuteIcon /> : <VolumeIcon />}
      </button>
    </div>
  )
}
