"""
Nommage des communautes du graphe.

Les identifiants de communaute ne sont PAS stables : chaque reclustering les
renumerote et redistribue les noeuds. Une table `{0: "Auth", 1: "Docker"}` est
donc fausse des le rebuild suivant — c'est ce qui a fait deriver les libelles
apres le premier `graphify update`.

Deux mecanismes stables ici :

  1. ANCRES — un libelle est attache a un NOEUD (`lib_db_schema`, ...). Au
     nommage, la communaute qui contient ce noeud herite du libelle. Le noeud
     survit au reclustering, le libelle suit.

  2. REPLI AUTOMATIQUE — les communautes sans ancre sont nommees d'apres le
     repertoire dominant de leurs fichiers. Deterministe, jamais perime.

Pour ajouter un libelle : reperer un noeud caracteristique de la communaute
(`graphify query "..."` donne les identifiants) et l'ajouter a ANCHORS.
"""

import collections
import json
import re
from pathlib import Path

from graphify.build import build_from_json
from graphify.analyze import suggest_questions
from graphify.report import generate
from graphify.export import to_json

ROOT = 'next-app'

# Noeud caracteristique -> libelle de sa communaute.
# Ordre = priorite : si plusieurs ancres tombent dans la meme communaute, la
# premiere de cette liste gagne.
ANCHORS = [
    # Socle
    ('lib_db_schema', 'Schéma DB Drizzle'),
    ('lib_db_drizzle_db', 'Connexion DB & auth'),
    ('lib_auth_index_getcurrentuser', 'Session & utilisateur courant'),
    ('lib_ability_defineabilityfor', 'Permissions CASL'),
    ('lib_logger_logger', 'Logger & services partagés'),
    ('lib_api_client_apiclient', 'Client API centralisé'),
    ('lib_cache_service_cached', 'Cache applicatif'),

    # Notifications
    ('lib_notifications_v2_dispatcher_dispatch', 'Notifs — dispatcher'),
    ('lib_notifications_v2_outbox_outbox_worker_outboxworker', 'Notifs — outbox worker'),
    ('lib_notifications_v2_templates_template_renderer_templaterenderer', 'Notifs — moteur de templates'),
    ('lib_notifications_v2_config_config_store_configstore', 'Notifs — config & destinataires'),
    ('lib_notifications_v2_store_event_store_recordevent', 'Notifs — event store & dédup'),
    ('lib_notifications_v2_providers_evolution_provider_evolutionprovider', 'Notifs — provider WhatsApp'),
    ('lib_notifications_v2_providers_webpush_provider_webpushprovider', 'Notifs — provider Web Push'),
    ('lib_notifications_v2_pollers_availability_poller_availabilitypoller', 'Notifs — détection de disponibilité'),
    ('lib_notifications_v2_pollers_queue_poller_queuepoller', 'Notifs — poller de queue'),
    ('lib_push_store', 'Push — souscriptions & envoi'),
    ('lib_push_live_card', 'Push — cartes vivantes'),
    ('lib_notifications_internal', 'Notifications internes (cloche)'),

    # Services externes
    ('lib_services_emby_embyservice', 'Service Emby'),
    ('lib_services_jellyfin_jellyfinservice', 'Service Jellyfin'),
    ('lib_services_plex_plexservice', 'Service Plex'),
    ('lib_services_sonarr_sonarrservice', 'Service Sonarr'),
    ('lib_services_radarr_radarrservice', 'Service Radarr'),
    ('lib_services_tmdb_tmdbservice', 'Service TMDB'),
    ('lib_services_qbittorrent_qbittorrentservice', 'Service qBittorrent'),
    ('lib_services_prowlarr', 'Service Prowlarr'),
    ('lib_services_docker_dockerservice', 'Service Docker'),
    ('lib_services_unraid_unraidservice', 'Service Unraid'),
    ('lib_services_smb_smbservice', 'Service SMB'),
    ('lib_services_ftp_ftpservice', 'Service FTP'),
    ('lib_services_local_localservice', 'Service fichiers locaux'),
    ('lib_services_tracker_playwright', 'Scraping trackers (Playwright)'),
    ('lib_services_tracker_stats_service', 'Stats de trackers'),
    ('lib_services_storage_list', 'Cache liste de stockage'),
    ('lib_services_system_update_systemupdateservice', 'Mise à jour système'),
    ('lib_torrent_parser_parsetorrentname', 'Parseur de noms de torrents'),

    # Interface
    ('app_dashboard_page', 'Dashboard — accueil'),
    ('app_dashboard_media_id_page', 'Média — page de détail'),
    ('app_dashboard_media_id_components_season_seasonitem', 'Média — saisons & épisodes'),
    ('app_dashboard_media_id_managemediamodal', 'Média — gestion'),
    ('app_dashboard_requests_list_infiniterequestlist', 'Demandes — liste'),
    ('app_dashboard_downloads_components_torrentmanager', 'Téléchargements — torrents'),
    ('app_dashboard_downloads_components_filemanager', 'Téléchargements — fichiers'),
    ('app_dashboard_docker_page', 'Docker — page'),
    ('app_dashboard_docker_components_containerdetails', 'Docker — détail conteneur'),
    ('app_dashboard_stats_page', 'Statistiques'),
    ('app_dashboard_stats_components_livesessions', 'Sessions de lecture en direct'),
    ('app_dashboard_settings_components_settingstabs', 'Réglages — onglets'),
    ('app_dashboard_settings_components_notificationsv2', 'Réglages — notifications'),
    ('app_dashboard_settings_components_usermanagement', 'Réglages — utilisateurs'),
    ('app_dashboard_settings_components_rolemanagement', 'Réglages — rôles'),
    ('app_dashboard_settings_components_backupmanagement', 'Réglages — sauvegardes'),
    ('app_login_loginform', 'Connexion'),
    ('app_setup_setupform', 'Configuration initiale'),
    ('app_request_access_page', "Demande d'accès"),
    ('components_global_navbar', 'Navbar'),
    ('components_global_mediacard', 'MediaCard & listes'),
    ('components_global_prowlarrsearch', 'Recherche Prowlarr (UI)'),
    ('components_global_releasecalendar', 'Calendrier des sorties'),

    # Documentation
    ('doc_optimization_plan', 'Documentation & concepts du projet'),
]

# Segments de chemin sans valeur descriptive pour un libelle.
GENERIC_DIRS = {'app', 'lib', 'components', 'src', '_components', '_hooks', '_utils', '_types'}


def auto_label(members, nodes):
    """Libelle de repli : repertoire dominant des fichiers de la communaute."""
    dirs = collections.Counter()
    for n in members:
        sf = nodes.get(n, {}).get('source_file') or ''
        parts = [p for p in re.split(r'[\\/]', sf) if p]
        if len(parts) < 2:
            continue
        segments = [p for p in parts[:-1] if p not in GENERIC_DIRS]
        if not segments:
            segments = parts[:-1]
        dirs['/'.join(segments[-2:])] += 1

    if not dirs:
        # Communaute sans fichier exploitable : se rabattre sur le noeud le plus
        # represente plutot que de rendre un libelle vide.
        labels = collections.Counter(
            nodes.get(n, {}).get('label', '') for n in members
        )
        top = labels.most_common(1)[0][0]
        return top or 'Divers'

    top, _ = dirs.most_common(1)[0]
    return top.replace('_', ' ').replace('/', ' / ')


def main():
    out = Path('graphify-out')
    extraction = json.loads((out / '.graphify_extract.json').read_text(encoding='utf-8'))
    detection = json.loads((out / '.graphify_detect.json').read_text(encoding='utf-8'))
    analysis = json.loads((out / '.graphify_analysis.json').read_text(encoding='utf-8'))

    G = build_from_json(extraction, root=ROOT, directed=False)
    communities = {int(k): v for k, v in analysis['communities'].items()}
    cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
    tokens = {
        'input': extraction.get('input_tokens', 0),
        'output': extraction.get('output_tokens', 0),
    }

    nodes = {n['id']: n for n in extraction['nodes']}
    node_to_community = {}
    for cid, members in communities.items():
        for n in members:
            node_to_community[n] = cid

    # 1) Ancres : premiere ancre rencontree gagne pour sa communaute.
    labels = {}
    anchored = 0
    missing = []
    for node_id, label in ANCHORS:
        cid = node_to_community.get(node_id)
        if cid is None:
            missing.append(node_id)
            continue
        if cid not in labels:
            labels[cid] = label
            anchored += 1

    # 2) Repli automatique pour le reste.
    for cid, members in communities.items():
        if cid not in labels:
            labels[cid] = auto_label(members, nodes)

    questions = suggest_questions(G, communities, labels)
    report = generate(
        G, communities, cohesion, labels, analysis['gods'], analysis['surprises'],
        detection, tokens, ROOT, suggested_questions=questions,
    )
    (out / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
    (out / '.graphify_labels.json').write_text(
        json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )

    if not to_json(G, communities, str(out / 'graph.json'), community_labels=labels):
        print('ATTENTION : graph.json non reecrit (garde anti-retrecissement #479)')

    print(f'{len(labels)} communautes nommees — {anchored} par ancre, '
          f'{len(labels) - anchored} par repli automatique')
    if missing:
        print(f'Ancres introuvables dans le graphe ({len(missing)}) : {", ".join(missing[:8])}')


if __name__ == '__main__':
    main()
