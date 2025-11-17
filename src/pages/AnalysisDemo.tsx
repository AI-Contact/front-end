import { useState } from 'react';
import styles from './AnalysisDemo.module.css';

const AnalysisDemo = () => {
    const [mode, setMode] = useState('실시간 (웹캠)');
    const [exercise, setExercise] = useState('푸시업 (Push Up)');
    const [targetCount, setTargetCount] = useState(3);
    const [isRunning, setIsRunning] = useState(false);

    const handleStart = () => {
        setIsRunning(true);
        console.log('운동 시작:', { mode, exercise, targetCount });
        // TODO: MediaPipe 분석 시작
    };

    const handleStop = () => {
        setIsRunning(false);
        console.log('운동 중지');
        // TODO: MediaPipe 분석 중지
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* 설정 영역 - 가로 배치 */}
                <div className={styles.settingsSection}>
                    {/* <p className={styles.subtitle}>실시간 자세 분석 및 피드백 시스템</p> */}

                    <div className={styles.settingRow}>
                        <label className={styles.label}>모드 선택</label>
                        <select
                            className={styles.select}
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                        >
                            <option>실시간 (웹캠)</option>
                            <option>영상 업로드</option>
                        </select>
                    </div>

                    <div className={styles.settingRow}>
                        <label className={styles.label}>운동 선택</label>
                        <select
                            className={styles.select}
                            value={exercise}
                            onChange={(e) => setExercise(e.target.value)}
                        >
                            <option>푸시업 (Push Up)</option>
                            <option>스쿼트 (Squat)</option>
                            <option>플랭크 (Plank)</option>
                            <option>런지 (Lunge)</option>
                        </select>
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

                    <div className={styles.buttonRow}>
                        <button
                            className={styles.startButton}
                            onClick={handleStart}
                            disabled={isRunning}
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
                            <div className={styles.cameraPlaceholder}>
                                <p>카메라 대기 중...</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - 정보 */}
                    <div className={styles.rightPanel}>
                    {/* 현재 상태 */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>📊 현재 상태</h3>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>운동:</span>
                            <span className={styles.infoValue}>-</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>상태:</span>
                            <span className={styles.infoValue}>-</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>카운트:</span>
                            <span className={styles.infoValue}>-</span>
                        </div>
                    </div>

                    {/* 피드백 */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>💬 피드백</h3>
                        <div className={styles.feedbackContent}>
                            <p>운동을 시작하면 실시간 피드백이 표시됩니다.</p>
                        </div>
                    </div>

                    {/* 점수 */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>📈 점수</h3>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>총 횟수:</span>
                            <span className={styles.infoValue}>0</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>평균 점수:</span>
                            <span className={styles.infoValue}>-</span>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default AnalysisDemo;
