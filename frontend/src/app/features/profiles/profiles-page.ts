import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfilesService } from './profiles.service';
import { TemplatesService } from '../templates/templates.service';
import { SessionService } from '../../core/session.service';
import { ProfileModel, ProfileRoomInput } from '../../models/profile.model';
import { TemplateModel } from '../../models/template.model';
import { ApiError } from '../../models/api-error.model';
import { ErrorBanner } from '../../shared/error-banner';

interface RoomRow {
  type: string;
  count: number;
  minM2?: number | null;
  idealM2?: number | null;
  maxM2?: number | null;
  minSideM?: number | null;
}

@Component({
  selector: 'app-profiles-page',
  standalone: true,
  imports: [FormsModule, ErrorBanner],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Home profiles</h1>
          <p class="muted">Your home rules: rooms, kitchen, baths. Snapshotted into projects.</p>
        </div>
        @if (userId()) {
          <button class="btn btn-primary" [disabled]="formOpen()" (click)="startNew()">
            New profile
          </button>
        }
      </div>

      @if (!userId()) {
        <div class="state state-info">Pick a user from the top bar to start.</div>
      }

      <app-error-banner [error]="error()" />

      @if (formOpen()) {
        <form class="card card-pad section-card" #form="ngForm" (ngSubmit)="submit()">
          <div class="grid-2">
            <div class="field">
              <label for="pname">Profile name</label>
              <input
                id="pname"
                name="pname"
                required
                [(ngModel)]="draft.name"
                placeholder="e.g. My 2BHK"
              />
            </div>
            <div class="field">
              <label for="ptemplate">Template</label>
              <select
                id="ptemplate"
                name="ptemplate"
                required
                [(ngModel)]="draft.templateId"
                (ngModelChange)="onTemplateChange()"
              >
                @for (template of templates(); track template.id) {
                  <option [value]="template.id">
                    {{ template.name }} (v{{ template.version }})
                  </option>
                }
              </select>
            </div>
            <div class="field">
              <label for="pfloors">Floors</label>
              <select id="pfloors" name="pfloors" required [(ngModel)]="draft.floors">
                @for (n of [1, 2, 3]; track n) {
                  <option [ngValue]="n">{{ n }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="pmaxcoverage">Max coverage (fraction, optional)</label>
              <input
                id="pmaxcoverage"
                name="pmaxcoverage"
                type="number"
                min="0"
                max="1"
                step="0.01"
                [(ngModel)]="draft.maxCoverage"
              />
            </div>
          </div>

          <h3 style="margin-top: 1rem">Rooms</h3>
          <table class="list">
            <thead>
              <tr>
                <th>Type</th>
                <th>Count</th>
                <th>Min m²</th>
                <th>Ideal m²</th>
                <th>Max m²</th>
                <th>Min side m</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (room of draft.rooms; track $index) {
                <tr>
                  <td>
                    <input
                      class="compact"
                      name="room-type-{{ $index }}"
                      required
                      [(ngModel)]="room.type"
                      placeholder="type"
                    />
                  </td>
                  <td>
                    <input
                      class="compact"
                      name="room-count-{{ $index }}"
                      type="number"
                      min="1"
                      max="8"
                      [(ngModel)]="room.count"
                    />
                  </td>
                  <td>
                    <input
                      class="compact"
                      name="room-min-{{ $index }}"
                      type="number"
                      min="0"
                      step="0.5"
                      [(ngModel)]="room.minM2"
                    />
                  </td>
                  <td>
                    <input
                      class="compact"
                      name="room-ideal-{{ $index }}"
                      type="number"
                      min="0"
                      step="0.5"
                      [(ngModel)]="room.idealM2"
                    />
                  </td>
                  <td>
                    <input
                      class="compact"
                      name="room-max-{{ $index }}"
                      type="number"
                      min="0"
                      step="0.5"
                      [(ngModel)]="room.maxM2"
                    />
                  </td>
                  <td>
                    <input
                      class="compact"
                      name="room-side-{{ $index }}"
                      type="number"
                      min="0"
                      step="0.1"
                      [(ngModel)]="room.minSideM"
                    />
                  </td>
                  <td>
                    <button
                      class="btn btn-danger btn-sm"
                      type="button"
                      (click)="removeRoom($index)"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="row">
            @for (type of suggestedTypes(); track type) {
              <button class="btn btn-sm" type="button" (click)="addSuggested(type)">
                + {{ type }}
              </button>
            }
            <button class="btn btn-sm" type="button" (click)="addRoom()">+ custom</button>
          </div>

          <div class="grid-2" style="margin-top: 1rem">
            <div class="stack">
              <h3>Kitchen</h3>
              <div class="field">
                <label for="kcounter">Counter min (m)</label>
                <input
                  id="kcounter"
                  name="kcounter"
                  type="number"
                  min="0"
                  step="0.1"
                  [(ngModel)]="draft.kitchen.counterMinM"
                />
              </div>
              <div class="field">
                <label for="kideal">Ideal m²</label>
                <input
                  id="kideal"
                  name="kideal"
                  type="number"
                  min="0"
                  step="0.5"
                  [(ngModel)]="draft.kitchen.idealM2"
                />
              </div>
            </div>
            <div class="stack">
              <h3>Bath &amp; mandatory</h3>
              <div class="check-row">
                <input
                  id="ensuite"
                  name="ensuite"
                  type="checkbox"
                  [(ngModel)]="draft.bath.ensuite"
                />
                <label for="ensuite">Ensuite master bath</label>
              </div>
              <div class="field">
                <label for="commonBaths">Common baths</label>
                <input
                  id="commonBaths"
                  name="commonBaths"
                  type="number"
                  min="0"
                  max="4"
                  [(ngModel)]="draft.bath.commonBaths"
                />
              </div>
              <div class="field">
                <label for="wcPerFloor">WC per floor</label>
                <input
                  id="wcPerFloor"
                  name="wcPerFloor"
                  type="number"
                  min="0"
                  max="2"
                  [(ngModel)]="draft.bath.wcPerFloor"
                />
              </div>
              <div class="field">
                <label for="indoorCars">Indoor parking cars</label>
                <input
                  id="indoorCars"
                  name="indoorCars"
                  type="number"
                  min="0"
                  max="4"
                  [(ngModel)]="draft.mandatory.indoorCars"
                />
              </div>
            </div>
          </div>

          <div class="row" style="margin-top: 1rem">
            <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : editingId() ? 'Update profile' : 'Create profile' }}
            </button>
            <button class="btn" type="button" (click)="closeForm()">Cancel</button>
          </div>
        </form>
      }

      @if (profiles().length > 0) {
        <div class="split">
          <table class="list">
            <thead>
              <tr>
                <th>Name</th>
                <th>Floors</th>
                <th>Rooms</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (profile of profiles(); track profile.id) {
                <tr>
                  <td>
                    <strong>{{ profile.name }}</strong>
                    <div class="muted">{{ profile.templateSnapshot.name }}</div>
                  </td>
                  <td>{{ profile.floors }}</td>
                  <td>
                    @for (room of profile.rooms; track $index) {
                      @if ($index < 4) {
                        <span class="badge badge-muted"
                          >{{ room.type }}&times;{{ room.count }}</span
                        >
                      }
                    }
                  </td>
                  <td><button class="btn btn-sm" (click)="startEdit(profile)">Edit</button></td>
                  <td>
                    <button class="btn btn-danger btn-sm" (click)="remove(profile)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (userId() && !formOpen()) {
        <p class="muted">No profiles yet — create one to use in projects.</p>
      }
    </div>
  `,
  styles: `
    input.compact {
      width: 100%;
      min-width: 64px;
      font-size: 0.8rem;
      padding: 0.25rem 0.4rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
  `,
})
export class ProfilesPage implements OnInit {
  private readonly service = inject(ProfilesService);
  private readonly templatesService = inject(TemplatesService);
  readonly session = inject(SessionService);

  protected profiles = signal<ProfileModel[]>([]);
  protected templates = signal<TemplateModel[]>([]);
  protected error = signal<ApiError | null>(null);
  protected saving = signal(false);
  protected formOpen = signal(false);
  protected editingId = signal<string | null>(null);

  protected userId = this.session.activeUserId.asReadonly();

  protected draft: Draft = this.emptyDraft();

  async ngOnInit(): Promise<void> {
    try {
      this.templates.set(await this.templatesService.list());
    } catch (err) {
      this.error.set(err as ApiError);
    }
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
      this.profiles.set(await this.service.listByUser(uid));
      this.error.set(null);
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }

  protected startNew(): void {
    this.draft = this.emptyDraft();
    this.formOpen.set(true);
    this.editingId.set(null);
  }

  async startEdit(profile: ProfileModel): Promise<void> {
    this.editingId.set(profile.id);
    this.formOpen.set(true);
    this.draft = {
      name: profile.name,
      templateId: profile.templateId ?? this.templates()[0]?.id ?? '',
      floors: profile.floors,
      maxCoverage: profile.maxCoverage,
      rooms: profile.rooms.map((room) => ({
        type: room.type,
        count: room.count,
        minM2: room.minM2 ?? null,
        idealM2: room.idealM2 ?? null,
        maxM2: room.maxM2 ?? null,
        minSideM: room.minSideMm ? Number((room.minSideMm / 1000).toFixed(2)) : null,
      })),
      kitchen: {
        counterMinM: profile.kitchen.counterMinMm / 1000,
        idealM2: profile.kitchen.idealM2,
      },
      bath: {
        ensuite: profile.bathConnectivity.ensuite,
        commonBaths: profile.bathConnectivity.commonBaths,
        wcPerFloor: profile.bathConnectivity.wcPerFloor,
      },
      mandatory: {
        indoorCars: profile.mandatoryRequirements.indoorParking.cars,
      },
    };
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  protected onTemplateChange(): void {
    const template = this.templates().find((t) => t.id === this.draft.templateId);
    if (!template || this.draft.rooms.length > 0) {
      return;
    }
    this.draft.rooms = Object.keys(template.roomDefaults).map((type) => ({
      type,
      count: 1,
      minM2: null,
      idealM2: null,
      maxM2: null,
      minSideM: null,
    }));
    this.draft.kitchen = {
      counterMinM: template.kitchenDefaults.counterMinMm / 1000,
      idealM2: template.kitchenDefaults.idealM2,
    };
  }

  protected suggestedTypes(): string[] {
    const template = this.templates().find((t) => t.id === this.draft.templateId);
    if (!template) {
      return [];
    }
    return Object.keys(template.roomDefaults).filter(
      (type) => !this.draft.rooms.some((room) => room.type === type),
    );
  }

  protected addRoom(): void {
    this.draft.rooms = [...this.draft.rooms, this.newRoomRow()];
  }

  protected addSuggested(type: string): void {
    this.draft.rooms = [...this.draft.rooms, this.newRoomRow(type)];
  }

  protected removeRoom(index: number): void {
    this.draft.rooms = this.draft.rooms.filter((_, i) => i !== index);
  }

  protected async submit(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const rooms: ProfileRoomInput[] = this.draft.rooms
        .filter((room) => room.type.trim().length > 0)
        .map((room) => ({
          type: room.type.trim(),
          count: room.count,
          minM2: toNumberOrUndef(room.minM2),
          idealM2: toNumberOrUndef(room.idealM2),
          maxM2: toNumberOrUndef(room.maxM2),
          minSideM: toNumberOrUndef(room.minSideM),
        }));
      if (rooms.length === 0) {
        this.error.set(new ApiError({ code: 'VALIDATION', message: 'Add at least one room type' }));
        return;
      }
      const payload = {
        userId: uid,
        name: this.draft.name.trim(),
        templateId: this.draft.templateId,
        floors: this.draft.floors,
        rooms,
        kitchen: {
          counterMinM: toNumberOrUndef(this.draft.kitchen.counterMinM),
          idealM2: toNumberOrUndef(this.draft.kitchen.idealM2),
        },
        bathConnectivity: {
          ensuite: this.draft.bath.ensuite,
          commonBaths: this.draft.bath.commonBaths,
          wcPerFloor: this.draft.bath.wcPerFloor,
        },
        mandatory: {
          indoorParking: {
            required: this.draft.mandatory.indoorCars > 0,
            cars: this.draft.mandatory.indoorCars,
          },
        },
        maxCoverage: this.draft.maxCoverage,
      };
      const editId = this.editingId();
      if (editId) {
        await this.service.update(editId, payload);
      } else {
        await this.service.create(payload);
      }
      this.closeForm();
      await this.load();
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(profile: ProfileModel): Promise<void> {
    if (!window.confirm(`Delete profile "${profile.name}"?`)) {
      return;
    }
    try {
      await this.service.remove(profile.id);
      await this.load();
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }

  private emptyDraft(): Draft {
    return {
      name: '',
      templateId: '',
      floors: 2,
      maxCoverage: null,
      rooms: [this.newRoomRow('living'), this.newRoomRow('bed1')],
      kitchen: { counterMinM: 3.2, idealM2: 10 },
      bath: { ensuite: true, commonBaths: 1, wcPerFloor: 1 },
      mandatory: { indoorCars: 0 },
    };
  }

  private newRoomRow(type = ''): RoomRow {
    return { type, count: 1, minM2: null, idealM2: null, maxM2: null, minSideM: null };
  }
}

interface Draft {
  name: string;
  templateId: string;
  floors: number;
  maxCoverage: number | null;
  rooms: RoomRow[];
  kitchen: { counterMinM: number | null; idealM2: number | null };
  bath: { ensuite: boolean; commonBaths: number; wcPerFloor: number };
  mandatory: { indoorCars: number };
}

function toNumberOrUndef(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return undefined;
  }
  return Number(value);
}
