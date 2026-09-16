import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlotsService } from './plots.service';
import { SessionService } from '../../core/session.service';
import { LengthUnit, PlotModel } from '../../models/plot.model';
import { ApiError } from '../../models/api-error.model';
import { ErrorBanner } from '../../shared/error-banner';

@Component({
  selector: 'app-plots-page',
  standalone: true,
  imports: [FormsModule, ErrorBanner],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Plots</h1>
          <p class="muted">Your land dimensions. Converted to integer millimetres at the edge.</p>
        </div>
        @if (userId(); as uid) {
          <button class="btn btn-primary" [disabled]="editing()" (click)="startCreate()">
            Add plot
          </button>
        }
      </div>

      @if (!userId()) {
        <div class="state state-info">Pick a user from the top bar to start.</div>
      }

      <app-error-banner [error]="error()" />

      @if (creating()) {
        <form class="card card-pad section-card grid-2" #form="ngForm" (ngSubmit)="submit()">
          <div class="field">
            <label for="width">Width</label>
            <input
              id="width"
              type="number"
              min="1"
              step="0.01"
              required
              [(ngModel)]="draft.width"
              name="width"
            />
          </div>
          <div class="field">
            <label for="depth">Depth</label>
            <input
              id="depth"
              type="number"
              min="1"
              step="0.01"
              required
              [(ngModel)]="draft.depth"
              name="depth"
            />
          </div>
          <div class="field">
            <label for="unit">Unit</label>
            <select id="unit" name="unit" [(ngModel)]="draft.unit">
              <option value="M">Metres</option>
              <option value="FT">Feet</option>
            </select>
          </div>
          <div class="field">
            <label for="openSides">Open sides (1–4)</label>
            <select id="openSides" name="openSides" [(ngModel)]="draft.openSides">
              @for (n of [1, 2, 3, 4]; track n) {
                <option [ngValue]="n">{{ n }} side{{ n === 1 ? '' : 's' }}</option>
              }
            </select>
          </div>
          <div class="row">
            <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : 'Save plot' }}
            </button>
            <button class="btn" type="button" (click)="cancelCreate()">Cancel</button>
          </div>
        </form>
      }

      @if (plots().length > 0) {
        <table class="list card-pad">
          <thead>
            <tr>
              <th>Dimensions</th>
              <th>In millimetres</th>
              <th>Open sides</th>
              <th>Area</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (plot of plots(); track plot.id) {
              <tr>
                <td class="mono">{{ plot.widthRaw }} × {{ plot.depthRaw }} {{ plot.unit }}</td>
                <td class="mono">{{ plot.widthMm }} × {{ plot.depthMm }} mm</td>
                <td>{{ plot.openSides }}</td>
                <td class="mono">{{ ((plot.widthMm * plot.depthMm) / 1e6).toFixed(1) }} m²</td>
                <td>
                  <button class="btn btn-danger btn-sm" (click)="remove(plot)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else if (userId() && !creating()) {
        <p class="muted">No plots yet — add your first plot above.</p>
      }
    </div>
  `,
})
export class PlotsPage implements OnInit {
  private readonly service = inject(PlotsService);
  readonly session = inject(SessionService);

  protected plots = signal<PlotModel[]>([]);
  protected error = signal<ApiError | null>(null);
  protected creating = signal(false);
  protected editing = signal(false);
  protected saving = signal(false);

  protected draft = {
    width: 40,
    depth: 60,
    unit: 'FT' as LengthUnit,
    openSides: 3,
  };

  protected userId = this.session.activeUserId.asReadonly();

  async ngOnInit(): Promise<void> {
    if (this.userId()) {
      await this.load();
    }
  }

  protected async load(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    try {
      this.plots.set(await this.service.listByOwner(uid));
      this.error.set(null);
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }

  protected startCreate(): void {
    this.creating.set(true);
    this.editing.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
    this.editing.set(false);
  }

  protected async submit(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.service.create({
        ownerId: uid,
        width: Number(this.draft.width),
        depth: Number(this.draft.depth),
        unit: this.draft.unit,
        openSides: this.draft.openSides,
      });
      this.cancelCreate();
      await this.load();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.code === 'CONFLICT') {
        this.error.set(
          new ApiError({
            ...apiError,
            traceId: apiError.traceId ?? undefined,
            message: `${apiError.message} (try editing it instead)`,
          }),
        );
      } else {
        this.error.set(apiError);
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(plot: PlotModel): Promise<void> {
    if (!window.confirm(`Delete plot ${plot.widthRaw}×${plot.depthRaw} ${plot.unit}?`)) {
      return;
    }
    try {
      await this.service.remove(plot.id);
      await this.load();
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }
}
