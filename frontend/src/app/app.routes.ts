import { Routes } from '@angular/router';
import { HomePage } from './features/home/home-page';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Home — HomeAIArch Studio' },
  {
    path: 'templates',
    loadComponent: () => import('./features/templates/templates-page').then((m) => m.TemplatesPage),
    title: 'Templates — HomeAIArch Studio',
  },
  {
    path: 'plots',
    loadComponent: () => import('./features/plots/plots-page').then((m) => m.PlotsPage),
    title: 'Plots — HomeAIArch Studio',
  },
  {
    path: 'profiles',
    loadComponent: () => import('./features/profiles/profiles-page').then((m) => m.ProfilesPage),
    title: 'Profiles — HomeAIArch Studio',
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/projects-page').then((m) => m.ProjectsPage),
    title: 'Projects — HomeAIArch Studio',
  },
  {
    path: 'wizard',
    loadComponent: () => import('./features/wizard/wizard-page').then((m) => m.WizardPage),
    title: 'New project — HomeAIArch Studio',
  },
  {
    path: 'projects/:id/design',
    loadComponent: () => import('./features/studio/studio-page').then((m) => m.StudioPage),
    title: 'Design studio — HomeAIArch Studio',
  },
  { path: '**', redirectTo: '' },
];
