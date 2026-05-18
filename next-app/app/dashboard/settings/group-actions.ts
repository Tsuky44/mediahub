'use server'

import { db } from '@/lib/db/drizzle'
import { userGroups, userGroupMembers, users, roles } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const error = (...args: any[]) => { if (isDev) console.error(...args); };

export async function getUserGroups() {
  // Simplified version without nested includes - fetch separately if needed
  const groups = await db.select().from(userGroups).orderBy(desc(userGroups.createdAt))
  return groups
}

export async function createUserGroup(name: string, roleId?: string) {
  try {
    const user = await getCurrentUser()
    const [group] = await db.insert(userGroups).values({
      name,
      roleId: roleId || null
    }).returning()

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
    // Update group
    const [group] = await db.update(userGroups).set({
      name,
      roleId: roleId || null
    }).where(eq(userGroups.id, id)).returning()
    
    // If roleId is set, update all members to this role
    if (roleId && group) {
      const members = await db.select().from(userGroupMembers).where(eq(userGroupMembers.userGroupId, id))
      const userIds = members.map(m => m.userId)
      
      if (userIds.length > 0) {
        await db.update(users).set({
          role: 'user',
          roleId: roleId
        }).where(inArray(users.id, userIds))
      }
    }

    if (user) {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt((user as any).id), 'UPDATE', 'UserGroup', id, { name, roleId })
    }

    revalidatePath('/dashboard/settings')
    return group
  } catch (error) {
    console.error('Error updating user group:', error)
    throw new Error('Failed to update user group')
  }
}

export async function deleteUserGroup(id: string) {
  try {
    const user = await getCurrentUser()
    await db.delete(userGroupMembers).where(eq(userGroupMembers.userGroupId, id))
    await db.delete(userGroups).where(eq(userGroups.id, id))

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
    // Check if user is already in the group
    const [existing] = await db.select().from(userGroupMembers).where(
      and(eq(userGroupMembers.userGroupId, groupId), eq(userGroupMembers.userId, userId))
    ).limit(1)
    
    if (existing) return
    
    // Get group to know the role
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).limit(1)
    if (!group) throw new Error('Group not found')
    
    // Add member
    await db.insert(userGroupMembers).values({
      userGroupId: groupId,
      userId: userId
    })
    
    // Update user role if group has one
    if (group.roleId) {
      await db.update(users).set({ role: 'user', roleId: group.roleId }).where(eq(users.id, userId))
    }

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
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).limit(1)
    if (!group) throw new Error('Group not found')
    
    // Filter out users already in group
    const existingMembers = await db.select().from(userGroupMembers).where(
      and(eq(userGroupMembers.userGroupId, groupId), inArray(userGroupMembers.userId, userIds))
    )
    
    const existingUserIds = new Set(existingMembers.map(m => m.userId))
    const newUserIds = userIds.filter(id => !existingUserIds.has(id))
    
    if (newUserIds.length === 0) return
    
    // Bulk create members
    await db.insert(userGroupMembers).values(
      newUserIds.map(userId => ({
        userGroupId: groupId,
        userId: userId
      }))
    )
    
    // Bulk update roles if group has role
    if (group.roleId) {
      await db.update(users).set({ role: 'user', roleId: group.roleId }).where(inArray(users.id, newUserIds))
    }

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
    await db.delete(userGroupMembers).where(
      and(eq(userGroupMembers.userGroupId, groupId), eq(userGroupMembers.userId, userId))
    )
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
