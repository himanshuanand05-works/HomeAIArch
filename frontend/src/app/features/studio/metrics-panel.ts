import { Component, computed, input } from '@angular/core';
import { LayoutMetrics } from '../../models/design.model';

@Component({
  selector: 'app-metrics-panel',
  standalone: true,
  template: `
    @if (metrics(); as m) {
      <div class="score-row">
        <div class="score">
          <span class="score-num">{{ m.score.toFixed(1) }}</span>
          <span class="muted">score</span>
        </div>
        <div class="facts">
          <div>
            <span class="muted">Built-up</span> <strong>{{ sqm(m.builtUpAreaMm2) }}</strong>
          </div>
          <div>
            <span class="muted">Rooms</span> <strong>{{ sqm(m.roomAreaMm2) }}</strong>
          </div>
          <div>
            <span class="muted">Circulation</span> <strong>{{ sqm(m.circulationMm2) }}</strong>
          </div>
          <div>
            <span class="muted">Coverage</span> <strong>{{ pct(m.plotCoverage) }}</strong>
          </div>
        </div>
      </div>

      @if (breakdown().length > 0) {
        <div class="breakdown">
          @for (item of breakdown(); track item[0]) {
            <div class="bd-row">
              <span>{{ item[0] }}</span>
              <span class="mono">{{ item[1].toFixed(2) }}</span>
            </div>
          }
        </div>
      }

      @if (elapsedMs(); as ms) {
        <div class="muted elapsed">generated in {{ ms }} ms</div>
      }
    }
  `,
  styles: `
    .score-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .score {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--primary-soft);
      border-radius: var(--radius);
      padding: 0.6rem 0.9rem;
    }
    .score-num {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--primary-dark);
      line-height: 1;
    }
    .facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem 1rem;
      font-size: 0.85rem;
      flex: 1;
    }
    .breakdown {
      margin-top: 0.75rem;
      border-top: 1px solid var(--border);
      padding-top: 0.5rem;
    }
    .bd-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      padding: 0.1rem 0;
    }
    .elapsed {
      margin-top: 0.5rem;
      font-size: 0.75rem;
    }
  `,
})
export class MetricsPanel {
  readonly metrics = input<LayoutMetrics | null>(null);
  readonly elapsedMs = input<number | null>(null);

  protected readonly breakdown = computed<[string, number][]>(() => {
    const metrics = this.metrics();
    return metrics ? Object.entries(metrics.scoreBreakdown) : [];
  });

  protected sqm(mm2: number): string {
    return `${(mm2 / 1_000_000).toFixed(1)} m²`;
  }

  protected pct(fraction: number): string {
    return `${Math.round(fraction * 100)}%`;
  }
}
