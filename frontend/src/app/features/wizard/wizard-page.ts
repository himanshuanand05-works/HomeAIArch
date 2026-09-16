import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { TemplatesService } from '../templates/templates.service';
import { PlotsService } from '../plots/plots.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ProjectsService } from '../projects/projects.service';
import { TemplateModel } from '../../models/template.model';
import { LengthUnit, PlotModel } from '../../models/plot.model';
import { ProfileModel, ProfileRoomInput } from '../../models/profile.model';
import { ApiError } from '../../models/api-error.model';
import { ErrorBanner } from '../../shared/error-banner';

type Step = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-wizard-page',
  standalone: true,
  imports: [FormsModule, ErrorBanner, RouterLink],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>New project wizard</h1>
          <p class="muted">
            Template → Plot → Profile → Project. Each step saves to the backend as you go.
          </p>
        </div>
      </div>

      @if (!userId()) {
        <div class="state state-info">Pick a user from the top bar to start the wizard.</div>
      } @else {
        <app-error-banner [error]="error()" />

        <nav class="steps">
          @for (step of [1, 2, 3, 4]; track step) {
            <button
              class="step"
              [class.active]="step === current()"
              [class.done]="step < current()"
              type="button"
              (click)="goTo(step)"
            >
              {{ stepLabel(step) }}
            </button>
          }
        </nav>

        @switch (current()) {
          @case (1) {
            <section class="card card-pad section-card">
              <h2>1 · Regional template</h2>
              <div class="grid-3">
                @for (template of templates(); track template.id) {
                  <button
                    class="template-card"
                    [class.selected]="draft.templateId === template.id"
                    type="button"
                    (click)="pickTemplate(template)"
                  >
                    <strong>{{ template.name }}</strong>
                    <span class="muted">{{
                      template.wallNote ?? template.region ?? 'Standard'
                    }}</span>
                    <span class="muted">wall {{ template.wallThicknessMm / 1000 }} m</span>
                  </button>
                }
              </div>
              <div class="row">
                <button class="btn btn-primary" [disabled]="!draft.templateId" (click)="next()">
                  Next →
                </button>
              </div>
            </section>
          }
          @case (2) {
            <section class="card card-pad section-card">
              <h2>2 · Plot</h2>
              @if (plots().length > 0) {
                <div class="stack">
                  <label class="check-row">
                    <input
                      type="radio"
                      [checked]="draft.useExistingPlot"
                      name="plotPick"
                      (change)="draft.useExistingPlot = true"
                    />
                    Use an existing plot
                  </label>
                  <select [disabled]="!draft.useExistingPlot" [(ngModel)]="draft.plotId">
                    @for (plot of plots(); track plot.id) {
                      <option [value]="plot.id">
                        {{ plot.widthRaw }}×{{ plot.depthRaw }} {{ plot.unit }} ({{
                          plot.openSides
                        }}
                        sides)
                      </option>
                    }
                  </select>
                </div>
                <p class="muted">or</p>
              }
              <label class="check-row">
                <input
                  type="radio"
                  [checked]="!draft.useExistingPlot"
                  name="plotPick"
                  (change)="draft.useExistingPlot = false"
                />
                Define a new plot
              </label>
              @if (!plots().length) {
                <p class="muted">No plots yet — you'll create one here.</p>
              }
              <div class="form-grid" [class.hidden]="draft.useExistingPlot && plots().length > 0">
                <div class="field">
                  <label for="wz-plot-width">Width</label>
                  <input
                    id="wz-plot-width"
                    type="number"
                    min="1"
                    step="0.01"
                    [(ngModel)]="draft.newPlotWidth"
                  />
                </div>
                <div class="field">
                  <label for="wz-plot-depth">Depth</label>
                  <input
                    id="wz-plot-depth"
                    type="number"
                    min="1"
                    step="0.01"
                    [(ngModel)]="draft.newPlotDepth"
                  />
                </div>
                <div class="field">
                  <label for="wz-plot-unit">Unit</label>
                  <select id="wz-plot-unit" [(ngModel)]="draft.newPlotUnit">
                    <option value="M">Metres</option>
                    <option value="FT">Feet</option>
                  </select>
                </div>
                <div class="field">
                  <label for="wz-plot-open-sides">Open sides</label>
                  <select id="wz-plot-open-sides" [(ngModel)]="draft.newPlotOpenSides">
                    @for (n of [1, 2, 3, 4]; track n) {
                      <option [ngValue]="n">{{ n }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="row">
                <button class="btn" (click)="back()">← Back</button>
                <button class="btn btn-primary" [disabled]="busy()" (click)="next()">
                  {{ busy() ? 'Saving…' : 'Next →' }}
                </button>
              </div>
            </section>
          }
          @case (3) {
            <section class="card card-pad section-card">
              <h2>3 · Home profile</h2>
              @if (profiles().length > 0) {
                <div class="stack">
                  <label class="check-row">
                    <input
                      type="radio"
                      [checked]="draft.useExistingProfile"
                      name="profilePick"
                      (change)="draft.useExistingProfile = true"
                    />
                    Use existing profile
                  </label>
                  <select [disabled]="!draft.useExistingProfile" [(ngModel)]="draft.profileId">
                    @for (profile of profiles(); track profile.id) {
                      <option [value]="profile.id">
                        {{ profile.name }} ({{ profile.floors }} floors)
                      </option>
                    }
                  </select>
                </div>
                <p class="muted">or</p>
              }
              <label class="check-row">
                <input
                  type="radio"
                  [checked]="!draft.useExistingProfile"
                  name="profilePick"
                  (change)="draft.useExistingProfile = false"
                />
                Create from template {{ selectedTemplate()?.name ?? draft.templateId }}
              </label>
              <div
                class="form-grid"
                [class.hidden]="draft.useExistingProfile && profiles().length > 0"
              >
                <div class="field">
                  <label for="wz-profile-name">Name</label>
                  <input
                    id="wz-profile-name"
                    [(ngModel)]="draft.newProfileName"
                    placeholder="e.g. My {{ selectedTemplate()?.name ?? 'home' }}"
                  />
                </div>
                <div class="field">
                  <label for="wz-profile-floors">Floors</label>
                  <select id="wz-profile-floors" [(ngModel)]="draft.newProfileFloors">
                    @for (n of [1, 2, 3]; track n) {
                      <option [ngValue]="n">{{ n }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label for="wz-profile-rooms">Rooms (types)</label>
                  <input
                    id="wz-profile-rooms"
                    [(ngModel)]="draft.newProfileRoomTypes"
                    placeholder="living,dining,kitchen,bed1,bed2"
                  />
                </div>
                <div class="field">
                  <label for="wz-profile-counter">Kitchen counter min (m)</label>
                  <input
                    id="wz-profile-counter"
                    type="number"
                    min="0"
                    step="0.1"
                    [(ngModel)]="draft.newProfileCounter"
                  />
                </div>
              </div>
              <div class="row">
                <button class="btn" (click)="back()">← Back</button>
                <button class="btn btn-primary" [disabled]="busy()" (click)="next()">
                  {{ busy() ? 'Saving…' : 'Next →' }}
                </button>
              </div>
            </section>
          }
          @case (4) {
            <section class="card card-pad section-card">
              <h2>4 · Create project</h2>
              <dl class="summary">
                <div>
                  <dt>Template</dt>
                  <dd>{{ selectedTemplate()?.name ?? draft.templateId }}</dd>
                </div>
                <div>
                  <dt>Plot</dt>
                  <dd>{{ plotSummary() }}</dd>
                </div>
                <div>
                  <dt>Profile</dt>
                  <dd>{{ profileSummary() }}</dd>
                </div>
              </dl>
              <div class="field">
                <label for="wz-project-name">Project name (optional)</label>
                <input
                  id="wz-project-name"
                  [(ngModel)]="draft.projectName"
                  placeholder="e.g. Our new home"
                />
              </div>
              @if (created(); as project) {
                <div class="state state-info">
                  Project created —
                  <a routerLink="/projects/{{ project.id }}/design">open the design studio →</a>
                </div>
              }
              <div class="row">
                <button class="btn" (click)="back()">← Back</button>
                <button class="btn btn-primary" [disabled]="busy()" (click)="createProject()">
                  {{ busy() ? 'Creating…' : 'Create project' }}
                </button>
              </div>
            </section>
          }
        }
      }
    </div>
  `,
  styles: `
    .steps {
      display: flex;
      gap: 0.4rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .step {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: var(--radius-sm);
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .step.active {
      border-color: var(--primary);
      color: var(--primary-dark);
      background: var(--primary-soft);
      font-weight: 600;
    }
    .step.done {
      color: var(--accent);
    }
    .template-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
      text-align: left;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: var(--radius);
      padding: 0.9rem;
      cursor: pointer;
      font-family: var(--font);
      color: var(--text);
    }
    .template-card:hover {
      border-color: var(--primary);
    }
    .template-card.selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }
    .summary {
      margin: 0 0 1rem;
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 0.3rem 1rem;
      font-size: 0.9rem;
    }
    .summary dt {
      color: var(--text-muted);
      font-weight: 600;
    }
    .summary dd {
      margin: 0;
    }
    .hidden {
      opacity: 0.5;
      pointer-events: none;
    }
  `,
})
export class WizardPage implements OnInit {
  readonly session = inject(SessionService);
  private readonly templatesService = inject(TemplatesService);
  private readonly plotsService = inject(PlotsService);
  private readonly profilesService = inject(ProfilesService);
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);

  protected templates = signal<TemplateModel[]>([]);
  protected plots = signal<PlotModel[]>([]);
  protected profiles = signal<ProfileModel[]>([]);
  protected error = signal<ApiError | null>(null);
  protected busy = signal(false);
  protected current = signal<Step>(1);
  protected created = signal<{ id: string } | null>(null);

  protected userId = this.session.activeUserId.asReadonly();

  protected draft: WizardDraft = {
    templateId: '',
    plotId: '',
    useExistingPlot: false,
    newPlotWidth: 40,
    newPlotDepth: 60,
    newPlotUnit: 'FT',
    newPlotOpenSides: 3,
    profileId: '',
    useExistingProfile: false,
    newProfileName: '',
    newProfileFloors: 2,
    newProfileRoomTypes: 'living,dining,kitchen,bed1,bed2',
    newProfileCounter: 3.2,
    projectName: '',
  };

  async ngOnInit(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    try {
      this.templates.set(await this.templatesService.list());
      if (this.templates().length > 0) {
        this.draft.templateId = this.templates()[0].id;
      }
      await Promise.all([this.loadPlots(), this.loadProfiles()]);
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }

  protected selectedTemplate(): TemplateModel | null {
    return this.templates().find((t) => t.id === this.draft.templateId) ?? null;
  }

  protected pickTemplate(template: TemplateModel): void {
    this.draft.templateId = template.id;
    this.draft.newProfileName = `My ${template.name}`;
    this.draft.newProfileRoomTypes = Object.keys(template.roomDefaults).slice(0, 5).join(',');
    this.draft.newProfileCounter = template.kitchenDefaults.counterMinMm / 1000;
  }

  protected plotSummary(): string {
    const plot = this.plots().find((p) => p.id === this.draft.plotId);
    if (plot) {
      return `${plot.widthRaw}×${plot.depthRaw} ${plot.unit} (${plot.openSides} sides)`;
    }
    return `${this.draft.newPlotWidth}×${this.draft.newPlotDepth} ${this.draft.newPlotUnit} (${this.draft.newPlotOpenSides} sides)`;
  }

  protected profileSummary(): string {
    const profile = this.profiles().find((p) => p.id === this.draft.profileId);
    if (profile) {
      return `${profile.name} (${profile.floors} floors)`;
    }
    return `${this.draft.newProfileName || 'Unnamed'} (${this.draft.newProfileFloors} floors)`;
  }

  protected stepLabel(step: Step): string {
    return ['Template', 'Plot', 'Profile', 'Project'][step - 1];
  }

  protected goTo(step: Step): void {
    if (step < this.current()) {
      this.current.set(step);
    }
  }

  protected back(): void {
    const step = this.current();
    if (step > 1) {
      this.current.set((step - 1) as Step);
    }
  }

  protected async next(): Promise<void> {
    const step = this.current();
    this.busy.set(true);
    this.error.set(null);
    try {
      if (step === 1) {
        if (!this.draft.templateId) {
          return;
        }
        this.current.set(2);
      } else if (step === 2) {
        await this.resolvePlot();
        this.current.set(3);
      } else if (step === 3) {
        await this.resolveProfile();
        this.current.set(4);
      }
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.busy.set(false);
    }
  }

  protected async createProject(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const project = await this.projectsService.create({
        ownerId: uid,
        plotId: this.draft.plotId,
        homeProfileId: this.draft.profileId,
        name: this.draft.projectName.trim() || undefined,
      });
      this.created.set({ id: project.id });
      await this.router.navigate(['/projects', project.id, 'design']);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.busy.set(false);
    }
  }

  private async resolvePlot(): Promise<void> {
    if (this.draft.useExistingPlot && this.draft.plotId) {
      return;
    }
    const uid = this.userId();
    if (!uid) {
      return;
    }
    const plot = await this.plotsService.create({
      ownerId: uid,
      width: Number(this.draft.newPlotWidth),
      depth: Number(this.draft.newPlotDepth),
      unit: this.draft.newPlotUnit,
      openSides: this.draft.newPlotOpenSides,
    });
    this.draft.plotId = plot.id;
    await this.loadPlots();
  }

  private async resolveProfile(): Promise<void> {
    if (this.draft.useExistingProfile && this.draft.profileId) {
      return;
    }
    const uid = this.userId();
    if (!uid || !this.draft.templateId) {
      return;
    }
    const rooms: ProfileRoomInput[] = this.draft.newProfileRoomTypes
      .split(',')
      .map((type) => type.trim())
      .filter((type) => type.length > 0)
      .map((type) => ({ type, count: 1 }));
    const profile = await this.profilesService.create({
      userId: uid,
      name: this.draft.newProfileName.trim() || `My home`,
      templateId: this.draft.templateId,
      floors: this.draft.newProfileFloors,
      rooms,
      kitchen: { counterMinM: Number(this.draft.newProfileCounter) },
    });
    this.draft.profileId = profile.id;
    await this.loadProfiles();
  }

  private async loadPlots(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    this.plots.set(await this.plotsService.listByOwner(uid));
    if (!this.draft.plotId && this.plots().length > 0) {
      this.draft.plotId = this.plots()[0].id;
    }
  }

  private async loadProfiles(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    this.profiles.set(await this.profilesService.listByUser(uid));
    if (!this.draft.profileId && this.profiles().length > 0) {
      this.draft.profileId = this.profiles()[0].id;
    }
  }
}

interface WizardDraft {
  templateId: string;
  plotId: string;
  useExistingPlot: boolean;
  newPlotWidth: number;
  newPlotDepth: number;
  newPlotUnit: LengthUnit;
  newPlotOpenSides: number;
  profileId: string;
  useExistingProfile: boolean;
  newProfileName: string;
  newProfileFloors: number;
  newProfileRoomTypes: string;
  newProfileCounter: number;
  projectName: string;
}
