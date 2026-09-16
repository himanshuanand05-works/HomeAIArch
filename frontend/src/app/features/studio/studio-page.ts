import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectsService } from '../projects/projects.service';
import { DesignsService } from './designs.service';
import { ProjectModel } from '../../models/project.model';
import { DesignVersionSummary, DesignView, Room } from '../../models/design.model';
import { ApiError } from '../../models/api-error.model';
import { ErrorBanner } from '../../shared/error-banner';
import { FloorPlan } from './floor-plan';
import { MetricsPanel } from './metrics-panel';
import { ChangeRequestForm } from './change-request-form';

@Component({
  selector: 'app-studio-page',
  standalone: true,
  imports: [RouterLink, FormsModule, ErrorBanner, FloorPlan, MetricsPanel, ChangeRequestForm],
  template: `
    <div class="page">
      @if (project(); as project) {
        <div class="page-head">
          <div>
            <h1>{{ project.name }}</h1>
            <p class="muted">
              Plot {{ project.plotSnapshot.widthMm / 1000 }} ×
              {{ project.plotSnapshot.depthMm / 1000 }} m ·
              {{ project.prefsSnapshot.floors }} floors ·
              {{ project.prefsSnapshot.rooms.length }} room type(s)
            </p>
          </div>
          <a class="btn" routerLink="/projects">All projects</a>
        </div>
      }

      <app-error-banner [error]="error()" />

      @if (loading()) {
        <p class="muted">Loading studio…</p>
      } @else if (designs().length === 0) {
        <section class="card card-pad section-card">
          <h2>No designs yet</h2>
          <p class="muted">
            Generate version 1. The seed makes the result reproducible — reuse it later to see how a
            change request moved things.
          </p>
          <div class="row">
            <label class="field" style="max-width: 180px">
              <span>Seed (optional)</span>
              <input type="number" [ngModel]="seed()" (ngModelChange)="seed.set($event)" />
            </label>
            <button class="btn btn-primary" [disabled]="busy()" (click)="generate()">
              {{ busy() ? 'Generating…' : 'Generate version 1' }}
            </button>
          </div>
        </section>
      } @else {
        <div class="split">
          <section>
            <div class="card card-pad section-card">
              <div class="spread">
                <h2>
                  Version {{ active()?.versionNumber ?? '—' }}
                  @if (active()?.parentId) {
                    <span class="badge badge-muted">child</span>
                  } @else {
                    <span class="badge badge-success">root</span>
                  }
                </h2>
                <div class="floors">
                  @for (floor of floors(); track floor.floorNumber) {
                    <button
                      class="floor-tab"
                      [class.active]="floor.floorNumber === floorNumber()"
                      (click)="floorNumber.set(floor.floorNumber)"
                    >
                      {{ floor.name }}
                    </button>
                  }
                </div>
              </div>

              <app-floor-plan
                [layout]="active()?.layout ?? null"
                [floorNumber]="floorNumber()"
                [highlightRoomIds]="highlight()"
                (roomClick)="selectRoom($event)"
              />

              @if (selectedRoom(); as room) {
                <div class="room-info">
                  <strong>{{ room.label }}</strong> · <span class="mono">{{ room.type }}</span> ·
                  {{ (room.areaMm2 / 1e6).toFixed(1) }} m²
                  @if (room.props?.counterMinMm) {
                    <span> · counter ≥ {{ (room.props?.counterMinMm ?? 0) / 1000 }} m</span>
                  }
                  @if (room.props?.parkingCars) {
                    <span> · {{ room.props?.parkingCars }} car(s)</span>
                  }
                </div>
              }
            </div>

            <div class="card card-pad section-card">
              <h3>Metrics</h3>
              <app-metrics-panel
                [metrics]="active()?.layout?.metrics ?? null"
                [elapsedMs]="elapsedMs()"
              />
            </div>
          </section>

          <aside>
            <div class="card card-pad section-card">
              <h3>Iterate</h3>
              <p class="muted">Branch a new version from v{{ active()?.versionNumber }}.</p>
              <app-change-request-form
                [layout]="active()?.layout ?? null"
                (iterate)="iterate($event)"
              />
            </div>

            <div class="card card-pad section-card">
              <h3>History</h3>
              <ol class="history">
                @for (design of designs(); track design.id) {
                  <li [class.active]="design.versionNumber === active()?.versionNumber">
                    <button (click)="selectVersion(design.versionNumber)">
                      <span>v{{ design.versionNumber }}</span>
                      <span class="muted">
                        {{ design.metrics ? design.metrics.score.toFixed(1) : '—' }} score
                      </span>
                    </button>
                  </li>
                }
              </ol>
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .floors {
      display: flex;
      gap: 0.3rem;
      flex-wrap: wrap;
    }
    .floor-tab {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: var(--radius-sm);
      padding: 0.25rem 0.6rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .floor-tab.active {
      background: var(--primary-soft);
      color: var(--primary-dark);
      border-color: var(--primary);
      font-weight: 600;
    }
    .room-info {
      margin-top: 0.6rem;
      padding: 0.5rem 0.7rem;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
    }
    .history {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .history button {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: var(--radius-sm);
      padding: 0.35rem 0.6rem;
      font-size: 0.82rem;
      color: var(--text);
    }
    .history li.active button {
      border-color: var(--primary);
      background: var(--primary-soft);
      font-weight: 600;
    }
  `,
})
export class StudioPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectsService);
  private readonly designsService = inject(DesignsService);

  protected project = signal<ProjectModel | null>(null);
  protected designs = signal<DesignVersionSummary[]>([]);
  protected active = signal<DesignView | null>(null);
  protected loading = signal(true);
  protected busy = signal(false);
  protected error = signal<ApiError | null>(null);
  protected floorNumber = signal(1);
  protected selectedRoomId = signal<string | null>(null);
  protected seed = signal<number | null>(null);

  protected readonly floors = computed(() => this.active()?.layout?.floors ?? []);
  protected readonly highlight = computed(() => {
    const id = this.selectedRoomId();
    return id ? [id] : [];
  });
  protected readonly selectedRoom = computed<Room | null>(() => {
    const id = this.selectedRoomId();
    if (!id) {
      return null;
    }
    for (const floor of this.active()?.layout?.floors ?? []) {
      const room = floor.rooms.find((r) => r.roomId === id);
      if (room) {
        return room;
      }
    }
    return null;
  });

  private projectId = '';

  async ngOnInit(): Promise<void> {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? '';
    try {
      const [project, designs] = await Promise.all([
        this.projectsService.findById(this.projectId),
        this.designsService.list(this.projectId),
      ]);
      this.project.set(project);
      this.designs.set(designs);
      if (designs.length > 0) {
        await this.selectVersion(designs[designs.length - 1].versionNumber);
      }
      this.error.set(null);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loading.set(false);
    }
  }

  protected elapsedMs(): number | null {
    const diagnostics = this.active()?.diagnostics;
    return diagnostics?.elapsedMs ?? null;
  }

  protected async generate(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const design = await this.designsService.generate(this.projectId, {
        seed: this.seed(),
      });
      await this.reloadAndSelect(design.versionNumber);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.busy.set(false);
    }
  }

  protected async iterate(event: {
    changeRequest: import('../../models/change-request.model').ChangeRequest;
    seed: number | null;
  }): Promise<void> {
    const parent = this.active();
    if (!parent) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const design = await this.designsService.iterate(this.projectId, parent.versionNumber, {
        changeRequest: event.changeRequest,
        seed: event.seed,
      });
      await this.reloadAndSelect(design.versionNumber);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.busy.set(false);
    }
  }

  protected async selectVersion(versionNumber: number): Promise<void> {
    this.error.set(null);
    try {
      const design = await this.designsService.get(this.projectId, versionNumber);
      this.active.set(design);
      this.selectedRoomId.set(null);
      const firstFloor = design.layout.floors[0]?.floorNumber ?? 1;
      if (!design.layout.floors.some((f) => f.floorNumber === this.floorNumber())) {
        this.floorNumber.set(firstFloor);
      }
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }

  protected selectRoom(roomId: string): void {
    this.selectedRoomId.set(this.selectedRoomId() === roomId ? null : roomId);
  }

  private async reloadAndSelect(versionNumber: number): Promise<void> {
    const designs = await this.designsService.list(this.projectId);
    this.designs.set(designs);
    await this.selectVersion(versionNumber);
  }
}
