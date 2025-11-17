import { apiClient } from './config';

export type MeResponse = {
    email: string;
    username: string;
    full_name: string;
    age: number;
    height: number;
    weight: number;
    id: number;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    last_login: string;

}

export async function getMe(): Promise<MeResponse> {
    const response = await apiClient.get<MeResponse>('/api/users/me');
    return response.data;
}

export async function deleteMe() {
    const response = await apiClient.delete('/api/users/me');
    return response;
}