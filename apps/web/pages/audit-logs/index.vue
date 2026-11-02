<template>
  <div class="p-8 text-center text-slate-500">
    <p class="text-sm">Redirecting to Admin Settings: Audit Logs...</p>
  </div>
</template>

<script setup lang="ts">
await navigateTo('/admin?tab=audit', { replace: true });
</script>
