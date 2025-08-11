import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export const useImageStore = defineStore('image', () => {
  const uploadedImageUrl = ref<string | null>(null)
  const image = reactive(new Image())

  const uploadImage = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        uploadedImageUrl.value = reader.result as string
        image.src = uploadedImageUrl.value as string
        image.onload = () => resolve()
        image.onerror = reject
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return {
    uploadedImageUrl,
    image,
    uploadImage,
  }
})
