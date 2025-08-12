<template>
  <div class="flex flex-col gap-3">
    <Tooltip v-for="tool in toolsStore.tools" :key="tool.value">
      <TooltipTrigger as-child>
        <Button
          @click="toolsStore.setTool(tool.value)"
          :disabled="tool.disabled"
          :class="[
            'inline-flex items-center justify-start gap-3 h-11 px-4 rounded-md text-sm font-medium border shadow-sm cursor-pointer transition-colors',
            toolsStore.currentTool === tool.value
              ? 'bg-accent text-accent-foreground border-accent hover:bg-accent hover:text-accent-foreground'
              : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground',
          ]"
        >
          <component :is="tool.icon" class="w-5 h-5" />
          {{ tool.label }}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{{ tool.tooltip }}</TooltipContent>
    </Tooltip>
  </div>
</template>

<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useToolsStore } from '@/stores/tools'

const toolsStore = useToolsStore()
</script>
