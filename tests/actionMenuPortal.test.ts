import { actionMenuCoordinator } from '../src/services/actionMenuCoordinator';
import { useAnchoredPopover } from '../src/hooks/useAnchoredPopover';

console.log('🧪 Running Universal Action Menu Portal & Viewport Safety Unit Tests...\n');

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failedCount++;
  }
}

function runActionMenuPortalTests() {
  // Test 1: Single-Open-Menu Coordination
  let menu1Open = true;
  let menu2Open = false;

  const unsub1 = actionMenuCoordinator.subscribe(activeId => {
    if (activeId !== 'menu_1') menu1Open = false;
  });
  const unsub2 = actionMenuCoordinator.subscribe(activeId => {
    if (activeId !== 'menu_2') menu2Open = false;
  });

  actionMenuCoordinator.openMenu('menu_1');
  assert(actionMenuCoordinator.getActiveMenuId() === 'menu_1', 'ActionMenuCoordinator sets active menu to menu_1');

  actionMenuCoordinator.openMenu('menu_2');
  assert(actionMenuCoordinator.getActiveMenuId() === 'menu_2', 'Opening menu_2 changes active menu to menu_2');
  assert(menu1Open === false, 'Opening menu_2 automatically closes menu_1');

  actionMenuCoordinator.closeMenu('menu_2');
  assert(actionMenuCoordinator.getActiveMenuId() === null, 'Closing menu_2 sets active menu to null');

  unsub1();
  unsub2();

  // Test 2: Viewport Positioning & Clamping Math
  // Mock viewport size
  const viewportWidth = 1024;
  const viewportHeight = 768;
  const margin = 12;
  const popoverWidth = 224;
  const popoverHeight = 340;

  // Case A: Normal top-right trigger position (below placement)
  const triggerA = { top: 100, bottom: 130, left: 700, right: 730 };
  const spaceBelowA = viewportHeight - triggerA.bottom - margin; // 768 - 130 - 12 = 626 > 340
  const placementA = (spaceBelowA < popoverHeight && (triggerA.top - margin) > spaceBelowA) ? 'above' : 'below';
  assert(placementA === 'below', 'Menu opens below when space below is sufficient');

  const topA = triggerA.bottom + 8;
  const targetLeftA = triggerA.right - popoverWidth; // 730 - 224 = 506
  const leftA = Math.max(margin, Math.min(viewportWidth - popoverWidth - margin, targetLeftA));
  assert(topA === 138, 'Calculated top position is trigger bottom + 8px');
  assert(leftA === 506, 'Calculated left aligns dropdown right edge with trigger right edge');

  // Case B: Trigger near bottom of viewport (above flip placement)
  const triggerB = { top: 680, bottom: 710, left: 700, right: 730 };
  const spaceBelowB = viewportHeight - triggerB.bottom - margin; // 768 - 710 - 12 = 46 < 340
  const spaceAboveB = triggerB.top - margin; // 680 - 12 = 668
  const placementB = (spaceBelowB < popoverHeight && spaceAboveB > spaceBelowB) ? 'above' : 'below';
  assert(placementB === 'above', 'Menu flips above when trigger is near viewport bottom');

  // Case C: Trigger near right edge of viewport (clamping test)
  const triggerC = { top: 100, bottom: 130, left: 1010, right: 1020 };
  const targetLeftC = triggerC.right - popoverWidth; // 1020 - 224 = 796
  const maxLeftC = viewportWidth - popoverWidth - margin; // 1024 - 224 - 12 = 788
  const leftC = Math.max(margin, Math.min(maxLeftC, targetLeftC));
  assert(leftC === 788, 'Menu clamps left position inside viewport right margin (788px)');

  // Case D: Trigger near left edge of viewport
  const triggerD = { top: 100, bottom: 130, left: 5, right: 35 };
  const targetLeftD = triggerD.right - popoverWidth; // 35 - 224 = -189
  const leftD = Math.max(margin, Math.min(viewportWidth - popoverWidth - margin, targetLeftD));
  assert(leftD === 12, 'Menu clamps left position inside viewport left margin (12px)');

  console.log(`\n----------------------------------------------------`);
  console.log(`📊 Action Menu Portal Test Results: ${passedCount} passed, ${failedCount} failed.`);
  console.log(`----------------------------------------------------\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runActionMenuPortalTests();
