import axios from 'axios';

/**
 * AI 서버 전용 Axios 인스턴스
 * vite.config.ts의 프록시 설정에 따라 /ai-api 요청은 AI 서버(5000번 포트)로 전달됨
 */
const aiClient = axios.create({
    baseURL: '', // 프록시 사용하므로 빈 문자열
    timeout: 30000,
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
    [key: string]: any;
}

/**
 * AI 운동 분석 시작 요청 파라미터
 */
export interface StartAnalysisParams {
    mode: 'realtime' | 'upload'; // 프론트엔드에서 사용하는 모드 명칭
    exercise: string;
    target_count?: number;
    video_file?: File;
}

/**
 * AI 운동 분석 시작
 */
export const startAIAnalysis = async (params: StartAnalysisParams) => {
    let videoPath = null;

    // 1. 영상 업로드 모드일 경우: 먼저 파일을 업로드하여 경로를 받아옴
    if (params.mode === 'upload' && params.video_file) {
        const formData = new FormData();
        formData.append('video', params.video_file);

        try {
            // FastAPI 엔드포인트: /api/exercises/pose-analysis/upload
            const uploadRes = await aiClient.post<string>('/api/exercises/pose-analysis/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // 백엔드는 파일 경로를 문자열로 반환
            videoPath = uploadRes.data;
        } catch (error) {
            console.error('비디오 업로드 중 오류:', error);
            throw error;
        }
    }

    // 2. 분석 시작 요청 (JSON 전송)
    // 백엔드 FastAPI는 mode로 'realtime' 또는 'video'를 기대함
    const payload = {
        exercise: params.exercise,
        mode: params.mode === 'upload' ? 'video' : 'realtime', // 모드 이름 변환
        target_reps: params.target_count || 10, // 백엔드 파라미터명: target_reps
        video_path: videoPath || '', // null 대신 빈 문자열
        camera_id: 0,
        target_time: params.exercise === 'plank' ? params.target_count : 0 // null 대신 0
    };

    // FastAPI 엔드포인트: /api/exercises/pose-analysis/start
    const response = await aiClient.post('/api/exercises/pose-analysis/start', payload);
    return response.data;
};

/**
 * AI 운동 분석 중지
 */
export const stopAIAnalysis = async () => {
    // FastAPI 엔드포인트: /api/exercises/pose-analysis/stop
    const response = await aiClient.post('/api/exercises/pose-analysis/stop');
    return response.data;
};

/**
 * AI 운동 분석 상태 조회
 */
export const getAIAnalysisStatus = async (): Promise<AIAnalysisStatus> => {
    // FastAPI 엔드포인트: /api/exercises/pose-analysis/status
    const response = await aiClient.get('/api/exercises/pose-analysis/status');
    const data = response.data;

    // 백엔드 응답 데이터를 프론트엔드 인터페이스에 맞게 매핑
    return {
        status: data.is_running ? 'running' : 'idle',
        count: data.rep_count || data.counters?.reps || 0,
        current_state: data.state || '-',
        feedback: data.feedback_ko || '운동을 시작하면 실시간 피드백이 표시됩니다.',
        score: data.total_score ? Math.round(data.total_score * 100) : 0,
        // 필요시 추가 데이터 매핑
        ...data
    };
};

/**
 * AI 비디오 스트림 URL 가져오기
 */
export const getVideoFeedUrl = (): string => {
    // FastAPI 엔드포인트: /api/exercises/pose-analysis/video-feed
    // 캐시 방지를 위해 타임스탬프 추가
    return `/api/exercises/pose-analysis/video-feed?t=${Date.now()}`;
};
