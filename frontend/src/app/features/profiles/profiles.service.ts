import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  CreateProfilePayload,
  ProfileModel,
  UpdateProfilePayload,
} from '../../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  private readonly api = inject(ApiService);

  async listByUser(userId: string): Promise<ProfileModel[]> {
    return firstValueFrom(this.api.get<ProfileModel[]>('/profiles', { userId }));
  }

  async findById(id: string): Promise<ProfileModel> {
    return firstValueFrom(this.api.get<ProfileModel>(`/profiles/${id}`));
  }

  async create(payload: CreateProfilePayload): Promise<ProfileModel> {
    return firstValueFrom(this.api.post<ProfileModel>('/profiles', payload));
  }

  async update(id: string, payload: UpdateProfilePayload): Promise<ProfileModel> {
    return firstValueFrom(this.api.patch<ProfileModel>(`/profiles/${id}`, payload));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/profiles/${id}`));
  }
}
