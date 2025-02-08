import fs from 'fs';
import path from 'path';

import * as github from '@actions/github';
import { Character, elizaLogger, ModelProviderName } from '@elizaos/core';

import {
  getIssueCommentMaster,
  getLearningAuditMaster,
  getSecureAuditMaster,
} from './eliza/character.js';
import DirectClientCLI from './eliza/directClientCLI.js';
import { downloadAsset } from './eliza/downloadAsset.js';
import { startAgent } from './eliza/index.js';
import { loadCharacters } from './eliza/loadCharacters.js';

if (process.env.NODE_ENV !== 'production') {
  import('dotenv').then((dotenv) => dotenv.config());
}

const readFilesFromDirectory = (
  dir: string,
  extensions: string[],
): string[] => {
  const code: string[] = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (
        path.basename(filePath) !== 'external-repo' &&
        path.basename(filePath) !== '.git' &&
        path.basename(filePath) !== '.github'
      ) {
        code.push(...readFilesFromDirectory(filePath, extensions));
      }
    } else if (extensions.includes(path.extname(file))) {
      const relativePath = path.relative(process.cwd(), filePath);
      let text = `// filepath: ${relativePath}\n`;
      text += fs.readFileSync(filePath, 'utf8') + '\n';
      code.push(text);
    }
  });

  return code;
};

const getModelFromTriggerComment = (): ModelProviderName | undefined => {
  const commentBody = github.context.payload.comment?.body;

  if (!commentBody) {
    elizaLogger.error('Trigger comment not found.');
    return undefined;
  }

  const match = commentBody
    .trim()
    .toLowerCase()
    .match(/eliza audit model=(openai|deepseek)/i);
  const model = match ? (match[1] as ModelProviderName) : null;

  return model === 'openai' || model === 'deepseek' ? model : undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const postComment = async (octokit: any, comment: string) => {
  try {
    const context = github.context;
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      body: comment,
    });
  } catch (error) {
    elizaLogger.error('Error post comment:', error);
  }
};

const loadAndStartAgents = async (
  characters: Character[],
  directClient: DirectClientCLI,
  sqlitePath: string,
) => {
  const apiKeys = new Map<ModelProviderName, string | undefined>([
    [ModelProviderName.OPENAI, process.env.OPENAI_API_KEY],
    [ModelProviderName.DEEPSEEK, process.env.DEEPSEEK_API_KEY],
  ]);

  for (const character of characters) {
    await startAgent(character, directClient, apiKeys, sqlitePath);
  }
};

const startAgents = async () => {
  const directClient = new DirectClientCLI();
  const currentDir = process.cwd();
  const projectPath = path.resolve(
    currentDir,
    '..',
    process.env.PROJECT_PATH || './',
  );
  const reportPath = path.resolve(
    currentDir,
    '..',
    process.env.REPORT_PATH || './',
  );
  const sqlitePath = path.resolve(
    currentDir,
    '..',
    process.env.SQLITE_PATH || './',
  );
  const characterArg =
    process.env.CHARACTER_PATH &&
    path.resolve(currentDir, '..', process.env.CHARACTER_PATH);

  const actionType = process.env.ACTION_TYPE;

  try {
    if (
      !process.env.SQLITE_PATH &&
      process.env.NODE_ENV === 'production' &&
      process.env.GITHUB_TOKEN
    ) {
      const repo = github.context.repo.owner + '/' + github.context.repo.repo;
      const assetName = 'db.sqlite';
      await downloadAsset(
        repo,
        assetName,
        sqlitePath,
        process.env.GITHUB_TOKEN,
      );
    }

    if (projectPath && process.env.GITHUB_TOKEN) {
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
      const model = getModelFromTriggerComment();
      if (actionType === 'audit') {
        if (characterArg) {
          const temp = await loadCharacters(characterArg, model);
          await loadAndStartAgents(
            temp.length > 0 ? temp : [getSecureAuditMaster(model)],
            directClient,
            sqlitePath,
          );
        } else {
          await loadAndStartAgents(
            [getSecureAuditMaster(model)],
            directClient,
            sqlitePath,
          );
        }

        try {
          const testResultsPath = path.join(projectPath, 'test_results.txt');
          const testResults = fs.readFileSync(testResultsPath, 'utf8');

          const codes = readFilesFromDirectory(`${projectPath}/sources`, [
            '.move',
          ]);
          const report = await directClient.audit(reportPath, projectPath, [
            ...codes,
            testResults,
          ]);

          if (report) {
            await postComment(octokit, report.join('\n'));
          } else {
            elizaLogger.error('No report generated');
          }
        } catch (error) {
          elizaLogger.error('Error processing audit:', error);
        }
      } else if (actionType === 'summary') {
        const context = github.context;

        const issueComments = await octokit.rest.issues.listComments({
          ...context.repo,
          issue_number: context.issue.number,
        });
        const commentBody = issueComments.data
          .map((comment) => `${comment.user?.login}: ${comment.body}`)
          .join('\n\n');
        if (commentBody) {
          await loadAndStartAgents(
            [getIssueCommentMaster(model)],
            directClient,
            sqlitePath,
          );
          /*
          const codes = readFilesFromDirectory(projectPath, ['.move']);
          const commentResponse = await directClient.comment(
            `${codes.join('\n\n')}\n\n${commentBody}`,
          );
          */
          const commentResponse = await directClient.comment(commentBody);

          if (commentResponse) {
            await postComment(octokit, commentResponse);
          } else {
            elizaLogger.error('No comment generated');
          }
        } else {
          elizaLogger.error('No report generated');
        }
      } else {
        elizaLogger.error(`undefined action type: ${actionType}`);
      }
    } else {
      const mode = process.env.MODE;
      if (mode === 'release') {
        await loadAndStartAgents(
          [getLearningAuditMaster()],
          directClient,
          './',
        );
      } else {
        elizaLogger.error('Project path not found');
      }
    }
  } catch (error) {
    elizaLogger.error('Error starting agents:', `${error}`);
  }
};

startAgents().catch((error) => {
  elizaLogger.error('Unhandled error in startAgents:', error);
  process.exit(1);
});
