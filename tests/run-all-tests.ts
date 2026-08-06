import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'normalization.test.ts',
  'browserCatalog.test.ts',
  'searchEngine.test.ts',
  'catalogRanking.test.ts',
  'gameListControls.test.ts',
  'userListService.test.ts',
  'homeWidgetService.test.ts',
  'homeCatalogWidgets.test.ts',
  'aboutPage.test.ts',
  'gameSourceService.test.ts',
  'personalCalendarService.test.ts',
  'catalogDetail.test.ts',
  'pagination.test.ts',
  'theme.test.ts',
  'globalTheme.test.ts',
  'visualTheme.test.ts',
  'stagingSearch.test.ts',
  'releaseCatalog.test.ts',
  'upcomingGamesPage.test.ts',
  'newReleasesPage.test.ts',
  'eventCatalog.test.ts',
  'personalData.test.ts',
  'catalogResolution.test.ts',
  'personalInitialization.test.ts',
  'personalGameVisibility.test.ts',
  'actionMenuPortal.test.ts',
];

interface TestSuiteSummary {
  fileName: string;
  passed: number;
  failed: number;
  success: boolean;
}

console.log('============ PLAY ATLAS SUITE RUNNER ============');

const results: TestSuiteSummary[] = [];
let totalPassed = 0;
let totalFailed = 0;
let anySuiteFailed = false;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`\n▶ Running ${file}...`);

  try {
    const output = execSync(`npx tsx "${filePath}"`, {
      encoding: 'utf8',
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    console.log(output);

    const passMatch = output.match(/(\d+)\s+passed/i);
    const failMatch = output.match(/(\d+)\s+failed/i);

    const passed = passMatch ? parseInt(passMatch[1], 10) : (output.includes('✅') ? (output.match(/✅/g) || []).length : 1);
    const failed = failMatch ? parseInt(failMatch[1], 10) : (output.includes('❌') ? (output.match(/❌/g) || []).length : 0);

    totalPassed += passed;
    totalFailed += failed;

    if (failed > 0) anySuiteFailed = true;

    results.push({ fileName: file, passed, failed, success: failed === 0 });
  } catch (err: any) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';

    console.log(stdout);
    if (stderr) console.error(stderr);

    const passMatch = stdout.match(/(\d+)\s+passed/i);
    const failMatch = stdout.match(/(\d+)\s+failed/i);

    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 1;

    totalPassed += passed;
    totalFailed += failed;
    anySuiteFailed = true;

    results.push({ fileName: file, passed, failed, success: false });
  }
}

console.log('\n=================== SUMMARY ===================');
for (const res of results) {
  const icon = res.success ? '✅' : '❌';
  console.log(`${icon} ${res.fileName.padEnd(25)} | Passed: ${res.passed} | Failed: ${res.failed}`);
}
console.log('-----------------------------------------------');
console.log(`📊 COMBINED FINAL TOTAL: ${totalPassed} Passed | ${totalFailed} Failed`);
console.log('===============================================\n');

if (anySuiteFailed) {
  process.exit(1);
}
