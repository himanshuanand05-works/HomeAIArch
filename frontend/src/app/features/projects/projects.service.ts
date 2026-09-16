import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CreateProjectPayload, ProjectModel } from '../../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(ApiService);

  async listByOwner(ownerId: string): Promise<ProjectModel[]> {
    return firstValueFrom(this.api.get<ProjectModel[]>('/projects', { ownerId }));
  }

  async findById(id: string): Promise<ProjectModel> {
    return firstValueFrom(this.api.get<ProjectModel>(`/projects/${id}`));
  }

  async create(payload: CreateProjectPayload): Promise<ProjectModel> {
    return firstValueFrom(this.api.post<ProjectModel>('/projects', payload));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/projects/${id}`));
  }
}
