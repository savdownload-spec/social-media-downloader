/**
 * Comprehensive Tool Testing Script
 * 
 * Tests all 76 tools systematically and generates a detailed report.
 * Run with: npx tsx scripts/test-all-tools.ts
 */

import { catalog } from '../src/config/catalog';
import { getToolPolicy } from '../src/lib/downloaderPolicy';

type TestResult = {
  slug: string;
  name: string;
  category: string;
  policyStatus: 'ENABLED' | 'UNAVAILABLE';
  tested: boolean;
  success: boolean;
  error?: string;
  responseTime?: number;
  notes?: string;
};

const TEST_URLS: Record<string, string> = {
  // YouTube
  'youtube-video-downloader': 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'youtube-shorts-downloader': 'https://www.youtube.com/shorts/[ID]',
  'youtube-thumbnail-downloader': 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'youtube-to-mp3': 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  
  // TikTok
  'tiktok-video-downloader': 'https://www.tiktok.com/@user/video/[ID]',
  'tiktok-to-mp3': 'https://www.tiktok.com/@user/video/[ID]',
  'tiktok-thumbnail-downloader': 'https://www.tiktok.com/@user/video/[ID]',
  'tiktok-photo-downloader': 'https://www.tiktok.com/@user/photo/[ID]',
  
  // Instagram
  'instagram-reels-downloader': 'https://www.instagram.com/reel/[ID]/',
  'instagram-profile-picture-downloader': 'instagram',
  
  // Facebook
  'facebook-video-downloader': 'https://www.facebook.com/watch/?v=[ID]',
  'facebook-reels-downloader': 'https://www.facebook.com/reel/[ID]',
  
  // X (Twitter)
  'x-video-downloader': 'https://twitter.com/user/status/[ID]',
  'x-gif-downloader': 'https://twitter.com/user/status/[ID]',
  
  // Pinterest
  'pinterest-video-downloader': 'https://www.pinterest.com/pin/[ID]/',
  'pinterest-image-downloader': 'https://www.pinterest.com/pin/[ID]/',
};

async function testDownloader(slug: string, url: string): Promise<Partial<TestResult>> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, tool: slug }),
    });
    
    const responseTime = Date.now() - startTime;
    const result = await response.json();
    
    if (response.ok && result.ok) {
      return {
        tested: true,
        success: true,
        responseTime,
        notes: `Found ${result.formats?.length ?? 0} formats`,
      };
    } else {
      return {
        tested: true,
        success: false,
        responseTime,
        error: result.error || `HTTP ${response.status}`,
        notes: result.code,
      };
    }
  } catch (error) {
    return {
      tested: true,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

async function testAllTools(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🔍 Testing all 76 tools...\n');
  console.log('Note: This requires the development server to be running (npm run dev)\n');
  
  for (const tool of catalog) {
    const policy = getToolPolicy(tool.slug);
    const policyStatus = policy.downloadPermitted || policy.metadataPermitted
      ? 'ENABLED'
      : 'UNAVAILABLE';
    
    const result: TestResult = {
      slug: tool.slug,
      name: tool.name,
      category: tool.group,
      policyStatus,
      tested: false,
      success: false,
    };
    
    // Only test downloaders that are ENABLED and have test URLs
    if (policyStatus === 'ENABLED' && TEST_URLS[tool.slug]) {
      console.log(`Testing ${tool.name} (${tool.slug})...`);
      const testResult = await testDownloader(tool.slug, TEST_URLS[tool.slug]);
      Object.assign(result, testResult);
      
      if (result.success) {
        console.log(`  ✅ Success (${result.responseTime}ms)`);
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    } else if (policyStatus === 'UNAVAILABLE') {
      result.notes = 'Policy: UNAVAILABLE';
      console.log(`⏭️  Skipping ${tool.name} (unavailable by policy)`);
    } else {
      result.notes = 'No test URL configured';
      console.log(`⏭️  Skipping ${tool.name} (no test URL)`);
    }
    
    results.push(result);
  }
  
  return results;
}

function generateReport(results: TestResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  const totalTools = results.length;
  const testedTools = results.filter(r => r.tested).length;
  const successfulTools = results.filter(r => r.success).length;
  const failedTools = results.filter(r => r.tested && !r.success).length;
  const skippedTools = results.filter(r => !r.tested).length;
  
  console.log(`Total Tools: ${totalTools}`);
  console.log(`Tested: ${testedTools}`);
  console.log(`✅ Successful: ${successfulTools}`);
  console.log(`❌ Failed: ${failedTools}`);
  console.log(`⏭️  Skipped: ${skippedTools}`);
  console.log(`\nSuccess Rate: ${testedTools > 0 ? ((successfulTools / testedTools) * 100).toFixed(1) : 0}%\n`);
  
  // Group by category
  const byCategory: Record<string, TestResult[]> = {};
  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  }
  
  console.log('BY CATEGORY:\n');
  for (const [category, tools] of Object.entries(byCategory)) {
    const tested = tools.filter(t => t.tested).length;
    const successful = tools.filter(t => t.success).length;
    console.log(`${category}:`);
    console.log(`  Total: ${tools.length}, Tested: ${tested}, Successful: ${successful}\n`);
  }
  
  // List failed tools
  if (failedTools > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('FAILED TOOLS:\n');
    
    const failed = results.filter(r => r.tested && !r.success);
    for (const tool of failed) {
      console.log(`❌ ${tool.name} (${tool.slug})`);
      console.log(`   Error: ${tool.error}`);
      console.log(`   Notes: ${tool.notes}\n`);
    }
  }
  
  // List successful tools
  if (successfulTools > 0) {
    console.log('\n' + '-'.repeat(80));
    console.log('SUCCESSFUL TOOLS:\n');
    
    const successful = results.filter(r => r.success);
    for (const tool of successful) {
      console.log(`✅ ${tool.name} (${tool.slug})`);
      console.log(`   Response Time: ${tool.responseTime}ms`);
      console.log(`   Notes: ${tool.notes}\n`);
    }
  }
  
  // Save to file
  const reportPath = './test-results.json';
  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${reportPath}\n`);
}

async function main() {
  console.log('GetSavDown Tool Testing Script');
  console.log('=' + '='.repeat(79) + '\n');
  
  try {
    const results = await testAllTools();
    generateReport(results);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
