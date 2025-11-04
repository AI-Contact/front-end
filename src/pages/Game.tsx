import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import styles from './Game.module.css'
import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface VideoItem {
    id: string;
    title: string;
    thumbnailUrl: string;
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
    const [rankingList, setRankingList] = useState<string[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const tempVideoList = [
            {
                id: "hAGfBjvIRFI",
                title: "팔 운동",
                thumbnailUrl: `https://img.youtube.com/vi/hAGfBjvIRFI/maxresdefault.jpg`
            },
            {
                id: "hAGfBjvIRFI",
                title: "팔 운동",
                thumbnailUrl: `https://img.youtube.com/vi/hAGfBjvIRFI/maxresdefault.jpg`
            },
            {
                id: "hAGfBjvIRFI",
                title: "팔 운동",
                thumbnailUrl: `https://img.youtube.com/vi/hAGfBjvIRFI/maxresdefault.jpg`
            },
            {
                id: "hAGfBjvIRFI",
                title: "팔 운동",
                thumbnailUrl: `https://img.youtube.com/vi/hAGfBjvIRFI/maxresdefault.jpg`
            },
            {
                id: "hAGfBjvIRFI",
                title: "팔 운동",
                thumbnailUrl: `https://img.youtube.com/vi/hAGfBjvIRFI/maxresdefault.jpg`
            },
            {
                id: "hAGfBjvIRFI",
                title: "팔 운동",
                thumbnailUrl: `https://img.youtube.com/vi/hAGfBjvIRFI/maxresdefault.jpg`
            },
            {
                id: "hAGfBjvIRFI",
                title: "팔 운동",
                thumbnailUrl: `https://img.youtube.com/vi/hAGfBjvIRFI/maxresdefault.jpg`
            },
        ];
        setVideoList(tempVideoList);

        const tempRankingList = ["AAAA", "BBBB", "CCCC", "DDDD", "EEEE"];
        setRankingList(tempRankingList);
    }, []);

    const handleVideoClick = (videoId: string) => {
        setSelectedVideo(videoId);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="play">
                <h1>게임하기</h1>
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
                            onClick={() => handleVideoClick(video.id)}
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
            </div>

            {/* Video Modal */}
            {isModalOpen && (
                <div className={styles.modal} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.closeButton}
                            onClick={() => setIsModalOpen(false)}
                        >
                            ×
                        </button>
                        <iframe
                            width="100%"
                            height="500"
                            src={`https://www.youtube.com/embed/${selectedVideo}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}

            <div className="ranking">
                <h1>랭킹보기</h1>
                <div className={styles.rankingList}>
                    <div className={styles.rankingHeader}>
                        <span>등수</span>
                        <span>아이디</span>
                        <span></span>
                        <span>점수</span>
                    </div>
                    {rankingList.map((item, idx) => (
                        <div key={idx} className={styles.rankingItem}>
                            <span className={styles.rankNumber}>{idx + 1}</span>
                            <span className={styles.rankAvatar}>{/* Avatar 이미지 */}</span>
                            <span className={styles.rankName}>{item}</span>
                            <span className={styles.rankScore}>20</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default Game;