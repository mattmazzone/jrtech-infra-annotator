<template>
  <aside class="flex h-full flex-col border-l bg-background p-4 gap-6 overflow-y-auto">
    <div class="flex h-16 items-center border-b px-2">
      <h2 class="text-xl font-semibold">Properties</h2>
    </div>

    <ScaleSection />
    <ZonesSection />
    <AntennasSection />
    <MeasurementsSection />
  </aside>
</template>

<script setup lang="ts">
import ScaleSection from '@/components/sections/ScaleSection.vue'
import ZonesSection from '@/components/sections/ZonesSection.vue'
import AntennasSection from '@/components/sections/AntennasSection.vue'
import MeasurementsSection from '@/components/sections/MeasurementsSection.vue'
</script>
