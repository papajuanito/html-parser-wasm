export enum TokenType {
  Invalid,
  DOCTYPE,
  StartTag,
  EndTag,
  Comment,
  Character,
  EndOfFile,
}

export class Token {
  tokenType: TokenType = TokenType.Invalid;

  constructor(tokenType: TokenType = TokenType.Invalid) {
    this.tokenType = tokenType;
  }

  isValid(): boolean {
    return this.tokenType != TokenType.Invalid;
  }

  toString(): string {
    return 'Token Type is not implemented';
  }
}

@unmanaged
class MissingAttribute {
  missing: boolean = true;
  value: string = '';
}

export class DOCTYPEToken extends Token {
  name: MissingAttribute = new MissingAttribute();
  publicIdentifier: MissingAttribute = new MissingAttribute();
  systemIdentifier: MissingAttribute = new MissingAttribute();
  forceQuirks: boolean = false;

  constructor() {
    super(TokenType.DOCTYPE);
  }

  appendToName(character: string): void {
    this.name.value += character;
  }

  toString(): string {
    return 'DOCTYPE Token Type with Name: ' + this.name.value;
  }
}

@unmanaged
export class TagAttribute {
  name: string = '';
  value: string = '';

  toString(): string {
    return 'Name: ' + this.name + ' | Value: ' + this.value;
  }
}

// StartTag and EndTag Token
export class TagToken extends Token {
  tagName: string = '';
  selfClosingAcknowledged: boolean = false;
  // FIXME: When a tag is created this has to be unset.
  selfClosing: boolean = false;
  public attributes: TagAttribute[] = [];

  appendToTagName(character: string): void {
    this.tagName += character;
  }

  addAttribute(attribute: TagAttribute): void {
    this.attributes.push(attribute);
  }

  toString(): string {
    return (
      'TagName: ' +
      this.tagName +
      ' | Attributes: ' +
      this.attributes.toString()
    );
  }
}

export class StartTagToken extends TagToken {
  constructor() {
    super(TokenType.StartTag);
  }

  toString(): string {
    return (
      'StartTagToken: ' +
      this.tagName +
      ' with attributes: ' +
      this.attributes.toString()
    );
  }
}

export class EndTagToken extends TagToken {
  constructor() {
    super(TokenType.EndTag);
  }
  toString(): string {
    return 'EndTagToken with tagName: ' + this.tagName;
  }
}

export class CommentOrCharacterToken extends Token {
  data: string = '';

  appendToData(character: string): void {
    this.data += character;
  }
}

export class CharacterToken extends CommentOrCharacterToken {
  constructor() {
    super(TokenType.Character);
  }

  toString(): string {
    return 'Character Token with Data: ' + this.data;
  }
}
