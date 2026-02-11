import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  // Paramètres (Système & Utilisateurs)
  'admin.access': 'Accès au tableau de bord administrateur',
  'settings.view': 'Voir les paramètres globaux',
  'settings.manage': 'Modifier les paramètres globaux',
  'logs.view': 'Voir les journaux d\'audit et logs',
  'users.view': 'Voir la liste des utilisateurs',
  'users.manage': 'Gérer les utilisateurs (Créer, Modifier, Bannir)',
  'roles.manage': 'Gérer les rôles et permissions',

  // Docker
  'docker.view': 'Voir l\'état des conteneurs Docker',
  'docker.manage': 'Contrôler les conteneurs (Start/Stop/Restart)',
  'docker.console': 'Accès au terminal/logs des conteneurs',

  // Téléchargements
  'downloads.view': 'Accès à l\'onglet Téléchargements',
  'downloads.add': 'Ajouter/Rechercher des nouveaux téléchargements',
  'downloads.manage': 'Contrôler les téléchargements (Pause/Reprise)',
  'downloads.delete': 'Supprimer des téléchargements',
  'files.view': 'Accès à l\'explorateur de fichiers',
  'files.manage': 'Gérer les fichiers (Renommer, Déplacer, Supprimer)',
  'files.share': 'Créer des liens de partage de fichiers',

  // Ma médiathèque
  'media.view': 'Voir le catalogue de médias',
  'media.play': 'Lire le contenu multimédia',
  'media.manage': 'Gérer les métadonnées et scans',
  'media.delete': 'Supprimer des médias de la librairie',

  // Demandes
  'requests.search.view': 'Accès à l\'onglet Demander (Recherche)',
  'requests.list.view': 'Accès à l\'onglet Mes demandes (Lecture seule)',
  'requests.list.manage': 'Gérer les demandes (Supprimer/Relancer)',
  'requests.details.manage': 'Menu de gestion sur les détails des médias',
  'requests.interactive': 'Utiliser la recherche interactive',

  // Stats
  'stats.view_global': 'Voir les statistiques globales',
  'stats.view_self': 'Voir ses propres statistiques',
}

const CATEGORY_MAPPING: Record<string, string> = {
  'admin': 'Paramètres',
  'settings': 'Paramètres',
  'logs': 'Paramètres',
  'users': 'Paramètres',
  'roles': 'Paramètres',
  'docker': 'Docker',
  'downloads': 'Téléchargements',
  'files': 'Téléchargements',
  'media': 'Ma médiathèque',
  'requests': 'Demandes',
  'stats': 'Statistiques',
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
      data: missingPermissions.map(name => {
        const prefix = name.split('.')[0]
        return {
          name,
          description: PERMISSION_DESCRIPTIONS[name] || `Permission ${name}`,
          category: CATEGORY_MAPPING[prefix] || 'Autres'
        }
      })
    })
  }

  const permissions = await prisma.permission.findMany({
    orderBy: {
      name: 'asc'
    }
  })

  return NextResponse.json(permissions)
}
