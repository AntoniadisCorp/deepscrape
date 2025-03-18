export type OpenAITokenDetails = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details: {
        cached_tokens: number;
        audio_tokens: number;
    };
    completion_tokens_details: {
        accepted_prediction_tokens: number;
        audio_tokens: number;
        reasoning_tokens: number;
        rejected_prediction_tokens: number;
    };
}

export type aichunk = Record<string, any | null>


export type claudeAiApiStreamDataDeltaStop = {

    "stop_reason": "end_turn" | 'tool_use' | null
    "stop_sequence": null
}
export type claudeAiApiStreamDataDelta = {

    "type": string, "text": string | claudeAiApiStreamDataDeltaStop
}

export type claudeAiApiStreamData = {

    "type": 'message_start' | 'content_block_start' | 'ping' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop'
    'message': any
    "index"?: 0 | 1
    "content_block"?: { "type": string, "text": string }
    'delta'?: claudeAiApiStreamDataDelta

    "usage": { "input_tokens": number, "output_tokens": number }
}


export type JinaOptions = {
    iframe: "true" | "false"
    forwardCookies: boolean
}