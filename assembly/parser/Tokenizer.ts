import {
  CharacterToken,
  DOCTYPEToken,
  EndTagToken,
  StartTagToken,
  TagToken,
  Token,
  TagAttribute,
} from './Token';

enum TokenizerState {
  Data,
  TagOpen,
  MarkupDeclarationOpen,
  DOCTYPE,
  BeforeDOCTYPEName,
  DOCTYPEName,
  AfterDOCTYPEName,
  TagName,
  EndTagOpen,
  BeforeAttributeName,
  AttributeName,
  AfterAttributeName,
  BeforeAttributeValue,
  AttributeValueDoubleQuoted,
  AfterAttributeValueQuoted,
  SelfClosingStartTag,
}

export class Tokenizer {
  state: TokenizerState = TokenizerState.Data;
  // HTML that we want to tokenize
  input: string;
  currentPosition: i32 = 0;
  currentToken: Token = new Token();
  emitToken: boolean = false;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Returns the next Token
   * @return {Token} - The next token
   */
  next(): Token {
    if (this.emitToken) {
      this.emitToken = false;
      const token = this.currentToken;
      this.currentToken = new Token();
      return token;
    }

    const currentInputCharacter: string = this.nextInputCharacter();

    // FIXME: We need a better way to know when we're done tokenizing;
    if (this.currentPosition > this.input.length) {
      return this.currentToken;
    }

    //trace(
    //  'CURRENT CHARACTER AND POSITION: ' + currentInputCharacter,
    //  2,
    //  this.currentPosition,
    //);

    switch (this.state) {
      case TokenizerState.Data: {
        if (currentInputCharacter == '<') {
          return this.switchToState(TokenizerState.TagOpen);
        }

        return this.emitCurrentCharacter(currentInputCharacter);
      }

      case TokenizerState.TagOpen: {
        if (currentInputCharacter == '!') {
          return this.switchToState(TokenizerState.MarkupDeclarationOpen);
        }

        if (currentInputCharacter == '/') {
          return this.switchToState(TokenizerState.EndTagOpen);
        }

        if (this.isCharacterASCIIAlpha(currentInputCharacter)) {
          this.currentToken = new StartTagToken();
          return this.switchToStateAndReconsumeCurrentInputCharacter(
            TokenizerState.TagName,
          );
        }
      }
      case TokenizerState.MarkupDeclarationOpen: {
        if (this.matchNextCharacters('DOCTYPE')) {
          this.consumeCharacters('DOCTYPE');
          return this.switchToState(TokenizerState.DOCTYPE);
        }
      }
      case TokenizerState.DOCTYPE: {
        if (this.isCharacterWhiteSpace(currentInputCharacter)) {
          return this.switchToState(TokenizerState.BeforeDOCTYPEName);
        }
      }
      case TokenizerState.BeforeDOCTYPEName: {
        this.currentToken = new DOCTYPEToken();
        (this.currentToken as DOCTYPEToken).appendToName(currentInputCharacter);
        return this.switchToState(TokenizerState.DOCTYPEName);
      }
      case TokenizerState.DOCTYPEName: {
        if (this.isCharacterWhiteSpace(currentInputCharacter)) {
          return this.switchToState(TokenizerState.AfterDOCTYPEName);
        }

        if (currentInputCharacter == '>') {
          return this.switchToStateAndEmitCurrentToken(TokenizerState.Data);
        }

        (this.currentToken as DOCTYPEToken).appendToName(currentInputCharacter);
        return this.next();
      }
      case TokenizerState.TagName: {
        if (this.isCharacterWhiteSpace(currentInputCharacter)) {
          return this.switchToState(TokenizerState.BeforeAttributeName);
        }

        if (currentInputCharacter == '>') {
          return this.switchToStateAndEmitCurrentToken(TokenizerState.Data);
        }

        (this.currentToken as TagToken).appendToTagName(currentInputCharacter);
        return this.next();
      }
      case TokenizerState.EndTagOpen: {
        if (this.isCharacterASCIIAlpha(currentInputCharacter)) {
          this.currentToken = new EndTagToken();
          return this.switchToStateAndReconsumeCurrentInputCharacter(
            TokenizerState.TagName,
          );
        }
      }

      case TokenizerState.BeforeAttributeName: {
        if (this.isCharacterWhiteSpace(currentInputCharacter)) {
          return this.next();
        }

        (this.currentToken as TagToken).attributes.push(new TagAttribute());
        return this.switchToStateAndReconsumeCurrentInputCharacter(
          TokenizerState.AttributeName,
        );
      }
      case TokenizerState.AttributeName: {
        if (
          this.isCharacterWhiteSpace(currentInputCharacter) ||
          currentInputCharacter == '/' ||
          currentInputCharacter == '>'
        ) {
          return this.switchToStateAndReconsumeCurrentInputCharacter(
            TokenizerState.AfterAttributeName,
          );
        }

        if (currentInputCharacter == '=') {
          return this.switchToState(TokenizerState.BeforeAttributeValue);
        }

        (this.currentToken as TagToken).attributes[
          (this.currentToken as TagToken).attributes.length - 1
        ].name += currentInputCharacter;
        return this.next();
      }
      case TokenizerState.BeforeAttributeValue: {
        if (this.isCharacterWhiteSpace(currentInputCharacter)) {
          return this.next();
        }

        if (currentInputCharacter == '"') {
          return this.switchToState(TokenizerState.AttributeValueDoubleQuoted);
        }
      }
      case TokenizerState.AttributeValueDoubleQuoted: {
        if (currentInputCharacter == '"') {
          return this.switchToState(TokenizerState.AfterAttributeValueQuoted);
        }

        (this.currentToken as TagToken).attributes[
          (this.currentToken as TagToken).attributes.length - 1
        ].value += currentInputCharacter;

        return this.next();
      }
      case TokenizerState.AfterAttributeValueQuoted: {
        if (this.isCharacterWhiteSpace(currentInputCharacter)) {
          return this.switchToState(TokenizerState.BeforeAttributeName);
        }

        if (currentInputCharacter == '/') {
          return this.switchToState(TokenizerState.SelfClosingStartTag);
        }

        if (currentInputCharacter == '>') {
          return this.switchToStateAndEmitCurrentToken(TokenizerState.Data);
        }
      }
      default: {
        return this.next();
      }
    }
  }

  matchNextCharacters(substring: string): boolean {
    for (let i = 0; i < substring.length; i++) {
      const codepoint = this.peekInputCharacter(i);
      if (codepoint != substring.charAt(i)) {
        return false;
      }
    }

    return true;
  }

  nextInputCharacter(): string {
    this.currentPosition++;
    return this.input.charAt(this.currentPosition);
  }

  peekInputCharacter(offset: i32): string {
    return this.input.charAt(this.currentPosition + offset);
  }

  consumeCharacters(substring: string): void {
    if (!this.matchNextCharacters(substring)) {
      return;
    }

    this.currentPosition += substring.length;
  }

  isCharacterWhiteSpace(ch: string): bool {
    return ['\t', '\n', '\f', ' '].includes(ch);
  }

  dontConsumeInputCharacter(): void {
    this.currentPosition--;
  }

  switchToState(state: TokenizerState): Token {
    this.state = state;
    return this.next();
  }

  switchToStateAndReconsumeCurrentInputCharacter(state: TokenizerState): Token {
    this.currentPosition--;
    return this.switchToState(state);
  }

  switchToStateAndEmitCurrentToken(state: TokenizerState): Token {
    this.emitToken = true;
    return this.switchToState(state);
  }

  emitCurrentCharacter(character: string): Token {
    const characterToken = new CharacterToken();
    characterToken.appendToData(character);
    this.currentToken = characterToken;
    return this.switchToStateAndEmitCurrentToken(this.state);
  }

  stateToString(): string {
    if (this.state === TokenizerState.Data) {
      return 'Data State';
    }

    if (this.state === TokenizerState.MarkupDeclarationOpen) {
      return 'MarkupDeclarationOpen State';
    }
    return 'State not implemented';
  }

  isCharacterUpperAlpha(ch: string): boolean {
    const charCode = ch.charCodeAt(0);
    return charCode > 64 && charCode < 91;
  }

  isCharacterLowerAlpha(ch: string): boolean {
    const charCode = ch.charCodeAt(0);
    return charCode > 96 && charCode < 123;
  }

  isCharacterASCIIAlpha(ch: string): boolean {
    return this.isCharacterLowerAlpha(ch) || this.isCharacterUpperAlpha(ch);
  }
}
