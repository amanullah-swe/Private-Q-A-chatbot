/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    serverExternalPackages: ["pdf-parse", "mammoth"],
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Prevent pdf-parse from being bundled (it tries to open test files)
            config.externals = [...(config.externals || []), 'pdf-parse'];
        }
        return config;
    },
};

export default nextConfig;
