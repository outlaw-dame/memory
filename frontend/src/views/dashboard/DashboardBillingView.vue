<script setup lang="ts">
const plan = {
  name: 'Provider Pro',
  price: '$49/mo',
  pods: 450,
  maxPods: 500,
  storage: '1.12TB',
  maxStorage: '2TB',
  renewsAt: '2026-05-20',
}
</script>

<template>
  <div class="flex flex-col h-full">
    <header class="px-6 py-4 border-b border-gray-100">
      <h1 class="text-[15px] font-semibold text-gray-800">Billing &amp; Subscription</h1>
    </header>
    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      <div class="rounded-2xl border border-gray-100 shadow-sm bg-white px-5 py-5 flex items-center justify-between">
        <div>
          <p class="text-[11px] text-gray-400">Current plan</p>
          <p class="text-[20px] font-bold text-gray-800">{{ plan.name }}</p>
          <p class="text-[12px] text-gray-500 mt-0.5">{{ plan.price }} · renews {{ plan.renewsAt }}</p>
        </div>
        <button class="text-[12px] font-semibold bg-[rgb(99,100,246)] text-white px-4 py-2 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors">
          Manage Plan
        </button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-2xl border border-gray-100 shadow-sm bg-white px-5 py-4">
          <p class="text-[11px] text-gray-400 mb-1">Pods</p>
          <p class="text-[20px] font-bold text-gray-800">{{ plan.pods }} <span class="text-[13px] font-normal text-gray-400">/ {{ plan.maxPods }}</span></p>
          <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-[rgb(99,100,246)] rounded-full" :style="`width: ${(plan.pods / plan.maxPods * 100).toFixed(0)}%`"></div>
          </div>
        </div>
        <div class="rounded-2xl border border-gray-100 shadow-sm bg-white px-5 py-4">
          <p class="text-[11px] text-gray-400 mb-1">Storage</p>
          <p class="text-[20px] font-bold text-gray-800">{{ plan.storage }} <span class="text-[13px] font-normal text-gray-400">/ {{ plan.maxStorage }}</span></p>
          <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-[rgb(99,100,246)] rounded-full" style="width: 56%"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
