/**
 * Fix broken numbered headings in DB posts.
 * Pattern matched: /^(\d{2})([a-zA-Z])/ at start of a line
 * e.g. "01open the video" -> "Open the video" (as proper step text)
 *
 * Run: npx tsx scripts/fix-numbered-headings.ts
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const LOG_PATH = join(__dirname, '..', '.agents', 'tasks', 'blog-redesign-2026', 'migration-log.md');

function ensureLog() {
  if (!existsSync(LOG_PATH)) {
    writeFileSync(LOG_PATH, `# Migration Log — SavDown Blog 2.0\n\nGenerated: ${new Date().toISOString()}\n\n`);
  }
}

function log(message: string) {
  console.log(message);
  appendFileSync(LOG_PATH, message + '\n');
}

/**
 * Fix pattern: lines starting with two digits followed immediately by a
 * lowercase letter with no space (e.g. "01open the video").
 * Converts to proper capitalized text without the numeric prefix.
 */
function fixBrokenHeadings(content: string): { fixed: string; changes: string[] } {
  const changes: string[] = [];
  const fixed = content.replace(
    /^(\d{2})([a-zA-Z])/gm,
    (match, digits, letter) => {
      const capitalized = letter.toUpperCase();
      changes.push(`  - "${match}..." -> starts with "${capitalized}..."`);
      return capitalized;
    },
  );
  return { fixed, changes };
}

async function main() {
  ensureLog();
  log('\n## fix-numbered-headings run\n');
  log(`Timestamp: ${new Date().toISOString()}\n`);

  const posts = await prisma.post.findMany({
    select: { id: true, slug: true, content: true },
  });

  log(`Scanning ${posts.length} posts for broken numbered headings (pattern /^\\d{2}[a-zA-Z]/m)...\n`);

  let totalFixed = 0;

  for (const post of posts) {
    if (!post.content) continue;

    // Check if pattern exists
    if (!/^\d{2}[a-zA-Z]/m.test(post.content)) continue;

    const { fixed, changes } = fixBrokenHeadings(post.content);

    if (changes.length === 0) continue;

    log(`### Post: ${post.slug}`);
    log(`Changes (${changes.length}):`);
    for (const change of changes) log(change);

    await prisma.post.update({
      where: { id: post.id },
      data: { content: fixed },
    });

    log(`✓ Updated\n`);
    totalFixed++;
  }

  if (totalFixed === 0) {
    log('No posts required fixing — all headings are properly formatted.\n');
  } else {
    log(`\n✓ Fixed ${totalFixed} post(s).\n`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
