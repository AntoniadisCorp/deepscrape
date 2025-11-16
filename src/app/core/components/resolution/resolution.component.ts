import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebRtcService } from '../../services';

interface Resolution {
  width: number;
  height: number;
  label: string;
}

@Component({
  selector: 'app-resolution',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="visible" class="resolution-container">
      <div class="resolution-content">
        <h3>Screen Resolution</h3>
        <p>Select a resolution for the remote screen:</p>
        
        <div class="resolutions-grid">
          <button 
            *ngFor="let res of resolutions" 
            class="resolution-button" 
            [class.selected]="isSelected(res)"
            (click)="selectResolution(res)">
            {{ res.label }}
          </button>
        </div>
        
        <div class="custom-resolution">
          <h4>Custom Resolution</h4>
          <div class="resolution-inputs">
            <input 
              type="number" 
              [(ngModel)]="customWidth" 
              placeholder="Width" 
              min="640" 
              max="7680"
              class="resolution-input"
            >
            <span>×</span>
            <input 
              type="number" 
              [(ngModel)]="customHeight" 
              placeholder="Height" 
              min="480" 
              max="4320"
              class="resolution-input"
            >
            <button 
              (click)="setCustomResolution()" 
              class="apply-button"
              [disabled]="!isValidCustomResolution()">
              Apply
            </button>
          </div>
        </div>
        
        <div class="button-row">
          <button (click)="close()" class="close-button">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .resolution-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .resolution-content {
      background-color: #fff;
      border-radius: 8px;
      padding: 20px;
      width: 90%;
      max-width: 600px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
    
    h3, h4 {
      margin-top: 0;
      color: #333;
    }
    
    h4 {
      margin-bottom: 10px;
    }
    
    .resolutions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
      margin: 15px 0;
    }
    
    .resolution-button {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #f5f5f5;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;
    }
    
    .resolution-button:hover {
      background-color: #e0e0e0;
    }
    
    .resolution-button.selected {
      background-color: #1976d2;
      color: white;
      border-color: #1976d2;
    }
    
    .custom-resolution {
      margin: 15px 0;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    
    .resolution-inputs {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .resolution-input {
      width: 80px;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    .apply-button {
      padding: 8px 16px;
      background-color: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .apply-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .button-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    
    .close-button {
      padding: 8px 16px;
      background-color: #e0e0e0;
      color: #333;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class ResolutionComponent {
  visible = false;
  
  @Output() resolutionChanged = new EventEmitter<{width: number, height: number}>();
  
  resolutions: Resolution[] = [
    { width: 640, height: 480, label: '640×480' },
    { width: 800, height: 600, label: '800×600' },
    { width: 1024, height: 768, label: '1024×768' },
    { width: 1280, height: 720, label: '1280×720 (720p)' },
    { width: 1280, height: 800, label: '1280×800' },
    { width: 1280, height: 1024, label: '1280×1024' },
    { width: 1366, height: 768, label: '1366×768' },
    { width: 1440, height: 900, label: '1440×900' },
    { width: 1600, height: 900, label: '1600×900' },
    { width: 1920, height: 1080, label: '1920×1080 (1080p)' },
    { width: 1920, height: 1200, label: '1920×1200' },
    { width: 2560, height: 1440, label: '2560×1440 (1440p)' },
    { width: 3840, height: 2160, label: '3840×2160 (4K)' }
  ];
  
  currentWidth = 1280;
  currentHeight = 720;
  customWidth = 1280;
  customHeight = 720;
  
  constructor(private rtc: WebRtcService) {}
  
  open() {
    this.visible = true;
  }
  
  close() {
    this.visible = false;
  }
  
  selectResolution(res: Resolution) {
    this.currentWidth = res.width;
    this.currentHeight = res.height;
    this.changeResolution();
  }
  
  setCustomResolution() {
    if (this.isValidCustomResolution()) {
      this.currentWidth = this.customWidth;
      this.currentHeight = this.customHeight;
      this.changeResolution();
    }
  }
  
  isSelected(res: Resolution): boolean {
    return this.currentWidth === res.width && this.currentHeight === res.height;
  }
  
  isValidCustomResolution(): boolean {
    return this.customWidth >= 640 && this.customWidth <= 7680 && 
           this.customHeight >= 480 && this.customHeight <= 4320;
  }
  
  private changeResolution() {
    // Emit resolution change event
    this.resolutionChanged.emit({
      width: this.currentWidth,
      height: this.currentHeight
    });
    
    // Send resolution change to server via WebRTC service
    this.rtc.sendMessage('screen/set', {
      width: this.currentWidth,
      height: this.currentHeight
    });
    
    // Close the dialog
    this.close();
  }
}
