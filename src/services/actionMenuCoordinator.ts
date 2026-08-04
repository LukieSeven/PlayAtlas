type MenuId = string;
type CoordinatorListener = (activeMenuId: MenuId | null) => void;

class ActionMenuCoordinator {
  private activeMenuId: MenuId | null = null;
  private listeners: Set<CoordinatorListener> = new Set();

  public openMenu(id: MenuId): void {
    if (this.activeMenuId !== id) {
      this.activeMenuId = id;
      this.notify();
    }
  }

  public closeMenu(id?: MenuId): void {
    if (!id || this.activeMenuId === id) {
      this.activeMenuId = null;
      this.notify();
    }
  }

  public getActiveMenuId(): MenuId | null {
    return this.activeMenuId;
  }

  public subscribe(listener: CoordinatorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => {
      try {
        l(this.activeMenuId);
      } catch (err) {
        console.error('Error in ActionMenuCoordinator listener:', err);
      }
    });
  }
}

export const actionMenuCoordinator = new ActionMenuCoordinator();
