import { useEffect, useRef, useState } from "react"

type DetectedBarcode = { rawValue: string }

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>
}

function createDetector(): BarcodeDetectorLike | null {
  const Detector = (window as unknown as {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike
  }).BarcodeDetector
  if (!Detector) return null
  return new Detector({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "codabar", "itf", "qr_code"],
  })
}

export function AdminBarcodeScan({
  onClose,
  onDetect,
}: {
  onClose: () => void
  onDetect: (code: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectRef = useRef(onDetect)
  const [message, setMessage] = useState("Abriendo cámara…")
  onDetectRef.current = onDetect

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const detector = createDetector()
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false

    async function start() {
      if (!detector) {
        setMessage("Este navegador no lee códigos de barras con la cámara. Usa Chrome o Edge, o escribe el código.")
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Este dispositivo no permite usar la cámara.")
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        setMessage("Apunta el código de barras al recuadro.")

        const tick = async () => {
          if (stopped) return
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video)
              const value = codes[0]?.rawValue?.trim()
              if (value) {
                stopped = true
                navigator.vibrate?.(40)
                onDetectRef.current(value)
                return
              }
            } catch {
              /* el frame aún no se puede leer */
            }
          }
          raf = window.requestAnimationFrame(() => {
            void tick()
          })
        }
        raf = window.requestAnimationFrame(() => {
          void tick()
        })
      } catch {
        setMessage("No se pudo abrir la cámara. Permite el acceso e inténtalo de nuevo.")
      }
    }

    void start()
    return () => {
      stopped = true
      window.cancelAnimationFrame(raf)
      const active = video.srcObject
      if (active instanceof MediaStream) {
        active.getTracks().forEach((track) => track.stop())
      }
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
  }, [])

  return (
    <div className="admin-scan">
      <button className="admin-scan__backdrop" type="button" aria-label="Cerrar" onClick={onClose} />
      <section className="admin-scan__panel" role="dialog" aria-labelledby="admin-scan-title">
        <header>
          <div>
            <p className="admin-kicker">Cámara</p>
            <h2 id="admin-scan-title">Escanear código</h2>
          </div>
          <button type="button" className="admin-sale__close admin-scan__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="admin-scan__view">
          <video ref={videoRef} muted playsInline autoPlay />
          <span className="admin-scan__frame" aria-hidden="true" />
        </div>
        <footer>
          <p>{message}</p>
          <button type="button" className="btn btn--outline" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  )
}
