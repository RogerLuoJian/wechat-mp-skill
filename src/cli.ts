#!/usr/bin/env node
// src/cli.ts
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAccount } from "./config.js";
import { listDrafts, createDraft, getDraft, deleteDraft, publishDraft } from "./api/draft.js";
import { listMaterials, getMaterial, uploadMaterial } from "./api/material.js";
import { parseArticleFile } from "./markdown.js";

const program = new Command();

function output(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

function handleError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

program
  .name("wechat-mp")
  .description("WeChat Official Account management CLI")
  .version("0.1.0");

// --- accounts ---
program
  .command("accounts")
  .description("List all configured accounts")
  .action(() => {
    try {
      const result = getAccount();
      output({ accounts: result.all });
    } catch (err) {
      handleError(err);
    }
  });

// --- draft ---
const draft = program.command("draft").description("Draft management");

draft
  .command("list")
  .description("List drafts")
  .option("--account <alias>", "Account alias")
  .option("--offset <n>", "Offset", "0")
  .option("--count <n>", "Count", "20")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await listDrafts(alias, parseInt(opts.offset), parseInt(opts.count));
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("create")
  .description("Create a draft from a file")
  .requiredOption("--file <path>", "Article file path (.md or .html)")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const filePath = resolve(opts.file);
      const content = readFileSync(filePath, "utf-8");
      const article = parseArticleFile(content, filePath);
      const result = await createDraft(alias, [article]);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("get")
  .description("Get draft details")
  .requiredOption("--media-id <id>", "Draft media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await getDraft(alias, opts.mediaId);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("delete")
  .description("Delete a draft")
  .requiredOption("--media-id <id>", "Draft media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      await deleteDraft(alias, opts.mediaId);
      output({ success: true, message: "Draft deleted" });
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("publish")
  .description("Publish a draft")
  .requiredOption("--media-id <id>", "Draft media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await publishDraft(alias, opts.mediaId);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

// --- material ---
const material = program.command("material").description("Material management");

material
  .command("list")
  .description("List materials")
  .requiredOption("--type <type>", "Material type (image, video, voice, news)")
  .option("--account <alias>", "Account alias")
  .option("--offset <n>", "Offset", "0")
  .option("--count <n>", "Count", "20")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await listMaterials(alias, opts.type, parseInt(opts.offset), parseInt(opts.count));
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

material
  .command("upload")
  .description("Upload a material file")
  .requiredOption("--file <path>", "File path")
  .requiredOption("--type <type>", "Material type (image, video, voice, thumb)")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const filePath = resolve(opts.file);
      const fileBuffer = readFileSync(filePath);
      const filename = filePath.split("/").pop() || "file";
      const blob = new Blob([fileBuffer]);
      const result = await uploadMaterial(alias, opts.type, blob, filename);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

material
  .command("get")
  .description("Get material details")
  .requiredOption("--media-id <id>", "Material media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await getMaterial(alias, opts.mediaId);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

function resolveAccount(alias?: string): string {
  if (alias) return alias;
  const result = getAccount();
  if (result.all && result.all.length === 1) {
    return result.all[0].alias;
  }
  // When called from CLI without alias, list accounts and exit
  output({
    error: "No account specified. Available accounts:",
    accounts: result.all,
  });
  process.exit(1);
}

program.parse();
