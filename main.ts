/**
 * main.ts — One Sentence for a Traveler from 1800
 *
 * Competition: u-po-pu-one-sentence-for-a-traveler-from-1800-7e6162fb
 * Harness: program/v1 (Node 22, standard library only, no network).
 *
 * The program writes exactly one sentence to /output/entry.txt. The
 * sentence explains the modern internet to a person who has just
 * stepped out of the year 1800, using only things that person already
 * knows: a road, a post office, a library, a letter, ink.
 *
 * One comparison carries the whole sentence: the internet as a road
 * of light. The comparison stays true of the internet as it is now,
 * because the messages really do travel as light along glass threads
 * under the sea and under the streets, and a letter really does arrive
 * before its ink would have dried on the road.
 *
 * Comparisons weighed and set aside while drafting:
 * - a library where every book answers back: vivid, but a library
 *   that talks back reads as magic, not as a road the traveler knows.
 * - a market square where every stallholder shouts at once: true of
 *   the noise, wrong about the quiet one-to-one letter at its heart.
 * - a post office that never sleeps: honest, but flat; it names the
 *   speed and keeps none of the wonder.
 * The road of light won because it holds the journey, the speed, and
 * the destination in a single image the traveler can picture.
 *
 * The program never prints the sentence itself. It prints only the
 * character count, the sha256 of the written bytes, and the path it
 * wrote. Two runs write byte-identical output: no clock reads, no
 * randomness, no network, no environment-dependent branching.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------------
// Gate limits, from the competition rules: entry.txt holds UTF-8 text of
// 1 to 200 characters, not only white space. A single sentence, one line.
// ---------------------------------------------------------------------------

const GATE_MIN_CHARS = 1;
const GATE_MAX_CHARS = 200;
const ENTRY_FILE_NAME = "entry.txt";
const DEFAULT_OUTPUT_DIR = "/output";

// ---------------------------------------------------------------------------
// The sentence, built from three named phrases. Each phrase carries one
// job: name the subject, carry the comparison, land the consequence.
// ---------------------------------------------------------------------------

const SUBJECT_PHRASE =
  "The internet";
const CARRIER_PHRASE =
  "is a road of light joining every post office and library on earth";
const CONSEQUENCE_PHRASE =
  "so a letter written in London is read in Boston before its ink dries";

// ---------------------------------------------------------------------------
// Vocabulary guards. Words coined after the traveler's time must stay out
// of the sentence, and every load-bearing noun must be one a person from
// 1800 already knows. The rule table below enforces both lists.
// ---------------------------------------------------------------------------

const FORBIDDEN_MODERN_WORDS: ReadonlyArray<string> = [
  "computer",
  "website",
  "screen",
  "email",
  "server",
  "cloud",
  "digital",
  "online",
  "smartphone",
  "app",
  "wifi",
  "browser",
  "software",
  "download",
];

const ERA_KNOWN_NOUNS: ReadonlyArray<string> = [
  "road",
  "light",
  "post office",
  "library",
  "letter",
  "ink",
  "London",
  "Boston",
  "earth",
];

// ---------------------------------------------------------------------------
// Small text helpers. Each one does a single job and names its result.
// ---------------------------------------------------------------------------

function countChars(text: string): number {
  const codePoints = [...text];
  return codePoints.length;
}

function countOccurrences(haystack: string, needle: string): number {
  const pieces = haystack.split(needle);
  return pieces.length - 1;
}

function sentenceWords(sentence: string): Array<string> {
  const lowered = sentence.toLowerCase();
  const cleaned = lowered.replace(/[^a-z ]/g, " ");
  const pieces = cleaned.split(" ");
  const found: Array<string> = [];
  for (const piece of pieces) {
    if (piece.length > 0) {
      found.push(piece);
    }
  }
  return found;
}

function sha256Hex(bytes: Buffer): string {
  const digest = createHash("sha256");
  digest.update(bytes);
  return digest.digest("hex");
}

// ---------------------------------------------------------------------------
// Assembly. The three phrases join with a comma between the carrier and
// the consequence, and one full stop closes the sentence.
// ---------------------------------------------------------------------------

function buildSentence(): string {
  const opening = `${SUBJECT_PHRASE} ${CARRIER_PHRASE}`;
  const joined = `${opening}, ${CONSEQUENCE_PHRASE}.`;
  return joined;
}

// ---------------------------------------------------------------------------
// Validation, as a rule table. Each rule names itself and returns either
// a problem string or an empty marker. The runner gathers every problem
// so one run reports all failures at once.
// ---------------------------------------------------------------------------

type SentenceRule = {
  name: string;
  check: (trimmed: string) => string;
};

const NO_PROBLEM = "";

function ruleNotEmpty(trimmed: string): string {
  if (trimmed.length === 0) {
    return "sentence is empty or only white space";
  }
  return NO_PROBLEM;
}

function ruleCharRange(trimmed: string): string {
  const charCount = countChars(trimmed);
  if (charCount < GATE_MIN_CHARS) {
    return `sentence has ${charCount} characters, below the minimum of ${GATE_MIN_CHARS}`;
  }
  if (charCount > GATE_MAX_CHARS) {
    return `sentence has ${charCount} characters, above the limit of ${GATE_MAX_CHARS}`;
  }
  return NO_PROBLEM;
}

function ruleOneFullStop(trimmed: string): string {
  const stopCount = countOccurrences(trimmed, ".");
  if (stopCount !== 1) {
    return `sentence holds ${stopCount} full stops, expected exactly 1`;
  }
  if (trimmed.endsWith(".") === false) {
    return "sentence does not end with a full stop";
  }
  return NO_PROBLEM;
}

function ruleNoBrokenMarks(trimmed: string): string {
  const brokenMarks: ReadonlyArray<string> = ["?", "!", ";", ":", "\n", "\t", "\r"];
  for (const mark of brokenMarks) {
    if (trimmed.includes(mark)) {
      return `sentence holds a forbidden mark: ${JSON.stringify(mark)}`;
    }
  }
  if (trimmed.includes("  ")) {
    return "sentence holds a doubled space";
  }
  return NO_PROBLEM;
}

function ruleOpensCapital(trimmed: string): string {
  const firstChar = trimmed.charAt(0);
  if (firstChar.length > 0 && firstChar !== firstChar.toUpperCase()) {
    return "sentence does not open with a capital letter";
  }
  return NO_PROBLEM;
}

function ruleNoModernWords(trimmed: string): string {
  const wordSet = new Set(sentenceWords(trimmed));
  for (const forbidden of FORBIDDEN_MODERN_WORDS) {
    if (wordSet.has(forbidden)) {
      return `sentence uses a modern word: ${forbidden}`;
    }
  }
  return NO_PROBLEM;
}

function ruleEraNounsPresent(trimmed: string): string {
  const lowered = trimmed.toLowerCase();
  for (const noun of ERA_KNOWN_NOUNS) {
    if (lowered.includes(noun.toLowerCase()) === false) {
      return `sentence is missing an era-known noun: ${noun}`;
    }
  }
  return NO_PROBLEM;
}

const SENTENCE_RULES: ReadonlyArray<SentenceRule> = [
  { name: "not-empty", check: ruleNotEmpty },
  { name: "char-range", check: ruleCharRange },
  { name: "one-full-stop", check: ruleOneFullStop },
  { name: "no-broken-marks", check: ruleNoBrokenMarks },
  { name: "opens-capital", check: ruleOpensCapital },
  { name: "no-modern-words", check: ruleNoModernWords },
  { name: "era-nouns-present", check: ruleEraNounsPresent },
];

function validateSentence(sentence: string, problems: Array<string>): Array<string> {
  const trimmed = sentence.trim();
  if (trimmed !== sentence) {
    problems.push("sentence carries leading or trailing white space");
  }
  for (const rule of SENTENCE_RULES) {
    const problem = rule.check(trimmed);
    if (problem !== NO_PROBLEM) {
      problems.push(`${rule.name}: ${problem}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Output. The entry file holds exactly the sentence bytes, with no
// trailing newline, so the gate counts precisely the sentence. The write
// is read back and compared byte for byte before the run reports success.
// ---------------------------------------------------------------------------

function resolveOutputDir(): string {
  const override = process.env.OUTPUT_DIR;
  if (override !== undefined && override.length > 0) {
    return override;
  }
  return DEFAULT_OUTPUT_DIR;
}

function writeEntryFile(targetPath: string, sentence: string): string {
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true });
  const payload = Buffer.from(sentence, "utf8");
  writeFileSync(targetPath, payload);
  const written = readFileSync(targetPath);
  const identical = written.equals(payload);
  if (identical === false) {
    throw new Error("read-back of the entry file differs from the sentence bytes");
  }
  return sha256Hex(payload);
}

// ---------------------------------------------------------------------------
// Entry point. Validate first, write second, report counts only.
// ---------------------------------------------------------------------------

function main(): number {
  const sentence = buildSentence();
  const problems: Array<string> = [];
  validateSentence(sentence, problems);
  if (problems.length > 0) {
    for (const problem of problems) {
      process.stderr.write(`problem: ${problem}\n`);
    }
    return 1;
  }
  const outputDir = resolveOutputDir();
  const targetPath = join(outputDir, ENTRY_FILE_NAME);
  const digest = writeEntryFile(targetPath, sentence);
  process.stdout.write(`chars: ${countChars(sentence)}\n`);
  process.stdout.write(`sha256: ${digest}\n`);
  process.stdout.write(`wrote: ${targetPath}\n`);
  return 0;
}

process.exitCode = main();
