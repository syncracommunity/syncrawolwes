const axios = require('axios');

module.exports = async (req, res) => {
    // CORS İzinleri
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
            // Eğer API JSON yerine metin dönerse bunu da alabilelim
            responseType: 'text', 
            validateStatus: () => true // Hata kodu dönse bile axios çökmesin, biz yakalayalım
        });

        // Gelen cevap gerçekten JSON mu diye kontrol edelim
        let responseData;
        try {
            responseData = JSON.parse(response.data);
        } catch (parseError) {
            // Eğer JSON değilse, ham metni frontend'e gönderelim
            return res.status(response.status).json({ 
                error: `API Geçersiz Cevap Döndürdü (Status: ${response.status})`, 
                rawResponse: response.data.substring(0, 200) // İlk 200 karakteri göster
            });
        }

        return res.status(response.status).json(responseData);

    } catch (error) {
        console.error(`[PROXY HATA] ${endpoint}:`, error.message);
        return res.status(500).json({ 
            error: `Proxy Hatası: ${error.message}` 
        });
    }
};
