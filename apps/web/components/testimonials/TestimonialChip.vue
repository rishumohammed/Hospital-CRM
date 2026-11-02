<template>
  <div class="inline-flex items-center gap-1.5 flex-wrap">
    <!-- Testimonial Status Chip -->
    <span
      :class="[
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-2xs',
        isSent
          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
      ]"
      :title="chipTooltip"
    >
      <span class="text-xs leading-none">{{ isSent ? '✓' : '○' }}</span>
      <span>{{ chipLabel }}</span>
    </span>

    <!-- Quick 2-Tap Action Button -->
    <button
      v-if="showActionButton"
      type="button"
      @click.stop="$emit('mark-sent')"
      class="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-all min-h-[28px] focus:outline-hidden focus:ring-2 focus:ring-teal-500 active:scale-95"
      :title="t('testimonials.mark_sent_title')"
    >
      <span>{{ t('testimonials.mark_sent') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
  defineProps<{
    sentCount?: number;
    lastSentAt?: string | Date | null;
    lastChannel?: string | null;
    showActionButton?: boolean;
    compact?: boolean;
  }>(),
  {
    sentCount: 0,
    lastSentAt: null,
    lastChannel: null,
    showActionButton: false,
    compact: false,
  }
);

defineEmits<{
  (e: 'mark-sent'): void;
}>();

const { t, locale } = useI18n();

const isSent = computed(() => (props.sentCount ?? 0) > 0);

const chipLabel = computed(() => {
  if (!isSent.value) {
    return `${t('testimonials.title')}: ${t('testimonials.chip_not_sent')}`;
  }

  if (props.compact || !props.lastSentAt) {
    return `${t('testimonials.title')}: ${t('testimonials.chip_sent')}`;
  }

  // Format date e.g. "1 Nov"
  const dateObj = new Date(props.lastSentAt);
  const dateStr = dateObj.toLocaleDateString(locale.value === 'ml' ? 'ml-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
  });

  const channelKey = props.lastChannel
    ? t(`testimonials.channel_${props.lastChannel}`, props.lastChannel)
    : '';

  if (channelKey) {
    return `${t('testimonials.chip_sent')}, ${dateStr}, ${channelKey}`;
  }

  return `${t('testimonials.chip_sent')}, ${dateStr}`;
});

const chipTooltip = computed(() => {
  if (!isSent.value) {
    return t('testimonials.chip_not_sent');
  }
  return `${props.sentCount} send(s) recorded`;
});
</script>
