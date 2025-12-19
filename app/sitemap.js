export default function sitemap() {
    const baseUrl = 'https://your-chat-domain.com'; // Update this when you deploy

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/signup`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        // We generally don't include dynamic user profile/chat URLs in public sitemaps
        // as they are private content.
    ];
}
