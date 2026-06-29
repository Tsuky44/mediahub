import { LayoutDashboard, Search, List, Film, BarChart3, Download, Container, Settings } from 'lucide-react'
import type { PermissionTabDef } from '../_types/permission'

export interface TabMeta {
    id: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
}

/** Tabs affichees dans le selecteur (ordre + icones). */
export const ROLE_TABS: TabMeta[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Demander', icon: Search },
    { id: 'my_requests', label: 'Mes demandes', icon: List },
    { id: 'media', label: 'Médiathèque', icon: Film },
    { id: 'stats', label: 'Statistiques', icon: BarChart3 },
    { id: 'downloads', label: 'Téléchargements', icon: Download },
    { id: 'docker', label: 'Docker', icon: Container },
    { id: 'settings', label: 'Paramètres', icon: Settings },
]

/**
 * Configuration declarative des permissions par tab.
 * Le "style: row" correspond au grand bloc label+description (legacy);
 * "compact" correspond a la carte avec check indicator.
 */
export const ROLE_PERMISSION_TABS: PermissionTabDef[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        heading: 'Permissions Dashboard',
        groups: [
            {
                style: 'row',
                permissions: [
                    {
                        subject: 'DashboardStats',
                        action: 'read',
                        label: 'Voir les statistiques du serveur (Dashboard Admin)',
                        description: "Affiche l'état des services, le stockage et les transferts en haut du dashboard.",
                    },
                ],
            },
        ],
    },
    {
        id: 'requests',
        label: 'Demander',
        heading: 'Permissions Demander',
        groups: [
            {
                style: 'row',
                permissions: [
                    {
                        subject: 'Media',
                        action: 'read',
                        label: "Voir l'onglet / faire de recherche",
                        description: "Permet d'accéder à la barre de recherche et de voir les fiches films/séries.",
                    },
                    {
                        subject: 'MediaRequest',
                        action: 'create',
                        label: 'Faire des demandes',
                        description: "Permet de demander l'ajout de nouveaux films ou séries.",
                    },
                    {
                        subject: 'Media',
                        action: 'interactive_search',
                        label: 'Recherche interactive',
                        description: 'Permet de choisir manuellement la release à télécharger (via Prowlarr).',
                    },
                    {
                        subject: 'Media',
                        action: 'trigger_search',
                        label: 'Recherche automatique (Manuelle)',
                        description: 'Permet de relancer une recherche automatique via le bouton loupe.',
                    },
                    {
                        subject: 'Media',
                        action: 'manage_settings',
                        label: 'Gestion des médias',
                        description: "Permet d'accéder au bouton paramètres (suppression, qualité, dossier...).",
                    },
                ],
            },
        ],
    },
    {
        id: 'my_requests',
        label: 'Mes demandes',
        heading: 'Permissions Mes demandes',
        groups: [
            {
                style: 'row',
                permissions: [
                    {
                        subject: 'MediaRequest',
                        action: 'read',
                        label: 'Voir ses demandes',
                        description: 'Permet de consulter la liste et le statut de ses propres demandes.',
                    },
                    {
                        subject: 'MediaRequest',
                        action: 'delete',
                        label: 'Supprimer ses demandes',
                        description: 'Permet de supprimer ses propres demandes.',
                    },
                    // `sync` is rendered with a special toggle (see MyRequestsTab)
                ],
            },
        ],
    },
    {
        id: 'media',
        label: 'Médiathèque',
        heading: 'Permissions Médiathèque',
        groups: [
            {
                style: 'row',
                permissions: [
                    {
                        subject: 'Library',
                        action: 'read',
                        label: 'Voir la médiathèque',
                        description: "Permet d'accéder à la bibliothèque de films et séries.",
                    },
                ],
            },
        ],
    },
    {
        id: 'stats',
        label: 'Statistiques',
        heading: 'Permissions Statistiques',
        groups: [
            {
                style: 'compact',
                permissions: [
                    {
                        subject: 'Stats',
                        action: 'read',
                        label: "Voir l'onglet Statistiques + Ses propres stats",
                        description: "Accès de base à l'onglet et aux stats personnelles",
                    },
                    {
                        subject: 'Stats',
                        action: 'read_all',
                        label: 'Voir les statistiques globales',
                        description: 'Voir les statistiques de tous les utilisateurs',
                    },
                    {
                        subject: 'Stats',
                        action: 'import',
                        label: "Utiliser l'importation (Sync)",
                        description: "Synchroniser l'historique depuis Plex/Emby/Jellyfin",
                    },
                    {
                        subject: 'Stats',
                        action: 'manage_storage',
                        label: 'Gérer le stockage (Lecture seule)',
                        description: "Voir l'analyse détaillée du stockage",
                    },
                    {
                        subject: 'Stats',
                        action: 'delete_media',
                        label: 'Supprimer des médias',
                        description: 'Droit de suppression définitive des fichiers médias',
                        danger: true,
                    },
                ],
            },
        ],
    },
    {
        id: 'downloads',
        label: 'Téléchargements',
        heading: 'Permissions Téléchargements',
        groups: [
            {
                title: 'Torrents',
                style: 'compact',
                permissions: [
                    {
                        subject: 'Downloads',
                        action: 'read',
                        label: 'Voir les téléchargements (Lecture seule)',
                        description: 'Voir la liste et la progression sans pouvoir modifier',
                    },
                    {
                        subject: 'Downloads',
                        action: 'add_torrent',
                        label: 'Ajouter des torrents',
                        description: 'Ajouter des torrents via URL ou fichier',
                    },
                    {
                        subject: 'Downloads',
                        action: 'manage_torrents',
                        label: 'Gérer les torrents (Pause/Reprise/Suppression)',
                        description: 'Contrôle total sur les torrents existants',
                    },
                ],
            },
            {
                title: 'Explorateur SMB',
                style: 'compact',
                permissions: [
                    {
                        subject: 'Downloads',
                        action: 'read_explorer',
                        label: 'Accès Explorateur (Lecture & Téléchargement)',
                        description: 'Naviguer et télécharger les fichiers',
                    },
                    {
                        subject: 'Downloads',
                        action: 'share_files',
                        label: 'Créer des liens de partage',
                        description: 'Générer des liens publics temporaires',
                    },
                    {
                        subject: 'Downloads',
                        action: 'delete_files',
                        label: 'Supprimer des fichiers',
                        description: 'Supprimer définitivement des fichiers du disque',
                        danger: true,
                    },
                ],
            },
            {
                title: 'Recherche Interactive',
                style: 'compact',
                permissions: [
                    {
                        subject: 'Downloads',
                        action: 'interactive_search',
                        label: 'Utiliser la Recherche Interactive',
                        description: 'Rechercher et lancer des téléchargements depuis les indexeurs configurés',
                    },
                ],
            },
        ],
    },
    {
        id: 'docker',
        label: 'Docker',
        heading: 'Permissions Docker',
        groups: [
            {
                title: 'Accès & Consultation',
                style: 'compact',
                permissions: [
                    {
                        subject: 'Docker',
                        action: 'read',
                        label: 'Voir les conteneurs (Lecture seule)',
                        description: 'Accès à la liste des conteneurs et leur statut (On/Off)',
                    },
                    {
                        subject: 'Docker',
                        action: 'read_details',
                        label: 'Voir les détails (Logs/Stats/Config)',
                        description: 'Accès aux logs en direct, statistiques et configuration',
                    },
                ],
            },
            {
                title: 'Gestion',
                style: 'compact',
                permissions: [
                    {
                        subject: 'Docker',
                        action: 'manage_containers',
                        label: 'Contrôler les conteneurs',
                        description: 'Démarrer, arrêter, redémarrer et accès à la console',
                        danger: true,
                    },
                    {
                        subject: 'Docker',
                        action: 'manage_groups',
                        label: 'Gérer les groupes',
                        description: 'Créer, modifier et supprimer des groupes de conteneurs',
                    },
                ],
            },
        ],
    },
    {
        id: 'settings',
        label: 'Paramètres',
        heading: 'Permissions Notifications Internes',
        groups: [
            {
                title: 'Disponibilité des Médias',
                style: 'compact',
                permissions: [
                    {
                        subject: 'Notification',
                        action: 'read_all_media_available',
                        label: 'Voir toutes les nouvelles disponibilités',
                        description: 'Permet de recevoir les notifications internes pour tous les nouveaux films/séries ajoutés.',
                    },
                    {
                        subject: 'Notification',
                        action: 'read_own_media_available',
                        label: 'Voir uniquement ses demandes disponibles',
                        description: 'Permet de recevoir les notifications internes uniquement pour les films/séries que vous avez demandés.',
                    },
                ],
            },
            {
                title: 'Notifications Système & Support',
                style: 'compact',
                permissions: [
                    {
                        subject: 'Notification',
                        action: 'read_system_update',
                        label: 'Voir les notifications de nouvelle version',
                        description: 'Permet d\'être notifié de la disponibilité d\'une nouvelle version de l\'application.',
                    },
                    {
                        subject: 'Notification',
                        action: 'read_new_ticket',
                        label: 'Voir les notifications de tickets de support',
                        description: 'Permet de recevoir une notification lorsqu\'un utilisateur ouvre un ticket de support.',
                    },
                ],
            },
        ],
    },
]

export function findTabConfig(tabId: string): PermissionTabDef | undefined {
    return ROLE_PERMISSION_TABS.find(t => t.id === tabId)
}
