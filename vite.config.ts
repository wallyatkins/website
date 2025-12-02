import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import obfuscator from 'rollup-plugin-javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    obfuscator({
      compact: true,
      controlFlowFlattening: true,
      deadCodeInjection: true,
      debugProtection: true,
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      renameGlobals: false,
      rotateStringArray: true,
      selfDefending: true,
      stringArray: true,
      stringArrayEncoding: ['rc4'],
      stringArrayThreshold: 0.75,
      unicodeEscapeSequence: false
    })
  ],
})
