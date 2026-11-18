import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  uploadBytesResumable,
  type StorageReference,
} from "firebase/storage"
import type { StoreProfile, StoreVideoKey } from "../../domain/catalog/entities.ts"
import { STORE_VIDEO_KEYS } from "../../domain/catalog/store-media.ts"
import { firebaseStorage } from "./firebase.ts"

export interface StorageService {
  uploadImage(file: File, path: string): Promise<string>
  uploadFile(file: File, path: string): Promise<string>
  uploadFileWithProgress(file: File, path: string, onProgress: (percent: number) => void): Promise<string>
  deleteProductMedia(productId: string, urls: string[]): Promise<void>
  deleteUrls(urls: string[]): Promise<void>
  fillMissingStoreMedia(store: StoreProfile): Promise<StoreProfile>
}

export class FirebaseStorageService implements StorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(firebaseStorage, path)
    const snapshot = await uploadBytes(storageRef, file, metadataFor(file))
    return await getDownloadURL(snapshot.ref)
  }

  uploadFileWithProgress(file: File, path: string, onProgress: (percent: number) => void): Promise<string> {
    const task = uploadBytesResumable(ref(firebaseStorage, path), file, metadataFor(file))
    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const total = snapshot.totalBytes || 1
          onProgress(Math.min(100, Math.round((snapshot.bytesTransferred / total) * 100)))
        },
        reject,
        () => {
          onProgress(100)
          void getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
        },
      )
    })
  }

  uploadImage(file: File, path: string): Promise<string> {
    return this.uploadFile(file, path)
  }

  async fillMissingStoreMedia(store: StoreProfile): Promise<StoreProfile> {
    try {
      const [banner, logo, videos] = await Promise.all([
        this.#latestFileUrl("store", "banner-"),
        this.#latestFileUrl("store", "logo-"),
        this.#latestVideoUrls(),
      ])
      const nextVideos = { ...store.videos }
      for (const key of STORE_VIDEO_KEYS) {
        if (!nextVideos[key].url && videos[key]) {
          nextVideos[key] = { ...nextVideos[key], url: videos[key] ?? null }
        }
      }
      return {
        ...store,
        banner: isMissingOrExternalBanner(store.banner) && banner ? banner : store.banner,
        logo: isMissingOrExternalBanner(store.logo) && logo ? logo : store.logo,
        videos: nextVideos,
      }
    } catch (error) {
      console.error("No se pudo recuperar media de Storage:", error)
      return store
    }
  }

  async #latestVideoUrls(): Promise<Partial<Record<StoreVideoKey, string>>> {
    const listed = await listAll(ref(firebaseStorage, "store/videos"))
    const byKey: Partial<Record<StoreVideoKey, string>> = {}
    await Promise.all(
      STORE_VIDEO_KEYS.map(async (key) => {
        const matches = listed.items.filter((item) => item.name.startsWith(`${key}-`))
        const latest = newestItem(matches)
        if (latest) byKey[key] = await getDownloadURL(latest)
      }),
    )
    return byKey
  }

  async #latestFileUrl(folder: string, prefix: string): Promise<string | null> {
    const listed = await listAll(ref(firebaseStorage, folder))
    const matches = listed.items.filter((item) => item.name.startsWith(prefix))
    const latest = newestItem(matches)
    return latest ? getDownloadURL(latest) : null
  }

  async deleteProductMedia(productId: string, urls: string[]): Promise<void> {
    await this.#deletePrefix(`products/${productId}`)
    await this.deleteUrls(urls)
  }

  async deleteUrls(urls: string[]): Promise<void> {
    await Promise.all(urls.filter(Boolean).map((url) => this.#deleteUrl(url)))
  }

  async #deletePrefix(path: string): Promise<void> {
    try {
      const folder = ref(firebaseStorage, path)
      const listed = await listAll(folder)
      await Promise.all(listed.items.map((item) => deleteObject(item).catch(() => undefined)))
      await Promise.all(listed.prefixes.map((prefix) => this.#deletePrefix(prefix.fullPath)))
    } catch {
      /* folder may not exist */
    }
  }

  async #deleteUrl(url: string): Promise<void> {
    try {
      await deleteObject(ref(firebaseStorage, url))
    } catch {
      /* already gone or not a storage url */
    }
  }
}

function metadataFor(file: File) {
  const contentType = file.type.trim()
  return contentType ? { contentType } : undefined
}

function newestItem(items: StorageReference[]) {
  if (items.length === 0) return null
  return [...items].sort((left, right) => left.name.localeCompare(right.name)).at(-1) ?? null
}

function isMissingOrExternalBanner(url: string) {
  if (!url.trim()) return true
  return url.includes("kyte-7c484") || url.includes("images-cdn.kyte.site")
}
