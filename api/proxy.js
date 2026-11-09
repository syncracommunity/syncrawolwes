const axios = require('axios');

module.exports = async (req, res) => {
    // Vercel'in gelen istekleri kabul etmesi için CORS izinleri
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { endpoint, ...params } = req.query;

    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint belirtilmedi.' });
    }

    try {
        // Senin API'nin temel adresi
        const API_BASE = 'https://api.ajaxsystems.fun';
        
        // İstek at
        const response = await axios.get(`${API_BASE}/${endpoint}`, {
            params: params,
            timeout: 9000 // Vercel limiti 10sn, 9sn'de keselim
        });

        return res.status(200).json(response.data);
    } catch (error) {
        console.error(`[PROXY HATA] ${endpoint}:`, error.message);
        return res.status(500).json({ 
            error: error.response?.data?.message || error.message || 'API isteği başarısız oldu.' 
        });
    }
};
