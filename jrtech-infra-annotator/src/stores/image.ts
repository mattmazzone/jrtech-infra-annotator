import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export const useImageStore = defineStore('image', () => {
  const uploadedImageUrl = ref<string | null>(null)
  const image = ref(new Image())

  const uploadImage = async (file: File): Promise<void> => {
    if (file.type === 'application/pdf') {
      await loadPdfAsImage(file)
    } else {
      await loadRegularImage(file)
    }
  }

  const loadRegularImage = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        uploadedImageUrl.value = reader.result as string
        image.value.src = uploadedImageUrl.value as string
        image.value.onload = () => resolve()
        image.value.onerror = reject
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const loadPdfAsImage = async (file: File): Promise<void> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1) // first page only

    const viewport = page.getViewport({ scale: 2 }) // increase for higher resolution
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({ canvasContext: context, viewport, canvas }).promise

    uploadedImageUrl.value = canvas.toDataURL('image/png')
    image.value.src = uploadedImageUrl.value
    await new Promise<void>((resolve, reject) => {
      image.value.onload = () => resolve()
      image.value.onerror = reject
    })
  }

  return {
    uploadedImageUrl,
    image,
    uploadImage,
  }
})
