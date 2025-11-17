import styles from './Report.module.css';
import { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const months = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
];


// 임시 데이터 생성 함수 
const generateDailyData = (days: number) => {
    return Array.from({ length: days }, () => Math.floor(Math.random() * 100));
};

const getDaysInMonth = (month: number) => {
    return new Date(2024, month + 1, 0).getDate();
};

const AccuracyCard = ({ title, score }: {
    title: string;
    score: string;
}) => (
    <div className={styles.accuracyCard}>
        <div className={styles.cardImage}></div>
        <div className={styles.scoreInfo}>
            <h2>{title}</h2>
            <div className={styles.score}>{score}</div>
        </div>
    </div>
);

const Report = () => {
    const [selectedMonth, setSelectedMonth] = useState(0); // January by default
    const daysInMonth = getDaysInMonth(selectedMonth);

    const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}일`);

    const data = {
        labels,
        datasets: [
            {
                label: '스쿼트',
                data: generateDailyData(daysInMonth),
                backgroundColor: 'rgba(255, 107, 107, 0.8)',
            },
            {
                label: '런지',
                data: generateDailyData(daysInMonth),
                backgroundColor: 'rgba(78, 205, 196, 0.8)',
            },
            {
                label: '푸쉬업',
                data: generateDailyData(daysInMonth),
                backgroundColor: 'rgba(69, 183, 209, 0.8)',
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
                max: 300,
            },
        },
        plugins: {
            legend: {
                position: 'bottom' as const,
                align: 'start' as const,
                labels: {
                    boxWidth: 20,
                    padding: 20
                }
            },
        },
    };

    const tempAccuracyData = [
        { title: '스쿼트 총점', score: '95/100' },
        { title: '런지 총점', score: '92/100' },
        { title: '푸쉬업 총점', score: '88/100' },
    ];

    return (
        <>
            <div className={styles.graphSection}>
                <div className={styles.graphHeader}>
                    <h1>나의 운동 상태 확인하기</h1>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className={styles.monthSelector}
                    >
                        {months.map((month, index) => (
                            <option key={month} value={index}>{month}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.graphContainer}>
                    <Bar options={options} data={data} />
                </div>
            </div>
            <div className={styles.accuracySection}>
                <h1>나의 운동 정확도 확인하기</h1>
                <div className={styles.accuracyContainer}>
                    {tempAccuracyData.map((item, idx) => (
                        <AccuracyCard key={idx} title={item.title} score={item.score} />
                    ))}
                </div>
            </div>
        </>
    );
};

export default Report;