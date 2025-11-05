import styles from './Workout.module.css';
import { FiClock, FiActivity, FiPlay, FiArrowRight } from 'react-icons/fi';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { useState } from 'react';

const Workout = () => {
    // 더미 데이터 - 모든 운동 정보
    const exercises = [
        {
            title: '스쿼트',
            difficulty: '초급',
            completion: 85,
            time: '30분',
            calories: '120 kcal',
            description:
                '하체 근력 강화에 효과적인 기본 운동입니다. 무릎과 엉덩이를 굽혀 앉았다 일어나는 동작을 반복합니다.',
            benefits: ['하체 근력 강화', '코어 안정성 향상', '칼로리 소모 효과'],
            thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800',
            videoId: 'hAGfBjvIRFI',
        },
        {
            title: '런지',
            difficulty: '초급',
            completion: 70,
            time: '25분',
            calories: '110 kcal',
            description:
                '하체와 둔근을 강화하는 운동입니다. 한 발을 앞으로 내딛고 무릎을 굽혀 몸을 낮추는 동작입니다.',
            benefits: ['하체 균형 발달', '둔근 강화', '다리 근력 향상'],
            thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
            videoId: 'QOVaHwm-Q6U',
        },
        {
            title: '플랭크',
            difficulty: '중급',
            completion: 60,
            time: '15분',
            calories: '80 kcal',
            description:
                '코어 근육을 강화하는 정적 운동입니다. 팔꿈치와 발끝으로 몸을 지탱하며 일자로 유지합니다.',
            benefits: ['코어 근력 강화', '자세 교정', '복부 근육 발달'],
            thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
            videoId: '1JAj5VbNHPQ',
        },
        {
            title: '팔운동',
            difficulty: '초급',
            completion: 75,
            time: '20분',
            calories: '90 kcal',
            description:
                '상체 근력을 키우는 팔 운동입니다. 덤벨 컬, 삼두근 운동 등 다양한 팔 근육을 발달시킵니다.',
            benefits: ['팔 근력 강화', '상체 라인 개선', '근지구력 향상'],
            thumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800',
            videoId: 'hAGfBjvIRFI',
        },
        {
            title: '복근운동',
            difficulty: '중급',
            completion: 55,
            time: '20분',
            calories: '100 kcal',
            description:
                '복부 근육을 집중적으로 강화하는 운동입니다. 크런치, 레그레이즈 등으로 복근을 발달시킵니다.',
            benefits: ['복근 강화', '체지방 감소', '코어 안정화'],
            thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
            videoId: 'DHD1-2P94DI',
        },
    ];

    // 영상 재생 상태
    const [isPlaying, setIsPlaying] = useState(false);
    // 선택된 운동 인덱스
    const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);

    // 현재 선택된 운동
    const featuredExercise = exercises[selectedExerciseIndex];

    // 운동 카드 클릭 핸들러
    const handleExerciseClick = (index: number) => {
        setSelectedExerciseIndex(index);
        setIsPlaying(false); // 새 운동 선택 시 영상 재생 초기화
    };

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
                            {featuredExercise.benefits.map((benefit, index) => (
                                <div key={index} className={styles.benefitItem}>
                                    <IoCheckmarkCircle className={styles.checkIcon} />
                                    <span className={styles.benefitText}>{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Start Button */}
                    <button className={styles.startButton}>
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
