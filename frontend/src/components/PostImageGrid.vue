<script setup lang="ts">
export interface GridImage {
  url: string
  alt?: string
  type?: 'image' | 'gif'
  attribution?: string
}

defineProps<{ images: GridImage[] }>()
</script>

<template>
  <div
    v-if="images.length === 1"
    class="rounded-2xl overflow-hidden"
  >
    <div class="relative">
      <img :src="images[0].url" :alt="images[0].alt ?? ''" class="w-full max-h-72 object-cover" />
      <span v-if="images[0].type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="images[0].attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ images[0].attribution }}</span>
    </div>
  </div>

  <div
    v-else-if="images.length === 2"
    class="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden"
  >
    <div v-for="(img, i) in images" :key="i" class="relative aspect-square">
      <img :src="img.url" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
      <span v-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
    </div>
  </div>

  <div
    v-else-if="images.length === 3"
    class="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden"
  >
    <div v-for="(img, i) in images" :key="i" class="relative aspect-square">
      <img :src="img.url" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
      <span v-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
    </div>
  </div>

  <div
    v-else-if="images.length === 4"
    class="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden"
  >
    <div v-for="(img, i) in images" :key="i" class="relative aspect-square">
      <img :src="img.url" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
      <span v-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
    </div>
  </div>

  <!-- 5 images: 3 top + 2 bottom -->
  <div v-else class="flex flex-col gap-1 rounded-2xl overflow-hidden">
    <div class="grid grid-cols-3 gap-1">
      <div v-for="(img, i) in images.slice(0, 3)" :key="i" class="relative aspect-square">
        <img :src="img.url" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
        <span v-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
        <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-1">
      <div v-for="(img, i) in images.slice(3)" :key="i" class="relative aspect-square">
        <img :src="img.url" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
        <span v-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
        <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
      </div>
    </div>
  </div>
</template>
