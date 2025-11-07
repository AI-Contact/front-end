import { apiClient } from './config';

// API spec types (lightweight local typings based on provided OpenAPI)
export type UserRegisterRequest = {
    email: string;
    username: string; // min 3, max 50
    full_name?: string | null;
    age?: number | null;
    height?: number | null;
    weight?: number | null;
    password: string; // min 4
    password_confirm: string;
};

export type UserResponse = {
    id: number;
    email: string;
    username: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at: string | null;
    last_login: string | null;
    full_name?: string | null;
    age?: number | null;
    height?: number | null;
    weight?: number | null;
};

export type LoginResponse = {
    access_token: string;
    token_type: 'bearer';
    refresh_token: string | null;
    user: UserResponse;
};

export async function registerUser(payload: UserRegisterRequest): Promise<UserResponse> {
    const { data } = await apiClient.post<UserResponse>('/api/auth/register', payload);
    return data;
}

export async function loginUser(params: { username: string; password: string }): Promise<LoginResponse> {
    // The spec expects application/x-www-form-urlencoded with fields: username, password
    const form = new URLSearchParams();
    form.set('username', params.username);
    form.set('password', params.password);

    const { data } = await apiClient.post<LoginResponse>('/api/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
}