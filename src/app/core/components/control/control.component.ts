import { Component, EventEmitter, Output, Input, OnInit, OnDestroy, DestroyRef } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WebRtcService } from '../../services';
import { EVENT } from '../../types';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-control',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="control-panel" [class.expanded]="expanded">
      <div class="control-header" (click)="toggleExpanded()">
        <span class="title">Control Panel</span>
        <span class="toggle-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    
      @if (expanded) {
        <div class="control-content">
          <div class="control-status">
            <span class="status-label">Status:</span>
            <span class="status-value" [class.active]="hasControl">
              {{ hasControl ? 'You have control' : 'Viewing only' }}
            </span>
          </div>
          <div class="control-actions">
            <button
              class="control-button request-button"
              [disabled]="hasControl || controlLocked"
              (click)="requestControl()">
              {{ controlLocked && !hasControl ? 'Control Locked' : 'Request Control' }}
            </button>
            <button
              class="control-button release-button"
              [disabled]="!hasControl"
              (click)="releaseControl()">
              Release Control
            </button>
          </div>
          @if (hasControl) {
            <div class="control-lock">
              <label class="lock-label">
                <input type="checkbox" [(ngModel)]="locked" (change)="toggleLock()">
                <span>Lock Control (prevent others from taking control)</span>
              </label>
            </div>
          }
        </div>
      }
    </div>
    `,
  styles: [`
    .control-panel {
      background-color: #2c3e50;
      border-radius: 4px;
      color: white;
      margin-bottom: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    
    .control-header {
      padding: 12px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      background-color: #34495e;
    }
    
    .title {
      font-weight: 500;
    }
    
    .toggle-icon {
      font-size: 12px;
    }
    
    .control-content {
      padding: 15px;
    }
    
    .control-status {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .status-label {
      margin-right: 10px;
      opacity: 0.8;
    }
    
    .status-value {
      font-weight: 500;
      color: #95a5a6;
    }
    
    .status-value.active {
      color: #2ecc71;
    }
    
    .control-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .control-button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s ease;
    }
    
    .control-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .request-button {
      background-color: #3498db;
      color: white;
    }
    
    .request-button:hover:not(:disabled) {
      background-color: #2980b9;
    }
    
    .release-button {
      background-color: #e74c3c;
      color: white;
    }
    
    .release-button:hover:not(:disabled) {
      background-color: #c0392b;
    }
    
    .control-lock {
      margin-top: 10px;
    }
    
    .lock-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
    }
  `]
})
export class ControlComponent implements OnInit, OnDestroy {
  @Input() hasControl = false;
  @Output() controlChanged = new EventEmitter<boolean>();
  
  expanded = true;
  locked = false;
  controlLocked = false;
  
  private subscriptions: Subscription[] = [];
  
  constructor(private rtc: WebRtcService, private destroyRef: DestroyRef) {}
  
  ngOnInit() {
    // Subscribe to control status changes from WebRtcService
    this.subscriptions.push(
      this.rtc.controlStatus$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(hasControl => {
        console.log('Control status changed:', hasControl);
        this.hasControl = hasControl;
        this.controlChanged.emit(hasControl);
      })
    );
    
    // Subscribe to control lock status
    this.subscriptions.push(
      this.rtc.controlLocked$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(locked => {
        console.log('Control lock status changed:', locked);
        this.controlLocked = locked;
      })
    );
  }
  
  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  toggleExpanded() {
    this.expanded = !this.expanded;
  }
  
  requestControl() {
    // Send control request to server
    this.rtc.sendMessage(EVENT.CONTROL.REQUEST);
    console.log('Control requested');
  }
  
  releaseControl() {
    // Release control
    this.rtc.sendMessage(EVENT.CONTROL.RELEASE);
    this.hasControl = false;
    this.controlChanged.emit(this.hasControl);
    console.log('Control released');
  }
  
  toggleLock() {
    if (this.locked) {
      // Lock control so others can't take it
      this.rtc.sendMessage('admin/lock');
    } else {
      // Unlock control
      this.rtc.sendMessage('admin/unlock');
    }
    console.log(`Control ${this.locked ? 'locked' : 'unlocked'}`);
  }
}

