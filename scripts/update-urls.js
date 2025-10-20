#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Read the form URLs from the config file
const configPath = join(projectRoot, 'form-urls.json');
const urls = JSON.parse(readFileSync(configPath, 'utf8'));

// Validate that we have an array of URLs
if (!Array.isArray(urls)) {
  console.error('Error: form-urls.json must contain an array of URLs');
  process.exit(1);
}

if (urls.length === 0) {
  console.error('Error: form-urls.json must contain at least one URL');
  process.exit(1);
}

// Validate URLs
const invalidUrls = urls.filter(url => {
  try {
    new URL(url);
    return false;
  } catch {
    return true;
  }
});

if (invalidUrls.length > 0) {
  console.error('Error: Invalid URLs found in form-urls.json:');
  invalidUrls.forEach(url => console.error(`  - ${url}`));
  process.exit(1);
}

console.log(`Updating KV storage with ${urls.length} form URLs...`);

try {
  // Update the KV storage
  const command = `npx wrangler kv key put "form_urls" '${JSON.stringify(urls)}' --binding URLS_KV --remote`;
  execSync(command, { 
    cwd: projectRoot,
    stdio: 'inherit'
  });
  
  console.log('✅ Successfully updated form URLs in KV storage!');
  console.log(`📝 Updated URLs:`);
  urls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
  });
} catch (error) {
  console.error('❌ Failed to update KV storage:', error.message);
  process.exit(1);
}
