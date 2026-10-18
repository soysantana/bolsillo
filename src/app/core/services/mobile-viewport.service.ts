import { DestroyRef, Injectable, inject } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';

@Injectable({ providedIn: 'root' })
export class MobileViewportService {
  constructor() {
    const viewport = window.visualViewport;
    let nativeKeyboardHeight = 0;
    const update = () => {
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportTop = viewport?.offsetTop ?? 0;
      const visualKeyboardHeight = Math.max(0, window.innerHeight - viewportHeight - viewportTop);
      const keyboardHeight = Math.max(nativeKeyboardHeight, visualKeyboardHeight);
      document.documentElement.style.setProperty(
        '--app-viewport-height',
        `${viewportHeight}px`,
      );
      document.documentElement.style.setProperty('--app-viewport-top', `${viewportTop}px`);
      document.documentElement.style.setProperty('--app-keyboard-height', `${keyboardHeight}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      nativeKeyboardHeight = info.keyboardHeight;
      update();
    }).catch(() => undefined);
    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      nativeKeyboardHeight = 0;
      update();
    }).catch(() => undefined);
    inject(DestroyRef).onDestroy(() => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      void showListener.then((listener) => listener?.remove());
      void hideListener.then((listener) => listener?.remove());
    });
  }
}
