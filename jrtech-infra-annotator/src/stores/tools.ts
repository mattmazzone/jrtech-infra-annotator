import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tool } from '@/types'

export const useToolsStore = defineStore('tools', () => {
  const currentTool = ref<Tool>('perimeter')

  const setTool = (tool: Tool) => {
    currentTool.value = tool
  }

  return {
    currentTool,
    setTool,
  }
})
