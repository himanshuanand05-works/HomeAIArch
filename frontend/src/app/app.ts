import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionBar } from './shared/session-bar';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SessionBar],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
