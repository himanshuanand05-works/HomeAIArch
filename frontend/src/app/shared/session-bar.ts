import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../core/session.service';
import { ApiError } from '../models/api-error.model';

@Component({
  selector: 'app-session-bar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bar">
      @if (hasUsers()) {
        <label for="active-user">Designing as</label>
        <select
          id="active-user"
          [ngModel]="session.activeUserId()"
          (ngModelChange)="onSelect($event)"
        >
          @for (user of session.users(); track user.id) {
            <option [value]="user.id">{{ user.name }} ({{ user.email }})</option>
          }
        </select>
      }
      @if (creating) {
        <input
          class="name-input"
          aria-label="New user name"
          placeholder="Name (e.g. Priya)"
          [(ngModel)]="newName"
        />
        <input
          class="name-input"
          aria-label="New user email"
          placeholder="Email"
          [(ngModel)]="newEmail"
        />
        <button class="btn btn-primary btn-sm" (click)="createUser()">Create</button>
        <button class="btn btn-sm" (click)="creating = false">Cancel</button>
      } @else if (hasUsers()) {
        <button class="btn btn-sm" (click)="creating = true">New user</button>
      }
      @if (error(); as err) {
        <span class="bar-error">{{ err.message }}</span>
      }
    </div>
  `,
  styles: `
    .bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      flex-wrap: wrap;
    }
    .bar label {
      color: var(--text-muted);
      font-weight: 600;
    }
    .bar select,
    .bar input.name-input {
      font-size: 0.8rem;
      padding: 0.25rem 0.45rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
    }
    .bar .bar-error {
      color: var(--danger);
    }
  `,
})
export class SessionBar {
  readonly session = inject(SessionService);

  protected creating = false;
  protected newName = '';
  protected newEmail = '';
  protected error = signal<ApiError | null>(null);

  protected hasUsers() {
    return this.session.users().length > 0;
  }

  protected onSelect(userId: string) {
    this.session.switchTo(userId).catch((err) => this.error.set(err as ApiError));
  }

  protected async createUser() {
    if (!this.newName.trim() || !this.newEmail.trim()) {
      this.error.set(new ApiError({ code: 'VALIDATION', message: 'Name and email are required' }));
      return;
    }
    try {
      const user = await this.session.createUser({
        name: this.newName.trim(),
        email: this.newEmail.trim(),
      });
      await this.session.switchTo(user.id);
      this.creating = false;
      this.newName = '';
      this.newEmail = '';
      this.error.set(null);
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }
}
