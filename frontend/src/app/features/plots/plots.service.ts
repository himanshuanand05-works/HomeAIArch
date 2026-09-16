import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CreatePlotPayload, PlotModel, UpdatePlotPayload } from '../../models/plot.model';

@Injectable({ providedIn: 'root' })
export class PlotsService {
  private readonly api = inject(ApiService);

  async listByOwner(ownerId: string): Promise<PlotModel[]> {
    return firstValueFrom(this.api.get<PlotModel[]>('/plots', { ownerId }));
  }

  async create(payload: CreatePlotPayload): Promise<PlotModel> {
    return firstValueFrom(this.api.post<PlotModel>('/plots', payload));
  }

  async update(id: string, payload: UpdatePlotPayload): Promise<PlotModel> {
    return firstValueFrom(this.api.patch<PlotModel>(`/plots/${id}`, payload));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(`/plots/${id}`));
  }
}
