import { Octokit } from "@octokit/rest";
import { readFileSync, writeFileSync } from "fs";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const USERNAME = process.env.USERNAME || "Nadeen-Gunathilake";

async function fetchTopRepos() {
  const { data } = await octokit.repos.listForUser({
    username: USERNAME,
    sort: "updated",
    per_page: 10,
    type: "owner",
  });

  const repos = data.filter((r) => !r.fork && r.name !== USERNAME);

  let md = "| Repository | Description | Language |\n|---|---|---|\n";
  for (const repo of repos.slice(0, 6)) {
    const lang = repo.language || "N/A";
    const desc = repo.description || "No description provided.";
    md += `| [**${repo.name}**](${repo.html_url}) | ${desc} | ![](https://img.shields.io/badge/-${encodeURIComponent(lang)}-0e75b6?style=flat-square) |\n`;
  }

  return md;
}

async function fetchContributions() {
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `type:pr author:${USERNAME} -user:${USERNAME} is:merged`,
    sort: "updated",
    per_page: 8,
  });

  if (!data.items.length) {
    return "_No external pull requests found yet. Keep contributing! _\n";
  }

  let md = "| Pull Request | Repository | Status |\n|---|---|---|\n";
  for (const pr of data.items) {
    const repoName = pr.repository_url.replace("https://api.github.com/repos/", "");
    const repoUrl = `https://github.com/${repoName}`;
    const status = pr.state === "closed" ? " Merged" : " Open";
    md += `| [${pr.title}](${pr.html_url}) | [${repoName}](${repoUrl}) | ${status} |\n`;
  }

  return md;
}

async function updateReadme() {
  let readme = readFileSync("README.md", "utf8");

  try {
    const projects = await fetchTopRepos();
    readme = readme.replace(
      /<!-- PROJECTS:START -->[\s\S]*?<!-- PROJECTS:END -->/,
      `<!-- PROJECTS:START -->\n${projects}\n<!-- PROJECTS:END -->`
    );

    const contributions = await fetchContributions();
    readme = readme.replace(
      /<!-- CONTRIBUTIONS:START -->[\s\S]*?<!-- CONTRIBUTIONS:END -->/,
      `<!-- CONTRIBUTIONS:START -->\n${contributions}\n<!-- CONTRIBUTIONS:END -->`
    );

    writeFileSync("README.md", readme);
    console.log(" README updated successfully!");
  } catch (err) {
    console.error(" Error updating README:", err.message);
    process.exit(1);
  }
}

updateReadme();