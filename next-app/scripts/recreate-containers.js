const http = require('http');
const fs = require('fs');

// Expected arguments:
// node recreate-containers.js <appContainerId> <trackerContainerId> <targetTag> <githubUser>
const appContainerId = process.argv[2];
const trackerContainerId = process.argv[3];
const targetTag = process.argv[4];
const githubUser = process.argv[5] || 'tsuky44';

const LOG_FILE = '/data/db/update.log';

if (!appContainerId || !targetTag) {
    console.error('Usage: node recreate-containers.js <appContainerId> <trackerContainerId> <targetTag> <githubUser>');
    process.exit(1);
}

function log(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const formatted = `[${timestamp}] [COMPAGNON] ${message}\n`;
    console.log(message);
    try {
        fs.appendFileSync(LOG_FILE, formatted);
    } catch (e) {
        console.error('Failed to write to update.log:', e.message);
    }
}

// Native Docker Socket Client
function dockerAPI(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            socketPath: '/var/run/docker.sock',
            path: path,
            method: method,
            headers: {}
        };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
        }
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data || 'No details'}`));
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanEndpointsConfig(networks) {
    if (!networks) return {};
    const cleaned = {};
    for (const [netName, netConfig] of Object.entries(networks)) {
        cleaned[netName] = {
            Aliases: netConfig.Aliases,
            Links: netConfig.Links,
            IPAMConfig: netConfig.IPAMConfig
        };
    }
    return cleaned;
}

async function safelyDeleteOldImage(name, oldImageId, oldImageTag, newImageId, newImageTag) {
    if (!oldImageId) return;
    if (oldImageId === newImageId) {
        log(`L'ancienne image et la nouvelle image de ${name} ont le même ID (${oldImageId.substring(0, 12)}). Suppression ignorée.`);
        return;
    }

    try {
        if (oldImageTag && oldImageTag !== newImageTag) {
            log(`Suppression de l'ancienne image de ${name} par son tag : "${oldImageTag}"...`);
            await dockerAPI('DELETE', `/images/${encodeURIComponent(oldImageTag)}`);
            log(`Ancienne image de ${name} par tag "${oldImageTag}" supprimée.`);
        } else {
            log(`L'ancien tag de ${name} est identique au nouveau ou absent. Suppression de l'ancienne image par son ID : ${oldImageId.substring(0, 12)}...`);
            await dockerAPI('DELETE', `/images/${oldImageId}`);
            log(`Ancienne image de ${name} par ID ${oldImageId.substring(0, 12)} supprimée.`);
        }
    } catch (e) {
        log(`⚠️ Échec de la suppression simple de l'ancienne image de ${name} : ${e.message}. Tentative avec force=true...`);
        try {
            await dockerAPI('DELETE', `/images/${oldImageId}?force=true`);
            log(`Ancienne image de ${name} forcée avec succès.`);
        } catch (forceErr) {
            log(`⚠️ Impossible de supprimer l'ancienne image de ${name} (${oldImageId.substring(0, 12)}) même avec force : ${forceErr.message}`);
        }
    }
}

async function recreate() {
    log(`=== Début du Recreateur de Conteneur (Tag: ${targetTag}) ===`);
    log(`Arguments de lancement: appId=${appContainerId.substring(0, 12)}, trackerId=${trackerContainerId}, tag=${targetTag}, user=${githubUser}`);
    await sleep(1000);

    let appInfo = null;
    let trackerInfo = null;
    let rollbackNeeded = false;
    let rollbackAppContainerId = null;
    let newTrackerImageId = null;

    try {
        // 1. Inspect APP container
        log(`Inspection du conteneur App actuel (${appContainerId.substring(0, 12)})...`);
        try {
            appInfo = await dockerAPI('GET', `/containers/${appContainerId}/json`);
            log(`Conteneur App trouvé : "${appInfo.Name}" utilisant l'image : ${appInfo.Config.Image}`);
        } catch (e) {
            log(`❌ Erreur fatale : Impossible d'inspecter le conteneur App actuel : ${e.message}`);
            process.exit(1);
        }

        const appCleanName = appInfo.Name.replace(/^\//, '');

        // 2. Inspect TRACKER container if provided
        if (trackerContainerId && trackerContainerId !== 'null' && trackerContainerId !== '-' && trackerContainerId !== 'undefined') {
            log(`Inspection du conteneur Tracker actuel (${trackerContainerId.substring(0, 12)})...`);
            try {
                trackerInfo = await dockerAPI('GET', `/containers/${trackerContainerId}/json`);
                log(`Conteneur Tracker trouvé : "${trackerInfo.Name}"`);
            } catch (e) {
                log(`⚠️ Avertissement : Impossible d'inspecter le Tracker : ${e.message}. Mise à jour du Tracker ignorée.`);
                trackerInfo = null;
            }
        }

        // 3. Clean up any existing rollback container from a previous crash
        const rollbackContainerName = `${appCleanName}-rollback`;
        log(`Vérification de l'existence d'un ancien conteneur de rollback "${rollbackContainerName}"...`);
        try {
            const oldRollback = await dockerAPI('GET', `/containers/${rollbackContainerName}/json`);
            if (oldRollback) {
                log(`Ancien conteneur de rollback détecté. Suppression de sécurité...`);
                try {
                    await dockerAPI('POST', `/containers/${rollbackContainerName}/stop?t=5`);
                } catch (e) {}
                await dockerAPI('DELETE', `/containers/${rollbackContainerName}?v=true`);
                log(`Ancien conteneur de rollback supprimé.`);
            }
        } catch (e) {
            // S'il n'existe pas, c'est normal (erreur 404), on continue
        }

        // 4. Stop tracker if it exists
        if (trackerInfo) {
            const trackerCleanName = trackerInfo.Name.replace(/^\//, '');
            log(`Arrêt du conteneur Tracker : "${trackerCleanName}"...`);
            try {
                await dockerAPI('POST', `/containers/${trackerInfo.Id}/stop?t=10`);
                log(`Tracker arrêté. Suppression du conteneur...`);
                await dockerAPI('DELETE', `/containers/${trackerInfo.Id}?v=true`);
                log(`Tracker supprimé.`);
            } catch (e) {
                log(`⚠️ Erreur lors de la suppression du Tracker : ${e.message}`);
            }
        }

        // 5. STOP and RENAME the current App Container (Transactional lock)
        log(`Arrêt du conteneur App principal : "${appCleanName}"...`);
        try {
            await dockerAPI('POST', `/containers/${appContainerId}/stop?t=15`);
            log(`Conteneur App principal arrêté.`);
        } catch (e) {
            log(`⚠️ Erreur d'arrêt du conteneur principal (peut-être déjà arrêté) : ${e.message}`);
        }

        log(`Renommage de sécurité de "${appCleanName}" vers "${rollbackContainerName}"...`);
        try {
            await dockerAPI('POST', `/containers/${appContainerId}/rename?name=${rollbackContainerName}`);
            rollbackAppContainerId = appContainerId;
            rollbackNeeded = true;
            log(`Renommage réussi. Le plan de rollback est actif.`);
        } catch (e) {
            log(`❌ Erreur fatale de renommage : ${e.message}`);
            throw e;
        }

        // 6. Build creation configuration for NEW App Container
        const newAppImage = `ghcr.io/${githubUser}/mediahub-app:${targetTag}`;
        log(`Préparation du nouveau conteneur App avec l'image : ${newAppImage}...`);

        // Replicate networking configurations perfectly by cleaning dynamic fields
        const endpointsConfig = cleanEndpointsConfig(appInfo.NetworkSettings?.Networks);

        const createConfig = {
            Image: newAppImage,
            Env: appInfo.Config.Env,
            Cmd: appInfo.Config.Cmd,
            Entrypoint: appInfo.Config.Entrypoint,
            WorkingDir: appInfo.Config.WorkingDir,
            User: appInfo.Config.User || 'root',
            Labels: appInfo.Config.Labels, // Conserves Docker Compose labels perfectly!
            ExposedPorts: appInfo.Config.ExposedPorts,
            HostConfig: {
                Binds: appInfo.HostConfig.Binds,
                PortBindings: appInfo.HostConfig.PortBindings,
                RestartPolicy: appInfo.HostConfig.RestartPolicy,
                NetworkMode: appInfo.HostConfig.NetworkMode,
                LogConfig: appInfo.HostConfig.LogConfig,
                ExtraHosts: appInfo.HostConfig.ExtraHosts,
                Devices: appInfo.HostConfig.Devices,
                CapAdd: appInfo.HostConfig.CapAdd,
                CapDrop: appInfo.HostConfig.CapDrop,
                SecurityOpt: appInfo.HostConfig.SecurityOpt
            },
            NetworkingConfig: {
                EndpointsConfig: endpointsConfig
            }
        };

        log(`Création du nouveau conteneur App "${appCleanName}"...`);
        let newAppContainer = null;
        try {
            newAppContainer = await dockerAPI('POST', `/containers/create?name=${appCleanName}`, createConfig);
            log(`Conteneur créé avec succès (ID: ${newAppContainer.Id.substring(0, 12)})`);
        } catch (e) {
            log(`❌ Échec de la création du nouveau conteneur : ${e.message}`);
            throw e;
        }

        // 7. Start NEW App Container
        log(`Démarrage du nouveau conteneur App...`);
        try {
            await dockerAPI('POST', `/containers/${newAppContainer.Id}/start`);
            log(`Démarrage initié.`);
        } catch (e) {
            log(`❌ Échec du démarrage du nouveau conteneur : ${e.message}`);
            throw e;
        }

        // 8. Health Check / Stability Check
        log(`Attente de stabilisation du nouveau conteneur (1 seconde)...`);
        await sleep(1000);

        log(`Vérification de l'état du nouveau conteneur...`);
        const inspectNew = await dockerAPI('GET', `/containers/${newAppContainer.Id}/json`);
        const isRunning = inspectNew.State && inspectNew.State.Running;
        const exitCode = inspectNew.State ? inspectNew.State.ExitCode : 0;

        if (!isRunning || exitCode !== 0) {
            const errorReason = !isRunning ? "Le conteneur s'est arrêté tout de suite." : `Le conteneur a crashé avec le code de sortie ${exitCode}.`;
            log(`❌ Problème de stabilité détecté : ${errorReason}`);
            throw new Error(`Stabilité compromise : ${errorReason}`);
        }

        log(`✅ Succès ! Le nouveau conteneur App fonctionne correctement et est stable.`);
        
        // 9. Recreate Tracker if needed
        if (trackerInfo) {
            const trackerCleanName = trackerInfo.Name.replace(/^\//, '');
            const newTrackerImage = `ghcr.io/${githubUser}/mediahub-tracker:${targetTag}`;
            log(`Création du nouveau conteneur Tracker "${trackerCleanName}" avec l'image : ${newTrackerImage}...`);

            const trackerCreateConfig = {
                Image: newTrackerImage,
                Env: trackerInfo.Config.Env,
                Cmd: trackerInfo.Config.Cmd,
                Entrypoint: trackerInfo.Config.Entrypoint,
                WorkingDir: trackerInfo.Config.WorkingDir,
                User: trackerInfo.Config.User || 'root',
                Labels: trackerInfo.Config.Labels,
                HostConfig: {
                    Binds: trackerInfo.HostConfig.Binds,
                    RestartPolicy: trackerInfo.HostConfig.RestartPolicy,
                    NetworkMode: trackerInfo.HostConfig.NetworkMode
                },
                NetworkingConfig: {
                    EndpointsConfig: cleanEndpointsConfig(trackerInfo.NetworkSettings?.Networks)
                }
            };

            try {
                const newTracker = await dockerAPI('POST', `/containers/create?name=${trackerCleanName}`, trackerCreateConfig);
                log(`Nouveau Tracker créé. Démarrage...`);
                await dockerAPI('POST', `/containers/${newTracker.Id}/start`);
                log(`✅ Tracker démarré avec succès.`);
                try {
                    const inspectNewTracker = await dockerAPI('GET', `/containers/${newTracker.Id}/json`);
                    newTrackerImageId = inspectNewTracker.Image;
                } catch (e) {
                    log(`⚠️ Impossible d'inspecter le nouveau Tracker : ${e.message}`);
                }
            } catch (e) {
                log(`⚠️ Échec de la recréation du Tracker : ${e.message}. L'application principale fonctionne quand même.`);
            }
        }

        // 10. Success: Clean up the rollback safety container
        log(`Nettoyage : Suppression de l'ancien conteneur de sécurité "${appCleanName}-rollback"...`);
        try {
            await dockerAPI('DELETE', `/containers/${rollbackAppContainerId}?v=true`);
            log(`Ancien conteneur supprimé.`);
        } catch (e) {
            log(`⚠️ Erreur mineure lors du nettoyage de l'ancien conteneur : ${e.message}`);
        }

        log(`Nettoyage : Suppression des anciennes images Docker pour libérer de l'espace...`);
        if (appInfo && inspectNew) {
            const oldImageId = appInfo.Image;
            const oldImageTag = appInfo.Config.Image;
            const newImageId = inspectNew.Image;
            const newImageTag = newAppImage;
            await safelyDeleteOldImage('Application', oldImageId, oldImageTag, newImageId, newImageTag);
        }
        if (trackerInfo && newTrackerImageId) {
            const oldImageId = trackerInfo.Image;
            const oldImageTag = trackerInfo.Config.Image;
            const newImageId = newTrackerImageId;
            const newImageTag = `ghcr.io/${githubUser}/mediahub-tracker:${targetTag}`;
            await safelyDeleteOldImage('Tracker', oldImageId, oldImageTag, newImageId, newImageTag);
        }

        log(`=== 🎉 Processus de mise à jour accompli avec succès ! ===`);
        process.exit(0);

    } catch (err) {
        log(`🚨 ERREUR CRITIQUE PENDANT LA MISE À JOUR : ${err.message}`);
        
        if (rollbackNeeded && rollbackAppContainerId) {
            const appCleanName = appInfo.Name.replace(/^\//, '');
            const rollbackContainerName = `${appCleanName}-rollback`;
            log(`🔄 AMORÇAGE DU PLAN DE ROLLBACK AUTOMATIQUE...`);
            
            try {
                // Check if a broken new container is occupying the name "mediahub-app"
                log(`Suppression du conteneur en panne "${appCleanName}" s'il existe...`);
                try {
                    const inspectBroken = await dockerAPI('GET', `/containers/${appCleanName}/json`);
                    if (inspectBroken) {
                        try {
                            await dockerAPI('POST', `/containers/${appCleanName}/stop?t=5`);
                        } catch (e) {}
                        await dockerAPI('DELETE', `/containers/${appCleanName}?v=true`);
                        log(`Conteneur en panne supprimé.`);
                    }
                } catch (e) {
                    // Not found, normal
                }

                // Rename rollback back to original name
                log(`Restauration du nom d'origine de "${rollbackContainerName}" vers "${appCleanName}"...`);
                await dockerAPI('POST', `/containers/${rollbackAppContainerId}/rename?name=${appCleanName}`);
                
                // Restart old container
                log(`Redémarrage de l'ancien conteneur...`);
                await dockerAPI('POST', `/containers/${rollbackAppContainerId}/start`);
                
                log(`✅ ROLLBACK ACCOMPLI AVEC SUCCÈS. L'ancienne version est en ligne et sécurisée.`);
            } catch (rollErr) {
                log(`❌ ERREUR CATASTROPHIQUE : Échec du rollback automatique ! Le système est instable. Erreur : ${rollErr.message}`);
            }
        } else {
            log(`⚠️ Aucun rollback n'a pu être amorcé (l'ancien conteneur n'a pas été modifié ou arrêté).`);
        }
        
        process.exit(1);
    }
}

recreate();
