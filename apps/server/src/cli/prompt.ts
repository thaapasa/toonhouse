import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

/** Ends the command after Ctrl-C, with the exit code of SIGINT. */
function cancel(): never {
  stdout.write('\n');
  process.exit(130);
}

/** Asks a question on the terminal and returns the trimmed answer. */
export async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  // Without a listener, readline rejects the question with an AbortError.
  rl.on('SIGINT', cancel);
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/**
 * Asks for a secret on the terminal and shows a star for each character. The
 * terminal is in raw mode while the user types, so this function handles
 * backspace, Enter, Ctrl-C and Ctrl-D itself. If the command fails or gets a
 * signal while the terminal is in raw mode, Node returns the terminal to its
 * normal mode when it exits.
 */
export function askSecret(question: string): Promise<string> {
  if (!stdin.isTTY) throw new Error('Typing a password needs a terminal');
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();
  let secret = '';

  return new Promise((resolve) => {
    const done = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: string) => {
      // A paste arrives as one chunk, so go through it a character at a time.
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          done();
          resolve(secret);
          return;
        }
        if (ch === '\u0003' || ch === '\u0004') {
          done();
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          if (secret) {
            secret = [...secret].slice(0, -1).join('');
            stdout.write('\b \b');
          }
        } else if (ch >= ' ') {
          secret += ch;
          stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });
}
