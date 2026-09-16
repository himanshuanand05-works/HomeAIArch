import { Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChangeRequest, OverrideRoomInput, AddRoomInput } from '../../models/change-request.model';
import { Layout, roomTypesIn } from '../../models/design.model';

type Operation = 'remove' | 'add' | 'override' | 'coverage';

@Component({
  selector: 'app-change-request-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="stack">
      <div class="row">
        <label for="cr-op">Operation</label>
        <select id="cr-op" [ngModel]="op()" (ngModelChange)="op.set($event)">
          <option value="remove">Remove room types</option>
          <option value="add">Add a room</option>
          <option value="override">Override room bounds</option>
          <option value="coverage">Cap coverage</option>
        </select>
      </div>

      @switch (op()) {
        @case ('remove') {
          <div>
            <div class="muted" style="margin-bottom: 0.4rem">In the current layout:</div>
            <div class="chips">
              @for (type of presentTypes(); track type) {
                <span class="chip">
                  {{ type }}
                  <button type="button" aria-label="remove {{ type }}" (click)="toggleRemove(type)">
                    {{ isSelected(type) ? '✓' : '+' }}
                  </button>
                </span>
              }
            </div>
          </div>
        }
        @case ('add') {
          <div class="grid-2">
            <div class="field">
              <label for="cr-add-type">Type</label>
              <input id="cr-add-type" [(ngModel)]="add.type" placeholder="e.g. study" />
            </div>
            <div class="field">
              <label for="cr-add-count">Count</label>
              <input id="cr-add-count" type="number" min="1" max="8" [(ngModel)]="add.count" />
            </div>
            <div class="field">
              <label for="cr-add-min">Min m²</label>
              <input id="cr-add-min" type="number" min="0" step="0.5" [(ngModel)]="add.minM2" />
            </div>
            <div class="field">
              <label for="cr-add-ideal">Ideal m²</label>
              <input id="cr-add-ideal" type="number" min="0" step="0.5" [(ngModel)]="add.idealM2" />
            </div>
            <div class="field">
              <label for="cr-add-max">Max m²</label>
              <input id="cr-add-max" type="number" min="0" step="0.5" [(ngModel)]="add.maxM2" />
            </div>
            <div class="field">
              <label for="cr-add-min-side">Min side m</label>
              <input
                id="cr-add-min-side"
                type="number"
                min="0"
                step="0.1"
                [(ngModel)]="add.minSideM"
              />
            </div>
          </div>
        }
        @case ('override') {
          <div class="grid-2">
            <div class="field">
              <label for="cr-ride-type">Room type</label>
              <select id="cr-ride-type" [(ngModel)]="override.type">
                @for (type of presentTypes(); track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="cr-ov-min">Min m²</label>
              <input id="cr-ov-min" type="number" min="0" step="0.5" [(ngModel)]="override.minM2" />
            </div>
            <div class="field">
              <label for="cr-ov-ideal">Ideal m²</label>
              <input
                id="cr-ov-ideal"
                type="number"
                min="0"
                step="0.5"
                [(ngModel)]="override.idealM2"
              />
            </div>
            <div class="field">
              <label for="cr-ov-max">Max m²</label>
              <input id="cr-ov-max" type="number" min="0" step="0.5" [(ngModel)]="override.maxM2" />
            </div>
          </div>
        }
        @case ('coverage') {
          <div class="field">
            <label for="cr-coverage">Max plot coverage (0–1)</label>
            <input
              id="cr-coverage"
              type="number"
              min="0"
              max="1"
              step="0.01"
              [(ngModel)]="coverageValue"
            />
          </div>
        }
      }

      <div class="field">
        <label for="cr-seed">Seed (determinism — reuse to reproduce)</label>
        <input id="cr-seed" type="number" [(ngModel)]="seed" />
      </div>

      <button class="btn btn-primary" [disabled]="!canSubmit()" (click)="submit()">
        Iterate → new version
      </button>
    </div>
  `,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
  `,
})
export class ChangeRequestForm {
  readonly layout = signal<Layout | null>(null);
  readonly busy = signal(false);
  readonly iterate = output<{ changeRequest: ChangeRequest; seed: number | null }>();

  protected op = signal<Operation>('remove');

  protected add = {
    type: '',
    count: 1,
    minM2: null as number | null,
    idealM2: null as number | null,
    maxM2: null as number | null,
    minSideM: null as number | null,
  };
  protected override = {
    type: '',
    minM2: null as number | null,
    idealM2: null as number | null,
    maxM2: null as number | null,
  };
  protected removeTypes = signal<string[]>([]);
  protected coverageValue: number | null = null;
  protected seed: number | null = null;

  protected presentTypes = computed(() => {
    const layout = this.layout();
    return layout ? roomTypesIn(layout) : [];
  });

  protected isSelected(type: string): boolean {
    return this.removeTypes().includes(type);
  }

  protected toggleRemove(type: string): void {
    const current = this.removeTypes();
    this.removeTypes.set(
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  }

  protected canSubmit(): boolean {
    if (this.op() === 'remove') {
      return this.removeTypes().length > 0;
    }
    if (this.op() === 'add') {
      return this.add.type.trim().length > 0;
    }
    if (this.op() === 'override') {
      return this.override.type.length > 0;
    }
    return this.coverageValue !== null && this.coverageValue !== undefined;
  }

  protected submit(): void {
    const changeRequest = this.build();
    if (!changeRequest) {
      return;
    }
    this.iterate.emit({ changeRequest, seed: this.seed });
    this.removeTypes.set([]);
  }

  private build(): ChangeRequest {
    switch (this.op()) {
      case 'remove':
        return { removeTypes: [...this.removeTypes()] };
      case 'add':
        return {
          addRooms: [this.buildAddRoom()],
        };
      case 'override':
        return { overrideRooms: [this.buildOverrideRoom()] };
      case 'coverage':
        return this.coverageValue !== null && this.coverageValue !== undefined
          ? { maxCoverage: Number(this.coverageValue) }
          : {};
      default:
        return {};
    }
  }

  private buildAddRoom(): AddRoomInput {
    return {
      type: this.add.type.trim(),
      count: this.add.count,
      minMm2: optionalMm2(this.add.minM2),
      idealMm2: optionalMm2(this.add.idealM2),
      maxMm2: optionalMm2(this.add.maxM2),
      minSideMm:
        this.add.minSideM !== undefined &&
        this.add.minSideM !== null &&
        !Number.isNaN(this.add.minSideM)
          ? Math.round(this.add.minSideM * 1000)
          : undefined,
    };
  }

  private buildOverrideRoom(): OverrideRoomInput {
    return {
      type: this.override.type,
      minMm2: optionalMm2(this.override.minM2),
      idealMm2: optionalMm2(this.override.idealM2),
      maxMm2: optionalMm2(this.override.maxM2),
    };
  }
}

function optionalMm2(value: number | null | undefined): number | undefined {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  return Math.round(value * 1_000_000);
}
