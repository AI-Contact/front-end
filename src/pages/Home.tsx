import styles from './Home.module.css';
import { IoSparkles } from 'react-icons/io5';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { getExercises, getMyRecords } from '../api/exerciseService';

interface ExerciseScore {
    exerciseId: number;
    exerciseName: string;
    exerciseReps: number;
    score: number;
}

interface CalendarDay {
    date: Date;
    dateKey: string;
    day: number;
    dayOfWeek: number;
    exercises: ExerciseScore[];
}

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const progressRef = useRef<HTMLDivElement>(null);
    const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);

    // 더미 데이터
    const rankings = [
        { rank: 1, emoji: '👑', name: '운동왕김철수', score: '9,850', type: 'gold' },
        { rank: 2, emoji: '🥈', name: '헬스마니아', score: '9,720', type: 'silver' },
        { rank: 3, emoji: '🥉', name: '다이어트중', score: '9,650', type: 'bronze' },
        { rank: 4, name: '초보운동러', score: '8,430', type: 'regular' },
        { rank: 5, name: '꾸준함의달인', score: '7,980', type: 'regular' },
    ];

    // 기록운동 페이지로 이동
    const handleStartWorkout = () => {
        navigate('/workout');
    };

    // 진행상황 섹션으로 스크롤
    const handleViewProgress = () => {
        progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // 운동 데이터 가져오기
    useEffect(() => {
        const fetchProgressData = async () => {
            try {

                // 운동 완료 후 전달된 데이터 확인
                const completedExercise = (location.state as { completedExercise?: { exerciseId: number; durationInSeconds: number } })?.completedExercise;
                if (completedExercise) {
                    console.log('=== Home - 완료된 운동 정보 ===');
                    console.log('Exercise ID:', completedExercise.exerciseId);
                    console.log('Duration (초):', completedExercise.durationInSeconds);
                }


                // 운동 목록 가져오기
                const exercises = await getExercises({ limit: 5 });

                // 내 운동 기록 가져오기
                let myRecords: Array<{
                    exercise_id: number;
                    completed_at?: string;
                    accuracy_score?: number;
                    repetitions?: number;
                }> = [];
                try {
                    myRecords = await getMyRecords({ limit: 100 });
                    console.log('Home - 내 운동 기록:', myRecords);

                } catch (recordErr) {
                    console.log('운동 기록 조회 실패:', recordErr);
                }

                // 캘린더 데이터 생성 (현재 달의 모든 날짜)
                const calendarDataMap: Record<string, ExerciseScore[]> = {};

                // 운동별 이름 매핑
                const exerciseNameMap: Record<number, string> = {};
                exercises.forEach((exercise: { id: number; name: string }) => {
                    exerciseNameMap[exercise.id] = exercise.name;
                });

                myRecords.forEach((record: {
                    exercise_id: number;
                    completed_at?: string;
                    accuracy_score?: number;
                    repetitions?: number;
                }) => {
                    const recordDate = record.completed_at ? new Date(record.completed_at) : null;
                    if (!recordDate) return;

                    const dateKey = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD

                    if (!calendarDataMap[dateKey]) {
                        calendarDataMap[dateKey] = [];
                    }

                    // Convert score from 0-100 range (accuracy_score is already 0-100 from API)
                    const score = record.accuracy_score || 0;

                    calendarDataMap[dateKey].push({
                        exerciseId: record.exercise_id - 1,
                        exerciseName: exerciseNameMap[record.exercise_id - 1] || '운동',
                        exerciseReps: record.repetitions || 0,
                        score: score,
                    });
                });

                // Generate current month calendar
                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth();

                // Get first day of the month and last day of the month
                const firstDay = new Date(currentYear, currentMonth, 1);
                const lastDay = new Date(currentYear, currentMonth + 1, 0);

                // Calculate starting day to fill the calendar grid
                const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
                const daysInMonth = lastDay.getDate();

                const calendar: CalendarDay[] = [];

                // Add empty days for proper calendar alignment
                for (let i = 0; i < startingDayOfWeek; i++) {
                    const emptyDate = new Date(currentYear, currentMonth, -(startingDayOfWeek - i - 1));
                    calendar.push({
                        date: emptyDate,
                        dateKey: '',
                        day: emptyDate.getDate(),
                        dayOfWeek: i,
                        exercises: [],
                    });
                }

                // Add all days of the current month
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(currentYear, currentMonth, day);
                    const dateKey = date.toISOString().split('T')[0];
                    const dayOfWeek = date.getDay();

                    calendar.push({
                        date: date,
                        dateKey: dateKey,
                        day: day,
                        dayOfWeek: dayOfWeek,
                        exercises: calendarDataMap[dateKey] || [],
                    });
                }

                setCalendarData(calendar);
            } catch (err) {
                console.error('진행상황 데이터 로드 실패:', err);
            }
        };

        fetchProgressData();
    }, [location.key, location.state]);

    // 운동별 고유 색상 생성 (exerciseId 기반)
    const getExerciseColor = (exerciseId: number) => {
        const colors = [
            "#FF6B6B", "#4D96FF", "#FFD166", "#6BCB77", "#9B5DE5"
        ];
        return colors[exerciseId % colors.length];
    };

    return (
        <div className={styles.home}>
            {/* Top Section: Welcome Banner + Weekly Ranking + Calendar */}
            <div className={styles.topSection}>
                {/* Left Column: Banner + Ranking */}
                <div className={styles.leftColumn}>
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
                            <button className={styles.primaryButton} onClick={handleStartWorkout}>
                                오늘의 운동 시작
                            </button>
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

                {/* Workout Calendar */}
                <div className={styles.workoutCalendar}>
                    <h2 className={styles.cardTitle}>나의 운동 캘린더</h2>
                    <p className={styles.calendarSubtitle}>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월</p>

                    {/* Days of week header */}
                    <div className={styles.calendarHeader}>
                        <div className={styles.dayOfWeek}>일</div>
                        <div className={styles.dayOfWeek}>월</div>
                        <div className={styles.dayOfWeek}>화</div>
                        <div className={styles.dayOfWeek}>수</div>
                        <div className={styles.dayOfWeek}>목</div>
                        <div className={styles.dayOfWeek}>금</div>
                        <div className={styles.dayOfWeek}>토</div>
                    </div>

                    {/* Calendar grid */}
                    <div className={styles.calendarGrid}>
                        {calendarData.map((day, index) => (
                            <div
                                key={index}
                                className={`${styles.calendarDay} ${day.dateKey === '' ? styles.emptyDay : ''} ${(day.date.getFullYear() === new Date().getFullYear() &&
                                    day.date.getMonth() === new Date().getMonth() &&
                                    day.date.getDate() === new Date().getDate())
                                    ? styles.today
                                    : ''
                                    }`}
                            >
                                <div className={styles.dayNumber}>{day.dateKey !== '' ? day.day : ''}</div>
                                <div className={styles.exerciseTags}>
                                    {day.exercises.map((exercise, idx) => (
                                        <div
                                            key={idx}
                                            className={styles.exerciseTag}
                                            style={{ backgroundColor: getExerciseColor(exercise.exerciseId) }}
                                        >
                                            <div className={styles.exerciseTooltip}>
                                                <div className={styles.tooltipExerciseName}>{exercise.exerciseName}</div>
                                                <div className={styles.tooltipReps}>{exercise.exerciseReps}회</div>
                                                <div className={styles.tooltipScore}>점수: {exercise.score.toFixed(1)}점</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.exerciseLegend}>
                        <div className={styles.legendItem}>
                            <div className={styles.legendCircle} style={{ backgroundColor: '#FF6B6B' }}></div>
                            <span>푸쉬업</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendCircle} style={{ backgroundColor: '#4D96FF' }}></div>
                            <span>플랭크</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendCircle} style={{ backgroundColor: '#FFD166' }}></div>
                            <span>크런치</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendCircle} style={{ backgroundColor: '#6BCB77' }}></div>
                            <span>크로스 런지</span>
                        </div>
                        <div className={styles.legendItem}>
                            <div className={styles.legendCircle} style={{ backgroundColor: '#9B5DE5' }}></div>
                            <span>레그레이즈</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
