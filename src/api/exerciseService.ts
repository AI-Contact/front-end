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

/**
 * 운동 시작 기록
 * @param exerciseId - 운동 ID
 * @param duration - 운동 시간 (분)
 * @param repetitions - 반복 횟수
 * @param setsCompleted - 완료한 세트 수
 */
export const startExercise = async (params: {
    exercise_id: number;
    duration: number;
    repetitions: number;
    sets_completed: number;
}) => {
    const response = await apiClient.post('/api/exercises/record/start', {
        ...params,
        started_at: new Date().toISOString(),
    });
    return response.data;
};

/**
 * 운동 완료 및 평가 기록
 * @param recordId - 운동 기록 ID
 * @param accuracyScore - 정확도 점수 (0-100)
 * @param formScore - 자세 점수 (0-100)
 * @param tempoScore - 템포 점수 (0-100)
 * @param feedbackData - 피드백 데이터
 * @param poseAnalysis - 자세 분석 데이터
 * @param caloriesBurned - 소모 칼로리
 */
export const completeExercise = async (
    recordId: number,
    params: {
        accuracy_score: number;
        form_score: number;
        tempo_score: number;
        feedback_data?: any;
        pose_analysis?: any;
        calories_burned: number;
    }
) => {
    const response = await apiClient.put(`/api/exercises/record/${recordId}/complete`, {
        ...params,
        completed_at: new Date().toISOString(),
    });
    return response.data;
};

/**
 * 내 운동 기록 조회
 * @param exerciseId - 운동 ID (선택)
 * @param skip - 건너뛸 개수 (페이지네이션)
 * @param limit - 가져올 개수 (기본값: 20)
 */
export const getMyRecords = async (params?: {
    exercise_id?: number;
    skip?: number;
    limit?: number;
}) => {
    const response = await apiClient.get('/api/exercises/records/my', { params });
    return response.data;
};

/**
 * 내 운동 통계 조회
 * @param exerciseId - 운동 ID (선택)
 */
export const getMyStats = async (params?: {
    exercise_id?: number;
}) => {
    const response = await apiClient.get('/api/exercises/stats/my', { params });
    return response.data;
};
