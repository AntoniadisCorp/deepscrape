// TypeScript models for seeding config and request
export interface SeedingConfig {
  source?: string
  pattern?: string
  live_check?: boolean
  extract_head?: boolean
  max_urls?: number
  concurrency?: number
  hits_per_sec?: number
  force?: boolean
  base_directory?: string | null
  verbose?: boolean
  query?: string
  score_threshold?: number
  scoring_method?: string
  filter_nonsense_urls?: boolean

  llm_config?: LLM_Config
}

export type LLM_Config = {
  provider?: string
  api_token?: string
  base_url?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
  n?: number

}
export interface SeederRequest {
  domains: string[]
  config: SeedingConfig
  stream?: boolean
}


export interface SeederResult {
  url: string
  status: string
  head_data: HeadData
  relevance_score: number
  domain: string
  query: string
}


interface MetaData {
  author?: string
  description?: string
  keywords?: string
  viewport?: string
  robots?: string
  "og:title"?: string
  "og:description"?: string
  "og:image"?: string
  "og:type"?: string
  "og:url"?: string
  "og:site_name"?: string
  "twitter:card"?: string
  "twitter:title"?: string
  "twitter:description"?: string
  "twitter:image"?: string
  "dc.creator"?: string
  "dc.date"?: string
  [key: string]: string | undefined
}

interface LinkItem {
  href: string
  type?: string
  as?: string
}

interface LinkData {
  preconnect?: LinkItem[]
  stylesheet?: LinkItem[]
  preload?: LinkItem[]
  canonical?: LinkItem[]
  icon?: LinkItem[]
  alternate?: LinkItem[]
  shortcut?: LinkItem[]
  manifest?: LinkItem[]
}

interface JsonLD {
  "@context"?: string
  "@type"?: string
  headline?: string
  datePublished?: string
  author?: { 
    "@type": string

    name: string 
  }
  url?: string
  name?: string
  [key: string]: any
}

interface HeadData {
  title: string
  charset: string
  lang?: string
  meta: MetaData
  link: LinkData
  jsonld: JsonLD[]
}



export interface PresetConfig {
  source?: string
  extract_head?: boolean
  query?: string
  scoring_method?: string
  score_threshold?: number
  max_urls?: number
  verbose?: boolean
  live_check?: boolean
  concurrency?: number
  pattern?: string
  hits_per_sec?: number
  filter_nonsense_urls?: boolean
}

export interface Preset {
  id: string
  label: string
  description: string
  config: PresetConfig
  exampleDomains?: string[] // Example domains for this preset
}