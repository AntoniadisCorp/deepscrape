export interface CrawlResult {
  url: string;
  html: string;
  fit_html: string;
  success: boolean;
  cleaned_html: string;
  media: {
    images: any[];
    videos: any[];
    audios: any[];
  };
  links: {
    internal: any[];
    external: any[];
  };
  downloaded_files: any;
  js_execution_result: any;
  screenshot: any;
  pdf: any;
  mhtml: any;
  extracted_content: any;
  metadata: {
    title: string;
    description: string;
    keywords: string | null;
    author: string | null;
    'og:type': string;
    'og:site_name': string;
    'og:url': string;
    'og:title': string;
    'og:description': string;
    'og:image': string;
    'twitter:card': string;
    'twitter:site': string;
    'twitter:title': string;
    'twitter:description': string;
    'twitter:image': string;
    'article:section': string;
    'article:opinion': string;
    'article:author': string;
  };
  error_message: string;
  session_id: string;
  response_headers: { [key: string]: string };
  status_code: number;
  ssl_certificate: any;
  dispatch_result: any;
  redirected_url: string;
  network_requests: any;
  console_messages: any;
  tables: any[];
  markdown: {
    raw_markdown: string;
    markdown_with_citations: string;
    references_markdown: string;
    fit_markdown: string;
    fit_html: string;
  };
  server_memory_mb: number;
  status: string;
  message?: string;
  expanded?: boolean;
}
