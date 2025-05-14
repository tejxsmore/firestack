import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import clerk from '@clerk/astro'
import react from '@astrojs/react';
import tailwindcss from "@tailwindcss/vite";

import vercel from '@astrojs/vercel';

import solidJs from '@astrojs/solid-js';

export default defineConfig({
  integrations: [react(), clerk(), solidJs()],
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'server',
})