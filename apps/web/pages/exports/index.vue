<template>
  <div class="p-8 text-center text-slate-500">
    <p class="text-sm">Redirecting to Reports: Data Exports...</p>
  </div>
</template>

<script setup lang="ts">
await navigateTo('/reports?tab=exports', { replace: true });
</script>
