import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Config GitHub Pages : base '/dueliq/' pour anistaar.github.io/dueliq
export default defineConfig({
  plugins: [svelte()],
  base: '/dueliq/',
})
