import styles from './Home.module.css';
import { FiClock, FiActivity } from 'react-icons/fi';
import { IoSparkles } from 'react-icons/io5';
import { IoMdTrendingUp } from 'react-icons/io';

const Home = () => {
    // 더미 데이터
    const rankings = [
        { rank: 1, emoji: '👑', name: '운동왕김철수', score: '9,850', type: 'gold' },
        { rank: 2, emoji: '🥈', name: '헬스마니아', score: '9,720', type: 'silver' },
        { rank: 3, emoji: '🥉', name: '다이어트중', score: '9,650', type: 'bronze' },
    ];

    const progress = [
        { emoji: '🏋️', name: '스쿼트', percentage: 85 },
        { emoji: '🏋️', name: '스쿼트', percentage: 85 },
        { emoji: '🏋️', name: '스쿼트', percentage: 85 },
        { emoji: '🏋️', name: '스쿼트', percentage: 85 },
        { emoji: '🏋️', name: '스쿼트', percentage: 85 },
    ];

    const videos = [
        { title: '스쿼트', difficulty: '초급', time: '10분', calories: '95 cal', thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
        { title: '스쿼트', difficulty: '초급', time: '10분', calories: '95 cal', thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
        { title: '스쿼트', difficulty: '초급', time: '10분', calories: '95 cal', thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
        { title: '스쿼트', difficulty: '초급', time: '10분', calories: '95 cal', thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
        { title: '스쿼트', difficulty: '초급', time: '10분', calories: '95 cal', thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
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
                        <button className={styles.primaryButton}>오늘의 운동 시작</button>
                        <button className={styles.secondaryButton}>진행상황 보기</button>
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
            <div className={styles.weeklyProgress}>
                <h2 className={styles.cardTitle}>이번 주 진행상황</h2>
                <div className={styles.progressList}>
                    {progress.map((item, index) => (
                        <div key={index} className={styles.progressItem}>
                            <div className={styles.progressHeader}>
                                <div className={styles.exerciseInfo}>
                                    <span className={styles.exerciseEmoji}>{item.emoji}</span>
                                    <span className={styles.exerciseName}>{item.name}</span>
                                </div>
                                <div className={styles.progressRight}>
                                    <span className={styles.percentage}>{item.percentage}%</span>
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

            {/* Recommended Videos */}
            <div className={styles.recommendedVideos}>
                <h2 className={styles.cardTitle}>추천 운동 영상</h2>
                <div className={styles.videoGrid}>
                    {videos.map((video, index) => (
                        <div key={index} className={styles.videoCard}>
                            <div className={styles.videoThumbnail}>
                                <img src={video.thumbnail} alt={video.title} />
                                <div className={styles.difficultyBadge}>{video.difficulty}</div>
                            </div>
                            <div className={styles.videoInfo}>
                                <h3 className={styles.videoTitle}>{video.title}</h3>
                                <div className={styles.videoStats}>
                                    <div className={`${styles.statBadge} ${styles.time}`}>
                                        <FiClock className={styles.statIcon} />
                                        <span>{video.time}</span>
                                    </div>
                                    <div className={`${styles.statBadge} ${styles.calories}`}>
                                        <FiActivity className={styles.statIcon} />
                                        <span>{video.calories}</span>
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

export default Home;
