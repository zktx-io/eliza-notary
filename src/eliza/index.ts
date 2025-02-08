import fs from 'fs';

import { SqliteDatabaseAdapter } from '@elizaos/adapter-sqlite';
import {
  AgentRuntime,
  Character,
  elizaLogger,
  ICacheManager,
  ModelProviderName,
  stringToUuid,
} from '@elizaos/core';

import { initializeDatabase, initializeDbCache } from './database.js';
import DirectClientCLI from './directClientCLI.js';

export function createAgent(
  character: Character,
  db: SqliteDatabaseAdapter,
  cache: ICacheManager,
  token: string,
) {
  elizaLogger.success(
    elizaLogger.successesTitle,
    'Creating runtime for character',
    character.name,
  );

  return new AgentRuntime({
    databaseAdapter: db,
    token,
    modelProvider: character.modelProvider,
    evaluators: [],
    character,
    plugins: [],
    providers: [],
    actions: [],
    services: [],
    managers: [],
    cacheManager: cache,
  });
}

export async function startAgent(
  character: Character,
  directClient: DirectClientCLI,
  apiKeys: Map<ModelProviderName, string | undefined>,
  dataDir: string,
) {
  try {
    character.id ??= stringToUuid(character.name);
    character.username ??= character.name;

    const token = apiKeys.get(character.modelProvider);

    if (token) {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const db = initializeDatabase(dataDir);

      await db.init();

      const cache = initializeDbCache(character, db);
      const runtime = createAgent(character, db, cache, token!);

      await runtime.initialize();

      runtime.clients = [];

      directClient.registerAgent(runtime);

      // report to console
      elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`);

      return runtime;
    }
    elizaLogger.error(
      `Error starting agent for character ${character.name}:`,
      'No API key found for model provider',
    );
    console.error('No API key found for model provider');
    throw 'No API key found for model provider';
  } catch (error) {
    elizaLogger.error(
      `Error starting agent for character ${character.name}:`,
      error,
    );
    console.error(error);
    throw error;
  }
}
