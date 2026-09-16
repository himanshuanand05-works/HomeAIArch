import { Component, computed, input, output } from '@angular/core';
import { Layout } from '../../models/design.model';
import { FloorPlanModel, renderFloorPlan } from '../../render/floor-plan';

@Component({
  selector: 'app-floor-plan',
  standalone: true,
  template: `
    @if (plan(); as plan) {
      <svg
        class="plan"
        [attr.viewBox]="'0 0 ' + plan.widthPx + ' ' + plan.depthPx"
        [attr.role]="'img'"
        [attr.aria-label]="'Floor plan for floor ' + plan.floorNumber"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          class="plot"
          [attr.x]="0"
          [attr.y]="0"
          [attr.width]="plan.plot.width"
          [attr.height]="plan.plot.depth"
        />

        @for (room of plan.rooms; track room.id) {
          <g class="room" (click)="onRoomClick.emit(room.roomId)">
            <rect
              class="wall"
              [attr.x]="room.outer.x"
              [attr.y]="room.outer.y"
              [attr.width]="room.outer.width"
              [attr.height]="room.outer.depth"
            />
            <rect
              class="inner"
              [class.highlighted]="room.highlighted"
              [attr.x]="room.inner.x"
              [attr.y]="room.inner.y"
              [attr.width]="room.inner.width"
              [attr.height]="room.inner.depth"
            />
            <text
              class="label"
              [attr.x]="room.inner.x + room.inner.width / 2"
              [attr.y]="room.inner.y + room.inner.depth / 2 - 6"
            >
              {{ room.label }}
            </text>
            <text
              class="area"
              [attr.x]="room.inner.x + room.inner.width / 2"
              [attr.y]="room.inner.y + room.inner.depth / 2 + 10"
            >
              {{ room.areaLabel }}
            </text>
          </g>
        }

        @for (door of plan.doors; track door.id) {
          <circle class="door" [class]="door.kind" [attr.cx]="door.x" [attr.cy]="door.y" r="6">
            <title>{{ door.kind }}</title>
          </circle>
        }
      </svg>
    }
  `,
  styles: `
    .plan {
      display: block;
      width: 100%;
      height: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .plot {
      fill: #fbfcfd;
      stroke: var(--primary-dark);
      stroke-width: 2px;
    }
    .room {
      cursor: pointer;
    }
    .wall {
      fill: #d7dee6;
      stroke: #8a97a5;
      stroke-width: 1px;
    }
    .inner {
      fill: #ffffff;
      stroke: #aab6c2;
      stroke-width: 0.6px;
    }
    .inner.highlighted {
      fill: #e7eefc;
      stroke: var(--primary);
      stroke-width: 1.25px;
    }
    .label {
      text-anchor: middle;
      font-size: 12px;
      font-weight: 600;
      fill: var(--text);
      pointer-events: none;
    }
    .area {
      text-anchor: middle;
      font-size: 10px;
      fill: var(--text-muted);
      pointer-events: none;
    }
    .door {
      fill: #fff;
      stroke: var(--accent);
      stroke-width: 1.5px;
    }
    .door.stair {
      stroke: var(--warning);
    }
    .door.passage {
      stroke: var(--primary);
    }
  `,
})
export class FloorPlan {
  readonly layout = input<Layout | null>(null);
  readonly floorNumber = input(1);
  readonly highlightRoomIds = input<string[]>([]);

  readonly roomClick = output<string>();

  protected readonly plan = computed<FloorPlanModel | null>(() => {
    const layout = this.layout();
    if (!layout) {
      return null;
    }
    return renderFloorPlan(layout, this.floorNumber(), this.highlightRoomIds());
  });
}
