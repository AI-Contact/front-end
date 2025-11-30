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
    maxCombo: number;
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
    const [isCameraSelectModalOpen, setIsCameraSelectModalOpen] = useState(false);
    const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');

    const [showHit, setShowHit] = useState(false);
    const [hitType, setHitType] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [hitCounts, setHitCounts] = useState({ PERFECT: 0, GOOD: 0, BAD: 0 });
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [comboPulse, setComboPulse] = useState(false);
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
    const maxComboRef = useRef<number>(0);

    const enumerateCameras = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setAvailableCameras(videoDevices);
            if (videoDevices.length > 0 && !selectedCameraId) {
                setSelectedCameraId(videoDevices[0].deviceId);
            }
        } catch (err) {
            console.error("Error enumerating cameras:", err);
            alert("카메라 목록을 불러올 수 없습니다.");
        }
    };

    const startCamera = async (deviceId?: string) => {
        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId }, width: 640, height: 480 }
                    : { width: 640, height: 480 }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
            // Get video dimensions
            const videoWidth = videoRef.current.videoWidth || canvasRef.current.width;
            const videoHeight = videoRef.current.videoHeight || canvasRef.current.height;

            // Rotate the canvas dimensions (swap width and height)
            const rotatedWidth = videoHeight;
            const rotatedHeight = videoWidth;

            // Adjust canvas size if needed
            if (canvasRef.current.width !== rotatedWidth || canvasRef.current.height !== rotatedHeight) {
                canvasRef.current.width = rotatedWidth;
                canvasRef.current.height = rotatedHeight;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Save the current context state
            ctx.save();

            // Rotate 90 degrees counter-clockwise (left)
            // Move rotation center to canvas center
            ctx.translate(canvasRef.current.width / 2, canvasRef.current.height / 2);
            ctx.rotate(-Math.PI / 2); // -90 degrees

            // Draw the image with adjusted position
            ctx.drawImage(videoRef.current, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);

            // Restore the context state
            ctx.restore();

            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);

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
                    thumbnailUrl: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
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
        setCombo(0);
        setMaxCombo(0);
        maxComboRef.current = 0;
        setServerGrade('');
        setIsGameRunning(false);
        setIsWarmingUp(false);
        // Open camera selection modal first
        await enumerateCameras();
        setIsCameraSelectModalOpen(true);
    };

    const handleCameraSelect = async () => {
        setIsCameraSelectModalOpen(false);
        setIsModalOpen(true);
        // Start camera with selected device
        await startCamera(selectedCameraId);
    };

    const handleStartGame = async () => {
        console.log("START!");
        setHitCounts({ PERFECT: 0, GOOD: 0, BAD: 0 });
        setCombo(0);
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
                video_id: selectedVideo!.id
            }
            ws.send(JSON.stringify(initMessage));

            console.log("WS Connected");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'init_success') {
                    console.log("Game Initialized:", data.message);
                    // 프레임 전송 시작 (전송 속도 대폭 감소: 10 FPS → 3 FPS)
                    if (!frameIntervalRef.current) {
                        frameIntervalRef.current = setInterval(sendFrame, 333); // 333ms = 3 FPS
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
                    // 운동 구간에서 3초마다 새 등급이 매겨질 때만 화면에 표시
                    if (result && result.grade_changed && result.current_grade) {
                        const grade = result.current_grade as 'PERFECT' | 'GOOD' | 'BAD';
                        console.log(`✨ 새 등급 평가: ${grade} (점수: ${result.score?.toFixed(1)}, 시간: ${result.grade_timestamp?.toFixed(1)}s, REST: ${result.is_rest})`);

                        // 등급 카운트 증가
                        setHitCounts(prev => ({
                            ...prev,
                            [grade]: prev[grade] + 1
                        }));

                        // Update combo: increment on PERFECT/GOOD, reset on BAD
                        // if (grade === 'BAD') {
                        //     setCombo(0);
                        // } else {
                        setCombo(prev => {
                            const newCombo = prev + 1;
                            setMaxCombo(max => {
                                const newMax = Math.max(max, newCombo);
                                maxComboRef.current = newMax;
                                // console.log(`Combo: ${newCombo}, Max Combo: ${newMax}`);
                                return newMax;
                            });
                            return newCombo;
                        });
                        // Trigger pulse animation
                        setComboPulse(true);
                        setTimeout(() => setComboPulse(false), 300);
                        // }

                        setHitType(grade);
                        setShowHit(true);
                        setTimeout(() => setShowHit(false), 500);
                    }
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

                    // 영상을 끝까지 완료한 경우에만 결과 처리
                    if (res.video_completed) {
                        setHitCounts(res.grade_counts);
                        if (res.final_rank) {
                            setServerGrade(res.final_rank);
                        }
                        // 자동으로 결과 화면 표시 및 점수 제출 (백엔드 점수 사용)
                        handleGameComplete(true, res.grade_counts, res.final_rank, res.final_score);
                    } else {
                        // 중간에 수동 종료한 경우에도 결과 화면 표시
                        console.log("영상 중간 종료 - 결과 화면 표시 (백엔드 점수 사용)");
                        setHitCounts(res.grade_counts);
                        if (res.final_rank) {
                            setServerGrade(res.final_rank);
                        }
                        // 백엔드에서 계산한 점수로 결과 화면 표시
                        handleGameComplete(true, res.grade_counts, res.final_rank, res.final_score);
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

            // stop 메시지 전송 후 WebSocket은 stopped 메시지를 받은 후에 닫힘
        }
        // Camera continues running

        // Pause the YouTube video
        if (iframeRef && iframeRef.contentWindow) {
            iframeRef.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
    };

    const handleGameComplete = async (fromAutoComplete: boolean = false, providedGradeCounts?: any, providedGrade?: string, providedScore?: number) => {
        if (!selectedVideo) return;
        if (isGameRunning) handleStopGame();

        // 자동 완료가 아닌 경우(수동 종료)에만 WebSocket에 stop 메시지 전송
        if (!fromAutoComplete) {
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
                // 프레임 전송 중지
                if (frameIntervalRef.current) {
                    clearInterval(frameIntervalRef.current);
                    frameIntervalRef.current = null;
                }

                // 백엔드에 'stop' 메시지 전송
                ws.send(JSON.stringify({ type: "stop" }));
                console.log("Stop message sent to backend - waiting for stopped response");
                // stopped 응답을 기다림 (여기서 리턴)
                return;
            }
        }

        // 여기부터는 stopped 응답을 받았을 때 실행됨
        setIsGameRunning(false);

        // providedGradeCounts가 있으면 사용, 없으면 state의 hitCounts 사용
        const counts = providedGradeCounts || hitCounts;
        const grade = providedGrade || serverGrade || 'F';

        const totalHits = counts.PERFECT + counts.GOOD + counts.BAD;
        // if there isn't anything to submit, just show the default 0 result and return
        if (totalHits === 0) {
            setShowResults(true);
            return;
        }

        // 백엔드에서 계산한 점수 사용, 없으면 자체 계산 (백엔드와 동일한 공식)
        const totalScore = providedScore !== undefined
            ? Math.round(providedScore)
            : ((counts.PERFECT * 100.0 + counts.GOOD * 70.0 + counts.BAD * 30.0) / totalHits);
        const accuracy = totalHits > 0 ? ((totalHits - counts.BAD) / totalHits) * 100 : 0;

        // console.log('Max Combo at game completion:', maxComboRef.current);

        const results: GameResults = {
            totalScore,
            perfectHits: counts.PERFECT,
            goodHits: counts.GOOD,
            badHits: counts.BAD,
            accuracy: Math.round(accuracy * 10) / 10,
            grade: grade,
            maxCombo: maxComboRef.current
        };

        console.log('Game Results:', results);

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

            {/* Camera Selection Modal */}
            {isCameraSelectModalOpen && (
                <div className={styles.modal} onClick={() => setIsCameraSelectModalOpen(false)}>
                    <div className={styles.cameraSelectModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>카메라 선택</h2>
                            <button
                                className={styles.closeButton}
                                onClick={() => setIsCameraSelectModalOpen(false)}
                            >
                                닫기
                            </button>
                        </div>
                        <div className={styles.cameraList}>
                            {availableCameras.length === 0 ? (
                                <p className={styles.noCamerasText}>사용 가능한 카메라가 없습니다.</p>
                            ) : (
                                availableCameras.map((camera, idx) => (
                                    <div
                                        key={camera.deviceId}
                                        className={`${styles.cameraOption} ${selectedCameraId === camera.deviceId ? styles.cameraOptionSelected : ''
                                            }`}
                                        onClick={() => setSelectedCameraId(camera.deviceId)}
                                    >
                                        <div className={styles.cameraIcon}>📹</div>
                                        <div className={styles.cameraInfo}>
                                            <div className={styles.cameraName}>
                                                {camera.label || `카메라 ${idx + 1}`}
                                            </div>
                                            <div className={styles.cameraId}>{camera.deviceId.substring(0, 20)}...</div>
                                        </div>
                                        {selectedCameraId === camera.deviceId && (
                                            <div className={styles.checkmark}>✓</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className={styles.cameraSelectActions}>
                            <button
                                className={styles.primaryAction}
                                onClick={handleCameraSelect}
                                disabled={!selectedCameraId}
                            >
                                선택 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                            <button className={styles.primaryAction} onClick={() => handleGameComplete()}>운동 완료</button>
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
                                            {isGameRunning && !isWarmingUp && (
                                                <div className={`${styles.comboDisplay} ${comboPulse ? styles.comboPulse : ''}`}>
                                                    {combo > 0 && (
                                                        <>
                                                            <div className={styles.comboNumber}>{combo}</div>
                                                            <div className={styles.comboText}>COMBO</div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
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
                                            height="720"
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
                                        <div className={styles.maxComboLabel} style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7', marginTop: '8px' }}>
                                            Max Combo: {gameResults?.maxCombo}
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
            {/* Camera Preview - always render but control visibility with CSS */}
            <div className={styles.cameraPreview} style={{ display: isModalOpen ? 'block' : 'none' }}>
                <video ref={videoRef} playsInline muted autoPlay></video>
            </div>
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }}></canvas>
        </>
    );
}

export default Game;