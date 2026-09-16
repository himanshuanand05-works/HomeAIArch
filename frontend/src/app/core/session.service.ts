import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { CreateUserPayload, UserModel } from '../models/user.model';

const SESSION_KEY = 'homeaiarch.session.userId';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly users = signal<UserModel[]>([]);
  readonly activeUserId = signal<string | null>(this.readStored());

  private readonly api = inject(ApiService);

  constructor() {
    this.refreshUsers();
  }

  async refreshUsers(): Promise<void> {
    this.users.set(await firstValueFrom(this.api.get<UserModel[]>('/users')));
  }

  async createUser(payload: CreateUserPayload): Promise<UserModel> {
    const created = await firstValueFrom(this.api.post<UserModel>('/users', payload));
    await this.refreshUsers();
    return created;
  }

  async switchTo(userId: string): Promise<void> {
    this.activeUserId.set(userId);
    localStorage.setItem(SESSION_KEY, userId);
  }

  get activeUser(): UserModel | null {
    const id = this.activeUserId();
    return this.users().find((user) => user.id === id) ?? null;
  }

  get activeUserName(): string {
    const id = this.activeUserId();
    if (!id) {
      return 'No user selected';
    }
    const user = this.users().find((u) => u.id === id);
    return user ? `${user.name} (${user.email})` : `user ${id.slice(0, 8)}`;
  }

  get hasActiveUser(): boolean {
    return this.activeUserId() !== null;
  }

  private readStored(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(SESSION_KEY);
  }
}
