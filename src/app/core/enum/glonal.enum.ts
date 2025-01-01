// Enum which contains only LIGHT and DARK themes, if DEVICE theme selected it means you don't need a value for this purpose. DEVICE theme means no user preferences in the app. That is why value should be undefined (removed from localStorage).
export enum AppTheme {
    LIGHT = 'false',
    DARK = 'true',
    DEFAULT = 'false',
    SYSTEM = ''
}