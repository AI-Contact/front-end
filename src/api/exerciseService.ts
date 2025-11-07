import { apiClient } from './config';

/**
 * 운동 목록 조회
 * @param category - 운동 카테고리 (upper_body, lower_body 등)
 * @param difficulty - 난이도 (beginner, intermediate, advanced)
 * @param skip - 건너뛸 개수 (페이지네이션)
 * @param limit - 가져올 개수 (기본값: 20)
 */
export const getExercises = async (params?: {
    category?: string;
    difficulty?: string;
    skip?: number;
    limit?: number;
}) => {
    const response = await apiClient.get('/api/exercises/', { params });
    return response.data;
};

/**
 * 특정 운동 상세 정보 조회
 * @param exerciseId - 운동 ID
 */
export const getExerciseById = async (exerciseId: number) => {
    const response = await apiClient.get(`/api/exercises/${exerciseId}`);
    return response.data;
};
