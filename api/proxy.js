module.exports = async (req, res) => {
    // Tarayıcıdan gelen isteklere izin ver (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // URL'den endpoint ve diğer parametreleri al
    const { endpoint, ...params } = req.query;
    
    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint belirtilmedi.' });
    }

    try {
        const API_BASE = 'https://api.ajaxsystems.fun';
        const queryString = new URLSearchParams(params).toString();
        const targetUrl = `${API_BASE}/${endpoint}?${queryString}`;

        // Node.js'in yerleşik fetch'ini kullan (Harici paket gerektirmez)
        const response = await fetch(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        });

        const textData = await response.text();
        
        // Eğer API "A server error" gibi düz metin hata sayfası dönerse
        if (textData.includes('A server error')) {
            return res.status(200).json({ error: 'Hedef API şu anda yanıt vermiyor (Sunucu Hatası).' });
        }

        // Gelen veriyi JSON olarak ayrıştırmayı dene
        try {
            const jsonData = JSON.parse(textData);
            return res.status(200).json(jsonData);
        } catch (e) {
            // JSON değilse ham veriyi dön
            return res.status(200).json({ 
                error: 'API geçersiz yanıt döndürdü.', 
                raw: textData.substring(0, 100) 
            });
        }

    } catch (error) {
        // Bağlantı hatası vb. durumlarda Vercel'in çökmesini engelle, JSON dön
        return res.status(200).json({ error: `Proxy Bağlantı Hatası: ${error.message}` });
    }
};
