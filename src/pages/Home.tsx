import styles from './Home.module.css';
import { IoSparkles } from 'react-icons/io5';
import { IoMdTrendingUp } from 'react-icons/io';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { getExercises, getMyRecords } from '../api/exerciseService';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const progressRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState<any[]>([]);

    // 기록운동 페이지로 이동
    const handleStartWorkout = () => {
        navigate('/workout');
    };

    // 진행상황 섹션으로 스크롤
    const handleViewProgress = () => {
        progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // 운동 데이터 가져오기
    useEffect(() => {
        const fetchProgressData = async () => {
            try {

                // 운동 완료 후 전달된 데이터 확인
                const completedExercise = (location.state as { completedExercise?: { exerciseId: number; durationInSeconds: number } })?.completedExercise;
                if (completedExercise) {
                    console.log('=== Home - 완료된 운동 정보 ===');
                    console.log('Exercise ID:', completedExercise.exerciseId);
                    console.log('Duration (초):', completedExercise.durationInSeconds);
                }


                // 운동 목록 가져오기
                const exercises = await getExercises({ limit: 5 });

                // 내 운동 기록 가져오기

                let myRecords: Array<{
                    exercise_id: number;
                    duration?: number;
                    accuracy_score?: number;
                    form_score?: number;
                    tempo_score?: number;
                }> = [];
                try {
                    myRecords = await getMyRecords({ limit: 100 });
                    console.log('Home - 내 운동 기록:', myRecords);

                } catch (recordErr) {
                    console.log('운동 기록 조회 실패:', recordErr);
                }

                // 각 운동별 총 운동 시간 계산 (초 단위)
                const recordTimeMap = myRecords.reduce((acc: Record<number, number>, record: { exercise_id: number; duration?: number }) => {
                    const exerciseId = record.exercise_id;
                    const durationInSeconds = (record.duration || 0) * 60;
                    acc[exerciseId] = (acc[exerciseId] || 0) + durationInSeconds;
                    return acc;
                }, {});


                // 각 운동별 평균 점수 계산
                const averageScoreMap: Record<number, number> = {};
                const scoreCountMap: Record<number, number> = {};

                myRecords.forEach((record) => {
                    const exerciseId = record.exercise_id;

                    // accuracy_score, form_score, tempo_score가 있으면 평균 계산
                    const scores = [
                        record.accuracy_score,
                        record.form_score,
                        record.tempo_score
                    ].filter(score => score !== undefined && score !== null) as number[];

                    if (scores.length > 0) {
                        const recordAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;

                        if (!averageScoreMap[exerciseId]) {
                            averageScoreMap[exerciseId] = 0;
                            scoreCountMap[exerciseId] = 0;
                        }

                        averageScoreMap[exerciseId] += recordAverage;
                        scoreCountMap[exerciseId] += 1;
                    }
                });

                // 각 운동별 최종 평균 점수 계산
                Object.keys(averageScoreMap).forEach((key) => {
                    const exerciseId = parseInt(key);
                    averageScoreMap[exerciseId] = Math.round(averageScoreMap[exerciseId] / scoreCountMap[exerciseId]);
                });

                console.log('Home - 평균 점수 맵:', averageScoreMap);

                // 방금 완료한 운동의 시간을 즉시 추가 (API 응답 전에 UI 업데이트)
                if (completedExercise) {
                    const existingTime = recordTimeMap[completedExercise.exerciseId] || 0;
                    recordTimeMap[completedExercise.exerciseId] = existingTime + completedExercise.durationInSeconds;
                    console.log('=== Home - 업데이트된 운동 시간 ===');
                    console.log(`Exercise ${completedExercise.exerciseId}: ${recordTimeMap[completedExercise.exerciseId]}초`);
                }


                // 모든 운동의 시간을 먼저 계산
                const exerciseTimes = exercises.map((exercise: { id: number; name: string }) => {
                    return recordTimeMap[exercise.id] || 0;
                });

                // 최대 운동 시간 찾기 (프로그레스 바의 기준)
                const maxSeconds = Math.max(...exerciseTimes, 1); // 최소값 1로 0 나누기 방지

                // progress 데이터 포맷팅
                const progressData = exercises.map((exercise: { id: number; name: string }, index: number) => {
                    const totalSeconds = exerciseTimes[index];
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;

                    // 시간 텍스트 생성
                    let timeText = '';
                    if (hours > 0) {
                        timeText = `${hours}시간 ${minutes}분 ${seconds}초`;
                    } else if (minutes > 0) {
                        timeText = `${minutes}분 ${seconds}초`;
                    } else {
                        timeText = `${seconds}초`;
                    }

                    // 최대 시간 대비 퍼센티지 계산 (상대적 진행도)
                    const percentage = Math.round((totalSeconds / maxSeconds) * 100);

                    // 평균 점수 가져오기
                    const averageScore = averageScoreMap[exercise.id] || 0;

                    return {
                        emoji: '🏋️',
                        name: exercise.name,
                        timeText: timeText,
                        percentage: percentage,
                        averageScore: averageScore, // 평균 점수 추가
                    };
                });

                setProgress(progressData);
            } catch (err) {
                console.error('진행상황 데이터 로드 실패:', err);
            }
        };

        fetchProgressData();
    }, [location.key, location.state]);

    // 더미 데이터
    const rankings = [
        { rank: 1, emoji: '👑', name: '운동왕김철수', score: '9,850', type: 'gold' },
        { rank: 2, emoji: '🥈', name: '헬스마니아', score: '9,720', type: 'silver' },
        { rank: 3, emoji: '🥉', name: '다이어트중', score: '9,650', type: 'bronze' },
    ];

    return (
        <div className={styles.home}>
            {/* Top Section: Welcome Banner + Weekly Ranking */}
            <div className={styles.topSection}>
                {/* Welcome Banner */}
                <div className={styles.welcomeBanner}>
                    <div className={styles.bannerBadges}>
                        <div className={styles.badge}>
                            <IoSparkles className={styles.badgeIcon} />
                            <span>AI 기반 운동 추적</span>
                        </div>
                        <div className={styles.badge}>
                            <span>🔥 7일 연속!</span>
                        </div>
                    </div>
                    <h1 className={styles.bannerTitle}>환영합니다!</h1>
                    <p className={styles.bannerSubtitle}>오늘도 건강한 하루를 시작해볼까요?</p>
                    <div className={styles.bannerButtons}>
                        <button className={styles.primaryButton} onClick={handleStartWorkout}>
                            오늘의 운동 시작
                        </button>
                        <button className={styles.secondaryButton} onClick={handleViewProgress}>
                            나의 운동 점수 보러가기
                        </button>
                    </div>
                </div>

                {/* Weekly Ranking */}
                <div className={styles.weeklyRanking}>
                    <h2 className={styles.cardTitle}>이번 주 랭킹</h2>
                    <div className={styles.rankingList}>
                        {rankings.map((item) => (
                            <div key={item.rank} className={styles.rankingItem}>
                                <div className={`${styles.rankBadge} ${styles[item.type as keyof typeof styles]}`}>
                                    {item.rank}
                                </div>
                                <span className={styles.rankEmoji}>{item.emoji}</span>
                                <span className={styles.userName}>{item.name}</span>
                                <span className={styles.score}>{item.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Weekly Progress */}
            <div className={styles.weeklyProgress} ref={progressRef}>
                <h2 className={styles.cardTitle}>나의 운동 정확도</h2>
                <div className={styles.progressList}>
                    {progress.map((item, index) => (
                        <div key={index} className={styles.progressItem}>
                            <div className={styles.progressHeader}>
                                <div className={styles.exerciseInfo}>
                                    <span className={styles.exerciseEmoji}>{item.emoji}</span>
                                    <span className={styles.exerciseName}>{item.name}</span>
                                </div>
                                <div className={styles.progressRight}>
                                    <span className={styles.percentage}>
                                        {item.averageScore > 0 ? `${item.averageScore}점` : '수행 전'}
                                    </span>
                                    <IoMdTrendingUp className={styles.trendIcon} />
                                </div>
                            </div>
                            <div className={styles.progressBarContainer}>
                                <div
                                    className={styles.progressBarFill}
                                    style={{ width: `${item.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Home;
