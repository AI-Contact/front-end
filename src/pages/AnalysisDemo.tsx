import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './AnalysisDemo.module.css';
import { startAIAnalysis, stopAIAnalysis, getAIAnalysisStatus, getVideoFeedUrl } from '../api/aiService';
import type { AIAnalysisStatus } from '../api/aiService';

// 운동 이름 매핑 (한글 -> 영문)
const EXERCISE_NAME_MAP: Record<string, string> = {
    '푸시업 (Push Up)': 'push_up',
    '스쿼트 (Squat)': 'squat',
    '플랭크 (Plank)': 'plank',
    '런지 (Lunge)': 'lunge',
};

const AnalysisDemo = () => {
    const location = useLocation();
    const { mode: initialMode, exercise: exerciseData } = (location.state as { mode?: string; exercise?: any }) || {};

    const [exercise, setExercise] = useState(exerciseData?.title || '푸시업 (Push Up)');
    const [targetCount, setTargetCount] = useState(3);
    const [isRunning, setIsRunning] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // AI 분석 상태
    const [aiStatus, setAiStatus] = useState<AIAnalysisStatus>({
        status: 'idle',
        count: 0,
        current_state: '-',
        feedback: '운동을 시작하면 실시간 피드백이 표시됩니다.',
        score: 0,
    });

    // 비디오 스트림 URL
    const [videoFeedUrl, setVideoFeedUrl] = useState<string>('');

    // 폴링 인터벌 ref
    const pollingIntervalRef = useRef<number | null>(null);

    // mode: 'webcam' or 'upload'
    const isWebcamMode = initialMode === 'webcam';
    const isUploadMode = initialMode === 'upload';

    // 운동 시작 핸들러
    const handleStart = async () => {
        try {
            const exerciseNameEn = EXERCISE_NAME_MAP[exercise] || 'push_up';
            const mode = isWebcamMode ? 'realtime' : 'upload';

            await startAIAnalysis({
                mode,
                exercise: exerciseNameEn,
                target_count: targetCount,
                video_file: uploadedFile || undefined,
            });

            setIsRunning(true);
            setVideoFeedUrl(getVideoFeedUrl());

            // 상태 폴링 시작 (0.5초마다)
            startPolling();
        } catch (error) {
            console.error('AI 분석 시작 실패:', error);
            alert('운동 분석 시작에 실패했습니다.');
        }
    };

    // 운동 중지 핸들러
    const handleStop = async () => {
        try {
            await stopAIAnalysis();
            setIsRunning(false);
            setVideoFeedUrl('');

            // 폴링 중지
            stopPolling();
        } catch (error) {
            console.error('AI 분석 중지 실패:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0]);
            console.log('업로드된 파일:', e.target.files[0].name);
        }
    };

    // 상태 폴링 시작
    const startPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(async () => {
            try {
                const status = await getAIAnalysisStatus();
                setAiStatus(status);
            } catch (error) {
                console.error('AI 상태 조회 실패:', error);
            }
        }, 500); // 0.5초마다 폴링
    };

    // 상태 폴링 중지
    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // 컴포넌트 언마운트 시 폴링 중지
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* 설정 영역 - 가로 배치 */}
                <div className={styles.settingsSection}>
                    {/* 웹캠 모드: 목표 횟수만 표시 */}
                    {isWebcamMode && (
                        <>
                            <div className={styles.settingRow}>
                                <label className={styles.label}>운동</label>
                                <div className={styles.exerciseDisplay}>{exercise}</div>
                            </div>

                            <div className={styles.settingRow}>
                                <label className={styles.label}>목표 횟수</label>
                                <input
                                    type="number"
                                    className={styles.numberInput}
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(parseInt(e.target.value) || 0)}
                                    min="1"
                                    max="100"
                                />
                            </div>
                        </>
                    )}

                    {/* 업로드 모드: 파일 업로드 표시 */}
                    {isUploadMode && (
                        <>
                            <div className={styles.settingRow}>
                                <label className={styles.label}>운동</label>
                                <div className={styles.exerciseDisplay}>{exercise}</div>
                            </div>

                            <div className={styles.settingRow}>
                                <label className={styles.label}>영상 파일</label>
                                <input
                                    type="file"
                                    className={styles.fileInput}
                                    accept="video/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            
                        </>
                    )}

                    <div className={styles.buttonRow}>
                        <button
                            className={styles.startButton}
                            onClick={handleStart}
                            disabled={isRunning || (isUploadMode && !uploadedFile)}
                        >
                            시작
                        </button>
                        <button
                            className={styles.stopButton}
                            onClick={handleStop}
                            disabled={!isRunning}
                        >
                            중지
                        </button>
                    </div>
                </div>

                {/* Main Content - 카메라 & 정보 */}
                <div className={styles.mainContent}>
                    {/* Left - 카메라 */}
                    <div className={styles.leftPanel}>
                        <div className={styles.cameraSection}>
                            {videoFeedUrl ? (
                                <img
                                    src={videoFeedUrl}
                                    alt="AI Video Stream"
                                    className={styles.videoStream}
                                />
                            ) : (
                                <div className={styles.cameraPlaceholder}>
                                    <p>카메라 대기 중...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - 정보 */}
                    <div className={styles.rightPanel}>
                    {/* 현재 상태 */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>📊 현재 상태</h3>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>운동:</span>
                            <span className={styles.infoValue}>{exercise}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>상태:</span>
                            <span className={styles.infoValue}>{aiStatus.current_state || '-'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>카운트:</span>
                            <span className={styles.infoValue}>{aiStatus.count || 0} / {targetCount}</span>
                        </div>
                    </div>

                    {/* 피드백 */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>💬 피드백</h3>
                        <div className={styles.feedbackContent}>
                            <p>{aiStatus.feedback || '운동을 시작하면 실시간 피드백이 표시됩니다.'}</p>
                        </div>
                    </div>

                    {/* 점수 */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>📈 점수</h3>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>현재 횟수:</span>
                            <span className={styles.infoValue}>{aiStatus.count || 0}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>평균 점수:</span>
                            <span className={styles.infoValue}>
                                {aiStatus.score ? `${aiStatus.score}점` : '-'}
                            </span>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisDemo;
