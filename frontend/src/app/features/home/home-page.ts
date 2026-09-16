import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { ProjectsService } from '../projects/projects.service';
import { ProjectModel } from '../../models/project.model';
import { ApiError } from '../../models/api-error.model';
import { ErrorBanner } from '../../shared/error-banner';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, ErrorBanner, DatePipe, DecimalPipe],
  template: `
    <div class="page">
      <section class="card card-pad section-card">
        <h1>HomeAIArch Studio</h1>
        <p class="muted">
          Generate home layout designs from your plot and preferences, then iterate — this is the
          <strong>design → change → redesign</strong> loop, deterministically.
        </p>
        <div class="row" style="margin-top: 0.9rem">
          <a class="btn btn-primary" routerLink="/wizard">Start a new project</a>
          @if (session.activeUserId()) {
            <a class="btn" routerLink="/projects">My projects</a>
          } @else {
            <span class="muted" style="font-size: 0.85rem"> Pick a user above to begin. </span>
          }
        </div>
      </section>

      @if (session.activeUserId(); as userId) {
        <section class="card card-pad section-card">
          <div class="page-head">
            <h2>Recent projects</h2>
            <a class="btn" routerLink="/projects">All projects</a>
          </div>
          @if (loading()) {
            <span class="muted">Loading…</span>
          }
          <app-error-banner [error]="error()" />
          @if (projects().length === 0 && !loading() && !error()) {
            <p class="muted">No projects yet — use the wizard to create one.</p>
          }
          @if (projects().length > 0) {
            <table class="list">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Plot</th>
                  <th>Floors</th>
                  <th>Versions</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                @for (project of projects().slice(0, 5); track project.id) {
                  <tr>
                    <td>
                      <a routerLink="/projects/{{ project.id }}/design">{{ project.name }}</a>
                    </td>
                    <td class="mono">
                      {{ project.plotSnapshot.widthMm / 1000 | number: '1.1-1' }} ×
                      {{ project.plotSnapshot.depthMm / 1000 | number: '1.1-1' }} m
                    </td>
                    <td>{{ project.prefsSnapshot.floors }}</td>
                    <td>
                      <span class="badge badge-success">{{ project.versionCount }}</span>
                    </td>
                    <td class="muted">{{ project.createdAt | date: 'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      <section class="grid-3">
        <div class="card card-pad">
          <h3>Templates</h3>
          <p class="muted">Regional standards seed your defaults</p>
          <a routerLink="/templates">Browse templates →</a>
        </div>
        <div class="card card-pad">
          <h3>Plots</h3>
          <p class="muted">Define dimensions in metres or feet</p>
          <a routerLink="/plots">Manage plots →</a>
        </div>
        <div class="card card-pad">
          <h3>Profiles</h3>
          <p class="muted">Rooms, kitchen, baths — your home rules</p>
          <a routerLink="/profiles">Manage profiles →</a>
        </div>
      </section>
    </div>
  `,
})
export class HomePage implements OnInit {
  readonly session = inject(SessionService);
  private readonly projectsService = inject(ProjectsService);

  protected loading = signal(true);
  protected error = signal<ApiError | null>(null);
  protected projectList = signal<ProjectModel[]>([]);
  protected projects = this.projectList.asReadonly();

  async ngOnInit(): Promise<void> {
    const userId = this.session.activeUserId();
    if (!userId) {
      this.loading.set(false);
      return;
    }
    try {
      this.projectList.set(await this.projectsService.listByOwner(userId));
      this.error.set(null);
    } catch (err) {
      this.error.set(err as ApiError);
    } finally {
      this.loading.set(false);
    }
  }
}
