import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import styles from './Game.module.css'
import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { getChallengeVideos, getRankings, submitGameScore } from '../api/gameService';
import { useRef } from 'react';

const WS_URL = "ws://localhost/api/games/ai-game/ws";

interface VideoItem {
    id: number;
    youtubeId: string;
    title: string;
    thumbnailUrl: string;
}

interface GameResults {
    totalScore: number;
    perfectHits: number;
    goodHits: number;
    badHits: number;
    accuracy: number;
    grade: string;
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
    const [hitCounts, setHitCounts] = useState({ PERFECT: 0, GOOD: 0, BAD: 0 });
    const [gameResults, setGameResults] = useState<GameResults | null>(null);
    const [isGameRunning, setIsGameRunning] = useState(false);
    const [isWarmingUp, setIsWarmingUp] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [serverGrade, setServerGrade] = useState<string>('');
    const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("카메라 접근 권한이 필요합니다.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const sendFrame = () => {
        if (!canvasRef.current || !videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);

            try {
                wsRef.current.send(JSON.stringify({
                    type: 'frame',
                    frame: dataUrl
                }));
            } catch (err) {
                console.error("Error sending frame:", err);
            }
        }
    };

    // const handleNoteHit = (accuracy: string) => {
    //     setHitType(accuracy);
    //     setShowHit(true);
    //     setTimeout(() => setShowHit(false), 500);
    // };

    // Simulation effect removed


    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isWarmingUp && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isWarmingUp, countdown]);

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

    const handleVideoClick = async (video: VideoItem) => {
        setSelectedVideo({ id: video.id, youtubeId: video.youtubeId });
        setShowResults(false);
        setHitCounts({ PERFECT: 0, GOOD: 0, BAD: 0 });
        setServerGrade('');
        setIsGameRunning(false);
        setIsWarmingUp(false);
        setIsModalOpen(true);
        // Start camera when modal opens
        await startCamera();
    };

    const handleStartGame = async () => {
        console.log("START!");
        setHitCounts({ PERFECT: 0, GOOD: 0, BAD: 0 });
        setServerGrade('');
        setIsGameRunning(true);
        setIsWarmingUp(true);
        setCountdown(5);

        // Camera is already running from modal open
        // Connect WS
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            const initMessage = {
                exercise: "yout_squat"
            }
            ws.send(JSON.stringify(initMessage));

            console.log("WS Connected");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'init_success') {
                    console.log("Game Initialized:", data.message);
                    // Start sending frames
                    if (!frameIntervalRef.current) {
                        frameIntervalRef.current = setInterval(sendFrame, 100); // 10 FPS
                    }
                } else if (data.type === 'warmup_end') {
                    console.log("Warmup Ended");
                    setIsWarmingUp(false);
                    // Play the YouTube video
                    if (iframeRef && iframeRef.contentWindow) {
                        iframeRef.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                    }
                } else if (data.type === 'frame') {
                    const result = data.status;
                    console.log(result);
                    // Update score/grade based on result
                    // Assuming result contains score or grade
                    if (result && result.current_grade) {
                        const grade = result.current_grade as 'PERFECT' | 'GOOD' | 'BAD';

                        setHitType(grade);
                        setShowHit(true);
                        setTimeout(() => setShowHit(false), 500);
                    } else if (result && result.score !== undefined) {
                        // Fallback if only score is provided
                        // This logic might need adjustment based on actual server response
                    }
                } else if (data.type === 'warmup_end') {

                }
                else if (data.type === 'error') {
                    console.error("Game Error:", data.message);
                } else if (data.type === 'stopped') {
                    const res = data.result;
                    console.log("Game Stopped:", data.result);

                    const ws = wsRef.current;
                    if (ws) {
                        ws.close();
                        wsRef.current = null;
                    }

                    setHitCounts(res.grade_counts);
                    if (res.grade) {
                        setServerGrade(res.grade);
                    }
                }
            } catch (e) {
                console.error("Error parsing WS message:", e);
            }
        };

        ws.onclose = () => {
            console.log("WS Closed");

        };

        // Play the YouTube video logic moved to warmup_end handler
        // if (iframeRef && iframeRef.contentWindow) {
        //     iframeRef.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        // }
    };

    const handleStopGame = () => {
        setIsGameRunning(false);
        setIsWarmingUp(false);

        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            // 프레임 전송 중지
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }

            // 백엔드에 'stop' 메시지 전송
            ws.send(
                JSON.stringify({
                    type: "stop",
                })
            );
        }
        // Camera continues running

        // Pause the YouTube video
        if (iframeRef && iframeRef.contentWindow) {
            iframeRef.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
    };

    const handleGameComplete = async () => {
        if (!selectedVideo) return;
        setIsGameRunning(false);

        const totalHits = hitCounts.PERFECT + hitCounts.GOOD + hitCounts.BAD;
        // if there isn't anything to submit, just show the default 0 result and return
        if (totalHits === 0) {
            setShowResults(true);
            return;
        }

        const totalScore = (hitCounts.PERFECT * 100) + (hitCounts.GOOD * 40);
        const accuracy = totalHits > 0 ? ((totalHits - hitCounts.BAD) / totalHits) * 100 : 0;

        const results: GameResults = {
            totalScore,
            perfectHits: hitCounts.PERFECT,
            goodHits: hitCounts.GOOD,
            badHits: hitCounts.BAD,
            accuracy: Math.round(accuracy * 10) / 10,
            grade: serverGrade || 'F' // Default to F if no grade received
        };

        setGameResults(results);
        setShowResults(true);

        try {
            await submitGameScore({
                video_id: selectedVideo.id,
                total_score: totalScore,
                accuracy_score: accuracy,
                timing_score: null,
            });

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
                <div className={styles.modal} onClick={() => {
                    setIsModalOpen(false);
                    stopCamera();
                }}>
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
                                                onClick={() => {
                                                    setIsModalOpen(false);
                                                    stopCamera();
                                                }}
                                            >
                                                닫기
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.videoContainer}>
                                        {/* Clickable overlay that starts the game */}
                                        {!isGameRunning && (
                                            <div
                                                className={styles.startOverlay}
                                                onClick={handleStartGame}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    zIndex: 10,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                }}
                                            >
                                                <div style={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                    padding: '20px 40px',
                                                    borderRadius: '10px',
                                                    fontSize: '24px',
                                                    fontWeight: 'bold',
                                                    color: '#333'
                                                }}>
                                                    클릭하여 게임 시작
                                                </div>
                                            </div>
                                        )}

                                        {isGameRunning && (
                                            <div
                                                onClick={handleStopGame}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    zIndex: 9, // Higher than the iframe
                                                    cursor: 'pointer',
                                                    backgroundColor: 'transparent', // Completely transparent
                                                }}
                                                title="게임 멈추기"
                                            />
                                        )}

                                        {/* The new element for showing the hit status */}
                                        <div className={styles.hitStatusOverlay}>
                                            <p className={`${styles.hitText} ${showHit ? styles.hitTextVisible : ''} ${hitType === 'PERFECT' ? styles.hitTextPerfect :
                                                hitType === 'GOOD' ? styles.hitTextGood :
                                                    hitType === 'BAD' ? styles.hitTextBad : ''
                                                }`}>
                                                {hitType}
                                            </p>
                                        </div>

                                        {/* Countdown Overlay */}
                                        {isWarmingUp && (
                                            <div className={styles.countdownOverlay}>
                                                {countdown > 0 ? countdown : "GO!"}
                                            </div>
                                        )}


                                        <iframe
                                            ref={(ref) => setIframeRef(ref)}
                                            width="100%"
                                            height="520"
                                            src={`https://www.youtube.com/embed/${selectedVideo?.youtubeId || ''}?enablejsapi=1`}
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
                                                onClick={() => {
                                                    setIsModalOpen(false);
                                                    stopCamera();
                                                }}
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
                                        <div className={styles.gradeLabel} style={{ fontSize: '24px', fontWeight: 'bold', color: '#4f46e5', marginTop: '10px' }}>
                                            Grade: {gameResults?.grade}
                                        </div>
                                        <div className={styles.accuracyLabel}>
                                            평균 정확도: {gameResults?.accuracy}%
                                        </div>
                                    </div>

                                    <div className={styles.hitDetailList}>
                                        <div className={`${styles.hitDetailCard} ${styles.perfectCard}`}>
                                            <div className={styles.hitDetailLabel}>PERFECT</div>
                                            <div className={styles.hitDetailValue}>{gameResults?.perfectHits}</div>
                                        </div>
                                        <div className={`${styles.hitDetailCard} ${styles.goodCard}`}>
                                            <div className={styles.hitDetailLabel}>GOOD</div>
                                            <div className={styles.hitDetailValue}>{gameResults?.goodHits}</div>
                                        </div>
                                        <div className={`${styles.hitDetailCard} ${styles.badCard}`}>
                                            <div className={styles.hitDetailLabel}>BAD</div>
                                            <div className={styles.hitDetailValue}>{gameResults?.badHits}</div>
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
            {/* Camera Preview - visible when modal is open */}
            {isModalOpen && (
                <div className={styles.cameraPreview}>
                    <video ref={videoRef} playsInline muted autoPlay></video>
                </div>
            )}
            {/* Hidden canvas for processing */}
            {!isModalOpen && (
                <video ref={videoRef} style={{ display: 'none' }} playsInline muted></video>
            )}
            <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }}></canvas>
        </>
    );
}

export default Game;