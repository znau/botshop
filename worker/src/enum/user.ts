
export enum sourceEnum {
  TELEGRAM = 'telegram',
  GOOGLE = 'google',
  EMAIL = 'email',
  ACCOUNT = 'account',
}


export const userNamePrefixEnum = {
  [sourceEnum.TELEGRAM]: 'tel@',
  [sourceEnum.GOOGLE]: 'go@',
}