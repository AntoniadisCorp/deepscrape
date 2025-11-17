import { Injectable } from '@angular/core'
import { environment } from 'src/environments/environment'

declare global {
  interface Console {
    forceLog?: (...args: unknown[]) => void
  }
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  // Static initialization - runs once when app starts
  static {
    // Only modify console in production
    if (environment.production) {
      // Store original methods
      const originalMethods = {
        log: console.log,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error
      }
      
      


      
      // Replace with filtered versions
      console.log = console.debug = console.info = console.warn = () => {}
      // else {
      //   console.log = function(...args) {
      //     originalMethods.log.apply(console, args)
      //   }
      //   console.debug = function(...args) {
      //     originalMethods.debug.apply(console, args)
      //   }
      //   console.info = function(...args) {
      //     originalMethods.info.apply(console, args)
      //   }
      //   console.warn = function(...args) {
      //     originalMethods.warn.apply(console, args)
      //   }
      // }
      
      
      // Keep error logging
      console.error = function(...args) {
        // Redact sensitive information before logging
        const redactedArgs = args.map(arg => {
          if (typeof arg === 'string') {
            return arg
              .replace(/apiKeys?\s*:\s*['"][^'"]+['"]/gi, 'apiKey: [REDACTED]')
              .replace(/apiKeyId\s*:\s*['"][^'"]+['"]/gi, 'apiKeyId: [REDACTED]')
              .replace(/apiKey\s*=\s*['"][^'"]+['"]/gi, 'apiKey=[REDACTED]');
          }
          if (typeof arg === 'object' && arg !== null) {
            // Shallow clone and redact known keys
            const clone = { ...arg };
            ['apiKey', 'apiKeys', 'apiKeyId'].forEach(key => {
              if (clone[key]) clone[key] = '[REDACTED]';
            });
            return clone;
          }
          return arg;
        });
        originalMethods.error.apply(console, redactedArgs)
        // Could add remote logging here
      };
      
      // Add ability to force logging even in production
      (console as Console).forceLog = (...args: unknown[]): void => {
        originalMethods.log.apply(console, args)
      }
    }
  }

  // Regular instance methods - these will maintain call stack
  log(...data: any[]): void {
    console.log(...data)
  }
  
  debug(...data: any[]): void {
    console.debug(...data)
  }
  
  info(...data: any[]): void {
    console.info(...data)
  }
  
  warn(...data: any[]): void {
    console.warn(...data)
  }
  
  error(...data: any[]): void {
    console.error(...data)
  }
  
  // For critical logs that should appear even in production
  forceLog(...data: any[]): void {
    if ((console as any).forceLog) {
      (console as any).forceLog(...data)
    } else {
      console.log(...data)
    }
  }
}