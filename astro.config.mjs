import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import clerk from '@clerk/astro'
import react from '@astrojs/react';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [react(),clerk()],
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'server',
})