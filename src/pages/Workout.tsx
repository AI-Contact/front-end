import styles from './Workout.module.css';
import { /* FiClock, FiActivity, */ FiPlay, FiArrowRight } from 'react-icons/fi';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getExercises, getMyStats } from '../api/exerciseService';

const Workout = () => {
    // 상태 관리
    const navigate = useNavigate();
    const location = useLocation();
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);

    // API에서 운동 데이터 가져오기
    useEffect(() => {
        const fetchExercises = async () => {
            try {
                setLoading(true);
                setError(null);

                // 운동 완료 후 전달된 데이터 확인
                const completedExercise = (location.state as { completedExercise?: { exerciseId: number; durationInSeconds: number } })?.completedExercise;
                if (completedExercise) {
                    console.log('=== 완료된 운동 정보 ===');
                    console.log('Exercise ID:', completedExercise.exerciseId);
                    console.log('Duration (초):', completedExercise.durationInSeconds);
                }

                // 운동 목록 가져오기
                const data = await getExercises({ limit: 20 });
                console.log('API 응답 데이터:', data); // 디버깅용

                // 각 운동별 통계 정보 가져오기
                const statsPromises = data.map((exercise: any) =>
                    getMyStats({ exercise_id: exercise.id })
                        .then(stats => ({ exerciseId: exercise.id, stats }))
                        .catch(err => {
                            console.log(`운동 ${exercise.id} 통계 조회 실패:`, err);
                            return { exerciseId: exercise.id, stats: null };
                        })
                );

                const statsResults = await Promise.all(statsPromises);
                const statsMap = statsResults.reduce((acc: Record<number, any>, { exerciseId, stats }) => {
                    acc[exerciseId] = stats;
                    return acc;
                }, {});

                // API 데이터를 UI에 맞게 변환
                const formattedExercises = data.map((exercise: any) => {
                    const stats = statsMap[exercise.id];

                    // 평균 점수 계산 (form_score 기준, 0-100 범위로 변환)
                    const averageScore = stats?.average_form_score || 0;

                    return {
                        id: exercise.id,
                        title: exercise.name,
                        difficulty: exercise.difficulty === 'beginner' ? '초급' :
                            exercise.difficulty === 'intermediate' ? '중급' : '고급',
                        description: exercise.description,
                        benefits: exercise.muscle_groups || [], // 배열이 없으면 빈 배열
                        thumbnail: exercise.thumbnail_url || 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800',
                        videoId: 'hAGfBjvIRFI', // 임시 비디오 ID
                        totalTimeSeconds: stats?.total_duration || 0, // 총 운동 시간 (분)
                        averageScore: averageScore, // API에서 가져온 평균 점수 (0-100)
                        totalSessions: stats?.total_sessions || 0, // 총 세션 수
                    };
                });

                setExercises(formattedExercises);
            } catch (err) {
                console.error('운동 데이터 로드 실패:', err);
                setError('운동 데이터를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchExercises();
    }, [location.key, location.state]); // location.key 또는 state가 변경될 때마다 데이터 새로고침

    // 운동 카드 클릭 핸들러
    const handleExerciseClick = (index: number) => {
        setSelectedExerciseIndex(index);
        setIsPlaying(false); // 새 운동 선택 시 영상 재생 초기화
    };

    // 웹캠 분석 핸들러
    const handleWebcamAnalysis = () => {
        const exercise = exercises[selectedExerciseIndex];
        navigate('/analysis-demo', {
            state: { exercise, mode: 'webcam' }
        });
    };

    // 영상 업로드 핸들러
    const handleVideoUpload = () => {
        const exercise = exercises[selectedExerciseIndex];
        navigate('/analysis-demo', {
            state: { exercise, mode: 'upload' }
        });
    };

    // 로딩 중일 때
    if (loading) {
        return (
            <div className={styles.workout}>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p>운동 데이터를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 에러 발생 시
    if (error) {
        return (
            <div className={styles.workout}>
                <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>다시 시도</button>
                </div>
            </div>
        );
    }

    // 데이터가 없을 때
    if (!exercises || exercises.length === 0) {
        return (
            <div className={styles.workout}>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p>운동 데이터가 없습니다.</p>
                </div>
            </div>
        );
    }

    // 현재 선택된 운동
    const featuredExercise = exercises[selectedExerciseIndex];

    return (
        <div className={styles.workout}>
            {/* Featured Exercise Card */}
            <div className={styles.featuredCard}>
                {/* Left - Image Section */}
                <div className={styles.imageSection}>
                    {!isPlaying ? (
                        <>
                            <img
                                src={featuredExercise.thumbnail}
                                alt={featuredExercise.title}
                                className={styles.backgroundImage}
                            />
                            <div className={styles.imageOverlay} />

                            {/* Completion Badge */}
                            {/* <div className={styles.completionBadge}>
                                완료율 {featuredExercise.completion}%
                            </div> */}

                            {/* Play Button */}
                            <div
                                className={styles.playButton}
                                onClick={() => setIsPlaying(true)}
                            >
                                <div className={styles.playCircle}>
                                    <FiPlay className={styles.playIcon} />
                                </div>
                                <span className={styles.playText}>영상 보기</span>
                            </div>
                        </>
                    ) : (
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${featuredExercise.videoId}?autoplay=1`}
                            title={featuredExercise.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className={styles.videoFrame}
                        ></iframe>
                    )}
                </div>

                {/* Right - Info Section */}
                <div className={styles.infoSection}>
                    {/* Title & Difficulty */}
                    <div className={styles.titleSection}>
                        <h1 className={styles.exerciseTitle}>{featuredExercise.title}</h1>
                    </div>

                    {/* Description */}
                    <p className={styles.description}>{featuredExercise.description}</p>

                    {/* Start Buttons */}
                    <div className={styles.buttonGroup}>
                        <button className={styles.startButton} onClick={handleWebcamAnalysis}>
                            <span className={styles.startButtonText}>웹캠 영상 분석</span>
                            <FiArrowRight className={styles.arrowIcon} />
                        </button>
                        <button className={styles.uploadButton} onClick={handleVideoUpload}>
                            <span className={styles.startButtonText}>영상 업로드</span>
                            <FiArrowRight className={styles.arrowIcon} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Exercise List */}
            <div className={styles.exerciseListSection}>
                <h2 className={styles.sectionTitle}>기본 운동</h2>
                <div className={styles.exerciseGrid}>
                    {exercises.map((exercise, index) => (
                        <div
                            key={index}
                            className={`${styles.exerciseCard} ${selectedExerciseIndex === index ? styles.selected : ''
                                }`}
                            onClick={() => handleExerciseClick(index)}
                        >
                            {/* Thumbnail */}
                            <div className={styles.cardThumbnail}>
                                <img src={exercise.thumbnail} alt={exercise.title} />
                            </div>

                            {/* Info */}
                            <div className={styles.cardInfo}>
                                <h3 className={styles.cardTitle}>{exercise.title}</h3>
                                <div className={styles.cardStats}>
                                    {/* Average Score Badge */}
                                    <div className={`${styles.cardBadge} ${styles.completed}`}>
                                        <IoCheckmarkCircle className={styles.badgeIcon} />
                                        <span>{exercise.averageScore > 0 ? `${exercise.averageScore.toFixed(2)}점` : '수행 전'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Workout;
