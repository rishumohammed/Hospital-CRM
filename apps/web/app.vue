<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* Clean, refined typography: normal (400) and semibold (600) only throughout the entire application */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #1e293b;
}

/* Strictly cap all headings, bold classes, strong tags, and heavy fonts to semibold (600) */
.font-bold,
.font-extrabold,
.font-black,
.font-semibold,
b,
strong,
h1,
h2,
h3,
h4,
h5,
h6 {
  font-weight: 600 !important;
}

/* Clean UI refinement: subtle buttons, clean inputs with visible borders */
button, input, select, textarea {
  font-family: inherit;
}

input:not([type="checkbox"]):not([type="radio"]),
select,
textarea {
  border-width: 1px;
}

/* Softer scrollbars for a clean look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
