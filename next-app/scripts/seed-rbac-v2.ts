
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Définition des permissions groupées par catégorie pour l'affichage UI futur
const PERMISSIONS_DATA = [
  // --- SYSTÈME (Paramètres) ---
  { name: 'admin.access', description: 'Accès au tableau de bord administrateur', category: 'Paramètres' },
  { name: 'settings.view', description: 'Voir les paramètres globaux', category: 'Paramètres' },
  { name: 'settings.manage', description: 'Modifier les paramètres globaux', category: 'Paramètres' },
  { name: 'logs.view', description: 'Voir les journaux d\'audit et logs', category: 'Paramètres' },
  // Utilisateurs est aussi dans Paramètres
  { name: 'users.view', description: 'Voir la liste des utilisateurs', category: 'Paramètres' },
  { name: 'users.manage', description: 'Gérer les utilisateurs (Créer, Modifier, Bannir)', category: 'Paramètres' },
  { name: 'roles.manage', description: 'Gérer les rôles et permissions', category: 'Paramètres' },

  // --- DASHBOARD (Général) ---
  // Peut-être des widgets spécifiques ? Pour l'instant on laisse vide ou basique.

  // --- INFRASTRUCTURE (DOCKER) ---
  { name: 'docker.view', description: 'Voir l\'état des conteneurs Docker', category: 'Docker' },
  { name: 'docker.manage', description: 'Contrôler les conteneurs (Start/Stop/Restart)', category: 'Docker' },
  { name: 'docker.console', description: 'Accès au terminal/logs des conteneurs', category: 'Docker' },

  // --- TÉLÉCHARGEMENTS ---
  { name: 'downloads.view', description: 'Accès à l\'onglet Téléchargements', category: 'Téléchargements' },
  { name: 'downloads.add', description: 'Ajouter/Rechercher des nouveaux téléchargements', category: 'Téléchargements' },
  { name: 'downloads.manage', description: 'Contrôler les téléchargements (Pause/Reprise)', category: 'Téléchargements' },
  { name: 'downloads.delete', description: 'Supprimer des téléchargements', category: 'Téléchargements' },
  { name: 'files.view', description: 'Accès à l\'explorateur de fichiers', category: 'Téléchargements' },
  { name: 'files.manage', description: 'Gérer les fichiers (Renommer, Déplacer, Supprimer)', category: 'Téléchargements' },
  { name: 'files.share', description: 'Créer des liens de partage de fichiers', category: 'Téléchargements' },

  // --- MÉDIAS ---
  { name: 'media.view', description: 'Voir le catalogue de médias', category: 'Ma médiathèque' },
  { name: 'media.play', description: 'Lire le contenu multimédia', category: 'Ma médiathèque' },
  { name: 'media.manage', description: 'Gérer les métadonnées et scans', category: 'Ma médiathèque' },
  { name: 'media.delete', description: 'Supprimer des médias de la librairie', category: 'Ma médiathèque' },

  // --- DEMANDES (REQUESTS) ---
  { name: 'requests.search.view', description: 'Accès à l\'onglet Demander (Recherche)', category: 'Demandes' },
  { name: 'requests.list.view', description: 'Accès à l\'onglet Mes demandes (Lecture seule)', category: 'Demandes' },
  { name: 'requests.list.manage', description: 'Gérer les demandes (Supprimer/Relancer)', category: 'Demandes' },
  { name: 'requests.details.manage', description: 'Menu de gestion sur les détails des médias', category: 'Demandes' },
  { name: 'requests.interactive', description: 'Utiliser la recherche interactive', category: 'Demandes' },
  // Suppression de manage/auto comme demandé

  // --- STATISTIQUES ---
  { name: 'stats.view_global', description: 'Voir les statistiques globales', category: 'Statistiques' },
  { name: 'stats.view_self', description: 'Voir ses propres statistiques', category: 'Statistiques' },
]

async function main() {
  console.log('🔄 Démarrage de la réinitialisation des permissions (Mode Granulaire)...')

  // 1. Nettoyage (Optionnel : on peut garder les rôles existants mais mettre à jour les perms)
  // Pour être propre, on va upsert les permissions.
  
  console.log('📦 Création/Mise à jour des permissions...')
  for (const perm of PERMISSIONS_DATA) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { 
        description: perm.description, 
        category: perm.category 
      },
      create: {
        name: perm.name,
        description: perm.description,
        category: perm.category
      }
    })
  }
  
  // Suppression des vieilles permissions qui ne sont plus dans la liste (Nettoyage)
  const currentPermNames = PERMISSIONS_DATA.map(p => p.name)
  const deleted = await prisma.permission.deleteMany({
    where: {
      name: { notIn: currentPermNames }
    }
  })
  console.log(`🧹 Nettoyage : ${deleted.count} anciennes permissions supprimées.`)

  // 2. Mise à jour du rôle Admin par défaut pour qu'il ait TOUT
  // On s'assure qu'il y a au moins un rôle admin complet
  const allPermissions = await prisma.permission.findMany()
  
  console.log('👑 Mise à jour du rôle Admin avec toutes les permissions...')
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {
      permissions: {
        set: allPermissions.map(p => ({ id: p.id }))
      }
    },
    create: {
      name: 'admin',
      displayName: 'Administrateur',
      description: 'Accès complet au système',
      isSystem: true,
      priority: 100,
      permissions: {
        connect: allPermissions.map(p => ({ id: p.id }))
      }
    }
  })

  // 3. Suppression du rôle "User" par défaut ou retrait de toutes ses permissions
  // L'utilisateur a demandé : "crée les compte sans role non accès a rien"
  console.log('👤 Reset du rôle User (Sans accès)...')
  // On crée le rôle "user" mais SANS permissions connectées (tableau vide)
  await prisma.role.upsert({
    where: { name: 'user' },
    update: {
      permissions: {
        set: [] // Aucune permission
      }
    },
    create: {
      name: 'user',
      displayName: 'Utilisateur',
      description: 'Utilisateur sans privilèges',
      isSystem: true,
      priority: 0,
      permissions: {
        connect: [] // Aucune permission
      }
    }
  })

  console.log('✅ Migration des permissions terminée avec succès.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
