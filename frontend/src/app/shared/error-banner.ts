import { Component, input, signal, effect } from '@angular/core';
import { ApiError, ConstraintViolationLike, ValidationIssue } from '../models/api-error.model';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  template: `
    @if (error(); as err) {
      <div class="state state-error" role="alert">
        <strong>{{ err.code }}</strong>
        @if (err.statusCode) {
          <span class="mono"> (HTTP {{ err.statusCode }})</span>
        }
        <div>{{ err.message }}</div>
        @if (constraintViolations().length > 0) {
          <div class="violations">
            @for (violation of constraintViolations(); track getKey($index)) {
              <div class="violation" [class]="'vio-' + violation.room ?? 'global'">
                <div>
                  <code>{{ violation.room ?? 'layout' }}</code>
                  <span>· {{ violation.constraint }}</span>
                </div>
                @if (violation.expected || violation.actual) {
                  <div class="mono">
                    expected {{ violation.expected ?? '—' }} · actual {{ violation.actual ?? '—' }}
                  </div>
                }
                @if (violation.hint) {
                  <div class="hint">💡 {{ violation.hint }}</div>
                }
              </div>
            }
          </div>
        }
        @if (issues().length > 0) {
          <div class="issues">
            @for (issue of issues(); track $index) {
              <div class="mono">
                {{ issue.path || issue.property }}:
                {{ issue.message || issue.constraints?.join(', ') }}
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .violations,
    .issues {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .violation {
      padding: 0.4rem 0.6rem;
      background: rgba(212, 60, 44, 0.08);
      border-left: 3px solid var(--danger);
      border-radius: var(--radius-sm);
    }
    .hint {
      color: var(--warning);
      margin-top: 0.2rem;
    }
    .issues div {
      font-size: 0.8rem;
    }
  `,
})
export class ErrorBanner {
  readonly error = input<ApiError | null>(null);

  protected constraintViolations = signal(undefined as ConstraintViolationLike[] | undefined);
  protected issues = signal(undefined as ValidationIssue[] | undefined);

  constructor() {
    effect(() => {
      const err = this.error();
      if (err) {
        if (err.code === 'UNSOLVABLE_LAYOUT') {
          this.constraintViolations.set(err.constraintViolations);
        } else {
          this.constraintViolations.set(undefined);
        }
        if (err.code === 'VALIDATION') {
          this.issues.set(err.validationIssues);
        } else {
          this.issues.set(undefined);
        }
      } else {
        this.constraintViolations.set(undefined);
        this.issues.set(undefined);
      }
    });
  }

  protected getKey(index: number) {
    return index;
  }
}
