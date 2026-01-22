
import axios from 'axios';
import https from 'https';

const EMBY_URL = "https://embytv.tsuky.ovh/";
const EMBY_API_KEY = "9e23afa9bc70417fa9f50f257f88f955";

async function testEmby() {
    const baseUrl = EMBY_URL.replace(/\/$/, '');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    console.log(`--- Testing Emby Connection to ${baseUrl} ---`);

    // 1. Test Public Info
    try {
        console.log("1. Testing /System/Info/Public...");
        const resInfo = await axios.get(`${baseUrl}/System/Info/Public`, { 
            httpsAgent,
            timeout: 5000 
        });
        console.log("✅ Public Info Success:", resInfo.data.ServerName || "Connected");
    } catch (e) {
        console.error("❌ Public Info Failed:", e.message);
    }

    // 2. Test API Key with /Users
    try {
        console.log("\n2. Testing API Key with /Users...");
        const resUsers = await axios.get(`${baseUrl}/Users`, {
            params: { api_key: EMBY_API_KEY },
            httpsAgent,
            timeout: 5000
        });
        console.log("✅ API Key Success: Found", resUsers.data.length, "users");
    } catch (e) {
        console.error("❌ API Key Failed:", e.response?.status || e.message);
        if (e.response?.data) console.error("Error data:", e.response.data);
    }
}

testEmby();
