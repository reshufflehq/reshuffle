export interface Email {
  value: string;
  type?: string;
}

export interface Profile {
  provider: string;
  id: string;
  displayName: string;
  emails?: Email[];
  picture?: string;
}
