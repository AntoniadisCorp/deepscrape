export enum CrawlOperationStatus {

    READY = 'Ready', // Ready to start, not started yet
    STARTED = 'Start',
    SCHEDULED = 'Scheduled',
    IN_PROGRESS = 'In Progress',
    CANCELED = 'Canceled',
    COMPLETED = 'Completed',
    FAILED = 'Failed'
}

export enum CrawlCachingMode {
    ENABLED = 'Enabled',
    DISABLED = 'Disabled',
    BYPASS = 'Bypass',
    NONE = 'None',
    WRITE_ONLY = 'Write Only',
    READ_ONLY = 'Read Only',
}

export enum BrowserType {
    Chromium = 'chromium',
    Firefox = 'firefox',
    Webkit = 'webkit',
}