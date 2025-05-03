import { DockerImageInfo } from "../types";

/* The `isImageDeployable` function in the provided TypeScript code is a function
that checks if an image specified by its URL is deployable. Here's a breakdown
of what the function does: */
export function isImageDeployable(imageUrl: string): { exists: boolean; info: DockerImageInfo | null } {
    const parsed = parseImageUrl(imageUrl);
    if (!parsed) {
        console.log('Invalid image URL')
        const info = { registry: '', org: '', name: '', tag: '' }
        return { exists: false, info: parsed }
    }

    const { registry, org, name, tag } = parsed;
    let exists = false;

    /* try {
        if (registry === 'docker.io') {
            const tags = tag ? `/tags/${tag}` : '';
            // Docker Hub: Only public images
            const url = `https://hub.docker.com/v2/repositories/${org}/${name}${tags}`;
            const response = await fetch(url);
            exists = response.ok;
        } else if (registry === 'ghcr.io' || registry === 'registry.fly.io') {
            // CORS will block this in browser — valid only for server-side or proxy request
            throw new Error(`${registry} cannot be checked directly from frontend due to CORS. Use a backend proxy.`);
        } else {
            throw new Error(`Unsupported registry: ${registry}`);
        }
    } catch (err) {
        exists = false;
    } */

    return { exists, info: parsed };
}

function parseImageUrl(imageUrl: string): DockerImageInfo | null {
    const dockerHubRegex = /^https?:\/\/hub\.docker\.com\/r\/([^\/]+)\/([^:]+)(?::(.+))?$/;
    const ghcrRegex = /^ghcr\.io\/([^\/]+)\/([^:]+)(?::(.+))?$/;
    const flyIoRegex = /^registry\.fly\.io\/([^:]+)(?::(.+))?$/;

    let match = dockerHubRegex.exec(imageUrl);
    if (match) {
        return {
            registry: 'docker.io',
            org: match[1],
            name: match[2],
            tag: match[3],
        };
    }

    match = ghcrRegex.exec(imageUrl);
    if (match) {
        return {
            registry: 'ghcr.io',
            org: match[1],
            name: match[2],
            tag: match[3],
        };
    }

    match = flyIoRegex.exec(imageUrl);
    if (match) {
        return {
            registry: 'registry.fly.io',
            org: match[1],
            name: match[1], // Fly image doesn't split org/name
            tag: match[2],
        };
    }

    return null;
}
