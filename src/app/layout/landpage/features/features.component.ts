import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { myIcons } from 'src/app/shared';

@Component({
  selector: 'app-features',
  imports: [NgFor, LucideAngularModule],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})
export class FeaturesComponent {

  readonly icons = myIcons
  coreFeatures = [
    {
      icon: myIcons['bot'], // Replace with actual icon component or path
      title: "AI-Powered Extraction",
      description: "Smart algorithms with LLM integration for intelligent content extraction and structured data generation."
    },
    {
      icon: myIcons['gauge'], // Replace with actual icon component or path
      title: "Lightning Fast",
      description: "Browser pooling with pre-warmed instances and memory-adaptive dispatcher for optimal performance."
    },
    {
      icon: myIcons['shield'], // Replace with actual icon component or path
      title: "Advanced Anti-Detection",
      description: "Custom browser profiles, proxy rotation, and world-aware crawling with geolocation settings."
    },
    {
      icon: myIcons['database'], // Replace with actual icon component or path
      title: "Structured Data Export",
      description: "Extract to JSON, CSV, pandas DataFrames with heuristic markdown generation."
    },
    {
      icon: myIcons['code'], // Replace with actual icon component or path
      title: "JavaScript Execution",
      description: "Execute JavaScript and extract dynamic content without requiring external LLMs."
    },
    {
      icon: myIcons['network'], // Replace with actual icon component or path
      title: "Deep Crawling",
      description: "BFS, DFS, and BestFirst strategies with graph-based website traversal algorithms."
    }
  ];

  advancedFeatures = [
    {
      icon: myIcons['brain'], // Replace with actual icon component or path
      title: "Agentic Crawler",
      description: "Autonomous multi-step crawling operations with question-based natural language discovery."
    },
    {
      icon: myIcons['globe'], // Replace with actual icon component or path
      title: "World-Aware Crawling",
      description: "Set geolocation, language, and timezone for authentic locale-specific content extraction."
    },
    {
      icon: myIcons['filetext'], // Replace with actual icon component or path
      title: "Multi-Format Processing",
      description: "PDF processing, MHTML snapshots, and table-to-DataFrame extraction capabilities."
    },
    {
      icon: myIcons['search'], // Replace with actual icon component or path
      title: "Semantic Search",
      description: "Web embedding index with semantic search infrastructure for crawled content."
    },
    {
      icon: myIcons['monitor'], // Replace with actual icon component or path
      title: "Performance Monitoring",
      description: "Real-time insights with network capture, console logs, and performance analytics."
    },
    {
      icon: myIcons['zap'], // Replace with actual icon component or path
      title: "LXML Speed Mode",
      description: "Ultra-fast HTML parsing using lxml library with optimized resource efficiency."
    }
  ];
}
