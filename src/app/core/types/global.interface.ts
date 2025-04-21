
export type Loading = {
    google: boolean
    github: boolean
}

export type DropDownOption = {

    name: string
    code: string
}

export type ScrollDimensions = {

    deltaX: number
    deltaY: number
}


export type AIModel = DropDownOption
export type Unit = DropDownOption


export type PlanPeriod = {
    value: string
    label: string
}

export type CrawlLinkTab = 'crawlpack' | 'machines' | 'browserconfig' | 'crawlerconfig' | 'crawlresults' | 'crawlextraction'
export type LinkTabs = {
    label: string
    link: string
    active: boolean
    icon: string
    index: CrawlLinkTab
}