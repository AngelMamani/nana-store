import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseStorage } from "./firebase.ts"

export interface StorageService {
  uploadImage(file: File, path: string): Promise<string>
}

export class FirebaseStorageService implements StorageService {
  async uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(firebaseStorage, path)
    const snapshot = await uploadBytes(storageRef, file)
    return await getDownloadURL(snapshot.ref)
  }
}
