export type FlyMachine = {
    id: string
    deploymentId: string,
    default: boolean,
    name: string
    description?: string
    state: string
    region: string
    instance_id: string
    private_ip: string
    created_at: string
    updated_at: string
    host_status: string
    config: {
        image: string
        guest: {
            cpus: number
            memory_mb: number
            cpu_kind: string
        }
        env: {
            [key: string]: string
        },
        restart: {
            [key: string]: string
        },
        services: Array<{
            autostart: boolean;
            autostop: boolean;
            concurrency: {
                hard_limit: number;
                soft_limit: number;
                type: string;
            };
            internal_port: number;
            ports: Array<{
                force_https?: boolean;
                handlers: string[];
                port: number;
            }>;
            protocol: string;
        }>;
    }
    image_ref: {
        registry: string
        repository: string
        tag: string
        digest: string
        labels: {
            [key: string]: string
        }
    }
    events: any[]
}


export type MachineResponse = {

    machine_details: FlyMachine,
    machine_id: string,
    message: string,
    status: boolean
}