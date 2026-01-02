import { franc } from 'franc-min';

export const LANGUAGE_MAP = {
    // Indian Languages
    'hin': 'hi-IN', // Hindi
    'ben': 'bn-IN', // Bengali
    'guj': 'gu-IN', // Gujarati
    'mar': 'mr-IN', // Marathi
    'tam': 'ta-IN', // Tamil
    'tel': 'te-IN', // Telugu
    'kan': 'kn-IN', // Kannada
    'mal': 'ml-IN', // Malayalam
    'pan': 'pa-IN', // Punjabi
    'urd': 'ur-IN', // Urdu

    // Asian Languages
    'cmn': 'zh-CN', // Mandarin Chinese
    'zho': 'zh-CN', // Chinese
    'jpn': 'ja-JP', // Japanese
    'kor': 'ko-KR', // Korean
    'ind': 'id-ID', // Indonesian
    'tha': 'th-TH', // Thai
    'vie': 'vi-VN', // Vietnamese

    // European Languages
    'eng': 'en-US', // English
    'spa': 'es-ES', // Spanish
    'fra': 'fr-FR', // French
    'deu': 'de-DE', // German
    'ita': 'it-IT', // Italian
    'por': 'pt-PT', // Portuguese
    'rus': 'ru-RU', // Russian
    'nld': 'nl-NL', // Dutch
    'pol': 'pl-PL', // Polish
    'tur': 'tr-TR', // Turkish
    'swe': 'sv-SE', // Swedish
    'dan': 'da-DK', // Danish
    'fin': 'fi-FI', // Finnish
    'nor': 'nb-NO', // Norwegian
    'ell': 'el-GR', // Greek
    'hun': 'hu-HU', // Hungarian
    'ces': 'cs-CZ', // Czech
    'ukr': 'uk-UA', // Ukrainian

    // Middle Eastern / African
    'arb': 'ar-SA', // Arabic
    'heb': 'he-IL', // Hebrew
    'fas': 'fa-IR', // Persian
    'swh': 'sw-KE', // Swahili
};

export const detectLanguage = (text) => {
    try {
        const langCode = franc(text, { minLength: 3 });
        console.log('Detected language code:', langCode);
        return langCode;
    } catch (err) {
        console.error('Language detection failed:', err);
        return 'eng';
    }
};

export const getTargetLang = (langCode) => {
    return LANGUAGE_MAP[langCode] || 'en-US';
};

export const getSelectedVoice = (targetLang) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        return voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
    }
    return null;
};

export const cleanTextForSpeech = (text) => {
    return text
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]+`/g, '') // Remove inline code
        .replace(/[#*_~]/g, '') // Remove markdown symbols
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
        .trim();
};

export const generateSpeechChunks = (text) => {
    // Split by punctuation: . ? ! : ; newline, Hindi Danda (।), and CJK punctuation (。？！，；：)
    const splitRegex = /([.?!:;\n\u0964\u3002\uFF1F\uFF01\uFF0C\uFF1B\uFF1A])/;
    const rawSegments = text.split(splitRegex);

    const chunks = [];
    let currentChunk = '';

    for (let i = 0; i < rawSegments.length; i++) {
        const segment = rawSegments[i];

        // If segment is just a delimiter, append to current chunk and push
        if (splitRegex.test(segment)) {
            currentChunk += segment;
            // Use a soft limit to avoid cutting sentences (e.g. "Mr." or "e.g.")
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
        } else {
            // It's text. Check if adding it exceeds limit
            if (currentChunk.length + segment.length > 200) {
                if (currentChunk.trim().length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
            }
            currentChunk += segment;
        }
    }
    // Push remaining
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
};
