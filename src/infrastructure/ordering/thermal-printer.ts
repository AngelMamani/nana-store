import { receiptBodyLines, type ReceiptTicket } from "../../domain/ordering/receipt.ts"

export type PrinterLink = "none" | "bluetooth" | "usb" | "android"

export type PrinterStatus = {
  link: PrinterLink
  name: string
  connected: boolean
}

type BleCharacteristic = {
  properties: { write?: boolean; writeWithoutResponse?: boolean }
  writeValue: (data: Uint8Array) => Promise<void>
  writeValueWithoutResponse?: (data: Uint8Array) => Promise<void>
}

type BleService = {
  getCharacteristics: () => Promise<BleCharacteristic[]>
}

type BluetoothDeviceLike = {
  name?: string
  gatt?: {
    connected: boolean
    connect: () => Promise<{
      getPrimaryService: (uuid: string) => Promise<BleService>
      getPrimaryServices?: () => Promise<BleService[]>
    }>
    disconnect: () => void
  }
  addEventListener: (name: string, listener: () => void) => void
  removeEventListener: (name: string, listener: () => void) => void
}

type SerialPortLike = {
  readable: unknown
  writable: { getWriter: () => { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void } } | null
  open: (options: { baudRate: number }) => Promise<void>
  close: () => Promise<void>
  addEventListener: (name: string, listener: () => void) => void
  removeEventListener: (name: string, listener: () => void) => void
}

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: {
      acceptAllDevices?: boolean
      filters?: { namePrefix?: string; name?: string }[]
      optionalServices?: string[]
    }) => Promise<BluetoothDeviceLike>
    getAvailability?: () => Promise<boolean>
    getDevices?: () => Promise<BluetoothDeviceLike[]>
  }
}

type SerialNavigator = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortLike>
    getPorts?: () => Promise<SerialPortLike[]>
  }
}

const BLE_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffb0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ae30-0000-1000-8000-00805f9b34fb",
]

const BLE_NAME_PREFIXES = [
  { namePrefix: "POS" },
  { namePrefix: "Printer" },
  { namePrefix: "MTP" },
  { namePrefix: "RPP" },
  { namePrefix: "BT" },
  { namePrefix: "GP" },
  { namePrefix: "Thermal" },
  { namePrefix: "BlueTooth" },
]

const RAWBT_STORE = "https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"

const PC850: Record<string, number> = {
  Á: 0xb5,
  É: 0x90,
  Í: 0xd6,
  Ó: 0xe0,
  Ú: 0xe9,
  Ü: 0x9a,
  Ñ: 0xa5,
  á: 0xa0,
  é: 0x82,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  ü: 0x81,
  ñ: 0xa4,
  "¿": 0xa8,
  "¡": 0xad,
  "°": 0xf8,
  º: 0xa7,
  ª: 0xa6,
  "·": 0xfa,
  "×": 0x9e,
  "€": 0xd5,
}

let status: PrinterStatus = { link: "none", name: "", connected: false }
const listeners = new Set<() => void>()
let bluetoothDevice: BluetoothDeviceLike | null = null
let writeBle:
  | ((chunk: Uint8Array) => Promise<void>)
  | null = null
let serialPort: SerialPortLike | null = null
let serialWriter: { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void } | null = null

function notify() {
  for (const listener of listeners) listener()
}

function setStatus(next: PrinterStatus) {
  status = next
  notify()
}

async function forget() {
  writeBle = null
  if (serialWriter) {
    try {
      serialWriter.releaseLock()
    } catch {
      /* already released */
    }
    serialWriter = null
  }
  if (serialPort) {
    try {
      await serialPort.close()
    } catch {
      /* already closed */
    }
    serialPort = null
  }
  if (bluetoothDevice?.gatt?.connected) {
    try {
      bluetoothDevice.gatt.disconnect()
    } catch {
      /* already disconnected */
    }
  }
  bluetoothDevice = null
  setStatus({ link: "none", name: "", connected: false })
}

function onBluetoothGone() {
  writeBle = null
  bluetoothDevice = null
  if (status.link === "bluetooth") setStatus({ link: "none", name: "", connected: false })
}

function onSerialGone() {
  serialWriter = null
  serialPort = null
  if (status.link === "usb") setStatus({ link: "none", name: "", connected: false })
}

function encodeChar(char: string) {
  if (PC850[char] != null) return PC850[char]
  const code = char.charCodeAt(0)
  if (code < 128) return code
  const plain = char.normalize("NFD").replace(/\p{M}/gu, "")
  if (plain && plain.charCodeAt(0) < 128) return plain.charCodeAt(0)
  return 0x3f
}

function encodeLine(text: string) {
  const normalized = text.normalize("NFC")
  const bytes = new Uint8Array(normalized.length + 1)
  for (let index = 0; index < normalized.length; index += 1) {
    bytes[index] = encodeChar(normalized[index] ?? "?")
  }
  bytes[normalized.length] = 0x0a
  return bytes
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("logo"))
    image.src = url
  })
}

async function encodeLogo(url: string) {
  try {
    const image = await loadImage(url)
    const maxWidth = 384
    const maxHeight = 240
    const scale = Math.min(maxWidth / Math.max(image.width, 1), maxHeight / Math.max(image.height, 1))
    const drawWidth = Math.max(8, Math.floor(image.width * scale))
    const drawHeight = Math.max(8, Math.floor(image.height * scale))
    const bytesPerRow = Math.ceil(drawWidth / 8)
    const canvas = document.createElement("canvas")
    canvas.width = bytesPerRow * 8
    canvas.height = drawHeight
    const context = canvas.getContext("2d")
    if (!context) return null
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    const offsetX = Math.floor((canvas.width - drawWidth) / 2)
    context.drawImage(image, offsetX, 0, drawWidth, drawHeight)
    const pixels = context.getImageData(0, 0, canvas.width, drawHeight).data
    const raster = new Uint8Array(bytesPerRow * drawHeight)
    for (let y = 0; y < drawHeight; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4
        const alpha = pixels[index + 3] ?? 0
        const luma = (pixels[index] ?? 255) * 0.3 + (pixels[index + 1] ?? 255) * 0.59 + (pixels[index + 2] ?? 255) * 0.11
        if (alpha > 40 && luma < 168) {
          raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7)
        }
      }
    }
    return concat([
      new Uint8Array([
        0x1d,
        0x76,
        0x30,
        0x00,
        bytesPerRow & 0xff,
        (bytesPerRow >> 8) & 0xff,
        drawHeight & 0xff,
        (drawHeight >> 8) & 0xff,
      ]),
      raster,
      new Uint8Array([0x0a]),
    ])
  } catch {
    return null
  }
}

function concat(chunks: Uint8Array[]) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}

export async function encodeReceipt(ticket: ReceiptTicket) {
  const chunks: Uint8Array[] = [
    new Uint8Array([0x1b, 0x40]),
    new Uint8Array([0x1b, 0x74, 0x02]),
    new Uint8Array([0x1b, 0x61, 0x01]),
  ]
  if (ticket.storeLogo) {
    const logo = await encodeLogo(ticket.storeLogo)
    if (logo) chunks.push(logo)
  }
  chunks.push(encodeLine("BOLETA SIMPLE"))
  chunks.push(new Uint8Array([0x1b, 0x61, 0x00]))
  for (const line of receiptBodyLines(ticket)) {
    if (line.startsWith("TOTAL")) {
      chunks.push(new Uint8Array([0x1b, 0x45, 0x01]))
      chunks.push(encodeLine(line))
      chunks.push(new Uint8Array([0x1b, 0x45, 0x00]))
      continue
    }
    chunks.push(encodeLine(line))
  }
  chunks.push(new Uint8Array([0x0a, 0x0a]))
  chunks.push(new Uint8Array([0x1d, 0x56, 0x41, 0x10]))
  return concat(chunks)
}

async function writeChunks(bytes: Uint8Array, send: (chunk: Uint8Array) => Promise<void>, size: number) {
  for (let offset = 0; offset < bytes.length; offset += size) {
    await send(bytes.slice(offset, offset + size))
  }
}

export function getPrinterStatus() {
  return status
}

export function subscribePrinter(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isAndroidClient() {
  return /Android/i.test(navigator.userAgent)
}

export function canUseBluetoothPrinter() {
  return Boolean((navigator as BluetoothNavigator).bluetooth)
}

export function canUseUsbPrinter() {
  return Boolean((navigator as SerialNavigator).serial)
}

export async function bluetoothPrinterAvailable() {
  const api = (navigator as BluetoothNavigator).bluetooth
  if (!api) return false
  try {
    if (api.getAvailability) return await api.getAvailability()
    return true
  } catch {
    return false
  }
}

function isBluetoothBlockedError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes("globally disabled") ||
    message.includes("permission has been blocked") ||
    (message.includes("bluetooth") && message.includes("block")) ||
    message.includes("not allowed by permissions")
  )
}

async function openSerialPort(port: SerialPortLike, name: string) {
  try {
    await port.open({ baudRate: 9600 })
  } catch {
    await port.open({ baudRate: 115200 })
  }
  if (!port.writable) throw new Error("El puerto no admite escritura.")
  serialPort = port
  serialWriter = port.writable.getWriter()
  port.addEventListener("disconnect", onSerialGone)
  setStatus({ link: "usb", name, connected: true })
}

function writerFromCharacteristic(characteristic: BleCharacteristic) {
  return async (chunk: Uint8Array) => {
    if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk)
      return
    }
    await characteristic.writeValue(chunk)
  }
}

async function writerFromServices(services: BleService[]) {
  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics()
      const characteristic = characteristics.find(
        (item) => item.properties.writeWithoutResponse || item.properties.write,
      )
      if (characteristic) return writerFromCharacteristic(characteristic)
    } catch {
      /* servicio sin escritura */
    }
  }
  return null
}

async function attachBluetoothDevice(device: BluetoothDeviceLike) {
  if (!device.gatt) throw new Error("La impresora no expone Bluetooth de baja energía.")
  const server = await device.gatt.connect()
  let writer: ((chunk: Uint8Array) => Promise<void>) | null = null
  if (server.getPrimaryServices) {
    try {
      writer = await writerFromServices(await server.getPrimaryServices())
    } catch {
      /* Chrome exige optionalServices para listar */
    }
  }
  if (!writer) {
    const found: BleService[] = []
    for (const uuid of BLE_SERVICES) {
      try {
        found.push(await server.getPrimaryService(uuid))
      } catch {
        /* este UUID no existe en esta impresora */
      }
    }
    writer = await writerFromServices(found)
  }
  if (!writer) {
    throw new Error(
      isAndroidClient()
        ? "Chrome no encontró un canal BLE. Empareja la POS58 e instala RawBT para imprimir por Bluetooth clásico."
        : "No se encontró un canal de impresión. Prueba USB/COM.",
    )
  }
  bluetoothDevice = device
  writeBle = writer
  device.addEventListener("gattserverdisconnected", onBluetoothGone)
  setStatus({ link: "bluetooth", name: device.name?.trim() || "POS58", connected: true })
}

function useRawBtLink() {
  setStatus({ link: "android", name: "POS58 Android", connected: true })
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

async function printWithRawBt(bytes: Uint8Array) {
  const payload = bytesToBase64(bytes)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const file = new File([copy.buffer], "boleta.prn", { type: "application/octet-stream" })
  const share = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: { files?: File[]; title?: string }) => Promise<void>
  }
  if (payload.length > 6500 && share.share && (!share.canShare || share.canShare({ files: [file] }))) {
    try {
      await share.share({ files: [file], title: "Boleta POS58" })
      return
    } catch {
      /* el usuario canceló compartir; se intenta RawBT */
    }
  }
  const href = `intent:base64,${payload}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.browser_fallback_url=${encodeURIComponent(RAWBT_STORE)};end`
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.rel = "noreferrer"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function isUserCancel(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return message.includes("cancel") || message.includes("choos") || message.includes("not found")
}

export async function reconnectSavedPrinter() {
  if (status.connected) return true
  const serial = (navigator as SerialNavigator).serial
  if (serial?.getPorts) {
    const ports = await serial.getPorts()
    for (const port of ports) {
      try {
        await openSerialPort(port, "POS58 USB / COM")
        return true
      } catch {
        /* puerto ocupado o cerrado */
      }
    }
  }
  if (!(await bluetoothPrinterAvailable())) return status.connected
  const bluetooth = (navigator as BluetoothNavigator).bluetooth
  if (bluetooth?.getDevices) {
    try {
      const devices = await bluetooth.getDevices()
      const printer = devices.find((device) => /pos|print|mtp|rpp/i.test(device.name ?? "")) ?? devices[0]
      if (printer) {
        await attachBluetoothDevice(printer)
        return true
      }
    } catch {
      /* Bluetooth bloqueado o hay que volver a pedir permiso */
    }
  }
  return status.connected
}

export async function connectBluetoothPrinter() {
  const api = (navigator as BluetoothNavigator).bluetooth
  if (!api) {
    throw new Error(
      isAndroidClient()
        ? "Usa Chrome en el celular o tablet para Bluetooth."
        : "Este navegador no permite Bluetooth. En Windows usa USB/COM.",
    )
  }
  const available = await bluetoothPrinterAvailable()
  if (!available && !isAndroidClient()) {
    throw new Error("Bluetooth está bloqueado en este navegador. En Windows usa USB/COM: la POS58 emparejada aparece como puerto COM.")
  }
  let device: BluetoothDeviceLike
  try {
    device = await api.requestDevice({
      filters: BLE_NAME_PREFIXES,
      optionalServices: BLE_SERVICES,
    })
  } catch (error) {
    if (isBluetoothBlockedError(error)) {
      throw new Error(
        isAndroidClient()
          ? "Bluetooth está bloqueado. Usa Chrome, enciende Bluetooth y recarga Pedidos."
          : "Bluetooth está bloqueado en este navegador. En Windows usa USB/COM.",
      )
    }
    device = await api.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_SERVICES,
    })
  }
  await attachBluetoothDevice(device)
}

export function connectAndroidPrinter() {
  useRawBtLink()
}

export async function connectUsbPrinter() {
  const api = (navigator as SerialNavigator).serial
  if (!api) throw new Error("Este navegador no permite USB/COM. Usa Chrome o Edge en el computador.")
  const port = await api.requestPort()
  await openSerialPort(port, "POS58 USB / COM")
}

export async function ensurePrinterConnected() {
  if (status.connected) return
  if (await reconnectSavedPrinter()) return
  if (isAndroidClient()) {
    if (canUseBluetoothPrinter()) {
      try {
        await connectBluetoothPrinter()
        return
      } catch (error) {
        if (isUserCancel(error) || isBluetoothBlockedError(error)) {
          useRawBtLink()
          return
        }
        const message = error instanceof Error ? error.message : ""
        if (message.includes("RawBT") || message.includes("canal BLE")) {
          useRawBtLink()
          return
        }
        throw error
      }
    }
    useRawBtLink()
    return
  }
  const usbOk = canUseUsbPrinter()
  const btOk = await bluetoothPrinterAvailable()
  if (usbOk) {
    try {
      await connectUsbPrinter()
      return
    } catch (error) {
      if (isUserCancel(error) || !btOk) throw error
    }
  }
  if (btOk) {
    try {
      await connectBluetoothPrinter()
      return
    } catch (error) {
      if (isBluetoothBlockedError(error) && usbOk) {
        await connectUsbPrinter()
        return
      }
      if (isBluetoothBlockedError(error)) {
        throw new Error("Bluetooth está bloqueado. En Windows vincula la POS58 y elige su puerto COM (USB/COM).")
      }
      throw error
    }
  }
  throw new Error("Usa Chrome o Edge. En Windows imprime por USB o por el COM de la POS58, no por Bluetooth de Chrome.")
}

export async function disconnectPrinter() {
  await forget()
}

export async function printReceipt(ticket: ReceiptTicket) {
  await ensurePrinterConnected()
  const bytes = await encodeReceipt(ticket)
  if (status.link === "bluetooth" && writeBle) {
    await writeChunks(bytes, writeBle, 20)
    return
  }
  if (status.link === "usb" && serialWriter) {
    await writeChunks(bytes, (chunk) => serialWriter!.write(chunk), 128)
    return
  }
  if (status.link === "android") {
    await printWithRawBt(bytes)
    return
  }
  throw new Error("Se perdió la conexión con la impresora.")
}
