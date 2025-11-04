import styles from './Workout.module.css';
import { FiClock, FiActivity, FiPlay, FiArrowRight } from 'react-icons/fi';
import { IoCheckmarkCircle } from 'react-icons/io5';

const Workout = () => {
    // 더미 데이터
    const featuredExercise = {
        title: '스쿼트',
        difficulty: '초급',
        completion: 85,
        time: '30분',
        calories: '120 kcal',
        description:
            '하체 근력 강화에 효과적인 기본 운동입니다. 무릎과 엉덩이를 굽혀 앉았다 일어나는 동작을 반복합니다.',
        benefits: ['하체 근력 강화', '코어 안정성 향상', '칼로리 소모 효과'],
        thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800',
    };

    const exercises = [
        {
            title: '스쿼트',
            difficulty: '초급',
            time: '10분',
            calories: '95 cal',
            thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
        },
        {
            title: '스쿼트',
            difficulty: '초급',
            time: '10분',
            calories: '95 cal',
            thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
        },
        {
            title: '스쿼트',
            difficulty: '초급',
            time: '10분',
            calories: '95 cal',
            thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
        },
        {
            title: '스쿼트',
            difficulty: '초급',
            time: '10분',
            calories: '95 cal',
            thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
        },
        {
            title: '스쿼트',
            difficulty: '초급',
            time: '10분',
            calories: '95 cal',
            thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
        },
    ];

    return (
        <div className={styles.workout}>
            {/* Featured Exercise Card */}
            <div className={styles.featuredCard}>
                {/* Left - Image Section */}
                <div className={styles.imageSection}>
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
                    <div className={styles.playButton}>
                        <div className={styles.playCircle}>
                            <FiPlay className={styles.playIcon} />
                        </div>
                        <span className={styles.playText}>영상 보기</span>
                    </div>
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
                        <div key={index} className={styles.exerciseCard}>
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
