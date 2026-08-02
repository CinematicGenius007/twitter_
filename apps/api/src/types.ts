export interface AuthedUser {
  id: number;
  handle: string;
}

export type AppEnv = {
  Variables: {
    user?: AuthedUser;
  };
};
