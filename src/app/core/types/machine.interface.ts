export type FlyMachine = Machine & {
    deploymentId: string
    default: boolean
    description?: string
    host_status: string
}

export interface App {
    id?: string
    name?: string
    organization?: Organization
    status?: string
}

export interface CheckStatus {
    name?: string
    output?: string
    status?: string
    updated_at?: string
}

export interface CreateAppRequest {
    app_name?: string
    app_role_id?: string
    network?: string
    org_slug?: string
}

export interface CreateLeaseRequest {
    description?: string
    ttl?: number
}

export interface CreateMachineRequest {
    config?: MachineConfig
    lease_ttl?: number
    lsvd?: boolean
    name?: string
    region?: string
    skip_launch?: boolean
    skip_service_registration?: boolean
}

export interface CreateVolumeRequest {
    compute: MachineGuest
    encrypted?: boolean
    fstype?: string
    machines_only?: boolean
    name?: string
    region?: string
    require_unique_zone?: boolean
    size_gb?: number
    snapshot_id?: string
    snapshot_retention?: number
    source_volume_id?: string
}

export interface ErrorResponse {
    details?: any
    error?: string
    status?: MainStatusCode
}

export interface ExtendVolumeRequest {
    size_gb?: number
}

export interface ExtendVolumeResponse {
    needs_restart?: boolean
    volume?: Volume
}

export interface ImageRef {
    digest?: string
    labels?: Record<string, string>
    registry?: string
    repository?: string
    tag?: string
}

export interface Lease {
    description?: string
    expires_at?: number
    nonce?: string
    owner?: string
    version?: string
}

export interface ListApp {
    id?: string
    machine_count?: number
    name?: string
    network?: any
}

export interface ListAppsResponse {
    apps?: ListApp[]
    total_apps?: number
}

export interface ListenSocket {
    address?: string
    proto?: string
}

export interface Machine {
    checks?: CheckStatus[]
    config: MachineConfig
    created_at: string
    events: MachineEvent[]
    id: string
    image_ref: ImageRef
    instance_id: string
    name?: string
    nonce?: string
    private_ip: string
    region: string
    state: string
    updated_at?: string
}

export interface MachineEvent {
    id?: string
    request?: any
    source?: string
    status?: string
    timestamp?: number
    type?: string
}

export interface MachineExecRequest {
    cmd?: string
    command?: string[]
    timeout?: number
}

export interface MachineVersion {
    user_config?: MachineConfig
    version?: string
}

export interface Organization {
    name?: string
    slug?: string
}

export interface ProcessStat {
    command?: string
    cpu?: number
    directory?: string
    listen_sockets?: ListenSocket[]
    pid?: number
    rss?: number
    rtime?: number
    stime?: number
}

export interface SignalRequest {
    signal?: SignalRequestSignalEnum
}

export interface StopRequest {
    signal?: string
    timeout?: string
}

export interface UpdateMachineRequest {
    config?: MachineConfig
    current_version?: string
    lease_ttl?: number
    lsvd?: boolean
    name?: string
    region?: string
    skip_launch?: boolean
    skip_service_registration?: boolean
}

export interface UpdateVolumeRequest {
    snapshot_retention?: number
}

export interface Volume {
    attached_alloc_id?: string
    attached_machine_id?: string
    block_size?: number
    blocks?: number
    blocks_avail?: number
    blocks_free?: number
    created_at?: string
    encrypted?: boolean
    fstype?: string
    id?: string
    name?: string
    region?: string
    size_gb?: number
    snapshot_retention?: number
    state?: string
    zone?: string
}

export interface VolumeSnapshot {
    created_at?: string
    digest?: string
    id?: string
    size?: number
    status?: string
}

export interface DNSConfig {
    skip_registration?: boolean
}

export interface File {
    guest_path?: string
    raw_value?: string
    secret_name?: string
}

export interface HTTPOptions {
    compress?: boolean
    h2_backend?: boolean
    response?: HTTPResponseOptions
}

export interface HTTPResponseOptions {
    headers?: Record<string, any>
}

export interface MachineCheck {
    grace_period?: string
    headers?: MachineHTTPHeader[]
    interval?: string
    method?: string
    path?: string
    port?: number
    protocol?: string
    timeout?: string
    tls_server_name?: string
    tls_skip_verify?: boolean
    type?: string
}

export interface MachineConfig {
    auto_destroy?: boolean
    checks?: Record<string, MachineCheck>
    disable_machine_autostart?: boolean
    dns?: DNSConfig
    env?: Record<string, string>
    files?: File[]
    guest: MachineGuest
    image?: string
    init?: MachineInit
    metadata?: Record<string, string>
    metrics?: MachineMetrics
    mounts?: MachineMount[]
    processes?: MachineProcess[]
    restart?: MachineRestart
    schedule?: string
    services?: MachineService[]
    size?: string
    standbys?: string[]
    statics?: Static[]
    stop_config?: StopConfig
}

export interface MachineGuest {
    cpu_kind: string
    cpus: number
    gpu_kind?: string
    host_dedication_id?: string
    kernel_args?: string[]
    memory_mb: number
}

export interface MachineHTTPHeader {
    name?: string
    values?: string[]
}

export interface MachineInit {
    cmd?: string[]
    entrypoint?: string[]
    exec?: string[]
    kernel_args?: string[]
    swap_size_mb?: number
    tty?: boolean
}

export interface MachineMetrics {
    path?: string
    port?: number
}

export interface MachineMount {
    add_size_gb?: number
    encrypted?: boolean
    extend_threshold_percent?: number
    name?: string
    path?: string
    size_gb?: number
    size_gb_limit?: number
    volume?: string
}

export interface MachinePort {
    end_port?: number
    force_https?: boolean
    handlers?: string[]
    http_options?: HTTPOptions
    port?: number
    proxy_proto_options?: ProxyProtoOptions
    start_port?: number
    tls_options?: TLSOptions
}

export interface MachineProcess {
    cmd?: string[]
    entrypoint?: string[]
    env?: Record<string, string>
    exec?: string[]
    user?: string
}

export interface MachineRestart {
    max_retries?: number
    policy?: MachineRestartPolicyEnum
}

export interface MachineService {
    autostart?: boolean
    autostop?: boolean
    checks?: MachineCheck[]
    concurrency?: MachineServiceConcurrency
    force_instance_description?: string
    force_instance_key?: string
    internal_port?: number
    min_machines_running?: number
    ports?: MachinePort[]
    protocol?: string
}

export interface MachineServiceConcurrency {
    hard_limit?: number
    soft_limit?: number
    type?: string
}

export interface ProxyProtoOptions {
    version?: string
}

export interface Static {
    guest_path: string
    url_prefix: string
}

export interface StopConfig {
    signal?: string
    timeout?: string
}

export interface TLSOptions {
    alpn?: string[]
    default_self_signed?: boolean
    versions?: string[]
}

export enum MainStatusCode {
    Unknown = 'unknown',
    CapacityErr = 'insufficient_capacity',
}

export enum SignalRequestSignalEnum {
    SIGABRT = 'SIGABRT',
    SIGALRM = 'SIGALRM',
    SIGFPE = 'SIGFPE',
    SIGHUP = 'SIGHUP',
    SIGILL = 'SIGILL',
    SIGINT = 'SIGINT',
    SIGKILL = 'SIGKILL',
    SIGPIPE = 'SIGPIPE',
    SIGQUIT = 'SIGQUIT',
    SIGSEGV = 'SIGSEGV',
    SIGTERM = 'SIGTERM',
    SIGTRAP = 'SIGTRAP',
    SIGUSR1 = 'SIGUSR1',
}

export enum MachineRestartPolicyEnum {
    No = 'no',
    Always = 'always',
    OnFailure = 'on-failure',
}

export interface AppsListParams {
    org_slug: string
}

export interface MachinesListParams {
    include_deleted?: boolean
    region?: string
    appName: string
}

export interface MachinesListProcessesParams {
    sort_by?: string
    order?: string
    appName: string
    machineId: string
}

export interface MachinesRestartParams {
    timeout?: string
    appName: string
    machineId: string
}

export interface MachinesWaitParams {
    instance_id?: string
    timeout?: number
    state?: StateEnum
    appName: string
    machineId: string
}

export enum StateEnum {
    Started = 'started',
    Stopped = 'stopped',
    Destroyed = 'destroyed',
}


export type MachineResponse = {

    machine_details: FlyMachine,
    machine_id: string,
    message: string,
    status: boolean
}