import { useEffect, useState } from "react"
import {
  canUseBluetoothPrinter,
  canUseUsbPrinter,
  connectBluetoothPrinter,
  connectUsbPrinter,
  disconnectPrinter,
  getPrinterStatus,
  reconnectSavedPrinter,
  subscribePrinter,
} from "../../infrastructure/ordering/thermal-printer.ts"
import { showAdminError, showAdminSuccess } from "./admin-alerts.ts"

export function AdminPrinterBar() {
  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const status = getPrinterStatus()

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
              ? "Bluetooth listo para imprimir"
              : "USB/COM listo para imprimir"
            : "Al imprimir se abre el selector. PIN de la POS58: 0000."}
        </em>
      </div>
      <div className="admin-printer__actions">
        {canUseBluetoothPrinter() ? (
          <button
            type="button"
            className="btn btn--outline"
            disabled={busy}
            onClick={() => void run(connectBluetoothPrinter, "Quedó vinculada por Bluetooth.")}
          >
            Bluetooth
          </button>
        ) : null}
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
        {status.connected ? (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void disconnectPrinter()}>
            Soltar
          </button>
        ) : null}
      </div>
    </section>
  )
}
