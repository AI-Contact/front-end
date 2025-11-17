import { apiClient } from './config';

export type VideoResponse = {
    id: number;
    youtube_id: string;
    title: string;
    description?: string | null;
    thumbnail_url?: string | null;
    duration?: number | null;
    difficulty?: string | null;
};

export type GameScoreResponse = {
    id: number;
    user_id: number;
    video_id: number;
    total_score: number;
    accuracy_score?: number | null;
    timing_score?: number | null;
    played_at: string;
};

export async function getChallengeVideos(): Promise<VideoResponse[]> {
    const { data } = await apiClient.get<VideoResponse[]>('/api/games/videos');
    return data;
}

export async function getRankings(videoId: number, limit?: number): Promise<GameScoreResponse[]> {
    const { data } = await apiClient.get<GameScoreResponse[]>('/api/games/rankings', {
        params: { video_id: videoId, limit },
    });
    return data;
}

export type GameScoreCreate = {
    video_id: number;
    total_score: number;
    accuracy_score?: number | null;
    timing_score?: number | null;
};

export async function submitGameScore(payload: GameScoreCreate): Promise<GameScoreResponse> {
    const { data } = await apiClient.post<GameScoreResponse>('/api/games/submit-score', payload);
    return data;
}