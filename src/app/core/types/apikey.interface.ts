export interface ApiKey {
    id: string;
    name: string;
    default: boolean
    key: string;
    type: ApiKeyType
    showKey: string;
    created_At: Date;
    created_By?: string
    lastUsed?: Date;
    permissions?: string[];
    menu_visible: boolean;
    visibility: boolean;
}


export type ApiKeyType = 'jina' | 'anthropic' | 'openai' | 'groq' | 'custom'

export type ApiKeyLoader = {
    modal: boolean
    visibility: { [key: string]: boolean }
}
export type ApiKeyPermission = 'read' | 'write' | 'delete' | 'update' | 'create'