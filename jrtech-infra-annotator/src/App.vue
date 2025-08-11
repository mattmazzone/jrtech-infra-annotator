<template>
  <TooltipProvider :delay-duration="100">
    <div class="grid h-screen w-full grid-cols-[240px_1fr_380px] bg-muted/40">
      <Sidebar />
      <MainCanvas />
      <PropertiesPanel />
    </div>
  </TooltipProvider>
  
</template>

<script setup lang="ts">
import { TooltipProvider } from '@/components/ui/tooltip'
import Sidebar from '@/components/layout/Sidebar.vue'
import MainCanvas from '@/components/layout/MainCanvas.vue'
import PropertiesPanel from '@/components/layout/PropertiesPanel.vue'
</script>
