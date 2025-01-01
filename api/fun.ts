/**
 * Soft Decryption Algorithm: Reverses the soft encryption process.
 * @param input - The transformed string to decrypt.
 * @returns The original string.
 */
export function customUrlDecoder(input: string): string {
    // Step 1: Base64 decode the string
    const decoded = Buffer.from(input, 'base64').toString('utf-8');

    // Step 2: Reverse the string back to the shifted format
    const reversedBack = decoded.split('').reverse().join('');

    // Step 3: Shift characters' ASCII values back to their original form (e.g., -3)
    const original = reversedBack.split('')
        .map(char => String.fromCharCode(char.charCodeAt(0) - 3))
        .join('');

    return original;
}