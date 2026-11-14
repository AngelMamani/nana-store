import { deleteObject, getDownloadURL, listAll, ref, uploadBytes, uploadBytesResumable } from "firebase/storage"
import { firebaseStorage } from "./firebase.ts"

export interface StorageService {
  uploadImage(file: File, path: string): Promise<string>
  uploadFile(file: File, path: string): Promise<string>
  uploadFileWithProgress(file: File, path: string, onProgress: (percent: number) => void): Promise<string>
  deleteProductMedia(productId: string, urls: string[]): Promise<void>
  deleteUrls(urls: string[]): Promise<void>
}

export class FirebaseStorageService implements StorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(firebaseStorage, path)
    const snapshot = await uploadBytes(storageRef, file)
    return await getDownloadURL(snapshot.ref)
  }

  uploadFileWithProgress(file: File, path: string, onProgress: (percent: number) => void): Promise<string> {
    const task = uploadBytesResumable(ref(firebaseStorage, path), file)
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
