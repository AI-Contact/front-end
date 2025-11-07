import styles from './Workout.module.css';
import { FiClock, FiActivity, FiPlay, FiArrowRight } from 'react-icons/fi';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getExercises, startExercise, getMyRecords } from '../api/exerciseService';

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

                // 운동 목록 가져오기
                const data = await getExercises({ limit: 20 });
                console.log('API 응답 데이터:', data); // 디버깅용

                // 내 운동 기록 가져오기
                let myRecords: Array<{ exercise_id: number; duration?: number }> = [];
                try {
                    myRecords = await getMyRecords({ limit: 100 });
                    console.log('내 운동 기록:', myRecords);
                } catch (recordErr) {
                    console.log('운동 기록 조회 실패 (로그인 필요 가능성):', recordErr);
                    // 기록 조회 실패해도 운동 목록은 표시
                }

                // 각 운동별 총 운동 시간 계산 (초 단위)
                const recordTimeMap = myRecords.reduce((acc: Record<number, number>, record: { exercise_id: number; duration?: number }) => {
                    const exerciseId = record.exercise_id;
                    // duration이 분 단위라면 초로 변환 (API 스펙에 따라 조정 필요)
                    const durationInSeconds = (record.duration || 0) * 60;
                    acc[exerciseId] = (acc[exerciseId] || 0) + durationInSeconds;
                    return acc;
                }, {});

                console.log('=== 운동 시간 계산 결과 ===');
                console.log('recordTimeMap:', recordTimeMap);

                // API 데이터를 UI에 맞게 변환
                const formattedExercises = data.map((exercise: any) => ({
                    id: exercise.id,
                    title: exercise.name,
                    difficulty: exercise.difficulty === 'beginner' ? '초급' :
                               exercise.difficulty === 'intermediate' ? '중급' : '고급',
                    completion: Math.floor(Math.random() * 40 + 60), // 임시 완료율
                    time: '30분', // 임시 시간
                    calories: `${exercise.calories_per_minute * 30} kcal`,
                    description: exercise.description,
                    benefits: exercise.muscle_groups || [], // 배열이 없으면 빈 배열
                    thumbnail: exercise.thumbnail_url || 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800',
                    videoId: 'hAGfBjvIRFI', // 임시 비디오 ID
                    totalTimeSeconds: recordTimeMap[exercise.id] || 0, // 총 운동 시간 (초)
                }));

                setExercises(formattedExercises);
            } catch (err) {
                console.error('운동 데이터 로드 실패:', err);
                setError('운동 데이터를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchExercises();
    }, [location.key]); // location.key가 변경될 때마다 (페이지 이동 시마다) 데이터 새로고침

    // 운동 카드 클릭 핸들러
    const handleExerciseClick = (index: number) => {
        setSelectedExerciseIndex(index);
        setIsPlaying(false); // 새 운동 선택 시 영상 재생 초기화
    };

    // 운동 시작 핸들러
    const handleStartExercise = async () => {
        const exercise = exercises[selectedExerciseIndex];

        try {
            const recordData = await startExercise({
                exercise_id: exercise.id,
                duration: 0,
                repetitions: 0,
                sets_completed: 0,
            });

            console.log('=== 운동 시작 API 응답 ===');
            console.log('Record ID:', recordData.id);
            console.log('Exercise ID:', recordData.exercise_id);
            console.log('Started At:', recordData.started_at);
            console.log('전체 응답 데이터:', recordData);

            // 운동 세션 페이지로 이동
            navigate('/exercise-session', {
                state: { exercise, recordData }
            });
        } catch (err) {
            console.error('운동 시작 실패:', err);
            alert('운동 시작에 실패했습니다.');
        }
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
                            <div className={styles.completionBadge}>
                                완료율 {featuredExercise.completion}%
                            </div>

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
                        <span className={styles.difficultyBadge}>
                            {featuredExercise.difficulty}
                        </span>
                    </div>

                    {/* Stats Cards */}
                    <div className={styles.statsCards}>
                        {/* Time Card */}
                        <div className={`${styles.statCard} ${styles.time}`}>
                            <div className={styles.statHeader}>
                                <FiClock className={`${styles.statIcon} ${styles.blue}`} />
                                <p className={`${styles.statValue} ${styles.blue}`}>
                                    {featuredExercise.time}
                                </p>
                            </div>
                            <p className={`${styles.statLabel} ${styles.blue}`}>소요시간</p>
                        </div>

                        {/* Calories Card */}
                        <div className={`${styles.statCard} ${styles.calories}`}>
                            <div className={styles.statHeader}>
                                <FiActivity className={`${styles.statIcon} ${styles.orange}`} />
                                <p className={`${styles.statValue} ${styles.orange}`}>
                                    {featuredExercise.calories}
                                </p>
                            </div>
                            <p className={`${styles.statLabel} ${styles.orange}`}>칼로리</p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className={styles.description}>{featuredExercise.description}</p>

                    {/* Benefits */}
                    <div className={styles.benefitsSection}>
                        <h3 className={styles.benefitsTitle}>운동 효과</h3>
                        <div className={styles.benefitsList}>
                            {featuredExercise.benefits.map((benefit: string, index: number) => (
                                <div key={index} className={styles.benefitItem}>
                                    <IoCheckmarkCircle className={styles.checkIcon} />
                                    <span className={styles.benefitText}>{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Start Button */}
                    <button className={styles.startButton} onClick={handleStartExercise}>
                        <span className={styles.startButtonText}>시작하러 가기</span>
                        <FiArrowRight className={styles.arrowIcon} />
                    </button>
                </div>
            </div>

            {/* Exercise List */}
            <div className={styles.exerciseListSection}>
                <h2 className={styles.sectionTitle}>기본 운동</h2>
                <div className={styles.exerciseGrid}>
                    {exercises.map((exercise, index) => (
                        <div
                            key={index}
                            className={`${styles.exerciseCard} ${
                                selectedExerciseIndex === index ? styles.selected : ''
                            }`}
                            onClick={() => handleExerciseClick(index)}
                        >
                            {/* Thumbnail */}
                            <div className={styles.cardThumbnail}>
                                <img src={exercise.thumbnail} alt={exercise.title} />
                                <div className={styles.thumbnailBadge}>{exercise.difficulty}</div>
                            </div>

                            {/* Info */}
                            <div className={styles.cardInfo}>
                                <h3 className={styles.cardTitle}>{exercise.title}</h3>
                                <div className={styles.cardStats}>
                                    {/* Time Badge */}
                                    <div className={`${styles.cardBadge} ${styles.time}`}>
                                        <FiClock className={styles.badgeIcon} />
                                        <span>{exercise.time}</span>
                                    </div>
                                    {/* Calories Badge */}
                                    <div className={`${styles.cardBadge} ${styles.calories}`}>
                                        <FiActivity className={styles.badgeIcon} />
                                        <span>{exercise.calories}</span>
                                    </div>
                                    {/* Total Time Badge */}
                                    <div className={`${styles.cardBadge} ${styles.completed}`}>
                                        <IoCheckmarkCircle className={styles.badgeIcon} />
                                        <span>
                                            {(() => {
                                                const totalSeconds = exercise.totalTimeSeconds;
                                                const hours = Math.floor(totalSeconds / 3600);
                                                const minutes = Math.floor((totalSeconds % 3600) / 60);
                                                const seconds = totalSeconds % 60;

                                                if (hours > 0) {
                                                    return `${hours}시간 ${minutes}분 ${seconds}초`;
                                                } else if (minutes > 0) {
                                                    return `${minutes}분 ${seconds}초`;
                                                } else {
                                                    return `${seconds}초`;
                                                }
                                            })()}
                                        </span>
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
