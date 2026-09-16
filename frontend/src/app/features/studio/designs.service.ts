import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DesignVersionSummary, DesignView, GenerateDesignPayload } from '../../models/design.model';
import { IteratePayload } from '../../models/change-request.model';

@Injectable({ providedIn: 'root' })
export class DesignsService {
  private readonly api = inject(ApiService);

  async generate(projectId: string, payload: GenerateDesignPayload): Promise<DesignView> {
    return firstValueFrom(this.api.post<DesignView>(`/projects/${projectId}/designs`, payload));
  }

  async list(projectId: string): Promise<DesignVersionSummary[]> {
    return firstValueFrom(this.api.get<DesignVersionSummary[]>(`/projects/${projectId}/designs`));
  }

  async get(projectId: string, versionNumber: number): Promise<DesignView> {
    return firstValueFrom(
      this.api.get<DesignView>(`/projects/${projectId}/designs/${versionNumber}`),
    );
  }

  async iterate(
    projectId: string,
    parentVersionNumber: number,
    payload: IteratePayload,
  ): Promise<DesignView> {
    return firstValueFrom(
      this.api.post<DesignView>(
        `/projects/${projectId}/designs/${parentVersionNumber}/iterations`,
        payload,
      ),
    );
  }
}
