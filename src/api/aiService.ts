import axios from 'axios';

/**
 * AI 서버 전용 Axios 인스턴스
 * /ai-api 프록시를 통해 AI 서버(포트 5000)와 통신
 */
const aiClient = axios.create({
    baseURL: '',
    timeout: 30000, // AI 처리 시간을 고려하여 30초로 설정
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * AI 운동 분석 상태 인터페이스
 */
export interface AIAnalysisStatus {
    status: 'running' | 'stopped' | 'idle';
    exercise?: string;
    count?: number;
    current_state?: string;
    feedback?: string;
    score?: number;
    [key: string]: any; // AI 서버에서 추가 데이터가 올 수 있음
}

/**
 * AI 운동 분석 시작 요청 파라미터
 */
export interface StartAnalysisParams {
    mode: string; // 'realtime' 또는 'upload'
    exercise: string; // 'push_up', 'squat', 'plank', 'lunge' 등
    target_count?: number; // 목표 횟수
    video_file?: File; // 업로드 모드일 때 비디오 파일
}

/**
 * AI 운동 분석 시작
 * @param params - 분석 시작 파라미터
 */
export const startAIAnalysis = async (params: StartAnalysisParams) => {
    // 업로드 모드일 경우 FormData 사용
    if (params.mode === 'upload' && params.video_file) {
        const formData = new FormData();
        formData.append('mode', params.mode);
        formData.append('exercise', params.exercise);
        if (params.target_count) {
            formData.append('target_count', params.target_count.toString());
        }
        formData.append('video', params.video_file);

        const response = await aiClient.post('/ai-api/start', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    // 웹캠 모드일 경우 JSON 사용
    const response = await aiClient.post('/ai-api/start', {
        mode: params.mode,
        exercise: params.exercise,
        target_count: params.target_count,
    });
    return response.data;
};

/**
 * AI 운동 분석 중지
 */
export const stopAIAnalysis = async () => {
    const response = await aiClient.post('/ai-api/stop');
    return response.data;
};

/**
 * AI 운동 분석 상태 조회
 * @returns AIAnalysisStatus - 현재 분석 상태 정보
 */
export const getAIAnalysisStatus = async (): Promise<AIAnalysisStatus> => {
    const response = await aiClient.get('/ai-api/status');
    return response.data;
};

/**
 * AI 비디오 스트림 URL 가져오기
 * @returns 비디오 스트림 URL
 */
export const getVideoFeedUrl = (): string => {
    // 캐시 방지를 위해 타임스탬프 추가
    return `/video_feed?t=${Date.now()}`;
};
