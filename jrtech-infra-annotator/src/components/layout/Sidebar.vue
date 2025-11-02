<template>
  <ImportExportDialog v-model:open="settings.openImportExportDialog" />

  <aside class="flex h-full flex-col border-r bg-background p-4 gap-4">
    <div class="flex h-16 items-center border-b px-2">
      <h1 class="text-xl font-semibold flex items-center gap-2">
        <img src="/jrtech-on-logo.png" alt="Logo" class="h-7 w-7" />
        InfraAnnotator
      </h1>
    </div>

    <div class="flex-1 flex flex-col justify-between">
      <div class="flex flex-col gap-4">
        <Label
          for="file-upload"
          class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
        >
          <Upload class="w-4 h-4 mr-2" />
          {{ imageStore.uploadedImageUrl ? 'Change Map' : 'Upload Map' }}
        </Label>
        <input
          id="file-upload"
          type="file"
          class="sr-only"
          accept="image/png,image/jpeg, application/pdf"
          @change="handleFileUpload"
        />
        <Separator class="my-1" />

        <ToolSelector />
      </div>

      <div class="flex flex-col gap-2">
        <Separator class="my-1" />
        <Button @click="settings.openImportExportDialog = true" variant="outline">
          <Download class="w-4 h-4 mr-2" /> Import/Export
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              <Icon
                icon="radix-icons:moon"
                class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
              />
              <Icon
                icon="radix-icons:sun"
                class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
              />
              <span class="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="mode = 'light'"> Light </DropdownMenuItem>
            <DropdownMenuItem @click="mode = 'dark'"> Dark </DropdownMenuItem>
            <DropdownMenuItem @click="mode = 'auto'"> System </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" @click="doLogout"> Logout </Button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Upload, Download } from 'lucide-vue-next'
import { Icon } from '@iconify/vue'
import { useColorMode } from '@vueuse/core'

import ToolSelector from '@/components/tools/ToolSelector.vue'
import { useImageStore } from '@/stores/image'
import { useCanvasStore } from '@/stores/canvas'
import { useSettingsStore } from '@/stores/settings'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import ImportExportDialog from '../ImportExportDialog.vue'
import { useAuth0 } from '@auth0/auth0-vue'

const { logout, user } = useAuth0()
const mode = useColorMode()
const imageStore = useImageStore()
const canvasStore = useCanvasStore()
const settings = useSettingsStore()
const { draw } = useCanvasRenderer()

const handleFileUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    await imageStore.uploadImage(file)
    if (canvasStore.canvasRef) {
      canvasStore.canvasRef.width = imageStore.image.width
      canvasStore.canvasRef.height = imageStore.image.height
      draw()
    }
  } catch (error) {
    console.error('Failed to upload map:', error)
  }
}
const doLogout = () => logout({ logoutParams: { returnTo: window.location.origin } })
</script>
