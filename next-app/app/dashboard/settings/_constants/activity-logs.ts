export const LOGS_PAGE_SIZE = 50

/**
 * Options for the action filter dropdown. The empty value means "all actions".
 */
export const ACTION_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: '', label: 'Toutes les actions' },
    { value: 'USER_LOGIN', label: 'Connexions' },
    { value: 'USER_LOGOUT', label: 'Déconnexions' },
    { value: 'MEDIA_REQUEST', label: 'Demandes de média' },
    { value: 'REQUEST_DELETE', label: 'Suppressions de demandes' },
    { value: 'MEDIA_SEARCH', label: 'Recherches' },
    { value: 'WATCH_LATER_ADD', label: 'Ajouts (À Regarder Plus Tard)' },
    { value: 'WATCH_LATER_REMOVE', label: 'Retraits (À Regarder Plus Tard)' },
    { value: 'ACCOUNT_REQUEST_CREATE', label: 'Nouvelles demandes de compte' },
    { value: 'UPDATE_SETTINGS', label: 'Mises à jour paramètres' },
    { value: 'MEDIA_DELETE', label: 'Suppressions médias' },
    { value: 'CREATE', label: 'Créations (Système)' },
    { value: 'UPDATE', label: 'Mises à jour (Système)' },
    { value: 'DELETE', label: 'Suppressions (Système)' },
] as const

/**
 * Human-readable labels for known action codes. Unknown codes fall back to
 * the raw code via getActionLabel().
 */
export const ACTION_LABELS: Readonly<Record<string, string>> = {
    USER_LOGIN: 'Connexion',
    USER_LOGOUT: 'Déconnexion',
    MEDIA_REQUEST: 'Demande de média',
    MEDIA_SEARCH: 'Recherche',
    WATCH_LATER_ADD: 'Ajout À Regarder Plus Tard',
    WATCH_LATER_REMOVE: 'Retrait À Regarder Plus Tard',
    CREATE: 'Création',
    UPDATE: 'Mise à jour',
    DELETE: 'Suppression',
    BULK_UPDATE: 'Mise à jour en masse',
    BULK_DELETE: 'Suppression en masse',
    ACCOUNT_REQUEST_CREATE: 'Demande de compte soumise',
    ACCOUNT_REQUEST_APPROVE: 'Demande de compte approuvée',
    ACCOUNT_REQUEST_REJECT: 'Demande de compte rejetée',
    ACCOUNT_REQUEST_DELETE: 'Demande de compte supprimée',
    UPDATE_SETTINGS: 'Mise à jour des paramètres système',
    MEDIA_DELETE: 'Suppression de média',
    REQUEST_DELETE: 'Suppression de demande',
    DOCKER_ACTION: 'Action Docker',
    SYNC_USERS: 'Synchronisation Utilisateurs',
}
