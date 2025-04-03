import { FormGroup } from "@angular/forms"
import { BrowserType, CrawlCachingMode, CrawlOperationStatus } from "../enum"
import { Size } from "../types"

export function crawlOperationStatusColor(status: CrawlOperationStatus) {
    let color = 'gray'
    switch (status) {
        case CrawlOperationStatus.IN_PROGRESS:
            color = 'cyan'
            break
        case CrawlOperationStatus.FAILED:
            color = 'red'
            break
        case CrawlOperationStatus.CANCELED:
            color = 'deep-orange'
            break
        case CrawlOperationStatus.SCHEDULED:
            color = 'emerald'
            break
        case CrawlOperationStatus.COMPLETED:
            color = 'green'
            break
        case CrawlOperationStatus.STARTED:
            color = 'blue'
            break
        case CrawlOperationStatus.READY:
            color = color
            break
        default:
            break
    }
    //` bg-${color}-600/[.8]` + ` hover:bg-${color}-600/[0.5]` + ` focus:bg-${color}-900/[0.8]`
    // ' bg-' + color + '-600/[.8] hover:bg-' + color + '-600/[0.5] focus:bg-' + color + '-900/[0.8] '
    return color
}


export function setOperationStatusList(statusList: Size[]) {
    const list = [
        { name: 'Save', code: CrawlOperationStatus.READY },
        { name: 'Run', code: CrawlOperationStatus.STARTED },
        { name: 'Schedule', code: CrawlOperationStatus.SCHEDULED }
    ]
    statusList.push(...list)
}

export function setCacheModeList(cacheModeList: Size[]) {
    const list = [
        { name: CrawlCachingMode.ENABLED.toUpperCase(), code: CrawlCachingMode.ENABLED.toLowerCase() },
        { name: CrawlCachingMode.DISABLED.toUpperCase(), code: CrawlCachingMode.DISABLED.toLowerCase() },
        { name: CrawlCachingMode.BYPASS.toUpperCase(), code: CrawlCachingMode.BYPASS.toLowerCase() },
        { name: CrawlCachingMode.NONE.toUpperCase(), code: CrawlCachingMode.NONE.toLowerCase() },
        { name: CrawlCachingMode.WRITE_ONLY.toUpperCase(), code: CrawlCachingMode.WRITE_ONLY.toLowerCase() },
        { name: CrawlCachingMode.READ_ONLY.toUpperCase(), code: CrawlCachingMode.READ_ONLY.toLowerCase() },
    ]
    cacheModeList.push(...list)
}

export function setBrowserTypeList(browserTypeList: Size[]) {
    const list = [
        { name: BrowserType.Chromium.toUpperCase(), code: BrowserType.Chromium.toLowerCase() },
        { name: BrowserType.Firefox.toUpperCase(), code: BrowserType.Firefox.toLowerCase() },
        { name: BrowserType.Webkit.toUpperCase(), code: BrowserType.Webkit.toLowerCase() },
    ]

    browserTypeList.push(...list)
}

export function validateForm(configForm: FormGroup<any>): boolean {
    if (configForm.invalid) {
        Object.keys(configForm.controls).forEach(key => {
            const control = configForm.get(key)
            if (control?.invalid) {
                console.log(`${key} is invalid: `, control.errors)
            }
        })
        return false
    }
    return true
}

export function getOffsetTop(element: HTMLElement | null): number {
    let offsetTop = 0;
    while (element) {
        offsetTop += element.offsetTop;
        element = element.offsetParent as HTMLElement
    }
    return offsetTop;
}


export function getErrorLabel(configForm: FormGroup<any>, controlName: string): string {

    if (!configForm.get(controlName) || configForm.get(controlName)?.errors === null)
        return ''

    const max = configForm.get(controlName)?.errors?.['max']?.max
    const min = configForm.get(controlName)?.errors?.['min']?.min

    const actual = parseInt(configForm.get(controlName)?.value, 10);

    // console.log(actual, max)
    if (actual > max) {
        console.log('invalid value, the maximum value is ' + max)
        return 'invalid value, the maximum value is ' + max
    }

    if (configForm.get(controlName)?.errors?.['required']) {
        return 'This field is required';
    } else if (configForm.get(controlName)?.errors?.['min']) {
        return 'invalid value, the minimum value is ' + min;
    } else if (configForm.get(controlName)?.errors?.['pattern']) {
        return 'invalid input, use only numbers'
    } else if (configForm.get(controlName)?.errors?.[controlName]) {
        return configForm.get(controlName)?.errors?.[controlName]
    }
    return 'invalid input'
}
