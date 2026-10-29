import type { PasswordHasher } from "../../domain/auth/ports.ts"

const ITERATIONS = 120_000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  )
  return new Uint8Array(bits)
}

function sameText(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

export class Pbkdf2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const digest = await derive(password, salt, ITERATIONS)
    return `pbkdf2$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(digest)}`
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [scheme, iterations, salt, hash] = passwordHash.split("$")
    if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false
    const digest = await derive(password, base64ToBytes(salt), Number(iterations))
    return sameText(bytesToBase64(digest), hash)
  }
}
