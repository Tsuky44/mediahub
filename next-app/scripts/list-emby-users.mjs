
import axios from 'axios';
import https from 'https';

const EMBY_URL = "https://embytv.tsuky.ovh/";
const EMBY_API_KEY = "9e23afa9bc70417fa9f50f257f88f955";

async function listUsers() {
    const baseUrl = EMBY_URL.replace(/\/$/, '');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    try {
        const resUsers = await axios.get(`${baseUrl}/Users`, {
            params: { 
                api_key: EMBY_API_KEY,
                IsDisabled: false
            },
            httpsAgent,
            timeout: 10000
        });
        console.log(`--- Emby Users List (Found ${resUsers.data.length}) ---`);
        resUsers.data.forEach(user => {
            console.log(`- Username: "${user.Name}"`);
            console.log(`  ID: ${user.Id}`);
            console.log(`  IsDisabled: ${user.IsDisabled}`);
            console.log(`  HasPassword: ${user.HasPassword}`);
            console.log(`  Policy.IsAdministrator: ${user.Policy?.IsAdministrator}`);
            console.log(`  Policy.EnableContentDeletion: ${user.Policy?.EnableContentDeletion}`);
            console.log(`-----------------------------`);
        });
    } catch (e) {
        console.error("❌ Failed to list users:", e.message);
    }
}

listUsers();
