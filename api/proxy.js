const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { endpoint, ...params } = req.query;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint belirtilmedi.' });

    try {
        const API_BASE = 'https://api.ajaxsystems.fun';
        
        const response = await axios.get(`${API_BASE}/${endpoint}`, {
            params: params,
            timeout: 9000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            validateStatus: () => true // 400, 500 fırlatmasın, biz yakalayalım
        });

        // API'den gelen cevap string (HTML veya hata metni) mi?
        if (typeof response.data === 'string') {
             // Eğer içinde "A server error" varsa anlamlı bir hata dön
             if (response.data.includes('A server error')) {
                 return res.status(200).json({ 
                     error: `API Sunucu Hatası (Status: ${response.status}). API geçici olarak yanıt vermiyor.` 
                 });
             }
             // Değilse ham veriyi dön (JSON parse edilemezse arayüz yakalar)
             return res.status(200).json({ 
                 error: `Geçersiz API Yanıtı (Status: ${response.status})`, 
                 raw: response.data.substring(0, 100) 
             });
        }

        // Gelen veri zaten JSON objesi ise direkt dön
        return res.status(200).json(response.data);

    } catch (error) {
        console.error(`[PROXY HATA] ${endpoint}:`, error.message);
        return res.status(200).json({ 
            error: `Proxy Bağlantı Hatası: ${error.message}` 
        });
    }
};
