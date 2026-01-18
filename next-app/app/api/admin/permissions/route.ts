import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'admin.access': 'Accès complet au panneau d\'administration et aux outils système',
  'users.view': 'Permet de consulter la liste des utilisateurs et leurs informations de base',
  'users.manage': 'Permet de créer, modifier les rôles et supprimer des utilisateurs',
  'roles.manage': 'Permet de créer et modifier les rôles ainsi que leurs permissions',
  'media.manage': 'Permet d\'actualiser les bibliothèques et modifier les métadonnées',
  'requests.view': 'Permet de consulter toutes les demandes des utilisateurs',
  'requests.create': 'Permet de soumettre de nouvelles demandes de films et séries',
  'requests.manage': 'Permet d\'approuver, rejeter ou marquer les demandes comme terminées',
  'settings.view': 'Permet de voir la configuration actuelle du serveur',
  'settings.manage': 'Permet de modifier les clés API et les réglages globaux du serveur',
  'logs.view': 'Accès aux journaux d\'audit et aux logs d\'erreurs du système',
  'docker.view': 'Permet de voir l\'état et les statistiques des conteneurs Docker',
  'docker.manage': 'Permet de démarrer, arrêter et redémarrer les conteneurs',
  'stats.view': 'Accès aux statistiques détaillées de consommation et d\'usage',
  'downloads.view': 'Permet de surveiller la file d\'attente des téléchargements',
  'downloads.manage': 'Permet d\'ajouter, mettre en pause ou supprimer des téléchargements',
  'dashboard.view': 'Accès à la page d\'accueil personnalisée du tableau de bord',
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  // Check permission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session.user as any).role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userPermissions = (session.user as any).permissions || []
  const hasAccess = userRole === 'admin' || userPermissions.includes(PERMISSIONS.ROLES_MANAGE)

  if (!hasAccess) return new NextResponse('Forbidden', { status: 403 })

  // Ensure all defined permissions exist in DB
  const definedPermissions = Object.values(PERMISSIONS)
  const existingPermissions = await prisma.permission.findMany()
  const existingNames = existingPermissions.map(p => p.name)

  const missingPermissions = definedPermissions.filter(p => !existingNames.includes(p))

  if (missingPermissions.length > 0) {
    await prisma.permission.createMany({
      data: missingPermissions.map(name => ({
        name,
        description: PERMISSION_DESCRIPTIONS[name] || `Permission ${name}`,
        category: name.split('.')[0]
      }))
    })
  }

  const permissions = await prisma.permission.findMany({
    orderBy: {
      name: 'asc'
    }
  })

  return NextResponse.json(permissions)
}
