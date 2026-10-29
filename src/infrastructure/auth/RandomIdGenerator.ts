import type { IdGenerator } from "../../domain/auth/ports.ts"

export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID()
  }
}
