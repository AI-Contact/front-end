import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import styles from './Game.module.css'
import { useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Game = () => {
    const responsive = {
        superLargeDesktop: {
            breakpoint: { max: 4000, min: 3000 },
            items: 6
        },
        desktop: {
            breakpoint: { max: 3000, min: 1024 },
            items: 4
        },
        tablet: {
            breakpoint: { max: 1024, min: 464 },
            items: 3
        },
        mobile: {
            breakpoint: { max: 464, min: 0 },
            items: 2
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

    // 유튜브 영상 정보들
    const [videoList, setVideoList] = useState<string[]>([]);
    const [rankingList, setRankingList] = useState<string[]>([]);

    // 서버에서 금주의 영상 리스트 불러오는 함수 & 랭킹도!
    // TODO: actually fetch from server
    useEffect(() => {
        const tempVideoList = ["영상1", "영상2", "영상3", "영상4", "영상5"];
        setVideoList(tempVideoList);

        const tempRankingList = ["AAAA", "BBBB", "CCCC", "DDDD", "EEEE"];
        setRankingList(tempRankingList);
    }, []);

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
                    {videoList.map((item, idx) => (
                        <div className={styles.cardContainer} key={idx}>
                            <div className={styles.card}>
                                <h3>{item}</h3> {/* TOOD: 임시, 추후 썸네일로 대체 */}
                            </div>
                            <p>{item} 제목</p>
                        </div>
                    ))}
                </Carousel>
            </div>

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