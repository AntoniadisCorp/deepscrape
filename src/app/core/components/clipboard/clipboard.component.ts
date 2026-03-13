import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { WebRtcService } from '../../services';

@Component({
  selector: 'app-clipboard',
  standalone: true,
  imports: [FormsModule],  template: `
    @if (visible) {
      <div class="clipboard-container">
        <div class="clipboard-content">
          <h3>Clipboard Sync</h3>
          <p>Copy text to remote clipboard</p>
          <textarea
            #clipboardTextarea
            [(ngModel)]="clipboardText"
            (ngModelChange)="onClipboardTextChange($event)"
            placeholder="Paste content to send to remote clipboard..."
            class="clipboard-textarea"
            rows="5"
          ></textarea>
          <div class="button-row">
            <button (click)="sendClipboard()" class="primary-button">Send</button>
            <button (click)="close()" class="secondary-button">Close</button>
          </div>
        </div>
      </div>
    }
    `,
  styles: [`
    .clipboard-container {
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
    
    .clipboard-content {
      background-color: #fff;
      border-radius: 8px;
      padding: 20px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
    
    h3 {
      margin-top: 0;
      color: #333;
    }
    
    .clipboard-textarea {
      width: 100%;
      margin: 10px 0;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      resize: vertical;
    }
    
    .button-row {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }
    
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .primary-button {
      background-color: #1976d2;
      color: white;
    }
    
    .secondary-button {
      background-color: #e0e0e0;
      color: #333;
    }
  `]
})
export class ClipboardComponent implements OnDestroy {
  visible = false;
  clipboardText = '';
  
  @Output() clipboardSent = new EventEmitter<string>();
  
  private typingTimeout: any;
  
  constructor(private rtc: WebRtcService) {}
    open() {
    this.visible = true;
    this.tryReadClipboard();
    
    // Focus the textarea after it becomes visible
    setTimeout(() => {
      const textareaEl = document.querySelector('.clipboard-textarea') as HTMLTextAreaElement;
      if (textareaEl) {
        textareaEl.focus();
        textareaEl.select(); // Select all text for easy replacement
      }
    }, 0);
  }
    close() {
    this.visible = false;
    this.clipboardText = '';
    
    // Clean up any pending timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }
  
  async tryReadClipboard() {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        this.clipboardText = text;
      }
    } catch (err) {
      console.warn('Could not read clipboard content:', err);
    }
  }  /**
   * Handle clipboard text changes with debounce
   * @param text Updated clipboard text
   */
  onClipboardTextChange(text: string) {
    // Clear any existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    
    // Debounce for 500ms like in the neko client
    this.typingTimeout = setTimeout(() => {
      if (text.trim()) {
        // Send clipboard content to server after typing stops
        this.rtc.sendClipboardText(text);
      }
    }, 500);
  }
  
  sendClipboard() {
    if (this.clipboardText.trim()) {
      // Clear any debounce timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
      
      // Send clipboard content to the server using the dedicated method
      const success = this.rtc.sendClipboardText(this.clipboardText);
      
      if (success) {
        this.clipboardSent.emit(this.clipboardText);
        this.close();
      } else {
        // Show error message to user
        console.error('Failed to send clipboard text. Make sure you are connected.');
        // This could be enhanced with a UI notification if needed
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up resources
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }
}
