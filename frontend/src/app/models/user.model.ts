export interface UserModel {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
}
