import { Headers } from "../types";

export const convertCookies = (input: any): any => {

    if (input?.cookies && typeof input?.cookies === 'string') {
        try {
            const cookies = JSON.stringify(input?.cookies)
            JSON.parse(cookies)
            input.cookies = {
                type: 'dict',
                value: input.cookies
            }
            return input;
        } catch (e) {
            console.error('Cookies are not in valid JSON format:', e);
            return  // Or handle the error as needed
        }
    }
    return

}
export const convertHeaders = (input: any): any => {

    let headers = input.headers
    if (headers && typeof headers === 'string') {
        try {
            input.headers = JSON.parse(input.headers)
        } catch (e) {
            console.error('headers are not in valid JSON format:', e);
            return input  // Or handle the error as needed
        }
    }

    if (input.headers && Array.isArray(input.headers)) {

        let headersObject: { [key: string]: string } = {}
        input.headers.forEach((header: Headers) => {
            headersObject = {
                [header.key]: header.value
            }
        })
        input.headers = {
            type: 'dict',
            value: headersObject
        };
    }
    return input;
}

export const convertExcludeSocialMediaDomains = (input: any) => {
    console.log(input)
    if (input?.excludeSocialMediaDomains && typeof input?.excludeSocialMediaDomains === 'string') {
        input.excludeSocialMediaDomains = (input.excludeSocialMediaDomains as string).split(',') as string[]
        return input
    }
    return
}
export const convertExcludeDomains = (input: any) => {

    if (input?.excludeDomains && typeof input?.excludeDomains === 'string') {
        input.excludeDomains = (input.excludeDomains as string).split(',')
        return input
    }
    return
}

export const switchPackKey = (packKey: string, packValue: any) => {
    switch (packKey) {
        case 'crawlConfig':
            return {
                crawl_config: {
                    "type": "CrawlRunConfig",
                    "params": {
                        ...packValue, ...convertExcludeDomains(packValue), ...convertExcludeSocialMediaDomains(packValue)
                    }
                }
            }
        case 'browserProfile':

            return {
                browser_config: {
                    "type": "BrowserConfig",
                    "params": {
                        ...packValue, ...convertHeaders(packValue), ...convertCookies(packValue)
                    }
                }
            }
        case 'crawlResultConfig':
            return {
                result_config: {
                    "type": "CrawlResult",
                    "params": {
                        ...packValue
                    }
                }

            }
        default:
            return packKey
    }
}