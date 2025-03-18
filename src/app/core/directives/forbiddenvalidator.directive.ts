import { Directive, Input } from '@angular/core'
import { AbstractControl, FormControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from '@angular/forms'
import { BrowserType, CrawlCachingMode } from '../enum'
import { Cookies, Headers } from '../types'

@Directive({
  selector: '[appForbiddenName]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: ForbiddenValidatorDirective,
      multi: true,
    },
  ],
  standalone: true,
})
export class ForbiddenValidatorDirective implements Validator {
  @Input('appForbiddenName') forbiddenName = ''

  validate(control: AbstractControl): ValidationErrors | null {

    return this.forbiddenName
      ? forbiddenNameValidator(new RegExp(this.forbiddenName, 'i'))(control)
      : null
  }
}

/** A hero's name can't match the given regular expression */
export function forbiddenNameValidator(nameRe: RegExp): ValidatorFn {

  return (control: AbstractControl): ValidationErrors | null => {

    const slicedArray = sliceByPrefix(control.value, ",")
    const isPassed: boolean = slicedArray.every(item => nameRe.test(item)) // passed all strings

    return !isPassed ? { forbiddenName: control.value } : null
  }
}

export function createPasswordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {

    const value = control.value

    if (!value) {
      return null
    }

    const hasUpperCase = /[A-Z]+/.test(value)

    const hasLowerCase = /[a-z]+/.test(value)

    const hasNumeric = /[0-9]+/.test(value)

    const hasSpeciallCharacters = /[@$!%*?&]+/.test(value)

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpeciallCharacters

    return !passwordValid ? { passwordStrength: true } : null
  }
}

function sliceByPrefix(str: string, prefix: string) {
  return str.trim().split(prefix)
}

export function browserTitleValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const title = control.value.trim() as string

    if (typeof title !== 'string') {
      return { title: 'Must be a string' }
    }

    if (!title) {
      return { title: 'Title is required' }
    }
    if (title.length < 3 || title.length > 60) {
      return { title: 'Title must be between 3 and 60 characters' }
    }
    return null
  }
}

// Create a custom validator function
export function browserTypeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const browserType: BrowserType = (control.value?.code || '') as BrowserType

    if (!Object.values(BrowserType).includes(browserType)) {
      return { browserType: 'Invalid browser type' }
    }
    return null
  }
}

export function cacheModeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cacheMode: CrawlCachingMode = (control.value?.code || '') as CrawlCachingMode

    if (!Object.values(CrawlCachingMode).includes(cacheMode)) {
      return { cacheMode: 'Invalid cache mode type' }
    }
    return null
  }
}

// Custom validator function for userAgent
export function userAgentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const userAgentRegex = /^Mozilla\/\d+\.\d+ \([^)]+\) AppleWebKit\/\d+\.\d+ \(KHTML, like Gecko\) (Chrome|Safari|Firefox|Edge)\/[\d.]+( Safari\/\d+\.\d+)?$/
    // Check if the userAgent matches the expected format
    if (control.value && !userAgentRegex.test(control.value)) {
      return { userAgent: 'Invalid user agent' }
    }
    return null
  }
}

export function proxyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '') {
      return null // null value is allowed
    }

    if (typeof control.value !== 'string') {
      return { proxy: 'Must be a string' }
    }

    const proxyUrl = control.value.trim()

    // Allow both HTTP/HTTPS and SOCKS proxy URLs
    if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://') &&
      !proxyUrl.startsWith('socks4://') && !proxyUrl.startsWith('socks5://')) {
      return { proxy: 'Must start with http://, https://, socks4://, or socks5://' }
    }

    try {
      // Use a regex to parse SOCKS proxy URLs
      if (proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks5://')) {
        const re = /^socks[45]?:\/\/([^:]+):(\d+)$/
        const match = re.exec(proxyUrl)

        if (!match) {
          return { proxy: 'Invalid SOCKS proxy URL' }
        }

        const hostname = match[1]
        const port = parseInt(match[2], 10)

        if (!hostname || port < 1 || port > 65535) {
          return { proxy: 'Invalid SOCKS proxy URL' }
        }
      } else {
        // Parse HTTP/HTTPS proxy URLs as before
        const url = new URL(proxyUrl)
        if (!url.protocol || !url.hostname || !url.port) {
          return { proxy: 'Invalid proxy URL' }
        }
      }
    } catch (error) {
      return { proxy: 'Invalid proxy URL' }
    }

    return null
  }
}

export function cookieValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {

    if (control.value === null || control.value === '')
      return null // null value is allowed


    try {

      let cookies: Cookies[] = JSON.parse(control.value) as Cookies[]
      if (!Array.isArray(cookies))
        return { cookie: 'Invalid cookie array' }


      for (const cookie of cookies as Cookies[]) {

        if (typeof cookie !== 'object')
          return { cookie: 'Invalid cookie object' }


        if (!cookie.domain || typeof cookie.domain !== 'string')
          return { cookie: 'Invalid domain' }


        if (typeof cookie.expirationDate !== 'number')
          return { cookie: 'Invalid expirationDate' }

        if (typeof cookie.hostOnly !== 'boolean')
          return { cookie: 'Invalid hostOnly' }

        if (typeof cookie.httpOnly !== 'boolean')
          return { cookie: 'Invalid httpOnly' }


        if (!cookie.name || typeof cookie.name !== 'string')
          return { cookie: 'Invalid name' }

        if (!cookie.path || typeof cookie.path !== 'string')
          return { cookie: 'Invalid path' }

        if (!cookie.sameSite || !['None', 'Lax', 'Strict'].includes(cookie.sameSite)) {
          return { cookie: 'Invalid sameSite' }
        }

        if (typeof cookie.secure !== 'boolean') {
          return { cookie: 'Invalid secure' }
        }

        if (typeof cookie.session !== 'boolean') {
          return { cookie: 'Invalid session' }
        }

        if ((cookie.storeId === undefined || cookie.storeId === null) || typeof cookie.storeId !== 'number') {
          return { cookie: 'Invalid storeId' }
        }

        if (!cookie.value || typeof cookie.value !== 'string') {
          return { cookie: 'Invalid value' }
        }
      }

      return null
    } catch (error) {
      return { cookie: 'Invalid cookie Array objects', error }
    }

    /*  if (typeof control.value !== 'object') {
       return { cookie: 'Invalid cookie object' }
     } */

  }
}

export function headersValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '')
      return null // null value is allowed

    try {
      let headers: Headers[] = JSON.parse(control.value) as Headers[]
      if (!Array.isArray(headers)) {
        return { headers: 'Invalid headers array' }
      }

      for (const header of headers) {
        if (typeof header !== 'object') {
          return { headers: 'Invalid header object' }
        }

        if (!header.key || typeof header.key !== 'string') {
          return { headers: 'Invalid header key' }
        }

        if (!header.value || typeof header.value !== 'string') {
          return { headers: 'Invalid header value objects' }
        }
      }

      return null
    }
    catch (error) {
      return { headers: 'Invalid object array', error }
    }
  }
}

/**
 * This is clean, structured, and visually appealing for easy reference. 🚀
 * Playwright-Specific Browser Arguments
 * -------------------------------------
 * These arguments can be passed when launching a Playwright browser instance.
 */

/**
 * 🌍 Common Playwright Arguments (Work across Chromium, Firefox, WebKit)
 * ----------------------------------------------------------------------
 * - `--no-sandbox` → Disables sandboxing (useful for CI/CD environments).
 * - `--disable-setuid-sandbox` → Further disables sandbox security.
 * - `--disable-dev-shm-usage` → Helps with shared memory issues in Docker.
 * - `--disable-background-networking` → Reduces unnecessary network activity.
 * - `--disable-background-timer-throttling` → Prevents throttling of background timers.
 * - `--disable-backgrounding-occluded-windows` → Keeps backgrounded windows active.
 * - `--disable-renderer-backgrounding` → Prevents background throttling of renderers.
 * - `--use-gl=swiftshader` → Forces software-based rendering (useful for headless runs).
 * - `--disable-breakpad` → Disables crash reporting.
 * - `--disable-component-update` → Disables automatic component updates.
 * - `--disable-domain-reliability` → Reduces network-related telemetry.
 * - `--disable-extensions` → Disables all browser extensions.
 * - `--disable-features=site-per-process` → Disables strict site isolation.
 * - `--disable-gpu` → Runs without GPU acceleration.
 * - `--disable-sync` → Disables browser syncing features.
 * - `--headless=new` → Uses the new Chromium headless mode.
 * - `--remote-debugging-port=0` → Disables remote debugging for security.
 */

/**
 * 🟡 Chromium-Specific Playwright Arguments
 * -----------------------------------------
 * - `--start-maximized` → Opens the browser in maximized mode.
 * - `--disable-infobars` → Hides the "Chrome is being controlled" message.
 * - `--enable-automation` → Enables automation features.
 * - `--mute-audio` → Mutes all audio in the browser.
 * - `--autoplay-policy=no-user-gesture-required` → Allows autoplaying media.
 * - `--disable-blink-features=AutomationControlled` → Helps evade detection as an automated browser.
 * - `--ignore-certificate-errors` → Ignores SSL certificate errors.
 * - `--window-size=1920,1080` → Sets the browser window size explicitly.
 */

/**
 * 🔵 Firefox-Specific Playwright Arguments
 * ----------------------------------------
 * - `--no-remote` → Ensures no other Firefox instances interfere.
 * - `--profile <path>` → Launches the browser with a specific user profile.
 * - `--headless` → Runs Firefox in headless mode.
 * - `--width=1920 --height=1080` → Sets the window size.
 */

/**
 * 🍏 WebKit-Specific Playwright Arguments
 * ---------------------------------------
 * - `--no-sandbox` → Disables sandboxing.
 * - `--disable-gpu` → Disables GPU acceleration.
 * - `--headless` → Runs WebKit in headless mode.
 */
/** 
  * Breakdown:
  *   Mozilla/5.0 → Legacy token for compatibility
  *   (Windows NT 10.0 Win64 x64) → OS and architecture
  *   AppleWebKit/537.36 → Rendering engine
  *   (KHTML, like Gecko) → Compatibility
  *   Chrome/120.0.0.0 → Browser name and version
  *   Safari/537.36 → Another compatibility tag
  */
export function extraArgsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '') {
      return null; // null value is allowed
    }

    if (typeof control.value !== 'string') {
      return { extraArgs: 'Must be a string' };
    }

    const extraArgs = control.value.trim().split(' ')

    for (const arg of extraArgs) {
      if (!arg.startsWith('--')) {
        return { extraArgs: 'All extraArgs must start with --' }
      }
    }

    return null;
  };
}

export function viewportDimensionValidator(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return { viewportDimension: 'Required' }
    }

    const value = parseInt(control.value, 10)
    if (isNaN(value) || value < min || value > max) {
      return { viewportDimension: `Must be a number between ${min} and ${max}` }
    }

    return null
  }
}