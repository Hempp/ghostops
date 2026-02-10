/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.twilio.com', 'media.twiliocdn.com'],
  },
}

module.exports = nextConfig
