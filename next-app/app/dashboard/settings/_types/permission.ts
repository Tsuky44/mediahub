export interface Permission {
    action: string
    subject: string
    conditions?: any
}

export interface Role {
    id?: string
    name: string
    description: string | null
    isSystem?: boolean
    permissions?: Permission[]
}

export type PermissionStyle = 'row' | 'compact'

/** Definition d'une permission individuelle. */
export interface PermissionDef {
    subject: string
    action: string
    label: string
    description?: string
    danger?: boolean
}

/** Definition specifique "sync OR manage" pour MediaRequest. */
export interface PermissionGroupDef {
    title?: string
    style: PermissionStyle
    permissions: PermissionDef[]
}

export interface PermissionTabDef {
    id: string
    label: string
    heading: string
    groups: PermissionGroupDef[]
}
