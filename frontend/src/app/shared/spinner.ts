import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    @if (show()) {
      <div class="spinner" role="status" aria-label="Loading">
        <span class="dot" [style.--delay]="'0ms'"></span>
        <span class="dot" [style.--delay]="'120ms'"></span>
        <span class="dot" [style.--delay]="'240ms'"></span>
      </div>
    }
  `,
  styles: `
    .spinner {
      display: inline-flex;
      gap: 5px;
      padding: 0.75rem;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary);
      animation: bounce 0.9s infinite ease-in-out;
      animation-delay: var(--delay);
    }
    @keyframes bounce {
      0%,
      80%,
      100% {
        transform: translateY(0);
        opacity: 0.5;
      }
      40% {
        transform: translateY(-6px);
        opacity: 1;
      }
    }
  `,
})
export class Spinner {
  readonly show = input(true);
}
