import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectsService } from './projects.service';
import { SessionService } from '../../core/session.service';
import { ProjectModel } from '../../models/project.model';
import { ApiError } from '../../models/api-error.model';
import { ErrorBanner } from '../../shared/error-banner';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [RouterLink, ErrorBanner],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Projects</h1>
          <p class="muted">
            A project freezes a plot + home profile snapshot. Open it to design and iterate.
          </p>
        </div>
        <a class="btn btn-primary" routerLink="/wizard">New project</a>
      </div>

      @if (!userId()) {
        <div class="state state-info">Pick a user from the top bar to start.</div>
      } @else {
        <app-error-banner [error]="error()" />
        @if (loading()) {
          <p class="muted">Loading…</p>
        }
        @if (projects().length === 0 && !loading() && !error()) {
          <p class="muted">No projects yet — start the wizard.</p>
        }
        @if (projects().length > 0) {
          <table class="list card-pad">
            <thead>
              <tr>
                <th>Name</th>
                <th>Plot</th>
                <th>Floors</th>
                <th>Room budget</th>
                <th>Versions</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (project of projects(); track project.id) {
                <tr>
                  <td>
                    <a routerLink="/projects/{{ project.id }}/design">{{ project.name }}</a>
                  </td>
                  <td class="mono">
                    {{ project.plotSnapshot.widthMm / 1000 }} ×
                    {{ project.plotSnapshot.depthMm / 1000 }} m ({{
                      project.plotSnapshot.openSides
                    }}
                    sides)
                  </td>
                  <td>{{ project.prefsSnapshot.floors }}</td>
                  <td>
                    @for (room of project.prefsSnapshot.rooms.slice(0, 5); track $index) {
                      <span class="badge badge-muted">{{ room.type }}</span>
                    }
                  </td>
                  <td>
                    <span class="badge badge-success">{{ project.versionCount }}</span>
                  </td>
                  <td class="muted">{{ project.createdAt }}</td>
                  <td>
                    <button class="btn btn-danger btn-sm" (click)="remove(project)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </div>
  `,
})
export class ProjectsPage implements OnInit {
  readonly session = inject(SessionService);
  private readonly service = inject(ProjectsService);

  protected projects = signal<ProjectModel[]>([]);
  protected loading = signal(true);
  protected error = signal<ApiError | null>(null);

  protected userId = this.session.activeUserId.asReadonly();

  async ngOnInit(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      this.loading.set(false);
      return;
    }
    await this.load();
  }

  protected async load(): Promise<void> {
    const uid = this.userId();
    if (!uid) {
      return;
    }
    this.loading.set(true);
    try {
      this.projects.set(await this.service.listByOwner(uid));
      this.error.set(null);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loading.set(false);
    }
  }

  protected async remove(project: ProjectModel): Promise<void> {
    if (!window.confirm(`Delete project "${project.name}" and all its design versions?`)) {
      return;
    }
    try {
      await this.service.remove(project.id);
      await this.load();
    } catch (err) {
      this.error.set(err as ApiError);
    }
  }
}
