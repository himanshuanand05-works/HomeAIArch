import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TemplateModel } from '../../models/template.model';

@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly api = inject(ApiService);

  async list(): Promise<TemplateModel[]> {
    return firstValueFrom(this.api.get<TemplateModel[]>('/templates'));
  }

  async findById(id: string): Promise<TemplateModel> {
    return firstValueFrom(this.api.get<TemplateModel>(`/templates/${id}`));
  }
}
