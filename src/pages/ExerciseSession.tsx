import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ExerciseSession.module.css';
import { completeExercise } from '../api/exerciseService';
import { useState } from 'react';

const ExerciseSession = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { exercise, recordData } = location.state || {};
    const [startTime] = useState(new Date());

    const handleEndExercise = async () => {
        if (!window.confirm('운동을 종료하시겠습니까?')) {
            return;
        }

        // 운동 완료 API 호출 (recordData가 있을 때만)
        if (recordData?.id) {
            try {
                // 운동 시간 계산 (초 단위)
                const endTime = new Date();
                const durationInSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
                const minutes = Math.floor(durationInSeconds / 60);
                const seconds = durationInSeconds % 60;

                console.log('=== 운동 시간 계산 ===');
                console.log('시작 시간:', startTime);
                console.log('종료 시간:', endTime);
                console.log('총 운동 시간:', `${minutes}분 ${seconds}초 (${durationInSeconds}초)`);

                const completeResponse = await completeExercise(recordData.id, {
                    accuracy_score: 85, // 임시 점수 (나중에 실제 분석 결과로 대체)
                    form_score: 90,
                    tempo_score: 80,
                    calories_burned: 150,
                    feedback_data: {},
                    pose_analysis: {},
                });

                console.log('=== 운동 완료 API 응답 ===');
                console.log('Record ID:', completeResponse.id);
                console.log('Accuracy Score:', completeResponse.accuracy_score);
                console.log('Form Score:', completeResponse.form_score);
                console.log('Tempo Score:', completeResponse.tempo_score);
                console.log('Calories Burned:', completeResponse.calories_burned);
                console.log('Completed At:', completeResponse.completed_at);
                console.log('Duration (분):', completeResponse.duration);
                console.log('전체 응답 데이터:', completeResponse);


                // 계산된 운동 시간을 함께 전달
                navigate('/workout', {
                    replace: false,
                    state: {
                        completedExercise: {
                            exerciseId: exercise.id,
                            durationInSeconds: durationInSeconds
                        }
                    }
                });
                return;

            } catch (err) {
                console.error('운동 완료 기록 실패:', err);
            }
        }


        navigate('/workout', { replace: false });
    };

    return (
        <div className={styles.container}>
            {/* 상단 헤더 */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.exerciseTitle}>{exercise?.title || '운동 세션'}</h1>
                    <span className={styles.difficultyBadge}>{exercise?.difficulty || '초급'}</span>
                </div>
                <button className={styles.endButton} onClick={handleEndExercise}>
                    운동 종료하기
                </button>
            </div>

            {/* 메인 컨텐츠 */}
            <div className={styles.mainContent}>
                {/* 카메라 영역 */}
                <div className={styles.cameraSection}>
                    <div className={styles.cameraPlaceholder}>
                        <p>카메라 연결 대기 중...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExerciseSession;
