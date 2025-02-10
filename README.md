# Eliza Notary

## Overview

**Eliza Notary** is an AI-driven solution that automatically audits smart contract code and identifies security vulnerabilities, while transparently verifying consistency between deployed code and open-source repositories using the **SLSA framework**.

<video width="1280" height="720" controls>
    <source src="https://docs.zktx.io/movie/eliza-notary.mp4" type="video/mp4">
</video>

### 🚀 AI Innovation: The Future of Smart Contract Auditing & On-Chain Provenance

In recent years, artificial intelligence has made remarkable advancements, fundamentally transforming how developers ensure code quality and security. The latest AI agents can automatically audit code, detect vulnerabilities, and generate insightful summaries in real time. By leveraging cutting-edge AI models, teams can significantly accelerate the review process and enhance the overall quality of their software.

However, the impact of AI in this domain goes beyond just improving development efficiency. Ensuring the integrity of the software supply chain has become a critical challenge. For Web3 developers, who heavily rely on open-source software, proving that deployed code matches the original source code stored in GitHub repositories is essential. This is especially crucial in smart contracts, where even minor discrepancies can lead to severe security vulnerabilities.

To address this issue, **SLSA (Supply chain Levels for Software Artifacts)** provides a transparent verification framework, playing a key role in ensuring consistency between deployed and original code. Based on SLSA principles, **Eliza Notary** conducts all audits publicly on GitHub and transparently discloses details such as the AI prompts used. This level of openness allows anyone to verify every step of the auditing process, significantly enhancing trust in the entire pipeline.

Additionally, **Eliza Notary rigorously inspects open-source code before deployment using AI**, enabling the early detection and mitigation of potential vulnerabilities or errors. This proactive auditing process goes beyond simple verification; it contributes to the overall quality and security of software while establishing a **trustworthy open-source provenance and deployment pipeline**.

Ultimately, by combining AI-powered innovations with **the SLSA transparent verification framework**, **Eliza Notary** becomes an indispensable tool for ensuring the **security and trustworthiness of smart contracts** and other critical systems. This comprehensive approach provides developers with a robust mechanism to prove the authenticity of their code, strengthening the quality and security of the entire open-source ecosystem.

## Expected Effects and Use Cases

- Enhanced Transparency and Reliability:
  The AI agent, eliza, automatically includes the prompts and source references used in generating the audit and summary reports. This ensures that the results are trustworthy and verifiable.
- Improved Collaboration Productivity:
  By automatically performing code audits and summarizing issue discussions during Pull Requests or issue threads, team members can quickly grasp changes and key points. This speeds up decision-making and problem resolution.
- Enhanced Smart Contract Quality:
  Including the audit report along with the smart contract deployment helps preemptively identify security vulnerabilities and basic errors. This contributes to greater transparency and overall stability of the smart contracts.
- Future Scalability and Ecosystem Contribution:
  As AI technology continues to evolve, the improved audit and summary functionalities will further elevate the quality and transparency of smart contracts across the ecosystem.

## Setup Instructions for Using as a GitHub Action

### Overview

Secure Audit Master leverages the AI agent eliza to automatically perform the following tasks:

- Code Audit:
  Analyzes the project’s source code (e.g., smart contract code) and test result files to detect security vulnerabilities, errors, and potential improvements.
- Issue Summary:
  Aggregates all comments within an issue and generates a summarized report that helps collaborators quickly understand the core discussion points.
- Model Selection Options:
  Allows you to choose between AI models (e.g., openai or deepseek) via command-line options.

### Environment Variables and Inputs

Required Environment Variables (typically set as Secrets):

- **GITHUB_TOKEN**: Required for GitHub API calls and posting comments on issues/PRs.
- **OPENAI_API_KEY**: API key for using the OpenAI model.
- **DEEPSEEK_API_KEY**: API key for using the DeepSeek model.

![setting](https://docs.zktx.io/images/elize-notary-settings.png)

Action Inputs:

- **project-path (required)**:
  The path to the project to be audited (e.g., ./my_project).
- **character-path (optional)**:
  The path to the character configuration file for the AI agent (used for custom character settings).
- **force-audit (optional)**:
  Enables forced execution of the AI audit process, ensuring that an audit report is always generated regardless of user commands.

### Example Workflow File

Below is an example of how to include the Secure Audit Master action in your workflow file:

```yml
name: Comment Triggered Workflow

on:
  issue_comment:
    types: [created]

jobs:
  run-on-comment:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
      contents: read

    steps:
      - name: Determine branch
        id: determine_branch
        run: |
          if [[ -n "${{ github.event.issue.pull_request }}" ]]; then
            echo "Running on PR..."
            PR_NUMBER=${{ github.event.issue.number }}
            echo "BRANCH=refs/pull/${PR_NUMBER}/head" >> $GITHUB_ENV
          else
            echo "Running on issue..."
            echo "BRANCH=main" >> $GITHUB_ENV
          fi

      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          ref: ${{ env.BRANCH }}

      - name: Run Eliza Notary
        uses: zktx-io/eliza-notary@main
        with:
          project-path: './my_project'
          character-path: './my_character.json'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
```

## Issue Comment Commands

The Secure Audit Master action is designed to be triggered by comments on issues. Depending on the command provided, the action will automatically execute one of the following functions:

### Help Command: **/eliza help**

- Usage:
  - Post the comment /eliza help on an issue.
- Functionality:
  - The action will automatically reply with a help message that outlines all available commands, including their descriptions and usage instructions.
- Example Output:

```bash
Usage: /eliza [command] [options]

Commands:
  /eliza help
    Display available commands and their descriptions.

  /eliza audit model=[openai|deepseek]
    Perform an audit of the repository's code.
    The 'model' option must be either 'openai' or 'deepseek'.

  /eliza summary model=[openai|deepseek]
    Summarize the issue content using AI.
    The 'model' option allows you to choose an AI model for summarization.
```

### Code Audit Command: **/eliza audit model=[openai|deepseek]**

- Usage:
  - Post a comment such as /eliza audit model=openai or /eliza audit model=deepseek on an issue.
- Functionality:
  - Invokes the specified AI model to collect the project’s source code (e.g., smart contract code) and test result file (test_results.txt).
  - Performs a code audit and posts the resulting report as a comment, including the prompts and source references used during the audit process.
- Expected Outcome:
  - Identifies security vulnerabilities and areas for improvement in the code before smart contract deployment.
  - Automatically generates an audit report during a Pull Request, enabling team members to quickly understand the changes and potential risks.

### Issue Summary Command: **/eliza summary model=[openai|deepseek]**

- Usage:
  - Post a comment such as /eliza summary model=openai or /eliza summary model=deepseek on an issue.
- Functionality:
  - Aggregates all comments within the issue and leverages AI to generate a concise, coherent summary.
  - Posts the summary as a comment, complete with the prompts and reference materials used in the summarization process.
- Expected Outcome:
  - Provides a quick overview of extensive issue discussions, greatly enhancing collaborative efficiency.
  - Helps team members rapidly identify the core discussion points, thereby facilitating faster decision-making and problem resolution.

## Github

- Get started with **SLSA on Sui** and learn by [github](https://github.com/zktx-io/slsa-on-sui)
- Get started with **Eliza Notary Example** and learn by [github](https://github.com/zktx-io/eliza-notary-example)
