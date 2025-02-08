import fs from 'fs';

import * as github from '@actions/github';
import { elizaLogger } from '@elizaos/core';
import fetch from 'node-fetch';

const getLatestReleaseAssetUrl = async (
  repo: string,
  assetName: string,
  githubToken: string,
): Promise<string> => {
  const [owner, repoName] = repo.split('/');
  const octokit = github.getOctokit(githubToken);
  const { data: releases } = await octokit.rest.repos.listReleases({
    owner,
    repo: repoName,
  });

  if (releases.length === 0) {
    throw new Error('No releases found');
  }

  const latestRelease = releases[0];
  const asset = latestRelease.assets.find((a) => a.name === assetName);

  if (!asset) {
    throw new Error(`Asset ${assetName} not found in the latest release`);
  }

  return asset.browser_download_url;
};

const downloadFile = async (url: string, outputPath: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
};

export const downloadAsset = async (
  repo: string,
  assetName: string,
  outputPath: string,
  githubToken: string,
): Promise<void> => {
  try {
    const assetUrl = await getLatestReleaseAssetUrl(
      repo,
      assetName,
      githubToken,
    );
    await downloadFile(assetUrl, outputPath);
  } catch (error) {
    elizaLogger.log(error);
  }
};
