import { BarcodeFormat, BrowserMultiFormatReader } from "@zxing/browser"
import { DecodeHintType } from "@zxing/library"
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

function createZxingReader() {
  const hints = new Map<DecodeHintType, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.QR_CODE,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  return new BrowserMultiFormatReader(hints)
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
    const preview = videoRef.current
    if (!preview) return
    const video: HTMLVideoElement = preview
    video.setAttribute("playsinline", "true")
    const detector = createDetector()
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    let stopZxing: (() => void) | null = null

    function finish(value: string) {
      if (stopped) return
      stopped = true
      navigator.vibrate?.(40)
      onDetectRef.current(value)
    }

    async function scanWithDetector(active: BarcodeDetectorLike) {
      const tick = async () => {
        if (stopped) return
        if (video.readyState >= 2) {
          try {
            const codes = await active.detect(video)
            const value = codes[0]?.rawValue?.trim()
            if (value) {
              finish(value)
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
    }

    async function scanWithZxing(activeStream: MediaStream) {
      const reader = createZxingReader()
      const controls = await reader.decodeFromStream(activeStream, video, (result) => {
        const value = result?.getText().trim()
        if (!value) return
        controls.stop()
        finish(value)
      })
      stopZxing = () => {
        controls.stop()
      }
    }

    async function openCamera() {
      const attempts: MediaStreamConstraints[] = [
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        { audio: false, video: { facingMode: "environment" } },
        { audio: false, video: true },
      ]
      let lastError: unknown
      for (const constraints of attempts) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints)
        } catch (error) {
          lastError = error
        }
      }
      throw lastError
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Este dispositivo no permite usar la cámara.")
        return
      }
      try {
        stream = await openCamera()
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        setMessage("Apunta el código de barras al recuadro.")
        if (detector) await scanWithDetector(detector)
        else await scanWithZxing(stream)
      } catch {
        setMessage("No se pudo abrir la cámara. Permite el acceso e inténtalo de nuevo.")
      }
    }

    void start()
    return () => {
      stopped = true
      window.cancelAnimationFrame(raf)
      stopZxing?.()
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
