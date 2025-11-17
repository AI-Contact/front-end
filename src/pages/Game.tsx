import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import styles from './Game.module.css'
import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { getChallengeVideos, getRankings, submitGameScore } from '../api/gameService';

interface VideoItem {
    id: number; // backend video id
    youtubeId: string;
    title: string;
    thumbnailUrl: string;
}

interface GameResults {
    totalScore: number;
    perfectHits: number;
    greatHits: number;
    goodHits: number;
    missHits: number;
    accuracy: number;
}

const Game = () => {
    const responsive = {
        superLargeDesktop: {
            breakpoint: { max: 4000, min: 3000 },
            items: 5
        },
        desktop: {
            breakpoint: { max: 3000, min: 1024 },
            items: 3
        },
        tablet: {
            breakpoint: { max: 1024, min: 464 },
            items: 2
        },
        mobile: {
            breakpoint: { max: 464, min: 0 },
            items: 1
        }
    };

    const CustomArrow = ({ onClick, direction }: { onClick?: () => void; direction: 'left' | 'right' }) => {
        return (
            <button
                onClick={onClick}
                className={`${styles.arrowButton} ${direction === 'left' ? styles.leftArrow : styles.rightArrow}`}
                aria-label={`${direction} arrow`}
            >
                {direction === 'right' ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
        );
    };

    const [videoList, setVideoList] = useState<VideoItem[]>([]);
    const [rankingList, setRankingList] = useState<{ userId: number; score: number }[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<{ id: number; youtubeId: string } | null>(null);
    const [loadingVideos, setLoadingVideos] = useState<boolean>(true);
    const [loadingRankings, setLoadingRankings] = useState<boolean>(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [showHit, setShowHit] = useState(false);
    const [hitType, setHitType] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [hitCounts, setHitCounts] = useState({ PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 });
    const [gameResults, setGameResults] = useState<GameResults | null>(null);

    // const handleNoteHit = (accuracy: string) => {
    //     setHitType(accuracy);
    //     setShowHit(true);
    //     setTimeout(() => setShowHit(false), 500);
    // };

    useEffect(() => {
        if (!isModalOpen) return;

        const hitTypes: Array<keyof typeof hitCounts> = ['PERFECT', 'GREAT', 'GOOD', 'MISS'];

        const interval = setInterval(() => {
            const randomType = hitTypes[Math.floor(Math.random() * hitTypes.length)];

            // increment the hitcounts
            setHitCounts(prev => ({
                ...prev,
                [randomType]: prev[randomType] + 1
            }));

            setHitType(randomType);
            setShowHit(true);
            setTimeout(() => setShowHit(false), 500);
        }, 2000); // Trigger every 2 seconds

        return () => clearInterval(interval);
    }, [isModalOpen]);

    useEffect(() => {
        setLoadingVideos(true);
        getChallengeVideos()
            .then((videos) => {
                const items: VideoItem[] = videos.map(v => ({
                    id: v.id,
                    youtubeId: v.youtube_id,
                    title: v.title,
                    thumbnailUrl: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/maxresdefault.jpg`,
                }));
                setVideoList(items);
            })
            .catch(() => {
                setVideoList([]);
            })
            .finally(() => setLoadingVideos(false));
    }, []);

    useEffect(() => {
        if (!selectedVideo) return;
        setLoadingRankings(true);
        getRankings(selectedVideo.id, 10)
            .then((rows) => {
                setRankingList(rows.map(r => ({ userId: r.user_id, score: r.total_score })));
            })
            .catch(() => setRankingList([]))
            .finally(() => setLoadingRankings(false));
    }, [selectedVideo, selectedVideo?.id]);

    const handleVideoClick = (video: VideoItem) => {
        setSelectedVideo({ id: video.id, youtubeId: video.youtubeId });
        setShowResults(false);
        setHitCounts({ PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 });
        setIsModalOpen(true);
    };

    const handleGameComplete = async () => {
        if (!selectedVideo) return;

        const totalHits = hitCounts.PERFECT + hitCounts.GREAT + hitCounts.GOOD + hitCounts.MISS;
        const totalScore = (hitCounts.PERFECT * 100) + (hitCounts.GREAT * 70) + (hitCounts.GOOD * 40);
        const accuracy = totalHits > 0 ? ((totalHits - hitCounts.MISS) / totalHits) * 100 : 0;

        const results: GameResults = {
            totalScore,
            perfectHits: hitCounts.PERFECT,
            greatHits: hitCounts.GREAT,
            goodHits: hitCounts.GOOD,
            missHits: hitCounts.MISS,
            accuracy: Math.round(accuracy * 10) / 10
        };

        setGameResults(results);
        setShowResults(true);

        try {
            // await submitGameScore({
            //     video_id: selectedVideo.id,
            //     total_score: totalScore,
            //     accuracy_score: accuracy,
            //     timing_score: null,
            // });

            setLoadingRankings(true);
            const rows = await getRankings(selectedVideo.id);
            setRankingList(rows.map(r => ({ userId: r.user_id, score: r.total_score })));
        } catch {
            alert('점수 제출에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoadingRankings(false);
        }
    };


    return (
        <>
            <div className="play">
                <h1>게임하기</h1>
                {loadingVideos ? (
                    <div className={styles.loader}>불러오는 중<span className={styles.ellipsis}>...</span></div>
                ) : (
                    <Carousel
                        responsive={responsive}
                        infinite={true}
                        autoPlay={true}
                        autoPlaySpeed={3000}
                        keyBoardControl={true}
                        customTransition="transform 300ms ease-in-out"
                        customRightArrow={<CustomArrow direction="right" />}
                        customLeftArrow={<CustomArrow direction="left" />}
                        arrows={true}
                        swipeable={true}
                        draggable={true}
                        removeArrowOnDeviceType={["tablet", "mobile"]}
                    >
                        {videoList.map((video, idx) => (
                            <div
                                className={styles.cardContainer}
                                key={idx}
                                onClick={() => handleVideoClick(video)}
                            >
                                <div className={styles.card}>
                                    <img
                                        src={video.thumbnailUrl}
                                        alt={video.title}
                                        className={styles.thumbnail}
                                    />
                                </div>
                                <p>{video.title}</p>
                            </div>
                        ))}
                    </Carousel>
                )}
            </div>

            {/* Video Modal */}
            {isModalOpen && (
                <div className={styles.modal} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
                        {
                            !showResults ? (
                                <>
                                    <div className={styles.modalHeader}>
                                        <h2 className={styles.modalTitle}>{videoList.find(v => v.id === selectedVideo?.id)?.title}</h2>
                                        <div className={styles.actionGroup}>
                                            <button className={styles.primaryAction} onClick={handleGameComplete}>운동 완료</button>
                                            <button
                                                className={styles.closeButton}
                                                onClick={() => setIsModalOpen(false)}
                                            >
                                                닫기
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.videoContainer}>
                                        {/* The new element for showing the hit status */}
                                        <div className={styles.hitStatusOverlay}>
                                            <p className={`${styles.hitText} ${showHit ? styles.hitTextVisible : ''} ${hitType === 'PERFECT' ? styles.hitTextPerfect :
                                                hitType === 'GREAT' ? styles.hitTextGreat :
                                                    hitType === 'GOOD' ? styles.hitTextGood :
                                                        hitType === 'MISS' ? styles.hitTextMiss : ''
                                                }`}>
                                                {hitType}
                                            </p>
                                        </div>

                                        <iframe
                                            width="100%"
                                            height="520"
                                            src={`https://www.youtube.com/embed/${selectedVideo?.youtubeId || ''}`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.modalHeader}>
                                        <h2 className={styles.modalTitle}>{videoList.find(v => v.id === selectedVideo?.id)?.title}</h2>
                                        <div className={styles.actionGroup}>
                                            <button
                                                className={styles.closeButton}
                                                onClick={() => setIsModalOpen(false)}
                                            >
                                                닫기
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.totalScoreContainer}>
                                        <div className={styles.scoreLabel}>총 점수</div>
                                        <div className={styles.totalScoreValue}>
                                            {gameResults?.totalScore}
                                        </div>
                                        <div className={styles.accuracyLabel}>
                                            평균 정확도: {gameResults?.accuracy}%
                                        </div>
                                    </div>

                                    <div className={styles.hitDetailGrid}>
                                        <div className={`${styles.hitDetailCard} ${styles.perfectCard}`}>
                                            <div className={styles.hitDetailLabel}>PERFECT</div>
                                            <div className={styles.hitDetailValue}>{gameResults?.perfectHits}</div>
                                        </div>
                                        <div className={`${styles.hitDetailCard} ${styles.greatCard}`}>
                                            <div className={styles.hitDetailLabel}>GREAT</div>
                                            <div className={styles.hitDetailValue}>{gameResults?.greatHits}</div>
                                        </div>
                                        <div className={`${styles.hitDetailCard} ${styles.goodCard}`}>
                                            <div className={styles.hitDetailLabel}>GOOD</div>
                                            <div className={styles.hitDetailValue}>{gameResults?.goodHits}</div>
                                        </div>
                                        <div className={`${styles.hitDetailCard} ${styles.missCard}`}>
                                            <div className={styles.hitDetailLabel}>MISS</div>
                                            <div className={styles.hitDetailValue}>{gameResults?.missHits}</div>
                                        </div>
                                    </div>
                                </>
                            )
                        }


                    </div>
                </div>
            )}

            <div className="ranking">
                <h1>랭킹보기</h1>
                {/* Video selection tabs for rankings */}
                <div className={styles.tabs}>
                    {videoList.map((v) => (
                        <button
                            key={v.id}
                            className={`${styles.tab} ${selectedVideo?.id === v.id ? styles.tabActive : ''}`}
                            onClick={() => setSelectedVideo({ id: v.id, youtubeId: v.youtubeId })}
                        >
                            {v.title}
                        </button>
                    ))}
                </div>
                <div className={styles.rankingList}>
                    <div className={styles.rankingHeader}>
                        <span>등수</span>
                        <span>아이디</span>
                        <span></span>
                        <span>점수</span>
                    </div>
                    {loadingRankings ? (
                        <div className={styles.loader}>랭킹 불러오는 중<span className={styles.ellipsis}>...</span></div>
                    ) : (
                        rankingList.length === 0 ? (
                            <div className={styles.rankingItem}>
                                <span></span>
                                <span></span>
                                <span className={styles.rankName} style={{ textAlign: 'center' }}>아직 랭킹 데이터가 없습니다. 첫 기록의 주인공이 되어보세요!</span>
                                <span></span>
                            </div>
                        ) : (
                            rankingList.map((item, idx) => (
                                <div key={idx} className={styles.rankingItem}>
                                    <span className={styles.rankNumber}>{idx + 1}</span>
                                    <span className={styles.rankAvatar}>{/* Avatar 이미지 */}</span>
                                    <span className={styles.rankName}>User {item.userId}</span>
                                    <span className={styles.rankScore}>{item.score}</span>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>
        </>
    );
}

export default Game;