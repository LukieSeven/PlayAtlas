import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { actionMenuCoordinator } from '../src/services/actionMenuCoordinator';
import { UniversalActionMenu } from '../src/components/common/UniversalActionMenu';
import { personalDataRepository } from '../src/services/personalDataRepository';

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

// Lightweight DOM environment for React 19 component testing in Node CLI environment
function setupDomMock() {
  if (typeof globalThis.document !== 'undefined' && globalThis.document.body) return;

  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const listeners: Record<string, Function[]> = {};

  class MockElement {
    nodeType = 1;
    nodeName = 'DIV';
    tagName = 'DIV';
    style: Record<string, any> = {};
    attributes: Record<string, string> = {};
    children: MockElement[] = [];
    parentNode: MockElement | null = null;
    ownerDocument: any = null;
    _className: string = '';

    set className(val: string) {
      this._className = String(val);
      this.attributes['class'] = String(val);
    }
    get className() {
      return this._className || this.attributes['class'] || '';
    }

    appendChild(child: MockElement) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    insertBefore(child: MockElement, before: MockElement | null) {
      child.parentNode = this;
      const idx = before ? this.children.indexOf(before) : -1;
      if (idx !== -1) {
        this.children.splice(idx, 0, child);
      } else {
        this.children.push(child);
      }
      return child;
    }

    removeChild(child: MockElement) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }

    setAttribute(name: string, value: string) {
      const valStr = String(value);
      this.attributes[name] = valStr;
      (this as any)[name] = valStr;
      if (name === 'data-testid') {
        (this as any).testId = valStr;
      }
      if (name === 'class') {
        this._className = valStr;
      }
    }

    getAttribute(name: string) {
      return this.attributes[name] || (this as any)[name] || null;
    }

    removeAttribute(name: string) {
      delete this.attributes[name];
      delete (this as any)[name];
    }

    addEventListener(type: string, listener: Function) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: Function) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(l => l !== listener);
      }
    }

    dispatchEvent(event: any) {
      const type = typeof event === 'string' ? event : event.type;
      const list = [...(listeners[type] || [])];
      list.forEach(l => l(event));
      if (this.parentNode) {
        this.parentNode.dispatchEvent(event);
      } else if (this.ownerDocument && (this as any) !== this.ownerDocument) {
        this.ownerDocument.dispatchEvent(event);
      }
    }

    getBoundingClientRect() {
      return { top: 100, bottom: 130, left: 700, right: 730, width: 30, height: 30 };
    }

    contains(node: MockElement | null): boolean {
      let curr = node;
      while (curr) {
        if (curr === (this as any)) return true;
        curr = curr.parentNode;
      }
      return false;
    }

    querySelector(selector: string): MockElement | null {
      for (const child of this.children) {
        if (child.matches(selector)) return child;
        const found = child.querySelector(selector);
        if (found) return found;
      }
      return null;
    }

    querySelectorAll(selector: string): MockElement[] {
      let results: MockElement[] = [];
      for (const child of this.children) {
        if (child.matches(selector)) results.push(child);
        results = results.concat(child.querySelectorAll(selector));
      }
      return results;
    }

    matches(selector: string): boolean {
      const isDropdown = selector.includes('action-menu-dropdown');
      const isTrigger = selector.includes('action-menu-trigger');

      const testId = this.attributes['data-testid'] || (this as any)['data-testid'] || (this as any).testId || '';
      const cls = this.className || '';

      if (isDropdown && (testId === 'action-menu-dropdown' || cls.includes('themed-panel'))) return true;
      if (isTrigger && (testId === 'action-menu-trigger' || cls.includes('rounded-xl'))) return true;
      return false;
    }
  }

  const doc: any = {
    nodeType: 9,
    nodeName: '#document',
    body: new MockElement(),
    createElement(tag: string) {
      const el = new MockElement();
      el.nodeName = tag.toUpperCase();
      el.tagName = tag.toUpperCase();
      el.ownerDocument = doc;
      return el;
    },
    createElementNS(_ns: string, tag: string) {
      return this.createElement(tag);
    },
    createTextNode(text: string) {
      const el = new MockElement();
      el.nodeName = '#text';
      (el as any).textContent = text;
      el.ownerDocument = doc;
      return el;
    },
    addEventListener(type: string, listener: Function) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: Function) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(l => l !== listener);
      }
    },
    dispatchEvent(event: any) {
      const type = typeof event === 'string' ? event : event.type;
      const list = [...(listeners[type] || [])];
      list.forEach(l => l(event));
    },
  };

  doc.body.ownerDocument = doc;
  doc.body.nodeName = 'BODY';
  doc.body.tagName = 'BODY';

  const win: any = {
    document: doc,
    innerWidth: 1024,
    innerHeight: 768,
    HTMLElement: MockElement,
    HTMLInputElement: MockElement,
    HTMLButtonElement: MockElement,
    HTMLSelectElement: MockElement,
    HTMLDivElement: MockElement,
    HTMLIFrameElement: MockElement,
    HTMLAnchorElement: MockElement,
    Node: MockElement,
    DocumentFragment: MockElement,
    addEventListener(type: string, listener: Function) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: Function) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(l => l !== listener);
      }
    },
    dispatchEvent(event: any) {
      const type = typeof event === 'string' ? event : event.type;
      const list = [...(listeners[type] || [])];
      list.forEach(l => l(event));
    },
    requestAnimationFrame(cb: Function) {
      return setTimeout(cb, 0);
    },
    cancelAnimationFrame(id: any) {
      clearTimeout(id);
    },
  };

  doc.defaultView = win;

  (globalThis as any).window = win;
  (globalThis as any).document = doc;
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).HTMLInputElement = MockElement;
  (globalThis as any).HTMLButtonElement = MockElement;
  (globalThis as any).HTMLSelectElement = MockElement;
  (globalThis as any).HTMLDivElement = MockElement;
  (globalThis as any).HTMLIFrameElement = MockElement;
  (globalThis as any).HTMLAnchorElement = MockElement;
  (globalThis as any).Node = MockElement;
  (globalThis as any).DocumentFragment = MockElement;
  (globalThis as any).requestAnimationFrame = win.requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = win.cancelAnimationFrame;
  (globalThis as any).listeners = listeners;
}

async function runActionMenuPortalTests() {
  // Mock personalDataRepository for Node CLI environment
  personalDataRepository.getAll = async () => [];
  personalDataRepository.put = async () => {};
  personalDataRepository.delete = async () => {};

  setupDomMock();

  // Test 1: Coordinator Snapshot & Single-Source Open State Logic
  actionMenuCoordinator.closeMenu();
  assert(actionMenuCoordinator.getSnapshot() === null, 'Coordinator snapshot is null when no menu is active');

  actionMenuCoordinator.openMenu('test_menu_1');
  assert(actionMenuCoordinator.getSnapshot() === 'test_menu_1', 'Coordinator snapshot returns active menu ID');

  actionMenuCoordinator.openMenu('test_menu_2');
  assert(actionMenuCoordinator.getSnapshot() === 'test_menu_2', 'Opening menu 2 updates coordinator snapshot');

  actionMenuCoordinator.closeMenu('test_menu_2');
  assert(actionMenuCoordinator.getSnapshot() === null, 'Closing active menu clears coordinator snapshot');

  // Test 2: React Component Interaction & Portal Mounting Suite
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container as any);

  await act(async () => {
    root.render(
      React.createElement(
        'div',
        null,
        React.createElement(UniversalActionMenu, { gameId: 92550, gameTitle: 'Fable A' }),
        React.createElement(UniversalActionMenu, { gameId: 92551, gameTitle: 'Fable B' })
      )
    );
  });

  const triggers = container.querySelectorAll('action-menu-trigger');
  assert(triggers.length === 2, 'Rendered 2 UniversalActionMenu components into DOM');

  const triggerA = triggers[0];
  const triggerB = triggers[1];

  // 1. Click trigger A -> Menu A becomes active in coordinator
  await act(async () => {
    triggerA.dispatchEvent({ type: 'click', target: triggerA, stopPropagation() {} });
  });

  // Wait for RAF and microtasks
  await act(async () => {
    await new Promise(r => setTimeout(r, 20));
  });

  const dropdownA = document.body.querySelector('action-menu-dropdown');
  assert(Boolean(dropdownA), 'Portal dropdown A remains mounted under document.body after animation frame and microtask');

  // 2. Click inside dropdown A -> remains open
  if (dropdownA) {
    await act(async () => {
      dropdownA.dispatchEvent({ type: 'pointerdown', target: dropdownA, stopPropagation() {} });
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });
    const dropdownStillOpen = document.body.querySelector('action-menu-dropdown');
    assert(Boolean(dropdownStillOpen), 'Clicking inside dropdown does not close it');
  }

  // 3. Outside pointerdown click -> closes dropdown
  const outsideNode = document.createElement('div');
  document.body.appendChild(outsideNode);

  await act(async () => {
    document.dispatchEvent({ type: 'pointerdown', target: outsideNode, composedPath: () => [outsideNode, document.body] });
  });

  await act(async () => {
    await new Promise(r => setTimeout(r, 20));
  });

  const dropdownAfterOutsideClick = document.body.querySelector('action-menu-dropdown');
  assert(dropdownAfterOutsideClick === null, 'Clicking outside closes the dropdown menu');

  // 4. Re-open trigger A and press Escape
  await act(async () => {
    triggerA.dispatchEvent({ type: 'click', target: triggerA, stopPropagation() {} });
  });
  await act(async () => {
    await new Promise(r => setTimeout(r, 20));
  });

  assert(Boolean(document.body.querySelector('action-menu-dropdown')), 'Dropdown reopened on trigger click');

  await act(async () => {
    window.dispatchEvent({ type: 'keydown', key: 'Escape' });
  });

  assert(document.body.querySelector('action-menu-dropdown') === null, 'Pressing Escape key closes the dropdown menu');

  // 5. Open menu A, then open menu B -> Menu A closes, menu B opens (single open menu)
  await act(async () => {
    triggerA.dispatchEvent({ type: 'click', target: triggerA, stopPropagation() {} });
  });
  await act(async () => {
    await new Promise(r => setTimeout(r, 20));
  });

  await act(async () => {
    triggerB.dispatchEvent({ type: 'click', target: triggerB, stopPropagation() {} });
  });
  await act(async () => {
    await new Promise(r => setTimeout(r, 20));
  });

  const activeDropdowns = document.body.querySelectorAll('action-menu-dropdown');
  assert(activeDropdowns.length === 1, 'Only ONE menu remains open at a time');

  // Clean up
  await act(async () => {
    root.unmount();
  });

  console.log(`\n----------------------------------------------------`);
  console.log(`📊 Action Menu Interaction Test Results: ${passedCount} passed, ${failedCount} failed.`);
  console.log(`----------------------------------------------------\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runActionMenuPortalTests().catch(err => {
  console.error('Action menu portal test failed:', err);
  process.exit(1);
});
