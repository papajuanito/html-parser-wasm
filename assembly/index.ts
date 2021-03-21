// The entry file of your WebAssembly module.

import { Tokenizer } from './parser/Tokenizer';

export function test(html: string): string {
  const tokenizer = new Tokenizer(html);

  let token = tokenizer.next();

  while (token.isValid()) {
    trace('TOKEN: ' + token.toString());
    token = tokenizer.next();
  }

  return token.toString();
}
