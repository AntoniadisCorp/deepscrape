import { DockerImageInfo } from "../types";

/* The `isImageDeployable` function in the provided TypeScript code is a function
that checks if an image specified by its URL is deployable. Here's a breakdown
of what the function does: */
export function isImageParsable(imageUrl: string): { exists: boolean; info: DockerImageInfo | null } {
    const parsed = parseImageUrl(imageUrl);
    console.log(parsed)
    if (!parsed) {
        console.log('Invalid image URL')
        const info = { registry: '', org: '', name: '', tag: '' }
        return { exists: false, info: parsed }
    }

    // const { registry, repository, name, tag } = parsed;
    let exists = false;

    return { exists, info: parsed };
}

export function parseImageUrl(imageUrl: string): DockerImageInfo | null {
    const dockerHubRegex = /^https?:\/\/hub\.docker\.com\/r\/([^\/]+)\/([^:]+)(?::(.+))?$/;
    const ghcrRegex = /^ghcr\.io\/([^\/]+)\/([^:]+)(?::(.+))?$/;
    const flyIoRegex = /^registry\.fly\.io\/([^:]+)(?::(.+))?$/;

    const genericImageRefRegex = /^(?:https?:\/\/)?(?:(?<registry>[\w.-]+(?::\d+)?)(?:\/))?(?:(?<namespace>[\w.-]+)\/)?(?<repository>[\w.-]+)(?::(?<tag>[\w.-]+))?(?:@(?<digest>sha256:[a-fA-F0-9]{64}))?$/;

    let match;

    // Docker Hub UI URL
    match = dockerHubRegex.exec(imageUrl);
    if (match) {
        const [_, namespace, repository, tag] = match;
        return {
            registry: 'docker.io',
            namespace,
            repository,
            tag,
            fullName: `docker.io/${namespace}/${repository}${tag ? `:${tag}` : ''}`,
        };
    }

    // ghcr.io/org/name:tag
    match = ghcrRegex.exec(imageUrl);
    if (match) {
        const [_, namespace, repository, tag] = match;
        return {
            registry: 'ghcr.io',
            namespace,
            repository,
            tag,
            fullName: `ghcr.io/${namespace}/${repository}${tag ? `:${tag}` : ''}`,
        };
    }

    // registry.fly.io/name:tag
    match = flyIoRegex.exec(imageUrl);
    if (match) {
        const [_, name, tag] = match;
        return {
            registry: 'registry.fly.io',
            namespace: name,
            repository: name,
            tag,
            fullName: `registry.fly.io/${name}${tag ? `:${tag}` : ''}`,
        };
    }

    // Generic parser
    match = genericImageRefRegex.exec(imageUrl);
    if (match?.groups) {
        let { registry, namespace, repository, tag, digest } = match.groups;

        // Default registry and namespace
        registry = registry || 'docker.io';
        namespace = namespace || 'library';

        // Construct full name
        const fullName = `${registry}/${namespace}/${repository}${tag ? `:${tag}` : ''}${digest ? `@${digest}` : ''}`;

        return {
            registry,
            namespace,
            repository,
            tag,
            digest,
            fullName,
        };
    }

    return null;
}
