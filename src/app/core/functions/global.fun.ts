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
            `body was:`, error.error, error)
    }
    return throwError(() => 'Something bad happened; please try again later.');
}


export function isArray(arr: any): boolean {
    return Array.isArray(arr) && arr.length > 0
}

function extractBalancedJsonFragment(input: string, startIndex: number): string | null {
    const openingChar = input[startIndex]

    if (openingChar !== '{' && openingChar !== '[')
        return null

    const expectedClosing = openingChar === '{' ? '}' : ']'
    const stack: string[] = [expectedClosing]

    let inString = false
    let isEscaped = false

    for (let index = startIndex + 1; index < input.length; index++) {
        const char = input[index]

        if (inString) {
            if (isEscaped) {
                isEscaped = false
                continue
            }

            if (char === '\\') {
                isEscaped = true
                continue
            }

            if (char === '"') {
                inString = false
            }

            continue
        }

        if (char === '"') {
            inString = true
            continue
        }

        if (char === '{') {
            stack.push('}')
            continue
        }

        if (char === '[') {
            stack.push(']')
            continue
        }

        if (char === '}' || char === ']') {
            const expected = stack.pop()

            if (expected !== char)
                return null

            if (stack.length === 0)
                return input.slice(startIndex, index + 1)
        }
    }

    return null
}

export function cleanAndParseJSON(dirtyJsonString: string): any | null {
    try {
        for (let index = 0; index < dirtyJsonString.length; index++) {
            const char = dirtyJsonString[index]

            if (char !== '{' && char !== '[')
                continue

            const candidate = extractBalancedJsonFragment(dirtyJsonString, index)

            if (!candidate)
                continue

            try {
                return JSON.parse(candidate)
            } catch {
                continue
            }
        }

        return null
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

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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


export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the data:*/*;base64, prefix if needed
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


export function extractNames(displayName: string): { firstname: string; lastname: string } {
  if (!displayName) {
    return { firstname: '', lastname: '' };
  }

  const [firstname, ...lastnameParts] = displayName.split(' ');
  const lastname = lastnameParts.join(' '); // Handles cases where the last name has multiple parts

  return { firstname: firstname || '', lastname: lastname || '' };
}


 /**
   * @function: checkPasswordStrength
   * @description Checks password strength
   * @param password 
   * @returns password strength 
   */
export function checkPasswordStrength(password: string) {

    const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasNonAlphas = /\W/.test(password)

        // has characters that not permitted
        const hasForbiddenCharacters = /[^\w\s@$!%*?&]/.test(password)

        return (
            password.length < minLength ? "Risky. Password needs to be at least 8 characters long" :
                !hasLowerCase ? "Risky. Password needs at least one lowercase letter" :
                    !hasUpperCase ? "Risky. Password needs at least one uppercase letter" :
                        !hasNumbers ? "Risky. Password needs at least one number" :
                            !hasNonAlphas ? "Risky. Password needs at least one special character" :
                                hasForbiddenCharacters ? "Risky. Dont use characters that are not permitted.." : "Strong as it gets"
        )
}

export async function getBrowser(navigator: any): Promise<string> {
    // Check for Brave browser
    if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
        if (await (navigator as any).brave.isBrave()) return 'brave';
    }
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr') && !ua.includes('brave')) return 'chrome';
    if (ua.includes('chromium')) return 'chromium';
    if (ua.includes('crios')) return 'chrome-ios';
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('fxios')) return 'firefox-ios';
    if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) return 'safari';
    if (ua.includes('opr') || ua.includes('opera')) return 'opera';
    if (ua.includes('edg')) return 'edge';
    if (ua.includes('msie') || ua.includes('trident')) return 'ie';
    if (ua.includes('vivaldi')) return 'vivaldi';
    if (ua.includes('yabrowser')) return 'yandex';
    if (ua.includes('ucbrowser')) return 'ucbrowser';
    if (ua.includes('qqbrowser')) return 'qqbrowser';
    if (ua.includes('baidubrowser')) return 'baidubrowser';
    if (ua.includes('maxthon')) return 'maxthon';
    if (ua.includes('samsungbrowser')) return 'samsung';
    if (ua.includes('puffin')) return 'puffin';
    if (ua.includes('palemoon')) return 'palemoon';
    if (ua.includes('waterfox')) return 'waterfox';
    if (ua.includes('seamonkey')) return 'seamonkey';
    if (ua.includes('avant browser')) return 'avant';
    if (ua.includes('sleipnir')) return 'sleipnir';
    if (ua.includes('epiphany')) return 'epiphany';
    if (ua.includes('konqueror')) return 'konqueror';
    if (ua.includes('midori')) return 'midori';
    if (ua.includes('lunascape')) return 'lunascape';
    if (ua.includes('comodo')) return 'comodo';
    if (ua.includes('icecat')) return 'icecat';
    if (ua.includes('iceweasel')) return 'iceweasel';
    if (ua.includes('qutebrowser')) return 'qutebrowser';
    if (ua.includes('torbrowser')) return 'tor';
    if (ua.includes('falkon')) return 'falkon';
    if (ua.includes('netscape')) return 'netscape';

    return 'other';
}


export async function getDeviceFingerprintHash(fingerprintData: string | null, window: Window): Promise<string> {
    let deviceFingerprintHash = '';
    try {
      if (fingerprintData) {
        // Hash the fingerprint for privacy
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintData);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
        deviceFingerprintHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      deviceFingerprintHash = '';
    }

    return deviceFingerprintHash
}