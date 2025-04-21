import { DropDownOption } from "../types"

export function isArray(arr: any): boolean {
    return Array.isArray(arr) && arr.length > 0
}
export function cleanAndParseJSON(dirtyJsonString: string): any | null {
    try {
        // Use a regular expression to extract the JSON object match(/\[[^[\]]*\]|{[^}]*}/) //
        const jsonMatch = dirtyJsonString.match(/(\[|\{)(?:[^[\]{}]|\{(?:[^{}]|\{[^{}]*\})*\}|\[(?:[^[\]]|\[.*?\])*\])*(\]|\})/)

        if (!jsonMatch)
            return null
        // throw new Error('No valid JSON array of objects found in the string')

        // Parse the extracted JSON string
        return JSON.parse(jsonMatch[0])
    } catch (error) {

        // console.log('Error parsing JSON:', error)
        return null
    }
}

export function sanitizeJSON(jsonString: string): string {
    // Remove invalid characters
    return jsonString
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
        // Escape special characters
        .replace(/\\n/g, "\\n")
        .replace(/\\r/g, "\\r")
        .replace(/\\t/g, "\\t")
        .replace(/\\b/g, "\\b")
        .replace(/\\f/g, "\\f");
}

export function formatBytes(bytes: number, decimals = 3) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let i = 0;

    while (bytes >= k && i < sizes.length - 1) {
        bytes /= k;
        i++;
    }

    return parseFloat((bytes).toFixed(dm)) + ' ' + sizes[i];
}

export function encodeToBytes(str: string) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

export function arrayBufferToString(buffer: any) {
    const decoder = new TextDecoder('utf-8');  // Use UTF-8 encoding
    return decoder.decode(buffer);
}

export function extractDomain(url: string): string | null {

    const pattern = /^(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    const domain = url.match(pattern)

    return domain && domain[2] ? domain[2] : null;
}

/**
 * Soft Encryption Algorithm: Transforms the string using shifts and Base64 encoding.
 * @param input - The string to "soft encrypt."
 * @returns The transformed string (encoded).
 */
export function customUrlEncoder(input: string): string {
    // Step 1: Shift characters' ASCII values by a fixed amount (e.g., +3)
    const shifted = input.split('')
        .map(char => String.fromCharCode(char.charCodeAt(0) + 3))
        .join('');

    // Step 2: Reverse the string to add an extra layer of obfuscation
    const reversed = shifted.split('').reverse().join('');

    // Step 3: Base64 encode the result using appropriate method based on environment
    if (typeof window !== 'undefined' && typeof window.btoa !== 'undefined') {
        // Browser environment (use btoa)
        return btoa(reversed);
    } else if (typeof Buffer !== 'undefined') {
        // Node.js environment (use Buffer)
        return Buffer.from(reversed).toString('base64');
    } else {
        throw new Error("Unsupported environment for Base64 encoding.");
    }
}


export function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function setDefaultImages(array: DropDownOption[]): void {
    const defaultImages = [
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
        { name: 'registry.fly.io/deepcrawl4ai:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
    ]

    array.push(...defaultImages)
}

export function setExistingMachines(array: DropDownOption[]): void {
    const clone = [
        { name: 'rough-forest-9606', code: '7843403a111178' },
        { name: 'broken-grass-6037', code: 'e82d623b363d68' },

    ]
    array.push(...clone)
}

export function preSetRegions(array: DropDownOption[]): void {
    const regions = [
        { name: 'us-east-1', code: 'us-east-1' },
        { name: 'eu-east', code: 'eu-east' },
        { name: 'eu-west-1', code: 'eu-west-1' },
    ]
    array.push(...regions)
}

export function setAutoContainerOptions(array: DropDownOption[]): void {
    const autoContainerOptions = [
        { name: 'suspend', code: 'suspend' },
        { name: 'stop', code: 'stop' },
        { name: 'manual', code: 'off' },
    ]
    array.push(...autoContainerOptions)
}