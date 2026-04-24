export interface ContainerVolume {
    source: string
    destination: string
    mode: string
    rw: boolean
}

export interface ContainerPortMapping {
    container: string
    host: string | null
}

export interface ContainerInfo {
    id: string
    name: string
    image: string
    cmd: string
    env: string[]
    volumes: ContainerVolume[]
    ports: ContainerPortMapping[]
    labels: Record<string, string>
    networkMode: string
    restartPolicy: string
    created: string
    platform: string
}

export type ContainerDetailsTab = 'info' | 'env' | 'volumes' | 'network'
