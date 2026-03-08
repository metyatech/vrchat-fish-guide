/** @type {import('next').NextConfig} */
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true';
const repoName = 'vrchat-fish-guide';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGitHubPagesBuild ? `/${repoName}` : '',
  assetPrefix: isGitHubPagesBuild ? `/${repoName}/` : undefined,
};

module.exports = nextConfig;
