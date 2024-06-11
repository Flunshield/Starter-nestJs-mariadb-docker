export interface User {
  id?: number;
  userName: string;
  email?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  lastLogin?: Date;
  status?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  groupsId?: number;
  group?: Groups;
  languagePreference?: string;
}

export interface Groups {
  id: number;
  name: string;
  roles: string;
}

export interface DecodedTokenController {
  sub: number;
  aud: {
    data: {
      id?: number;
      userName: string;
      email: string;
      emailVerified?: boolean;
      createdAt?: Date;
      lastLogin?: Date;
      status?: string;
      avatar?: string;
      firstName?: string;
      lastName?: string;
      groupsId?: number;
      languagePreference?: string;
      groups?: Groups;
    };
  };
  iat: number;
  exp: number;
}

export interface shortUser {
  userName: string;
  password?: string;
  email?: string;
  id?: number;
  firstName?: string;
  lastName?: string;
  groupsId?: number;
}

export interface DecodedTokenMail {
  id?: number;
  userName: string;
  iat: number;
  exp: number;
}

export interface UserMail {
  id?: number;
  userName?: string;
  password?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  groupsId?: number;
}
