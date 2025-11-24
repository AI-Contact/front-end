import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AnalysisDemo.module.css";
import { startExercise, completeExercise } from "../api/exerciseService";

// 웹소켓 URL (백엔드 서버로 직접 연결)
const WS_URL = "ws://localhost/api/exercises/pose-analysis/ws";

// 운동 이름 매핑 (백엔드 한글 이름 -> AI 서버 영문 이름)
const EXERCISE_NAME_MAP: Record<string, string> = {
  푸쉬업: "push_up",
  플랭크: "plank",
  크런치: "crunch",
  "크로스 런지": "cross_lunge",
  레그레이즈: "leg_raise",
};

// 피드백 메시지 -> TTS 파일 매핑
const FEEDBACK_TO_AUDIO: Record<string, string> = {
  "몸통을 앞발 방향으로 맞춰주세요": "/tts/1.mp3",
  "상체 균형을 유지하세요": "/tts/2.mp3",
  "허리를 지면에 고정하세요": "/tts/3.mp3",
  "어깨를 더 올려주세요": "/tts/4.mp3",
  "긴장을 유지하세요": "/tts/5.mp3",
  "무릎을 펴주세요": "/tts/7.mp3",
  "내릴 때도 긴장을 유지하세요": "/tts/8.mp3",
  "턱을 살짝 당겨주세요": "/tts/9.mp3",
  "팔꿈치를 어깨와 정렬하세요": "/tts/10.mp3",
  "몸통과 엉덩이의 정렬를 유지하세요": "/tts/11.mp3",
  "상체를 지면으로부터 충분히 올리세요": "/tts/12.mp3",
  "척추를 정렬을 맞춰주세요": "/tts/13.mp3",
  "손을 가슴 중앙에 위치시키세요": "/tts/14.mp3",
  "고개를 중립 상태로 유지하세요": "/tts/15.mp3",
  "가슴을 더 내려가세요": "/tts/16.mp3",
  "잘하고 있어요!": "/tts/17.mp3",
};

interface AIAnalysisStatus {
  is_running: boolean;
  is_warmup?: boolean;
  warmup_remaining?: number;
  message?: string;
  counters?: Record<string, number>;
  rep_count?: number;
  rep_scores?: Record<string, number>;
  elapsed_seconds?: number;
  total_score?: number;
  feedback_ko?: string;
  state?: string;
}

// 회차별 저장된 프레임 정보
interface RepFrame {
  frameData: string; // Base64 이미지
  feedback: string[]; // 피드백 메시지들
  state: string; // 운동 상태 (up/down/hold)
}

// 회차별 데이터
interface RepData {
  repNumber: number; // 회차 번호
  frames: RepFrame[]; // 해당 회차의 모든 프레임
  score?: number; // 점수 (0-1)
  finalFeedback?: string[]; // 최종 피드백
}

const AnalysisDemo = () => {
  const location = useLocation();
  const { mode, exercise: exerciseData } =
    (location.state as {
      mode?: string;
      exercise?: { title: string; id: number };
    }) || {};

  const exercise = exerciseData?.title || "";
  const [targetCount, setTargetCount] = useState<number | "">("");
  const [targetTime, setTargetTime] = useState<number | "">("");
  const [isRunning, setIsRunning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Exercise record tracking
  const [exerciseRecordId, setExerciseRecordId] = useState<number | null>(null);
  const exerciseStartTimeRef = useRef<Date | null>(null);

  // AI 분석 상태
  const [aiStatus, setAiStatus] = useState<AIAnalysisStatus>({
    is_running: false,
    counters: { reps: 0 },
    total_score: 0,
    feedback_ko: "운동을 시작하면 실시간 피드백이 표시됩니다.",
  });

  // 비디오 프레임 (Base64)
  const [videoFrame, setVideoFrame] = useState<string>("");

  // 회차별 모든 프레임 저장
  const [repDataList, setRepDataList] = useState<RepData[]>([]);

  // 현재 진행 중인 회차 추적
  const currentRepRef = useRef<number>(0);

  // 워밍업 상태 추적 (첫 번째 회차 처리용)
  const wasWarmupRef = useRef<boolean>(true);

  // 결과 모달 표시 여부
  const [showResultModal, setShowResultModal] = useState(false);

  // 운동 결과 저장 여부 추적
  const [isSaved, setIsSaved] = useState(false);

  // 각 회차의 현재 프레임 인덱스 추적 (애니메이션용)
  const [currentFrameIndices, setCurrentFrameIndices] = useState<Record<number, number>>({});

  // WebSocket 관련 refs
  const websocketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const sendFrameIntervalRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Audio for rep completion
  const repCompletionAudioRef = useRef<HTMLAudioElement | null>(null);

  // TTS Audio refs and queue
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const isPlayingTTSRef = useRef<boolean>(false);
  const lastFeedbackRef = useRef<string>("");

  // Initialize audio
  useEffect(() => {
    repCompletionAudioRef.current = new Audio('/ding.mp3');
    repCompletionAudioRef.current.volume = 0.5; // Adjust volume (0.0 to 1.0)
  }, []);

  // TTS playback function
  const playNextTTS = useCallback(() => {
    if (ttsQueueRef.current.length === 0) {
      isPlayingTTSRef.current = false;
      return;
    }

    isPlayingTTSRef.current = true;
    const audioPath = ttsQueueRef.current.shift()!;

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }

    ttsAudioRef.current = new Audio(audioPath);
    ttsAudioRef.current.volume = 0.7;

    ttsAudioRef.current.onended = () => {
      // Recursively play next - using setTimeout to avoid React warning
      setTimeout(() => {
        if (ttsQueueRef.current.length > 0) {
          playNextTTS();
        } else {
          isPlayingTTSRef.current = false;
        }
      }, 0);
    };

    ttsAudioRef.current.onerror = (error) => {
      console.log('TTS audio error:', error);
      setTimeout(() => {
        if (ttsQueueRef.current.length > 0) {
          playNextTTS();
        } else {
          isPlayingTTSRef.current = false;
        }
      }, 0);
    };

    ttsAudioRef.current.play().catch(err => {
      console.log('TTS play failed:', err);
      setTimeout(() => {
        if (ttsQueueRef.current.length > 0) {
          playNextTTS();
        } else {
          isPlayingTTSRef.current = false;
        }
      }, 0);
    });
  }, []);

  const playTTSFeedback = useCallback((feedback: string) => {
    const audioPath = FEEDBACK_TO_AUDIO[feedback];
    if (!audioPath) {
      console.log('No audio file for feedback:', feedback);
      return;
    }

    // Add to queue
    ttsQueueRef.current.push(audioPath);

    // Start playing if not already playing
    if (!isPlayingTTSRef.current) {
      playNextTTS();
    }
  }, [playNextTTS]);  // 모드 구분
  const isWebcamMode = mode === "webcam";
  const isUploadMode = mode === "upload";

  // 파일 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      console.log("업로드된 파일:", e.target.files[0].name);
    }
  };

  // 운동 시작 핸들러
  const handleStart = async () => {
    try {
      // 회차별 데이터 초기화
      setRepDataList([]);
      currentRepRef.current = 0;
      wasWarmupRef.current = true; // 워밍업 상태 초기화
      setIsSaved(false); // 저장 상태 초기화

      const isPlank = exercise === "플랭크";

      const exerciseNameEn = EXERCISE_NAME_MAP[exercise];
      console.log("운동 이름 매핑:", exercise, "→", exerciseNameEn);

      if (!exerciseNameEn) {
        alert("운동 종류를 선택해주세요.");
        return;
      }

      if (isUploadMode) {
        if (!uploadedFile) {
          alert("영상 파일을 선택해주세요.");
          return;
        }

        const video = document.createElement("video");
        const videoURL = URL.createObjectURL(uploadedFile);
        video.src = videoURL;
        video.playsInline = true;
        video.muted = true;

        video.onended = () => {
          console.log("비디오 재생 완료");
          handleStop(true);
        };

        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = reject;
        });

        videoElementRef.current = video;

        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 360;
        canvasElementRef.current = canvas;

      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480 },
            height: { ideal: 360 },
            frameRate: { ideal: 20, max: 30 },
          },
          audio: false,
        });

        localStreamRef.current = stream;

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        await video.play();

        videoElementRef.current = video;

        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 360;
        canvasElementRef.current = canvas;
      }

      // WebSocket 연결
      const ws = new WebSocket(WS_URL);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket 연결됨");

        const initMessage = {
          exercise: exerciseNameEn,
          is_video_mode: isUploadMode,
          target_reps:
            isUploadMode || isPlank
              ? null
              : typeof targetCount === "number"
                ? targetCount
                : null,
          target_time:
            isUploadMode || !isPlank
              ? null
              : typeof targetTime === "number"
                ? targetTime
                : null,
        };
        console.log("WebSocket 초기화:", initMessage);

        ws.send(JSON.stringify(initMessage));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "init_success") {
          console.log("초기화 성공:", data.message);
          setIsRunning(true);

          // Start exercise record via API
          if (exerciseData?.id) {
            exerciseStartTimeRef.current = new Date();
            const targetReps = typeof targetCount === "number" ? targetCount : 10;
            const estimatedDuration = targetReps * 2; // Estimate 2 minutes per rep

            startExercise({
              exercise_id: exerciseData.id,
              duration: estimatedDuration,
              repetitions: targetReps,
              sets_completed: 1,
            })
              .then((recordResponse) => {
                setExerciseRecordId(recordResponse.id);
                console.log("✅ Exercise record started:", recordResponse.id);
              })
              .catch((err) => {
                console.error("❌ Failed to start exercise record:", err);
              });
          }

          if (isUploadMode && videoElementRef.current) {
            videoElementRef.current.play();
          }

          const fps = isUploadMode ? 30 : 20;
          sendFrameIntervalRef.current = window.setInterval(
            sendFrame,
            1000 / fps
          );
        } else if (data.type === "frame") {
          // 처리된 프레임 표시
          setVideoFrame(data.frame);

          // 상태 업데이트
          if (data.status) {
            console.log(
              "📊 받은 status:",
              JSON.stringify(data.status, null, 2)
            );

            const actualRepCount =
              data.status.rep_scores &&
                Object.keys(data.status.rep_scores).length > 0
                ? Math.max(
                  ...Object.keys(data.status.rep_scores).map((k) =>
                    parseInt(k)
                  )
                )
                : data.status.rep_count || data.status.counters?.reps || 0;

            // 특별 처리: 워밍업이 끝나고 첫 번째 회차가 시작될 때
            if (wasWarmupRef.current && data.status.is_warmup === false && actualRepCount === 0) {
              console.log("🎯 워밍업 종료 - 첫 번째 회차 준비");
              wasWarmupRef.current = false;
              currentRepRef.current = 0; // 0으로 설정해서 actualRepCount가 1이 되면 새 rep이 생성되도록

              // 첫 번째 회차 데이터 생성
              setRepDataList([
                {
                  repNumber: 1,
                  frames: [],
                  score: undefined,
                  finalFeedback: [],
                }
              ]);
              console.log("🆕 첫 번째 회차 생성 (워밍업 종료 후)");
            }

            // 회차가 증가하면 새로운 RepData 생성
            // 첫 번째 rep의 경우: actualRepCount가 1이 되면 rep 2를 준비
            if (actualRepCount > currentRepRef.current && actualRepCount > 0) {
              // 이전 회차의 점수와 피드백 저장 (방금 완료된 회차)
              const completedRepNumber = actualRepCount; // 방금 완료된 회차

              // Play rep completion sound
              if (repCompletionAudioRef.current) {
                repCompletionAudioRef.current.currentTime = 0; // Reset to start
                repCompletionAudioRef.current.play().catch(err => {
                  console.log('Audio play failed:', err);
                });
              }

              // 점수 저장
              if (data.status.rep_scores) {
                const completedScore = data.status.rep_scores[completedRepNumber.toString()];
                if (completedScore !== undefined) {
                  setRepDataList(prev =>
                    prev.map(rep =>
                      rep.repNumber === completedRepNumber
                        ? { ...rep, score: completedScore }
                        : rep
                    )
                  );
                }
              }

              // 피드백 저장 (rep count가 증가할 때의 피드백은 완료된 회차에 대한 것)
              if (data.status.feedback_ko) {
                const feedbackMessages = data.status.feedback_ko
                  .split(" | ")
                  .map((msg: string) => msg.trim())
                  .filter((msg: string) => msg.length > 0);

                if (feedbackMessages.length > 0) {
                  setRepDataList(prev =>
                    prev.map(rep =>
                      rep.repNumber === completedRepNumber
                        ? { ...rep, finalFeedback: feedbackMessages }
                        : rep
                    )
                  );
                  console.log(`💬 회차 ${completedRepNumber}에 피드백 저장:`, feedbackMessages);
                }
              }

              currentRepRef.current = actualRepCount;

              // 다음 회차 데이터 추가 (actualRepCount + 1)
              const nextRepNumber = actualRepCount + 1;
              setRepDataList(prev => [
                ...prev,
                {
                  repNumber: nextRepNumber,
                  frames: [],
                  score: undefined,
                  finalFeedback: [],
                }
              ]);

              console.log(`🆕 새로운 회차 시작: ${nextRepNumber}회 (${actualRepCount}회 완료)`);
            }

            // 프레임 저장 로직: 현재 운동 중인 rep에만 프레임 저장 (피드백 제외)
            // actualRepCount는 "완료된" 회차 수를 나타냄
            // 현재 진행 중인 회차는 actualRepCount + 1
            const currentlyActiveRep = actualRepCount + 1;

            if (data.status.is_running && data.status.is_warmup === false && currentlyActiveRep > 0) {
              const newFrame: RepFrame = {
                frameData: data.frame,
                feedback: [], // 프레임에는 피드백 저장 안 함 (rep 완료 시 따로 저장)
                state: data.status.state || "unknown",
              };

              setRepDataList(prev => {
                // 현재 활성 rep이 존재하는지 확인
                const activeRepExists = prev.some(rep => rep.repNumber === currentlyActiveRep);

                if (!activeRepExists) {
                  // 활성 rep이 아직 없다면 생성 (방어 코드)
                  console.warn(`⚠️ Rep ${currentlyActiveRep}가 존재하지 않아 생성합니다.`);
                  return [
                    ...prev,
                    {
                      repNumber: currentlyActiveRep,
                      frames: [newFrame],
                      score: undefined,
                      finalFeedback: [],
                    }
                  ];
                }

                // 현재 활성 rep에 프레임 추가
                return prev.map(rep =>
                  rep.repNumber === currentlyActiveRep
                    ? { ...rep, frames: [...rep.frames, newFrame] }
                    : rep
                );
              });

              console.log(`➕ 회차 ${currentlyActiveRep}에 프레임 추가 (완료된 횟수: ${actualRepCount}, state: ${data.status.state || "unknown"})`);
            }

            // 현재 회차의 점수를 실시간으로 업데이트
            if (currentlyActiveRep > 0 && data.status.rep_scores) {
              const currentRepScore = data.status.rep_scores[currentlyActiveRep.toString()];
              if (currentRepScore !== undefined) {
                setRepDataList(prev =>
                  prev.map(rep =>
                    rep.repNumber === currentlyActiveRep
                      ? { ...rep, score: currentRepScore }
                      : rep
                  )
                );
              }
            }

            // Play TTS for new feedback
            if (data.status.feedback_ko && data.status.feedback_ko !== lastFeedbackRef.current) {
              const feedbackMessages = data.status.feedback_ko
                .split(" | ")
                .map((msg: string) => msg.trim())
                .filter((msg: string) => msg.length > 0);

              // Play TTS for each feedback message
              feedbackMessages.forEach((feedback: string) => {
                playTTSFeedback(feedback);
              });

              lastFeedbackRef.current = data.status.feedback_ko;
            }

            setAiStatus({
              ...data.status,
              rep_count: actualRepCount,
            });

            console.log(
              `✅ 실제 운동 횟수: ${actualRepCount} (백엔드 rep_count: ${data.status.rep_count}, 현재 진행 중인 회차: ${currentlyActiveRep})`
            );

            // 목표 횟수 도달 시 자동 중지
            if (
              typeof targetCount === "number" &&
              actualRepCount >= targetCount
            ) {
              console.log(`🎉 목표 달성! (${actualRepCount}/${targetCount})`);

              // 마지막 회차의 점수와 피드백 저장
              if (actualRepCount > 0) {
                // 점수 저장
                if (data.status.rep_scores) {
                  const lastRepScore = data.status.rep_scores[actualRepCount.toString()];
                  if (lastRepScore !== undefined) {
                    setRepDataList(prev =>
                      prev.map(rep =>
                        rep.repNumber === actualRepCount
                          ? { ...rep, score: lastRepScore }
                          : rep
                      )
                    );
                  }
                }

                // 피드백 저장 (목표 도달 시의 피드백은 마지막 완료된 회차에 대한 것)
                if (data.status.feedback_ko) {
                  const feedbackMessages = data.status.feedback_ko
                    .split(" | ")
                    .map((msg: string) => msg.trim())
                    .filter((msg: string) => msg.length > 0);

                  if (feedbackMessages.length > 0) {
                    setRepDataList(prev =>
                      prev.map(rep =>
                        rep.repNumber === actualRepCount
                          ? { ...rep, finalFeedback: feedbackMessages }
                          : rep
                      )
                    );
                    console.log(`💬 마지막 회차(${actualRepCount})에 피드백 저장:`, feedbackMessages);
                  }
                }
              }

              setTimeout(() => {
                handleStop(true);
                setShowResultModal(true); // 결과 모달 표시
              }, 500); // 마지막 프레임이 화면에 표시되도록 약간 지연
            }
          }

          // 처리 완료 플래그 해제
          isProcessingRef.current = false;
        } else if (data.type === "stopped") {
          console.log("운동 중지:", data.result);

          handleStop(true);
          setShowResultModal(true); // 결과 모달 표시
        } else if (data.type === "error") {
          console.error("오류:", data.message);
          alert("오류 발생: " + data.message);
          handleStop(true);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket 오류:", error);
        alert("WebSocket 연결 오류가 발생했습니다.");
        handleStop(true);
      };

      ws.onclose = () => {
        console.log("WebSocket 연결 종료");
      };
    } catch (error) {
      console.error("카메라 접근 오류:", error);
      alert("카메라에 접근할 수 없습니다: " + (error as Error).message);
    }
  };

  // 프레임 전송 함수
  const sendFrame = () => {
    const ws = websocketRef.current;
    const video = videoElementRef.current;
    const canvas = canvasElementRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!video || !canvas) {
      return;
    }

    // 비디오 파일 모드에서 비디오가 끝났는지 확인 (HTML 데모와 동일)
    if (isUploadMode) {
      if (video.ended || video.paused) {
        console.log("비디오 종료됨");
        handleStop(true); // 결과 유지
        return;
      }
    }

    // 이미 처리 중이면 건너뛰기 (프레임 드롭)
    if (isProcessingRef.current) {
      console.log("Skipping frame - still processing");
      return;
    }

    // 캔버스에 비디오 프레임 그리기
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Base64로 인코딩 (품질 낮춤)
    const frameData = canvas.toDataURL("image/jpeg", 0.6);

    // 처리 중 플래그 설정
    isProcessingRef.current = true;

    // WebSocket으로 전송
    try {
      ws.send(
        JSON.stringify({
          type: "frame",
          frame: frameData,
        })
      );
    } catch (error) {
      console.error("Failed to send frame:", error);
      isProcessingRef.current = false;
    }
  };

  // 운동 중지 핸들러
  const handleStop = useCallback(
    (keepResults = false) => {
      // 프레임 전송 중지
      if (sendFrameIntervalRef.current) {
        clearInterval(sendFrameIntervalRef.current);
        sendFrameIntervalRef.current = null;
      }

      // 처리 플래그 초기화
      isProcessingRef.current = false;

      // WebSocket 종료
      const ws = websocketRef.current;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "stop",
            })
          );
        }
        ws.close();
        websocketRef.current = null;
      }

      // 웹캠 중지
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("카메라 트랙 중지:", track.kind);
        });
        localStreamRef.current = null;
      }

      // 비디오 요소 정리
      const video = videoElementRef.current;
      if (video) {
        video.pause();

        // 웹캠 모드: srcObject 제거
        if (video.srcObject) {
          video.srcObject = null;
        }

        // 업로드 모드: src 제거
        if (isUploadMode && video.src) {
          URL.revokeObjectURL(video.src);
          video.src = "";
        }
      }
      videoElementRef.current = null;

      // 비디오 피드 초기화 (목표 달성 시에는 마지막 프레임 유지)
      if (!keepResults) {
        setVideoFrame("");
      }
      setIsRunning(false);

      // 상태 초기화 (목표 달성 시에는 결과 유지)
      if (!keepResults) {
        setAiStatus({
          is_running: false,
          counters: { reps: 0 },
          total_score: 0,
          feedback_ko: "운동을 시작하면 실시간 피드백이 표시됩니다.",
        });
      }
    },
    [isUploadMode]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      handleStop();
    };
  }, [handleStop]);

  // 각 회차의 프레임 애니메이션 (GIF처럼)
  useEffect(() => {
    if (!showResultModal || repDataList.length === 0) return;

    // 각 회차의 프레임 인덱스 초기화
    const initialIndices: Record<number, number> = {};
    repDataList.forEach(rep => {
      if (rep.frames.length > 0) {
        initialIndices[rep.repNumber] = 0;
      }
    });
    setCurrentFrameIndices(initialIndices);

    // 프레임 애니메이션 (30 FPS)
    const interval = setInterval(() => {
      setCurrentFrameIndices(prev => {
        const next: Record<number, number> = {};
        repDataList.forEach(rep => {
          if (rep.frames.length > 0) {
            const currentIndex = prev[rep.repNumber] || 0;
            next[rep.repNumber] = (currentIndex + 1) % rep.frames.length;
          }
        });
        return next;
      });
    }, 1000 / 30); // 30 FPS

    return () => clearInterval(interval);
  }, [showResultModal, repDataList]);

  // 운동 결과 저장 함수
  const handleSaveExercise = async () => {
    if (!exerciseRecordId || isSaved) {
      console.log("Already saved or no record ID");
      setShowResultModal(false);
      return;
    }
    console.log("🐢🐢🐢🐢:", aiStatus.total_score);
    try {
      const durationInMinutes = exerciseStartTimeRef.current
        ? Math.ceil((new Date().getTime() - exerciseStartTimeRef.current.getTime()) / 60000)
        : 1;

      const accuracyScore = (aiStatus.total_score || 0) * 100;
      const formScore = (aiStatus.total_score || 0) * 100;
      const tempoScore = (aiStatus.total_score || 0) * 100;
      const caloriesBurned = durationInMinutes * (exerciseData?.id ? 5 : 3); // Rough estimate

      await completeExercise(exerciseRecordId, {
        accuracy_score: accuracyScore,
        form_score: formScore,
        tempo_score: tempoScore,
        feedback_data: aiStatus.feedback_ko ? { feedback: aiStatus.feedback_ko } : undefined,
        pose_analysis: aiStatus.rep_scores ? { rep_scores: aiStatus.rep_scores } : undefined,
        calories_burned: caloriesBurned,
      });

      console.log("✅ Exercise saved successfully");
      setIsSaved(true);
      alert("운동 기록이 저장되었습니다!");
    } catch (err) {
      console.error("❌ Failed to save exercise record:", err);
      alert("운동 기록 저장에 실패했습니다.");
    }
  };

  const feedbackMessages =
    aiStatus.feedback_ko
      ?.split(" | ")
      .map((msg) => msg.trim())
      .filter((msg) => msg.length > 0) || [];

  const isPositiveFeedback = (msg: string) => {
    const positiveKeywords = [
      "잘하고 있어요",
      "좋아요",
      "완벽",
      "훌륭",
      "정확",
      "올바른",
      "잘",
    ];
    return positiveKeywords.some((keyword) => msg.includes(keyword));
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 설정 영역 - 가로 배치 */}
        <div className={styles.settingsSection}>
          <div className={styles.settingRow}>
            <label className={styles.label}>운동</label>
            <div className={styles.exerciseDisplay}>{exercise}</div>
          </div>

          {/* 업로드 모드일 때 파일 입력 표시 */}
          {isUploadMode && (
            <div className={styles.settingRow}>
              <label className={styles.label}>영상 파일</label>
              <input
                type="file"
                className={styles.fileInput}
                accept="video/*"
                onChange={handleFileChange}
                disabled={isRunning}
              />
            </div>
          )}

          {/* 웹캠 모드에서만 목표 설정 표시 */}
          {isWebcamMode && (
            <>
              {/* 플랭크가 아닐 때: 목표 횟수 */}
              {exercise !== "플랭크" && (
                <div className={styles.settingRow}>
                  <label className={styles.label}>목표 횟수</label>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={targetCount}
                    placeholder="목표 횟수 입력"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setTargetCount("");
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                          setTargetCount(numValue);
                        }
                      }
                    }}
                    min="1"
                    max="100"
                    disabled={isRunning}
                  />
                </div>
              )}
              {/* 플랭크일 때: 목표 시간 */}
              {exercise === "플랭크" && (
                <div className={styles.settingRow}>
                  <label className={styles.label}>목표 시간(초)</label>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={targetTime}
                    placeholder="목표 시간(초) 입력"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setTargetTime("");
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue > 0) {
                          setTargetTime(numValue);
                        }
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}

          <div className={styles.buttonRow}>
            <button
              className={styles.startButton}
              onClick={handleStart}
              disabled={isRunning || (isUploadMode && !uploadedFile)}
            >
              🚀 시작
            </button>
            <button
              className={styles.stopButton}
              onClick={() => {
                handleStop(true);
                setShowResultModal(true);
              }}
              disabled={!isRunning}
            >
              ⏹️ 중지
            </button>
            <button
              className={styles.resultButton}
              onClick={() => setShowResultModal(true)}
              disabled={repDataList.length === 0}
            >
              📊 결과 보기
            </button>
          </div>
        </div>

        {/* Main Content - 카메라 & 정보 */}
        <div className={styles.mainContent}>
          {/* Left - 카메라 */}
          <div className={styles.leftPanel}>
            <div className={styles.cameraSection}>
              {videoFrame ? (
                <img
                  src={videoFrame}
                  alt="AI Video Stream"
                  className={styles.videoStream}
                />
              ) : (
                <div className={styles.cameraPlaceholder}>
                  <p>카메라 대기 중...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - 정보 */}
          <div className={styles.rightPanel}>
            {/* 현재 상태 */}
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>📊 현재 상태</h3>

              {/* 가로 배치 그리드 */}
              <div className={styles.statusGrid}>
                {/* 운동 종류 */}
                <div className={styles.statusBox}>
                  <div className={styles.statusBoxIcon}>🏋️</div>
                  <div className={styles.statusBoxLabel}>운동</div>
                  <div className={styles.statusBoxValue}>{exercise}</div>
                </div>

                {/* 운동 상태 */}
                <div className={styles.statusBox}>
                  <div className={styles.statusBoxIcon}>
                    {aiStatus.is_running ? "▶️" : "⏸️"}
                  </div>
                  <div className={styles.statusBoxLabel}>상태</div>
                  <div
                    className={`${styles.statusBoxValue} ${aiStatus.is_running
                      ? styles.statusRunning
                      : styles.statusWaiting
                      }`}
                  >
                    {aiStatus.state
                      ? aiStatus.state
                      : aiStatus.is_running
                        ? "실행 중"
                        : "대기 중"}
                  </div>
                </div>

                {/* 카운트 (플랭크가 아닐 때) */}
                {exercise !== "플랭크" && (
                  <div className={styles.statusBox}>
                    <div className={styles.statusBoxIcon}>🔢</div>
                    <div className={styles.statusBoxLabel}>횟수</div>
                    <div className={styles.statusBoxValue}>
                      {aiStatus.rep_count || 0}
                      {typeof targetCount === "number" && ` / ${targetCount}`}
                    </div>
                  </div>
                )}

                {/* 경과 시간 (플랭크일 때) */}
                {exercise === "플랭크" &&
                  aiStatus.elapsed_seconds !== undefined && (
                    <div className={styles.statusBox}>
                      <div className={styles.statusBoxIcon}>⏱️</div>
                      <div className={styles.statusBoxLabel}>경과 시간</div>
                      <div className={styles.statusBoxValue}>
                        {aiStatus.elapsed_seconds.toFixed(1)}초
                        {typeof targetTime === "number" && ` / ${targetTime}초`}
                      </div>
                    </div>
                  )}

                {/* 경과 시간 (플랭크가 아닐 때) */}
                {aiStatus.elapsed_seconds !== undefined &&
                  exercise !== "플랭크" && (
                    <div className={styles.statusBox}>
                      <div className={styles.statusBoxIcon}>⏱️</div>
                      <div className={styles.statusBoxLabel}>경과 시간</div>
                      <div className={styles.statusBoxValue}>
                        {aiStatus.elapsed_seconds}초
                      </div>
                    </div>
                  )}
              </div>

              {/* 워밍업 알림 */}
              {aiStatus.is_warmup && (
                <div className={styles.warmupAlert}>
                  <div className={styles.warmupIcon}>⚠️</div>
                  <div className={styles.warmupContent}>
                    <div className={styles.warmupMessage}>
                      {aiStatus.message || "시작 자세를 취해주세요!"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 피드백 */}
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>💬 피드백</h3>
              {feedbackMessages.length > 0 ? (
                <div className={styles.feedbackList}>
                  {feedbackMessages.map((msg, index) => {
                    const isPositive = isPositiveFeedback(msg);
                    return (
                      <div
                        key={index}
                        className={`${styles.feedbackItem} ${isPositive
                          ? styles.feedbackPositive
                          : styles.feedbackNegative
                          }`}
                      >
                        <span className={styles.feedbackIcon}>
                          {isPositive ? "✅" : "⚠️"}
                        </span>
                        <span className={styles.feedbackText}>{msg}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.feedbackPlaceholder}>
                  운동을 시작하면 실시간 피드백이 표시됩니다.
                </div>
              )}
            </div>

            {/* 점수 */}
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>📈 점수</h3>
              <div className={`${styles.infoRow} ${styles.infoRowLast}`}>
                <span className={styles.infoLabel}>평균 점수:</span>
                <span className={styles.infoValue}>
                  {aiStatus.total_score
                    ? `${(aiStatus.total_score * 100).toFixed(2)}점`
                    : "-"}
                </span>
              </div>

              {/* 각 회차별 점수 */}
              {aiStatus.rep_scores &&
                Object.keys(aiStatus.rep_scores).length > 0 && (
                  <div className={styles.repScoresContainer}>
                    <div className={styles.repScoresTitle}>회차별 점수</div>
                    <div className={styles.repScoresList}>
                      {Object.entries(aiStatus.rep_scores)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([rep, score]) => {
                          const scoreValue = score * 100;
                          const scoreClass =
                            scoreValue >= 80
                              ? styles.scoreExcellent
                              : scoreValue >= 60
                                ? styles.scoreGood
                                : styles.scoreNeedsWork;
                          return (
                            <div key={rep} className={styles.repScoreItem}>
                              <div className={styles.repNumber}>
                                <span className={styles.repBadge}>{rep}회</span>
                              </div>
                              <div className={styles.repScoreBar}>
                                <div
                                  className={`${styles.repScoreFill} ${scoreClass}`}
                                  style={{ width: `${scoreValue}%` }}
                                >
                                  <span className={styles.repScoreValue}>
                                    {scoreValue.toFixed(1)}점
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* 결과 모달 */}
      {showResultModal && (
        <div className={styles.modalOverlay} onClick={() => setShowResultModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>🎯 운동 결과</h2>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowResultModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* 요약 정보 */}
              <div className={styles.resultSummary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>운동:</span>
                  <span className={styles.summaryValue}>{exercise}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>완료 횟수:</span>
                  <span className={styles.summaryValue}>{aiStatus.rep_count || 0}회</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>평균 점수:</span>
                  <span className={styles.summaryValue}>
                    {aiStatus.total_score ? `${(aiStatus.total_score * 100).toFixed(2)}점` : "-"}
                  </span>
                </div>
              </div>

              {/* 회차별 프레임들 */}
              {repDataList.length > 0 ? (
                <div className={styles.repsContainer}>
                  {repDataList
                    .filter((repData) => repData.frames.length > 0)
                    .sort((a, b) => a.repNumber - b.repNumber)
                    .map((repData) => (
                      <div key={repData.repNumber} className={styles.repSection}>
                        <div className={styles.repHeader}>
                          <h3 className={styles.repTitle}>
                            {repData.repNumber}회차
                          </h3>
                          {repData.score !== undefined && (
                            <span className={`${styles.repScore} ${repData.score >= 0.8 ? styles.scoreExcellent :
                              repData.score >= 0.6 ? styles.scoreGood :
                                styles.scoreNeedsWork
                              }`}>
                              {(repData.score * 100).toFixed(1)}점
                            </span>
                          )}
                        </div>

                        {/* 애니메이션으로 프레임 재생 (GIF처럼) */}
                        {repData.frames.length > 0 && (
                          <div className={styles.repAnimationContainer}>
                            {(() => {
                              const currentIndex = currentFrameIndices[repData.repNumber] || 0;
                              const currentFrame = repData.frames[currentIndex];

                              return (
                                <>
                                  <div className={styles.animationWrapper}>
                                    <img
                                      src={currentFrame.frameData}
                                      alt={`Rep ${repData.repNumber} Animation`}
                                      className={styles.animatedFrameImage}
                                    />
                                    <div className={styles.animationOverlay}>
                                      <div className={styles.frameCounter}>
                                        Frame {currentIndex + 1} / {repData.frames.length}
                                      </div>
                                      <div className={styles.frameStateInfo}>
                                        <span className={styles.stateIndicator}>{currentFrame.state}</span>                                      </div>
                                    </div>
                                  </div>
                                  {/* 회차 완료 후 받은 최종 피드백 표시 */}
                                  {repData.finalFeedback && repData.finalFeedback.length > 0 && (
                                    <div className={styles.animatedFrameFeedback}>
                                      <div className={styles.feedbackTitle}>회차 완료 피드백:</div>
                                      {repData.finalFeedback.map((msg, msgIndex) => (
                                        <div key={msgIndex} className={styles.animatedFeedbackLine}>
                                          {msg}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className={styles.noNegativeFeedback}>
                  <p>ℹ️ 기록된 프레임이 없습니다.</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.modalConfirmButton}
                onClick={handleSaveExercise}
                disabled={isSaved || !exerciseRecordId}
              >
                {isSaved ? "✅ 저장 완료" : "💾 결과 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisDemo;
