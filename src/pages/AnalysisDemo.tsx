import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import styles from "./AnalysisDemo.module.css";

// 웹소켓 URL (백엔드 서버로 직접 연결)
const WS_URL = "ws://localhost/api/exercises/pose-analysis/ws";

// 운동 이름 매핑 (백엔드 한글 이름 -> AI 서버 영문 이름)
const EXERCISE_NAME_MAP: Record<string, string> = {
  "팔굽혀펴기": "push_up",
  "푸시업": "push_up",
  "스쿼트": "squat",
  "플랭크": "plank",
  "런지": "lunge",
  "크런치": "crunch",
  "크로스 런지": "cross_lunge",
  "레그 레이즈": "leg_raise",
};

interface AIAnalysisStatus {
  is_running: boolean;
  is_warmup?: boolean;
  warmup_remaining?: number;
  counters?: Record<string, number>;
  elapsed_seconds?: number;
  total_score?: number;
  feedback_ko?: string;
}

const AnalysisDemo = () => {
  const location = useLocation();
  const { mode, exercise: exerciseData } =
    (location.state as { mode?: string; exercise?: { title: string } }) || {};

  const exercise = exerciseData?.title || "팔굽혀펴기";
  const [targetCount, setTargetCount] = useState(3);
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
      const exerciseNameEn = EXERCISE_NAME_MAP[exercise] || "push_up";
      console.log("운동 이름 매핑:", exercise, "→", exerciseNameEn);

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

        // 비디오 종료 시 자동 중지
        video.onended = () => {
          console.log("비디오 재생 완료");
          handleStop();
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
          target_reps: isUploadMode ? null : targetCount || null,
          target_time: isUploadMode ? null : null,
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
            setAiStatus(data.status);
          }

          // 처리 완료 플래그 해제
          isProcessingRef.current = false;
        } else if (data.type === "stopped") {
          console.log("운동 중지:", data.result);
          handleStop();

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
          handleStop();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket 오류:", error);
        alert("WebSocket 연결 오류가 발생했습니다.");
        handleStop();
      };

      ws.onclose = () => {
        console.log("WebSocket 연결 종료");
        handleStop();
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
        handleStop();
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
  const handleStop = useCallback(() => {
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
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // 업로드 비디오 정리
    const video = videoElementRef.current;
    if (video && isUploadMode) {
      video.pause();
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    }
    videoElementRef.current = null;

    // 비디오 피드 초기화
    setVideoFrame("");
    setIsRunning(false);

    // 상태 초기화
    setAiStatus({
      is_running: false,
      counters: { reps: 0 },
      total_score: 0,
      feedback_ko: "운동을 시작하면 실시간 피드백이 표시됩니다.",
    });
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

          {/* 웹캠 모드에서만 목표 횟수 표시 (업로드 모드는 목표 불필요) */}
          {isWebcamMode && (
            <div className={styles.settingRow}>
              <label className={styles.label}>목표 횟수</label>
              <input
                type="number"
                className={styles.numberInput}
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value) || 3)}
                min="1"
                max="100"
                disabled={isRunning}
              />
            </div>
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
              onClick={handleStop}
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
                <span className={styles.infoValue}>
                  {aiStatus.is_running ? "실행 중" : "대기 중"}
                </span>
              </div>
              {aiStatus.is_warmup && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>워밍업:</span>
                  <span className={styles.infoValue}>
                    {aiStatus.warmup_remaining
                      ? `${aiStatus.warmup_remaining.toFixed(1)}초`
                      : "준비 중"}
                  </span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>카운트:</span>
                <span className={styles.infoValue}>
                  {aiStatus.counters?.reps || 0} / {targetCount}
                </span>
              </div>
              {aiStatus.elapsed_seconds !== undefined && (
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
                <p>
                  {aiStatus.feedback_ko ||
                    "운동을 시작하면 실시간 피드백이 표시됩니다."}
                </p>
              </div>
            </div>

            {/* 점수 */}
            <div className={styles.infoCard}>
              <h3 className={styles.cardTitle}>📈 점수</h3>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>현재 횟수:</span>
                <span className={styles.infoValue}>
                  {aiStatus.counters?.reps || 0}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>평균 점수:</span>
                <span className={styles.infoValue}>
                  {aiStatus.total_score
                    ? `${aiStatus.total_score.toFixed(2)}점`
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDemo;
