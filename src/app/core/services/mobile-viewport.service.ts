import { DestroyRef, Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MobileViewportService {
  constructor() {
    const viewport = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty(
        '--app-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`,
      );
      document.documentElement.style.setProperty(
        '--app-viewport-top',
        `${viewport?.offsetTop ?? 0}px`,
      );
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    inject(DestroyRef).onDestroy(() => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    });
  }
}
