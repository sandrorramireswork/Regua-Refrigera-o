import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function getDesktopPath() {
  const oneDriveDesktop = "e:\\OneDrive\\Área de Trabalho";
  if (fs.existsSync(oneDriveDesktop)) {
    return oneDriveDesktop;
  }
  const userDesktop = path.join(os.homedir(), "Desktop");
  if (fs.existsSync(userDesktop)) {
    return userDesktop;
  }
  const ptDesktop = path.join(os.homedir(), "Área de Trabalho");
  if (fs.existsSync(ptDesktop)) {
    return ptDesktop;
  }
  return projectRoot;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function createBackup() {
  console.log("\n=======================================================");
  console.log("  INICIANDO BACKUP - RÉGUA REFRIGERAÇÃO TERMOMASTER PRO ");
  console.log("=======================================================\n");

  const desktop = getDesktopPath();
  const backupDir = path.join(desktop, "Backups_ReguaRefrigeracao");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Pasta criada na Área de Trabalho: ${backupDir}`);
  }

  const timestamp = getTimestamp();
  const fileName = `regua-refrigeracao-termomaster-pro_${timestamp}.zip`;
  const destination = path.join(backupDir, fileName);

  console.log(`⏳ Compactando arquivos do projeto...`);
  console.log(`   (ignorando node_modules, .git e builds temporários)\n`);

  try {
    // Utiliza o tar.exe nativo do Windows com suporte a .zip
    const excludePatterns = [
      '--exclude="node_modules"',
      '--exclude=".git"',
      '--exclude="dist"',
      '--exclude=".output"',
      '--exclude=".tanstack"',
      '--exclude="*.zip"',
      '--exclude="*.log"',
    ].join(" ");

    const cmd = `tar.exe -a -c -f "${destination}" ${excludePatterns} *`;
    execSync(cmd, { cwd: projectRoot, stdio: "pipe" });

    const stats = fs.statSync(destination);
    console.log(`✅ BACKUP CONCLUÍDO COM SUCESSO!`);
    console.log(`📦 Arquivo: ${fileName}`);
    console.log(`💾 Tamanho: ${formatBytes(stats.size)}`);
    console.log(`📍 Local:   ${destination}\n`);
    return destination;
  } catch (error) {
    console.error(`❌ Erro ao criar backup com tar:`, error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createBackup();
}
