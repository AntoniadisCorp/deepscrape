import { environment } from "src/environments/environment"

export const API_ANTHROPIC = environment?.production ? environment?.API_ANTHROPIC + '/v1' : '/api/anthropic'
export const API_OPENAI = environment?.production ? environment?.API_OPENAI + '/v1' : '/api/openai'
export const API_GROQAI = environment?.production ? environment?.API_GROQ + '/openai/v1' : '/api/groq'

export const API_JINAAI = environment?.production ? environment?.API_JINAAI + '' : '/api/jina'

export const API_CRAWL4AI = environment?.production ? environment?.API_CRAWL4AI + '/' : '/api'