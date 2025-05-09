import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import clerk from '@clerk/astro'
import react from '@astrojs/react';
import tailwindcss from "@tailwindcss/vite";

import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [react(),clerk()],
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'server',
})