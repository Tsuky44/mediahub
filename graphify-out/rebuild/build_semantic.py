# -*- coding: utf-8 -*-
import json
from pathlib import Path

def N(i, l, sf, loc, ft='document'):
    return {'id': i, 'label': l, 'file_type': ft, 'source_file': sf,
            'source_location': loc, '_origin': 'semantic'}

def E(s, t, r, ctx, conf='EXTRACTED', sf='', loc=''):
    return {'source': s, 'target': t, 'relation': r, 'context': ctx,
            'confidence': conf, 'source_file': sf, 'source_location': loc,
            'weight': 1.0, '_origin': 'semantic'}

nodes = []
edges = []

# --- CHANGELOG.md ---
f = 'CHANGELOG.md'
nodes += [
    N('doc_changelog', 'CHANGELOG (v0.9.60 - 0.9.697)', f, 'L1'),
    N('concept_mediahub', 'MediaHub (application)', f, 'L1'),
    N('concept_web_push_notifs', 'Notifications push web', f, 'L7'),
    N('concept_smb_share', 'Partage SMB', f, 'L12'),
    N('concept_tracker_ratio', 'Suivi de ratio tracker', f, 'L17'),
    N('concept_storage_mgmt', 'Gestion du stockage', f, 'L22'),
    N('concept_fail2ban', 'Fail2ban sur tous les providers', f, 'L37'),
    N('concept_jellyfin_primary', 'Jellyfin comme serveur principal', f, 'L45'),
    N('concept_single_docker', "Docker unique (tracker integre a l'app)", f, 'L60'),
    N('concept_support_chatbot', 'Chatbot de support (en test)', f, 'L70'),
]
edges += [
    E('doc_changelog', 'concept_mediahub', 'documents', 'changelog du projet MediaHub', sf=f, loc='L1'),
    E('concept_mediahub', 'concept_web_push_notifs', 'has_feature', 'ajout "notif push" en 0.9.697', sf=f, loc='L7'),
    E('concept_mediahub', 'concept_smb_share', 'has_feature', 'partage SMB corrige en 0.9.693', sf=f, loc='L12'),
    E('concept_mediahub', 'concept_tracker_ratio', 'has_feature', 'nouveau tracker pris en charge pour le ratio', sf=f, loc='L17'),
    E('concept_mediahub', 'concept_storage_mgmt', 'has_feature', 'colonnes activite / date de demande', sf=f, loc='L22'),
    E('concept_mediahub', 'concept_fail2ban', 'has_feature', 'fail2ban sur tous les providers', sf=f, loc='L37'),
    E('concept_mediahub', 'concept_jellyfin_primary', 'has_feature', 'Jellyfin serveur principal', sf=f, loc='L45'),
    E('concept_mediahub', 'concept_single_docker', 'deployed_as', 'un seul Docker au lieu de deux', sf=f, loc='L60'),
    E('concept_mediahub', 'concept_support_chatbot', 'has_feature', 'chatbot support en phase de test', conf='AMBIGUOUS', sf=f, loc='L70'),
    E('concept_web_push_notifs', 'lib_notifications_v2_providers_webpush_provider', 'implemented_by', 'provider web push', conf='INFERRED', sf=f, loc='L7'),
    E('concept_jellyfin_primary', 'lib_auth_providers_jellyfin', 'implemented_by', 'provider auth Jellyfin', conf='INFERRED', sf=f, loc='L45'),
]

# --- NOTIFICATIONS_V2_IMPLEMENTATION.md ---
f = 'NOTIFICATIONS_V2_IMPLEMENTATION.md'
nodes += [
    N('doc_notifs_v2_impl', 'Notifications V2 - Implementation Summary', f, 'L1'),
    N('concept_outbox_pattern', 'Outbox pattern (livraison fiable)', f, 'L60'),
    N('concept_dedup_key', 'Dedup atomique via UNIQUE(dedup_key)', f, 'L9'),
    N('concept_exponential_backoff', 'Retry avec backoff exponentiel', f, 'L70'),
    N('concept_notif_pipeline', 'Pipeline de notifications V2', f, 'L1'),
    N('table_notification_events', 'Table notification_events', f, 'L8'),
    N('table_notification_deliveries', 'Table notification_deliveries', f, 'L12'),
]
edges += [
    E('doc_notifs_v2_impl', 'concept_notif_pipeline', 'documents', "resume d'implementation", sf=f, loc='L1'),
    E('concept_notif_pipeline', 'concept_dedup_key', 'uses', 'UNIQUE(dedup_key) garantit 0 doublon au niveau DB', sf=f, loc='L11'),
    E('concept_notif_pipeline', 'concept_outbox_pattern', 'uses', 'une ligne par destinataire dans l outbox', sf=f, loc='L13'),
    E('concept_outbox_pattern', 'concept_exponential_backoff', 'uses', 'next_retry_at stocke en DB', sf=f, loc='L70'),
    E('concept_dedup_key', 'lib_notifications_v2_store_dedup_key', 'implemented_by', 'dedup-key.ts construit req:42:MEDIA_GRABBED', sf=f, loc='L20'),
    E('concept_notif_pipeline', 'lib_notifications_v2_dispatcher', 'implemented_by', 'dispatcher.ts orchestre le flux', sf=f, loc='L27'),
    E('concept_outbox_pattern', 'lib_notifications_v2_outbox_outbox_worker', 'implemented_by', 'outbox-worker.ts poll toutes les 5s', sf=f, loc='L40'),
    E('concept_notif_pipeline', 'lib_notifications_v2_bootstrap', 'started_by', "bootstrap demarre l'OutboxWorker", sf=f, loc='L54'),
    E('concept_notif_pipeline', 'lib_notifications_v2_store_recipient_resolver', 'uses', 'resolution des destinataires depuis config + users', sf=f, loc='L24'),
    E('table_notification_events', 'lib_db_schema_notificationevents', 'defined_in', 'schema drizzle', conf='INFERRED', sf=f, loc='L8'),
    E('table_notification_deliveries', 'lib_db_schema_notificationdeliveries', 'defined_in', 'schema drizzle', conf='INFERRED', sf=f, loc='L12'),
    E('lib_notifications_v2_pollers_availability_poller', 'concept_notif_pipeline', 'feeds', 'AvailabilityPoller appelle dispatch()', sf=f, loc='L76'),
    E('lib_notifications_v2_realtime_realtime_orchestrator', 'concept_notif_pipeline', 'feeds', 'RealtimeOrchestrator dispatch chaque transition de progression', sf=f, loc='L81'),
]

# --- OPTIMIZATION_PLAN.md ---
f = 'OPTIMIZATION_PLAN.md'
nodes += [
    N('doc_optimization_plan', "Plan d'Optimisation & Refactoring", f, 'L1'),
    N('concept_rsc_migration', 'P0 - Reduire le CSR massif (migration RSC)', f, 'L38'),
    N('concept_tanstack_query', 'P0 - Centraliser les donnees (TanStack Query v5)', f, 'L153'),
    N('concept_any_debt', 'P1 - Eliminer la dette de typage any', f, 'L269'),
    N('concept_component_decomposition', 'P1 - Decomposer les composants monolithiques', f, 'L343'),
    N('concept_useeffect_refactor', 'P1 - Refactoriser les anti-patterns useEffect', f, 'L411'),
    N('concept_central_api_client', 'P2 - Client API centralise', f, 'L466'),
    N('concept_bundle_optimization', 'P2 - Memoization, code splitting, virtualisation', f, 'L566'),
    N('concept_refactor_roadmap', 'Roadmap en 4 phases', f, 'L610'),
]
edges += [
    E('doc_optimization_plan', 'concept_mediahub', 'plans_refactor_of', "plan d'optimisation de MediaHub", sf=f, loc='L1'),
    E('doc_optimization_plan', 'concept_rsc_migration', 'contains', 'section 2', sf=f, loc='L38'),
    E('doc_optimization_plan', 'concept_tanstack_query', 'contains', 'section 3', sf=f, loc='L153'),
    E('doc_optimization_plan', 'concept_any_debt', 'contains', 'section 4', sf=f, loc='L269'),
    E('doc_optimization_plan', 'concept_component_decomposition', 'contains', 'section 5', sf=f, loc='L343'),
    E('doc_optimization_plan', 'concept_useeffect_refactor', 'contains', 'section 6', sf=f, loc='L411'),
    E('doc_optimization_plan', 'concept_central_api_client', 'contains', 'section 7', sf=f, loc='L466'),
    E('doc_optimization_plan', 'concept_bundle_optimization', 'contains', 'section 8', sf=f, loc='L566'),
    E('doc_optimization_plan', 'concept_refactor_roadmap', 'contains', 'section 9', sf=f, loc='L610'),
    E('concept_central_api_client', 'lib_api_client', 'implemented_by', 'lib/api-client.ts', sf=f, loc='L478'),
    E('concept_component_decomposition', 'doc_largest_components', 'measured_by', 'liste des plus gros composants', conf='INFERRED', sf=f, loc='L345'),
]

# --- largest_components.txt ---
f = 'largest_components.txt'
nodes += [N('doc_largest_components', 'Top 20 des plus gros composants (lignes)', f, 'L1')]
BIG = [
    ('app_request_access_page', '285', 'L1'),
    ('app_dashboard_settings_components_storagesettings', '257', 'L2'),
    ('app_dashboard_settings_components_rolemanagement', '254', 'L3'),
    ('app_dashboard_docker_components_containerstats', '254', 'L4'),
    ('app_dashboard_settings_components_systemmessagemanagement', '252', 'L5'),
    ('app_dashboard_downloads_components_torrent_filtermodal', '252', 'L6'),
    ('app_dashboard_settings_components_mediasettings', '233', 'L7'),
    ('components_global_prowlarrsearch', '232', 'L8'),
    ('app_dashboard_stats_components_livesessions', '231', 'L9'),
    ('app_dashboard_docker_components_terminalviewer', '229', 'L10'),
    ('app_dashboard_media_id_requestbutton', '221', 'L11'),
    ('app_dashboard_requests_infinitemedialist', '219', 'L12'),
    ('app_dashboard_stats_page', '218', 'L13'),
    ('app_dashboard_settings_components_settingsform', '215', 'L14'),
    ('app_dashboard_media_id_interactivesearch', '213', 'L15'),
    ('app_dashboard_stats_components_storage_storagedetailsmodal', '208', 'L16'),
    ('app_dashboard_docker_components_logviewer', '206', 'L17'),
    ('components_global_mediacard', '204', 'L19'),
    ('app_dashboard_page', '203', 'L20'),
]
for nid, ln, loc in BIG:
    edges.append(E('doc_largest_components', nid, 'flags_as_large', ln + ' lignes - candidat a la decomposition', sf=f, loc=loc))
    edges.append(E('concept_component_decomposition', nid, 'targets', 'composant > 200 lignes (' + ln + ')', conf='INFERRED', sf=f, loc=loc))

# --- scripts/README-PRODUCTION-FIX.md ---
f = 'scripts/README-PRODUCTION-FIX.md'
nodes += [
    N('doc_production_fix', 'Correction des erreurs DB en production', f, 'L1'),
    N('concept_prod_db_drift', 'Derive de schema DB en production', f, 'L5'),
    N('concept_docker_container_mediahub_app', 'Conteneur docker mediahub-app', f, 'L40'),
]
edges += [
    E('doc_production_fix', 'concept_prod_db_drift', 'documents', 'tables/colonnes manquantes en prod', sf=f, loc='L5'),
    E('concept_prod_db_drift', 'table_notification_deliveries', 'missing_in_prod', 'table manquante', sf=f, loc='L7'),
    E('concept_prod_db_drift', 'lib_db_schema_users', 'missing_columns', 'email_verified, discord_user_id, discord_webhook, custom_webhook, whatsapp_number', sf=f, loc='L10'),
    E('doc_production_fix', 'concept_docker_container_mediahub_app', 'targets', 'docker exec mediahub-app sqlite3 /app/data/db/dev.db', sf=f, loc='L40'),
    E('concept_docker_container_mediahub_app', 'concept_mediahub', 'runs', 'MediaHub tourne dans ce conteneur', conf='INFERRED', sf=f, loc='L40'),
]

# --- c411.yml ---
f = 'c411.yml'
nodes += [
    N('doc_c411_definition', 'Definition tracker C411 (Torznab)', f, 'L1'),
    N('concept_torznab', 'API Torznab / mapping de categories', f, 'L12'),
]
edges += [
    E('doc_c411_definition', 'concept_torznab', 'uses', 'torznab?apikey=...&t=caps', sf=f, loc='L14'),
    E('doc_c411_definition', 'concept_tracker_ratio', 'supports', 'tracker prive FR suivi pour le ratio', conf='INFERRED', sf=f, loc='L1'),
]

# --- README.md ---
f = 'README.md'
nodes += [
    N('doc_readme', 'README (Next.js bootstrap)', f, 'L1'),
    N('concept_nextjs', 'Next.js App Router', f, 'L1'),
]
edges += [
    E('doc_readme', 'concept_nextjs', 'describes', 'projet bootstrap create-next-app', sf=f, loc='L1'),
    E('concept_mediahub', 'concept_nextjs', 'built_with', 'application Next.js', sf=f, loc='L1'),
]

out = {'nodes': nodes, 'edges': edges, 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}
Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')

ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding='utf-8'))
ids = {n['id'] for n in ast['nodes']} | {n['id'] for n in nodes}
dangling = sorted({e['source'] for e in edges if e['source'] not in ids} | {e['target'] for e in edges if e['target'] not in ids})
print('semantic nodes', len(nodes), 'edges', len(edges))
print('DANGLING:', dangling)
