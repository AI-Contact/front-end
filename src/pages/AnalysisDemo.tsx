import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AnalysisDemo.module.css";

// 웹소켓 URL (백엔드 서버로 직접 연결)
const WS_URL = "ws://34.61.174.62/api/exercises/pose-analysis/ws";

// 운동 이름 매핑 (백엔드 한글 이름 -> AI 서버 영문 이름)
const EXERCISE_NAME_MAP: Record<string, string> = {
  "푸쉬업": "push_up",
  "플랭크": "plank",
  "크런치": "crunch",
  "크로스 런지": "cross_lunge",
  "레그레이즈": "leg_raise",
};

interface AIAnalysisStatus {
  is_running: boolean;
  is_warmup?: boolean;
  warmup_remaining?: number;
  message?: string; // 워밍업 메시지 등
  counters?: Record<string, number>;
  rep_count?: number; // 총 운동 횟수 (백엔드에서 전송)
  rep_scores?: Record<string, number>; // 각 회차별 점수
  elapsed_seconds?: number;
  total_score?: number;
  feedback_ko?: string;
  state?: string; // 현재 운동 상태 (up, down, hold 등)
}

const AnalysisDemo = () => {
  const location = useLocation();
  const { mode, exercise: exerciseData } =
    (location.state as { mode?: string; exercise?: { title: string; id: number } }) || {};

  const exercise = exerciseData?.title || "";
  const [targetCount, setTargetCount] = useState<number | "">(""); // 빈 필드로 시작
  const [targetTime, setTargetTime] = useState<number | "">(""); // 플랭크용 목표 시간
  const [isRunning, setIsRunning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // AI 분석 상태
  const [aiStatus, setAiStatus] = useState<AIAnalysisStatus>({
    is_running: false,
    counters: { reps: 0 },
    total_score: 0,
    feedback_ko: "운동을 시작하면 실시간 피드백이 표시됩니다.",
  });

  // 비디오 프레임 (Base64)
  const [videoFrame, setVideoFrame] = useState<string>("");

  // WebSocket 관련 refs
  const websocketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const sendFrameIntervalRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // 모드 구분
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
      // 플랭크 여부 확인
      const isPlank = exercise === "플랭크";

      const exerciseNameEn = EXERCISE_NAME_MAP[exercise];
      console.log("운동 이름 매핑:", exercise, "→", exerciseNameEn);

      if (!exerciseNameEn) {
        alert("운동 종류를 선택해주세요.");
        return;
      }

      if (isUploadMode) {
        // 업로드 모드: 파일을 읽어서 비디오로 처리
        if (!uploadedFile) {
          alert("영상 파일을 선택해주세요.");
          return;
        }

        // 비디오 요소 생성 및 파일 로드
        const video = document.createElement("video");
        const videoURL = URL.createObjectURL(uploadedFile);
        video.src = videoURL;
        video.playsInline = true;
        video.muted = true;

        // 비디오 종료 시 자동 중지 (결과 유지)
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

        // 비디오 재생은 WebSocket 초기화 후에 시작 (init_success에서)
      } else {
        // 웹캠 모드: 웹캠 접근 (해상도 낮춤 for 속도 개선)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480 },
            height: { ideal: 360 },
            frameRate: { ideal: 20, max: 30 },
          },
          audio: false,
        });

        localStreamRef.current = stream;

        // 비디오 및 캔버스 요소 생성
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

        // 초기화 메시지 전송 (HTML 데모와 동일한 형식)
        const initMessage = {
          exercise: exerciseNameEn,
          is_video_mode: isUploadMode, // 업로드 모드 여부 전달
          target_reps: isUploadMode || isPlank ? null : (typeof targetCount === "number" ? targetCount : null),
          target_time: isUploadMode || !isPlank ? null : (typeof targetTime === "number" ? targetTime : null),
        };
        console.log("WebSocket 초기화:", initMessage);

        ws.send(JSON.stringify(initMessage));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "init_success") {
          console.log("초기화 성공:", data.message);
          setIsRunning(true);

          // 업로드 모드면 비디오 재생 시작 (HTML 데모와 동일)
          if (isUploadMode && videoElementRef.current) {
            videoElementRef.current.play();
          }

          // 프레임 전송 시작 (HTML 데모와 동일: 웹캠 20fps, 비디오 30fps)
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
            // 전체 status 로그 (디버깅용)
            console.log("📊 받은 status:", JSON.stringify(data.status, null, 2));

            // rep_scores의 최대 키 값으로 실제 완료된 횟수 확인
            // 우선순위: rep_scores > rep_count > counters.reps
            const actualRepCount = data.status.rep_scores && Object.keys(data.status.rep_scores).length > 0
              ? Math.max(...Object.keys(data.status.rep_scores).map(k => parseInt(k)))
              : (data.status.rep_count || data.status.counters?.reps || 0);

            // aiStatus 업데이트 시 실제 횟수 반영
            setAiStatus({
              ...data.status,
              rep_count: actualRepCount, // 실제 완료된 횟수로 덮어쓰기
            });

            // 카운팅 업데이트 로그 (디버깅용)
            console.log(`✅ 실제 운동 횟수: ${actualRepCount} (백엔드 rep_count: ${data.status.rep_count})`);

            // 목표 횟수 도달 시 자동 중지
            if (typeof targetCount === "number" && actualRepCount >= targetCount) {
              console.log(`🎉 목표 달성! (${actualRepCount}/${targetCount})`);

              // localStorage에 평균 점수 저장
              if (exerciseData?.id && data.status.total_score) {
                const averageScore = (data.status.total_score * 100).toFixed(2);
                localStorage.setItem(`exercise_${exerciseData.id}_score`, averageScore);
                console.log(`✅ 점수 저장: Exercise ${exerciseData.id} -> ${averageScore}점`);
              }

              setTimeout(() => {
                handleStop(true); // 결과 유지
                alert(`목표 달성!\n완료 횟수: ${actualRepCount}\n평균 점수: ${data.status.total_score ? (data.status.total_score * 100).toFixed(2) : 0}점`);
              }, 500); // 마지막 프레임이 화면에 표시되도록 약간 지연
            }
          }

          // 처리 완료 플래그 해제
          isProcessingRef.current = false;
        } else if (data.type === "stopped") {
          console.log("운동 중지:", data.result);
          handleStop(true); // 결과 유지

          // 결과 표시
          if (data.result.rep_count) {
            alert(
              `운동 완료!\n횟수: ${data.result.rep_count
              }\n평균 점수: ${data.result.total_score.toFixed(2)}`
            );
          }
        } else if (data.type === "error") {
          console.error("오류:", data.message);
          alert("오류 발생: " + data.message);
          handleStop(true); // 에러 발생 시에도 결과 유지
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket 오류:", error);
        alert("WebSocket 연결 오류가 발생했습니다.");
        handleStop(true); // 에러 발생 시에도 결과 유지
      };

      ws.onclose = () => {
        console.log("WebSocket 연결 종료");
        // 정상 종료 시 결과 유지
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
  const handleStop = useCallback((keepResults = false) => {
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
        console.log('카메라 트랙 중지:', track.kind);
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
        video.src = '';
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
  }, [isUploadMode]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      handleStop();
    };
  }, [handleStop]);

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
              onClick={() => handleStop(true)}
              disabled={!isRunning}
            >
              ⏹️ 중지
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
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>운동:</span>
                <span className={styles.infoValue}>{exercise}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>상태:</span>
                {aiStatus.state ? (
                  <span className={styles.infoValue}>{aiStatus.state}</span>
                ) : (
                  <span className={styles.infoValue}>
                    {aiStatus.is_running ? "실행 중" : "대기 중"}
                  </span>
                )}
              </div>
              {aiStatus.is_warmup && (
                <div className={styles.warmupAlert}>
                  <div className={styles.warmupMessage}>
                    {aiStatus.message || "시작 자세를 취해주세요!"}
                  </div>
                  {aiStatus.warmup_remaining !== undefined && (
                    <div className={styles.warmupTime}>
                      {Math.ceil(aiStatus.warmup_remaining)}초 남음
                    </div>
                  )}
                </div>
              )}

              {/* 플랭크가 아닐 때 카운트 표시 */}
              {exercise !== "플랭크" && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>카운트:</span>
                  <span className={styles.infoValue}>
                    {aiStatus.rep_count || 0} / {typeof targetCount === "number" ? targetCount : "-"}
                  </span>
                </div>
              )}

              {/* 플랭크일 때 경과 시간 표시 */}
              {exercise === "플랭크" && aiStatus.elapsed_seconds !== undefined && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>경과 시간:</span>
                  <span className={styles.infoValue}>
                    {aiStatus.elapsed_seconds.toFixed(1)}초 / {typeof targetTime === "number" ? targetTime : "-"}초
                  </span>
                </div>
              )}

              {aiStatus.elapsed_seconds !== undefined && exercise !== "플랭크" && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>경과 시간:</span>
                  <span className={styles.infoValue}>
                    {aiStatus.elapsed_seconds}초
                  </span>
                </div>
              )}
            </div>

            {/* 피드백 */}
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>💬 피드백</h3>
              <div className={styles.feedbackContent}>
                {aiStatus.feedback_ko ? (
                  aiStatus.feedback_ko.split(" | ").map((msg, index) => (
                    <p key={index} className={styles.feedbackMessage}>{msg.trim()}</p>
                  ))
                ) : (
                  <p>운동을 시작하면 실시간 피드백이 표시됩니다.</p>
                )}
              </div>
            </div>

            {/* 점수 */}
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>📈 점수</h3>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>현재 횟수:</span>
                <span className={styles.infoValue}>
                  {aiStatus.rep_count || 0}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>평균 점수:</span>
                <span className={styles.infoValue}>
                  {aiStatus.total_score
                    ? `${(aiStatus.total_score * 100).toFixed(2)}점`
                    : "-"}
                </span>
              </div>

              {/* 각 회차별 점수 */}
              {aiStatus.rep_scores && Object.keys(aiStatus.rep_scores).length > 0 && (
                <div style={{ marginTop: "10px", maxHeight: "200px", overflowY: "auto" }}>
                  <div style={{ fontSize: "0.9em", color: "#666", marginBottom: "5px" }}>회차별 점수:</div>
                  {Object.entries(aiStatus.rep_scores)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([rep, score]) => (
                      <div key={rep} style={{ fontSize: "0.85em", padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                        <span>{rep}회:</span>
                        <span>{(score * 100).toFixed(2)}점</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDemo;
