export interface UserGroupMember {
    userId: number
    user: {
        id: number
        name: string | null
        email: string | null
        image: string | null
    }
}

export interface UserGroup {
    id: string
    name: string
    roleId: string | null
    role: { id: string; name: string } | null
    members: UserGroupMember[]
}

export interface UserGroupRoleOption {
    id: string
    name: string
}

export interface UserGroupUserOption {
    id: number
    name: string | null
    email: string | null
    image?: string | null
}
