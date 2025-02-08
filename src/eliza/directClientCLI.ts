import fs from 'fs';

// import { DefaultArtifactClient } from '@actions/artifact';
import {
  AgentRuntime,
  elizaLogger,
  messageCompletionFooter,
  composeContext,
  generateMessageResponse,
  ModelClass,
  stringToUuid,
  type Content,
  type Memory,
} from '@elizaos/core';

async function uploadArtifactWithContent(
  projectPath: string,
  fileName: string,
  content: string,
) {
  try {
    fs.writeFileSync(`${projectPath}/${fileName}`, content, 'utf8');
    /*
    const artifactClient = new DefaultArtifactClient();
    const artifactName = 'audit-report';
    const files = [fileName];
    const rootDirectory = projectPath;
    const uploadResult = await artifactClient.uploadArtifact(
      artifactName,
      files,
      rootDirectory,
      {
        retentionDays: 10,
      },
    );
    elizaLogger.log('Artifact upload result:', uploadResult);
    */
  } catch (error) {
    elizaLogger.error('Error uploading artifact:', error);
  }
}

class DirectClientCLI {
  private agents: Map<string, AgentRuntime>;

  constructor() {
    elizaLogger.log('DirectClientCLI constructor');
    this.agents = new Map();
  }

  public registerAgent(runtime: AgentRuntime) {
    this.agents.set(runtime.agentId, runtime);
  }

  public unregisterAgent(runtime: AgentRuntime) {
    this.agents.delete(runtime.agentId);
  }

  public async comment(comment: string) {
    const agentId = [...this.agents.keys()][0];

    const runtime = this.agents.get(agentId);
    if (!runtime) {
      elizaLogger.error('Agent not found.');
      return;
    }

    try {
      const response = await this.processMessage(runtime, comment);
      return response.text;
    } catch (error) {
      elizaLogger.error('Error processing message:', error);
    }
    return;
  }

  public async audit(reportPath: string, projectPath: string, codes: string[]) {
    const agentId = [...this.agents.keys()][0];

    const runtime = this.agents.get(agentId);
    if (!runtime) {
      elizaLogger.error('Agent not found.');
      return;
    }

    const reports: string[] = [];
    try {
      /*
      let fullResponseText = '';
      for (const code of codes) {
        const response = await this.processMessage(runtime, code);
        reports.push(response.text);
        fullResponseText += response.text + '\n\n\n';
      }
      const currentTime = new Date()
        .toISOString()
        .split('.')[0]
        .replace(/[:]/g, '-');
      const reportFileName = `${reportPath}/report-${currentTime}.md`;
      fs.appendFileSync(reportFileName, fullResponseText);
      */
      const response = await this.processMessage(runtime, codes.join('\n\n'));
      reports.push(response.text);
      /*
      const currentTime = new Date()
        .toISOString()
        .split('.')[0]
        .replace(/[:]/g, '-');
      fs.appendFileSync(
        `${reportPath}/report-${currentTime}.md`,
        response.text,
      );
      */
      uploadArtifactWithContent(projectPath, 'report.md', response.text);
    } catch (error) {
      elizaLogger.error('Error processing message:', error);
    }
    return reports;
  }

  private async processMessage(runtime: AgentRuntime, text: string) {
    const roomId = stringToUuid('cli-room-' + runtime.agentId);
    const userId = stringToUuid('cli-user');
    const messageId = stringToUuid(Date.now().toString());

    const content: Content = {
      text,
      attachments: [],
      source: 'cli',
      inReplyTo: undefined,
    };

    const memory: Memory = {
      id: messageId,
      agentId: runtime.agentId,
      userId,
      roomId,
      content,
      createdAt: Date.now(),
    };

    await runtime.messageManager.createMemory(memory);

    const state = await runtime.composeState(
      { content, userId, roomId, agentId: runtime.agentId },
      { agentName: runtime.character.name },
    );
    const context = composeContext({
      state,
      template:
        `{{messageDirections}}\n{{recentMessages}}\n` + messageCompletionFooter,
    });

    return await generateMessageResponse({
      runtime,
      context,
      modelClass: ModelClass.LARGE,
    });
  }
}

export default DirectClientCLI;
