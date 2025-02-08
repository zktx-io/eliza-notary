import fs from 'fs';
import path from 'path';

import { Character, validateCharacterConfig } from '@elizaos/core';

export async function loadCharacters(
  charactersArg: string,
): Promise<Character[]> {
  const characterPaths = charactersArg?.split(',').map((filePath) => {
    return path.resolve(process.cwd(), filePath.trim());
  });

  const loadedCharacters: Character[] = [];

  if (characterPaths?.length > 0) {
    for (const filePath of characterPaths) {
      try {
        const characterData = await fs.promises.readFile(filePath, 'utf8');
        const character = JSON.parse(characterData);

        validateCharacterConfig(character);

        loadedCharacters.push(character);
      } catch (e) {
        console.error(`Error loading character from ${filePath}: ${e}`);
        // Continue loading other characters even if one fails
      }
    }
  }

  return loadedCharacters;
}
