'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const error = (...args: any[]) => { if (isDev) console.error(...args); };

export async function getUserGroups() {
  return await prisma.userGroup.findMany({
    include: {
      role: true,
      members: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function createUserGroup(name: string, roleId?: string) {
  try {
    const user = await getCurrentUser()
    const group = await prisma.userGroup.create({
      data: {
        name,
        roleId: roleId || null
      }
    })

    if (user) {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'CREATE', 'UserGroup', group.id, { name, roleId })
    }

    revalidatePath('/dashboard/settings')
    return group
  } catch (err) {
    error('Error creating user group:', err)
    throw new Error('Failed to create user group')
  }
}

export async function updateUserGroup(id: string, name: string, roleId?: string) {
  try {
    const user = await getCurrentUser()
    // transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
        const group = await tx.userGroup.update({
            where: { id },
            data: {
                name,
                roleId: roleId || null
            }
        })

        // If roleId is set, update all members to this role
        if (roleId) {
            const members = await tx.userGroupMember.findMany({
                where: { userGroupId: id }
            })

            const userIds = members.map(m => m.userId)

            if (userIds.length > 0) {
                await tx.user.updateMany({
                    where: { id: { in: userIds } },
                    data: {
                        role: 'user', // Default base role
                        roleId: roleId
                    }
                })
            }
        }

        return group
    })

    if (user) {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'UPDATE', 'UserGroup', id, { name, roleId })
    }

    revalidatePath('/dashboard/settings')
    return result
  } catch (error) {
    console.error('Error updating user group:', error)
    throw new Error('Failed to update user group')
  }
}

export async function deleteUserGroup(id: string) {
  try {
    const user = await getCurrentUser()
    await prisma.userGroup.delete({
      where: { id }
    })

    if (user) {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'DELETE', 'UserGroup', id)
    }

    revalidatePath('/dashboard/settings')
  } catch (err) {
    error('Error deleting user group:', err)
    throw new Error('Failed to delete user group')
  }
}

export async function addUserToGroup(groupId: string, userId: number) {
  try {
    const user = await getCurrentUser()
    await prisma.$transaction(async (tx) => {
        // Check if user is already in the group
    const existing = await tx.userGroupMember.findUnique({
        where: {
            userId_userGroupId: {
                userGroupId: groupId,
                userId: userId
            }
        }
    })

        if (existing) return

        // Get group to know the role
        const group = await tx.userGroup.findUnique({
            where: { id: groupId },
            include: { role: true }
        })

        if (!group) throw new Error('Group not found')

        // Add member
        await tx.userGroupMember.create({
            data: {
                userGroupId: groupId,
                userId: userId
            }
        })

        // Update user role if group has one
        if (group.roleId) {
            await tx.user.update({
                where: { id: userId },
                data: {
                    role: 'user',
                    roleId: group.roleId
                }
            })
        }
    })

    if (user) {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'UPDATE', 'UserGroupMember', `${groupId}-${userId}`, { action: 'add', groupId, targetUserId: userId })
    }

    revalidatePath('/dashboard/settings')
  } catch (error) {
    console.error('Error adding user to group:', error)
    throw new Error('Failed to add user to group')
  }
}

export async function addUsersToGroup(groupId: string, userIds: number[]) {
  try {
    const user = await getCurrentUser()
    await prisma.$transaction(async (tx) => {
        const group = await tx.userGroup.findUnique({
            where: { id: groupId }
        })

        if (!group) throw new Error('Group not found')

        // Filter out users already in group
        const existingMembers = await tx.userGroupMember.findMany({
            where: {
                userGroupId: groupId,
                userId: { in: userIds }
            },
            select: { userId: true }
        })
        
        const existingUserIds = new Set(existingMembers.map(m => m.userId))
        const newUserIds = userIds.filter(id => !existingUserIds.has(id))

        if (newUserIds.length === 0) return

        // Bulk create members
        await tx.userGroupMember.createMany({
            data: newUserIds.map(userId => ({
                userGroupId: groupId,
                userId: userId
            }))
        })

        // Bulk update roles if group has role
        if (group.roleId) {
            await tx.user.updateMany({
                where: { id: { in: newUserIds } },
                data: {
                    role: 'user',
                    roleId: group.roleId
                }
            })
        }
    })

    if (user) {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'BULK_UPDATE', 'UserGroupMember', groupId, { action: 'add_multiple', groupId, count: userIds.length })
    }

    revalidatePath('/dashboard/settings')
  } catch (error) {
    console.error('Error adding users to group:', error)
    throw new Error('Failed to add users to group')
  }
}

export async function removeUserFromGroup(groupId: string, userId: number) {
  try {
    const user = await getCurrentUser()
    await prisma.userGroupMember.delete({
      where: {
        userId_userGroupId: {
          userGroupId: groupId,
          userId: userId
        }
      }
    })
    // Note: We do NOT revert the user's role automatically, as we don't know what it should be.
    // The admin can manually change it if needed.

    if (user) {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'UPDATE', 'UserGroupMember', `${groupId}-${userId}`, { action: 'remove', groupId, targetUserId: userId })
    }
    
    revalidatePath('/dashboard/settings')
  } catch (err) {
    error('Error removing user from group:', err)
    throw new Error('Failed to remove user from group')
  }
}
