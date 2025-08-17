import { throwError } from "rxjs/internal/observable/throwError";
import { DropDownOption } from "../types"
import { HttpErrorResponse } from "@angular/common/http";
import { Observable } from "rxjs/internal/Observable";


export function handleError(error: HttpErrorResponse | any): Observable<never> {
    if (error.error instanceof ErrorEvent) {
        console.error('An error occurred:', error.error.message)

    } else {
        console.error(
            `Backend returned code ${error.status}, ` +
            `body was: ${error.error}`)
    }
    return throwError(() => 'Something bad happened; please try again later.');
}


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
        { name: 'registry.fly.io/crawlagent:deployment-01JMCZMGQ5ZKXW2J65KHW15EXB', code: 'deployment-01JMCZMGQ5ZKXW2J65KHW15EXB' },
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
        { name: 'Amsterdam, Netherlands', code: 'ams' },
        { name: 'Stockholm, Sweden', code: 'arn' },
        { name: 'Atlanta, Georgia (US)', code: 'atl' },
        { name: 'Bogotá, Colombia', code: 'bog' },
        { name: 'Mumbai, India', code: 'bom' },
        { name: 'Boston, Massachusetts (US)', code: 'bos' },
        { name: 'Paris, France', code: 'cdg' },
        { name: 'Denver, Colorado (US)', code: 'den' },
        { name: 'Dallas, Texas (US)', code: 'dfw' },
        { name: 'Dubai, United Arab Emirates', code: 'dxb' },
        { name: 'Secaucus, NJ (US)', code: 'ewr' },
        { name: 'Ezeiza, Argentina', code: 'eze' },
        { name: 'Frankfurt, Germany', code: 'fra' },
        { name: 'Guadalajara, Mexico', code: 'gdl' },
        { name: 'Rio de Janeiro, Brazil', code: 'gig' },
        { name: 'Sao Paulo, Brazil', code: 'gru' },
        { name: 'Hong Kong, Hong Kong', code: 'hkg' },
        { name: 'Ashburn, Virginia (US)', code: 'iad' },
        { name: 'Istanbul, Turkey', code: 'ist' },
        { name: 'Johannesburg, South Africa', code: 'jnb' },
        { name: 'Los Angeles, California (US)', code: 'lax' },
        { name: 'London, United Kingdom', code: 'lhr' },
        { name: 'Madrid, Spain', code: 'mad' },
        { name: 'Melbourne, Australia', code: 'mel' },
        { name: 'Miami, Florida (US)', code: 'mia' },
        { name: 'Tokyo, Japan', code: 'nrt' },
        { name: 'Chicago, Illinois (US)', code: 'ord' },
        { name: 'Bucharest, Romania', code: 'otp' },
        { name: 'Phoenix, Arizona (US)', code: 'phx' },
        { name: 'Querétaro, Mexico', code: 'qro' },
        { name: 'Santiago, Chile', code: 'scl' },
        { name: 'Seattle, Washington (US)', code: 'sea' },
        { name: 'Singapore, Singapore', code: 'sin' },
        { name: 'San Jose, California (US)', code: 'sjc' },
        { name: 'Sydney, Australia', code: 'syd' },
        { name: 'Warsaw, Poland', code: 'waw' },
        { name: 'Montreal, Canada', code: 'yul' },
        { name: 'Toronto, Canada', code: 'yyz' }
    ];
    array.push(...regions)
}

export function preSetCPUtypes(array: DropDownOption[]): void {
    const cpuskind = [
        { "name": "Shared CPU 1x", "code": "shared-cpu-1x" },
        { "name": "Shared CPU 2x", "code": "shared-cpu-2x" },
        { "name": "Shared CPU 4x", "code": "shared-cpu-4x" },
        { "name": "Shared CPU 8x", "code": "shared-cpu-8x" },
        { "name": "Performance CPU 1x", "code": "performance--1x" },
        { "name": "Performance CPU 2x", "code": "performance-2x" },
        { "name": "Performance CPU 4x", "code": "performance-4x" },
        { "name": "Performance CPU 8x", "code": "performance-8x" },
        { "name": "Performance CPU 16x", "code": "performance-16x" }
    ]
    array.push(...cpuskind)
}

export function setAutoContainerOptions(array: DropDownOption[]): void {
    const autoContainerOptions = [
        { name: 'suspend', code: 'suspend' },
        { name: 'stop', code: 'stop' },
        { name: 'manual', code: 'off' },
    ]
    array.push(...autoContainerOptions)
}