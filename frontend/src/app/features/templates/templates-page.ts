import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TemplatesService } from './templates.service';
import { TemplateModel } from '../../models/template.model';
import { ApiError } from '../../models/api-error.model';
import { ErrorBanner } from '../../shared/error-banner';

@Component({
  selector: 'app-templates-page',
  standalone: true,
  imports: [RouterLink, ErrorBanner],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Templates</h1>
          <p class="muted">Regional design standards that seed your home profile defaults.</p>
        </div>
      </div>

      <app-error-banner [error]="error()" />

      @if (loading()) {
        <p class="muted">Loading templates…</p>
      }

      <div class="grid-3">
        @for (template of templates(); track template.id) {
          <article class="card card-pad">
            <div class="spread">
              <h2>{{ template.name }}</h2>
              <span class="badge">v{{ template.version }}</span>
            </div>
            <p class="muted">
              {{ template.region ?? 'Standard' }} ·
              <span class="mono">{{ template.slug }}</span>
            </p>

            <div class="stack">
              <div class="kv">
                <span>Wall thickness</span><code>{{ template.wallThicknessMm / 1000 }} m</code>
              </div>
              <div class="kv">
                <span>Circulation ratio</span><code>{{ template.circulationRatio * 100 }}%</code>
              </div>
              <div class="kv">
                <span>Door width</span><code>{{ template.doorWidthMm / 1000 }} m</code>
              </div>
              @if (template.wallNote) {
                <div class="kv">
                  <span>Note</span><code>{{ template.wallNote }}</code>
                </div>
              }
              <div class="kv">
                <span>Staircase</span
                ><code
                  >{{ template.staircase.widthMm / 1000 }} ×
                  {{ template.staircase.depthMm / 1000 }} m</code
                >
              </div>
            </div>

            <h3 style="margin-top: 0.9rem">Room defaults</h3>
            <ul class="room-list">
              @for (room of roomEntries(template); track room[0]) {
                <li>
                  <code>{{ room[0] }}</code>
                  <span>
                    {{ room[1].idealM2 }} m² ideal · min side {{ room[1].minSideMm / 1000 }} m
                  </span>
                </li>
              }
            </ul>

            <h3 style="margin-top: 0.9rem">Kitchen</h3>
            <p class="muted" style="margin: 0">
              {{ template.kitchenDefaults.idealM2 }} m² ideal · counter ≥
              {{ template.kitchenDefaults.counterMinMm / 1000 }} m
            </p>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .kv {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 0.85rem;
    }
    .kv span {
      color: var(--text-muted);
    }
    .kv code {
      font-weight: 600;
    }
    .room-list {
      margin: 0.4rem 0 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .room-list li {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 0.82rem;
    }
    .room-list li span {
      color: var(--text-muted);
    }
  `,
})
export class TemplatesPage implements OnInit {
  private readonly service = inject(TemplatesService);

  protected templates = signal<TemplateModel[]>([]);
  protected loading = signal(true);
  protected error = signal<ApiError | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.templates.set(await this.service.list());
      this.error.set(null);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loading.set(false);
    }
  }

  protected roomEntries(
    template: TemplateModel,
  ): [string, TemplateModel['roomDefaults'][string]][] {
    return Object.entries(template.roomDefaults);
  }
}
