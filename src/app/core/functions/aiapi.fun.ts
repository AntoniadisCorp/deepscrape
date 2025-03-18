import { OpenAITokenDetails, Size } from "../types";
import { sanitizeJSON } from "./global.fun";

/**
 * Convert a string into batches of bytes and push each batch to the messages array.
 * @param messages The array to which the batches will be added.
 * @param subcontent The string to be converted into batches.
 */
export function chatInBatchesAI(messages: { role: string, content: string }[], subcontent: string) {
    const encoder = new TextEncoder();
    const bytesLength = encoder.encode(subcontent).length;
    const chunkSize = 1024;

    messages.push({
        role: 'user', content: `To provide the context for the above prompt,
        I will send you text in parts. When I am finished, I will tell you 
        'ALL PARTS SENT'. Do not answer until you have received all the parts.` })

    for (let i = 0; i < Math.ceil(bytesLength / chunkSize); i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, bytesLength)
        const chunk = subcontent.slice(start, end).trim()
        if (chunk.length < 1) break;
        // const chunkBytesLength = (await encodeToBytes(chunk)).length;
        // console.log(`Chunk ${i + 1} of ${Math.ceil(bytesLength / chunkSize)}:`, `(${formatBytes(chunkBytesLength)})`);
        messages.push({ role: 'user', content: sanitizeJSON(chunk) })
    }
    messages.push({ role: 'user', content: 'ALL PARTS SENT' })
}

export function calculateOpenAICost(usage: OpenAITokenDetails, model: string): number {


    const MODEL_COSTS: Record<string, { promptCost: number; completionCost: number }> = {
        "gpt-4-turbo": { promptCost: 0.03, completionCost: 0.06 },
        "gpt-4": { promptCost: 0.06, completionCost: 0.12 },
        "gpt-3.5": { promptCost: 0.02, completionCost: 0.04 }, // Example rates for GPT-3.5
        "gpt-4o-mini": { promptCost: 0.015, completionCost: 0.03 }, // Example rates for GPT-4 OpenAI mini
        "gpt-3.5-turbo": { promptCost: 0.025, completionCost: 0.05 }, // Example rates for GPT-3.5 Turbo
        "llama-3.1-8b-instant": { promptCost: 0.05, completionCost: 0.08 },
        "llama-3.3-70b-versatile": { promptCost: 0.59, completionCost: 0.79 },
        "claude-3-5-sonnet-20240620": { promptCost: 0.003, completionCost: 0.015 },
        "claude-3-5-sonnet-20241022": { promptCost: 0.003, completionCost: 0.015 },
        "claude-3-haiku-20240307": { promptCost: 0.00025, completionCost: 0.00125 },
        "claude-3-5-haiku-20241022": { promptCost: 0.001, completionCost: 0.005 },
        // Add more models here if needed
    }
    // Retrieve cost rates for the model from the configuration object
    const costRates = MODEL_COSTS[model];
    if (!costRates) {
        throw new Error("Unknown model specified");
    }

    // Extract token counts
    const { prompt_tokens, completion_tokens, prompt_tokens_details } = usage;
    const cached_tokens = prompt_tokens_details?.cached_tokens || 0;

    // Calculate non-cached prompt tokens
    const non_cached_prompt_tokens = prompt_tokens - cached_tokens;

    // Calculate costs
    const prompt_cost = (non_cached_prompt_tokens / 1000) * costRates.promptCost
    const completion_cost = (completion_tokens / 1000) * costRates.completionCost

    // Total cost
    const total_cost = prompt_cost + completion_cost;

    return parseFloat(total_cost.toFixed(5)); // Round to 5 decimal places
}


export function switchModelApiEndpoint(modelName: string, apiEndpoints: string[], apiKey: string[]): string[] {
    const model = modelName
    const [openApi, groqApi] = apiEndpoints;
    const [openApiKey, groqApiKey] = apiKey;

    switch (model) {

        case 'gpt-4':
        case 'gpt-4-turbo':
        case 'gpt-4o-mini':
        case 'gpt-3.5':
        case 'gpt-3.5-turbo':
            return [model, openApi, openApiKey, 'openai']
        case 'distil-whisper-large-v3-en':
        case 'gemma2-9b-it':
        case 'gemma-7b-it':
        case 'llama-3.3-70b-versatile':
        case 'llama-3.1-70b-versatile':
        case 'llama-3.1-8b-instant':
        case 'llama-guard-3-8b':
        case 'llama3-70b-8192':
        case 'llama3-8b-8192':
        case 'mixtral-8x7b-32768':
        case 'whisper-large-v3':
        case 'whisper-large-v3-turbo':
            return [model, groqApi, groqApiKey, 'groqai']
        case 'claude-3-opus-20240229':
        case 'claude-3-sonnet-20240229':
        case 'claude-3-5-sonnet-20241022':
        case 'claude-3-5-sonnet-20240620':
        case 'claude-3-haiku-20240307':
        case 'claude-2.1':
        case 'claude-2.0':
        case 'claude-instant-1.2':
            return [model, openApi, openApiKey, 'anthropic']

        default:
            return [model, openApi, openApiKey, 'openai']
    }

}

export function setAIModel(newModel: Size[]) {
    const model = [
        { name: 'gpt-4-turbo', code: 'openai' },
        { name: 'gpt-4', code: 'openai' },
        { name: 'gpt-3.5', code: 'openai' },
        { name: 'gpt-4o-mini', code: 'openai' },
        { name: 'gpt-3.5-turbo', code: 'openai' },
        { name: 'llama-3.1-8b-instant', code: 'groq' },
        { name: 'llama-3.3-70b-versatile', code: 'groq' },
        { name: 'claude-3-5-sonnet-20240620', code: 'claude' },
        { name: 'claude-3-5-sonnet-20241022', code: 'claude' },
        { name: 'claude-3-haiku-20240307', code: 'claude' },
        { name: 'claude-3-5-haiku-20241022', code: 'claude' },
    ]
    newModel.push(...model)
}

export function constructCookiesforJina(cookies: { name: string, value: string, domain: string }[]): string {
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}; domain=${cookie.domain}`).join(', ')
}