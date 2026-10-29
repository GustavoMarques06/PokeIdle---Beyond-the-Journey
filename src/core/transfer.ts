// Código de transferência: o save comprimido (gzip) num texto curto, para levar o jogo a outro
// navegador ou computador sem servidor. Formato: `PKI1.<checksum>.<gzip em base64url>`.
// O checksum (FNV-1a do JSON) acusa códigos cortados ou alterados antes de substituir o jogo.

import type { GameState } from './game';
import { importSave, parseSave, serialize, type ParseResult } from './save';

export const TRANSFER_PREFIX = 'PKI1';
/** Extensão do arquivo baixado com o código. */
export const TRANSFER_EXTENSION = '.pkidle';

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  transform: ReadableWritablePair<Uint8Array, BufferSource>,
): Promise<Uint8Array> {
  const input = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = input.pipeThrough(transform).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

/** FNV-1a de 32 bits, em base 36. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export interface TransferCode {
  code: string;
  /** Tamanho do save sem compressão (bytes), para mostrar o ganho. */
  rawBytes: number;
}

/** Texto comprimido num código `<prefixo>.<checksum>.<gzip em base64url>` (save, troca, duelo). */
export async function packCode(prefix: string, json: string): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(json), new CompressionStream('gzip'));
  return `${prefix}.${checksum(json)}.${toBase64Url(packed)}`;
}

/** O inverso de `packCode`: o JSON de dentro, ou o motivo da recusa. */
export async function unpackCode(
  prefix: string,
  text: string,
): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const clean = text.replace(/\s+/g, '');
  if (!clean) return { ok: false, error: 'código vazio' };
  if (!clean.startsWith(`${prefix}.`)) return { ok: false, error: 'este não é um código deste tipo' };
  const [, sum, body] = clean.split('.');
  if (!sum || !body) return { ok: false, error: 'código incompleto' };
  let json: string;
  try {
    json = new TextDecoder().decode(await pipe(fromBase64Url(body), new DecompressionStream('gzip')));
  } catch {
    return { ok: false, error: 'código corrompido ou incompleto' };
  }
  if (checksum(json) !== sum) return { ok: false, error: 'código alterado ou incompleto' };
  return { ok: true, json };
}

export async function encodeTransferCode(state: GameState, now: number): Promise<TransferCode> {
  const json = serialize(state, now);
  return { code: await packCode(TRANSFER_PREFIX, json), rawBytes: new TextEncoder().encode(json).length };
}

/**
 * Lê um código de transferência. Também aceita o texto da exportação antiga (base64 do JSON)
 * e o JSON puro, para que saves exportados antes desta versão continuem valendo.
 */
export async function decodeTransferCode(text: string): Promise<ParseResult> {
  const clean = text.replace(/\s+/g, '');
  if (!clean) return { ok: false, error: 'código vazio' };
  if (!clean.startsWith(`${TRANSFER_PREFIX}.`)) {
    return clean.startsWith('{') ? parseSave(clean) : importSave(clean);
  }
  const out = await unpackCode(TRANSFER_PREFIX, clean);
  return out.ok ? parseSave(out.json) : out;
}

/** Nome do arquivo baixado: pokeidle-<treinador>-<data>.pkidle */
export function transferFileName(state: GameState, now: number): string {
  const name =
    state.trainerName
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toLowerCase() || 'save';
  const date = new Date(now).toISOString().slice(0, 10);
  return `pokeidle-${name}-${date}${TRANSFER_EXTENSION}`;
}
