import { Component, Input, Output, EventEmitter, HostBinding, signal, WritableSignal, AfterViewInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule, JsonPipe, NgClass, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { CrawlResult } from '../../types/crawl-result.type';
import { expandCollapseAnimation } from 'src/app/animations';
import { MarkdownModule } from 'ngx-markdown';
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule
import { LucideAngularModule } from 'lucide-angular';
import { myIcons } from 'src/app/shared';

@Component({
  selector: 'app-crawl-result-item',
  standalone: true,
  imports: [CommonModule, NgClass, NgIf, NgFor, NgSwitch, NgSwitchCase, JsonPipe, MarkdownModule, MatIconModule,
    LucideAngularModule
  ],
  animations: [expandCollapseAnimation],
  templateUrl: './crawl-result-item.component.html',
  styles: [`
    /* Custom styles for tab overflow if needed, or rely on JS for dynamic class application */
    /* Example: Hide scrollbar for tab container if it overflows */
    .flex-wrap::-webkit-scrollbar {
      display: none;
    }
    .flex-wrap {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `]
})
export class CrawlResultItemComponent implements AfterViewInit {
  @Input() crawlResult!: CrawlResult;
  @Input() clipboardButton: any; // Type as any for now, as it's a component reference
  @Output() toggleExpand = new EventEmitter<CrawlResult>();

  readonly icons = myIcons
  activeSubTab: string = 'overview';

  subTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'metadata', label: 'Metadata' },
    { key: 'media', label: 'Media' },
    { key: 'links', label: 'Links' },
    { key: 'tables', label: 'Tables' },
    { key: 'raw_markdown', label: 'Raw Markdown' },
    { key: 'raw_html', label: 'Raw HTML' },
    { key: 'technical_details', label: 'Technical Details' },
    { key: 'files', label: 'Files' },
  ];

  constructor(private el: ElementRef) { }

  ngAfterViewInit(): void {
    // Implement logic for tab overflow here if needed.
    // This would involve measuring the width of the tab container and individual tabs.
    // For now, we'll rely on flex-wrap for basic responsiveness.
  }

  selectSubTab(tabName: string): void {
    this.activeSubTab = tabName;
  }

  getOverviewData(): any {
    const { url, status, message, success, status_code, error_message, session_id, redirected_url } = this.crawlResult;
    return { url, status, message, success, status_code, error_message, session_id, redirected_url };
  }

  getTechnicalDetails(): any {
    const { response_headers, network_requests, console_messages, ssl_certificate, dispatch_result, js_execution_result, server_memory_mb } = this.crawlResult;
    return { response_headers, network_requests, console_messages, ssl_certificate, dispatch_result, js_execution_result, server_memory_mb };
  }

  getFullImageUrl(imageSrc: string, fullUrl: string): string {
    const pattern = /^(https?:\/\/|www\.|ftp:\/\/)/;

    try {
      if (pattern.test(imageSrc)) {
        return imageSrc; // Return the full URL as is
      } else {
        const url = new URL(fullUrl); // Create a URL object, Get the host domain
        // Return the host (including protocol)
        return `${url.origin}/${imageSrc}`; // Concatenate the domain with the image source
      }
      

    } catch (error) {
      console.error('Invalid full URL:', error);
      return imageSrc; // Return an empty string if the URL is invalid
    }

    
  }
}
