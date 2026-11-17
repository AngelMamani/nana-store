import { useEffect, useState } from "react"
import {
  canUseBluetoothPrinter,
  canUseUsbPrinter,
  connectBluetoothPrinter,
  connectUsbPrinter,
  disconnectPrinter,
  getPrinterStatus,
  isAndroidClient,
  isIosClient,
  reconnectSavedPrinter,
  subscribePrinter,
} from "../../infrastructure/ordering/thermal-printer.ts"
import { showAdminError, showAdminSuccess } from "./admin-alerts.ts"

export function AdminPrinterBar() {
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const android = isAndroidClient()
  const ios = isIosClient()
  const status = getPrinterStatus()
  const showBluetooth = canUseBluetoothPrinter()

  useEffect(() => {
    const stop = subscribePrinter(() => setTick((value) => value + 1))
    void reconnectSavedPrinter()
    return stop
  }, [])

  async function run(action: () => Promise<void>, ok: string) {
    setBusy(true)
    try {
      await action()
      await showAdminSuccess("Impresora", ok)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo vincular la impresora."
      if (message.toLowerCase().includes("cancel")) return
      await showAdminError("Impresora", message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-printer" aria-label="Impresora térmica">
      <div>
        <p className="admin-kicker">Boletas</p>
        <strong>{status.connected ? status.name : "POS58 no vinculada"}</strong>
        <em>
          {status.connected
            ? status.link === "bluetooth"
              ? "Bluetooth listo para imprimir. Sin RawBT, sin marca de agua."
              : "USB/COM listo para imprimir"
            : ios
              ? "En iPhone o iPad Safari no puede hablar Bluetooth con la POS58. Al imprimir se abre Compartir o el menú de impresión."
              : android
                ? "En tablet o celular: Chrome, pulsa Bluetooth y elige la POS58 en ese mismo toque."
                : canUseUsbPrinter()
                  ? "Pulsa USB/COM y elige el cable o el puerto COM de la POS58. En Windows Chrome no usa Bluetooth clásico."
                  : "Al imprimir se abre el selector. PIN de la POS58: 0000."}
        </em>
      </div>
      <div className="admin-printer__actions">
        {canUseUsbPrinter() ? (
          <button
            type="button"
            className="btn btn--outline"
            disabled={busy}
            onClick={() => void run(connectUsbPrinter, "Quedó vinculada por USB/COM.")}
          >
            USB / COM
          </button>
        ) : null}
        {showBluetooth ? (
          <button
            type="button"
            className="btn btn--outline"
            disabled={busy}
            onClick={() => void run(connectBluetoothPrinter, "Quedó vinculada por Bluetooth.")}
          >
            Bluetooth
          </button>
        ) : null}
        {status.connected ? (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void disconnectPrinter()}>
            Soltar
          </button>
        ) : null}
      </div>
    </section>
  )
}
