
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PERMISSIONS = [
  { name: 'admin.access', description: 'Accès au tableau de bord administrateur', category: 'admin' },
  { name: 'users.view', description: 'Voir la liste des utilisateurs', category: 'users' },
  { name: 'users.manage', description: 'Gérer les utilisateurs (créer, modifier, supprimer)', category: 'users' },
  { name: 'roles.manage', description: 'Gérer les rôles et permissions', category: 'system' },
  { name: 'media.manage', description: 'Gérer les médias (actualiser, modifier)', category: 'media' },
  { name: 'requests.view', description: 'Voir les demandes de médias', category: 'requests' },
  { name: 'requests.manage', description: 'Gérer les demandes (approuver, rejeter)', category: 'requests' },
  { name: 'settings.view', description: 'Voir les paramètres', category: 'system' },
  { name: 'settings.manage', description: 'Modifier les paramètres', category: 'system' },
  { name: 'logs.view', description: 'Voir les journaux d\'audit', category: 'system' },
]

const ROLES = [
  {
    name: 'admin',
    displayName: 'Administrateur',
    description: 'Accès complet au système',
    isSystem: true,
    priority: 100,
    permissions: PERMISSIONS.map(p => p.name)
  },
  {
    name: 'moderator',
    displayName: 'Modérateur',
    description: 'Gestion du contenu et des utilisateurs',
    isSystem: false,
    priority: 50,
    permissions: ['media.manage', 'requests.manage', 'users.view', 'admin.access']
  },
  {
    name: 'user',
    displayName: 'Utilisateur',
    description: 'Utilisateur standard',
    isSystem: true,
    priority: 0,
    permissions: []
  },
  {
    name: 'user_plus',
    displayName: 'Utilisateur +',
    description: 'Utilisateur avec privilèges étendus (téléchargements)',
    isSystem: false,
    priority: 10,
    permissions: ['requests.view'] // Add more if needed
  }
]

async function main() {
  console.log('Seeding RBAC...')

  // 1. Create Permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description, category: perm.category },
      create: perm
    })
  }
  console.log('Permissions created.')

  // 2. Create Roles
  for (const role of ROLES) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        priority: role.priority
      },
      create: {
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        priority: role.priority
      }
    })

    // Assign permissions
    if (role.permissions.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: { name: { in: role.permissions } }
      })

      await prisma.role.update({
        where: { id: createdRole.id },
        data: {
          permissions: {
            set: [], // Clear existing
            connect: permissions.map(p => ({ id: p.id }))
          }
        }
      })
    }
  }
  console.log('Roles created.')

  console.log('RBAC Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
