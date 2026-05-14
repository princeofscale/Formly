#!/usr/bin/env node
// Generate a VAPID key pair for Web Push.
// Usage:  node scripts/generate-vapid.js
// Copy the printed values to .env.local AND Vercel env vars.

const webpush = require('web-push')

const keys = webpush.generateVAPIDKeys()

console.log('')
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
console.log('')
console.log('Paste these into .env.local and Vercel → Settings → Environment Variables.')
console.log('Then redeploy.')
