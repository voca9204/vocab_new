#!/usr/bin/env node

/**
 * Clear all caches to ensure fresh data is loaded
 */

console.log('🧹 Clearing Browser Caches\n');
console.log('='.repeat(60));

console.log(`
To clear caches, please:

1. In your browser (Chrome/Edge):
   - Open Developer Tools (F12)
   - Go to Application tab
   - Under Storage, click "Clear site data"
   
2. Or use keyboard shortcut:
   - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - This does a hard refresh

3. Clear localStorage manually:
   - In browser console, run: localStorage.clear()
   
4. Restart the development server:
   - Stop the current server (Ctrl+C)
   - Run: npm run dev

This will ensure all cached data is cleared and fresh data is loaded from the database.
`);

console.log('='.repeat(60));