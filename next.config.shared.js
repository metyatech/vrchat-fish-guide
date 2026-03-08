const repoName = 'vrchat-fish-guide';

/**
 * @param {Record<string, string | undefined>} [env=process.env]
 */
function getNextConfig(env = process.env) {
  const isGitHubPagesBuild = env.DEPLOY_TARGET === 'github-pages';

  return {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    basePath: isGitHubPagesBuild ? `/${repoName}` : '',
    assetPrefix: isGitHubPagesBuild ? `/${repoName}/` : undefined,
  };
}

module.exports = {
  getNextConfig,
  repoName,
};
