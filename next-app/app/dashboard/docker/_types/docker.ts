export interface DockerContainer {
    id: string
    name: string
    image: string
    state: string
    status: string
    ports?: string
    autoStart: boolean
    icon?: string
}

export interface DockerGroup {
    id: string
    name: string
    members: { containerName: string }[]
}

export type DockerViewMode = 'grid' | 'list'

export type DockerAction = 'start' | 'stop' | 'restart'
