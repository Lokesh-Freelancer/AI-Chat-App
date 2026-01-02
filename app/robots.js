export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/profile/'], // Hide API and private profile routes
        },
        sitemap: 'https://promptly-devgpt.vercel.app/sitemap.xml',
    }
}
