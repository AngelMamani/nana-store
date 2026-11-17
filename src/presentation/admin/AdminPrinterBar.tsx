import { useEffect, useState } from "react"
import {
  bluetoothPrinterAvailable,
  canUseBluetoothPrinter,
  canUseUsbPrinter,
  connectAndroidPrinter,
  connectBluetoothPrinter,
  connectUsbPrinter,
  disconnectPrinter,
  getPrinterStatus,
  isAndroidClient,
  reconnectSavedPrinter,
  subscribePrinter,
} from "../../infrastructure/ordering/thermal-printer.ts"
import { showAdminError, showAdminSuccess } from "./admin-alerts.ts"

export function AdminPrinterBar() {
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const [bluetoothOk, setBluetoothOk] = useState(false)
  const android = isAndroidClient()
  const status = getPrinterStatus()
  const showBluetooth = bluetoothOk || (android && canUseBluetoothPrinter())

  useEffect(() => {
    const stop = subscribePrinter(() => setTick((value) => value + 1))
    void bluetoothPrinterAvailable().then(setBluetoothOk)
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
              ? "Bluetooth listo para imprimir"
              : status.link === "android"
                ? "Al imprimir se manda a RawBT. En la app elige la POS58 y deja que imprima, no el visor PRN."
                : "USB/COM listo para imprimir"
            : android
              ? "Empareja la POS58 (PIN 0000), instala RawBT y pulsa POS58 Android. Si abre un visor, elige la impresora."
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
        {android ? (
          <button
            type="button"
            className="btn btn--outline"
            disabled={busy}
            onClick={() => void run(async () => connectAndroidPrinter(), "Listo: al imprimir se abre RawBT.")}
          >
            POS58 Android
          </button>
        ) : null}
        {android ? (
          <a
            className="btn btn--outline"
            href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
            target="_blank"
            rel="noreferrer"
          >
            Instalar RawBT
          </a>
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
