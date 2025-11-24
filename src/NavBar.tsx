import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./NavBar.module.css"

// icons
import { FaHouse, FaBolt, FaDumbbell } from "react-icons/fa6";
import { FaCog } from "react-icons/fa";
import { IoLogOut } from "react-icons/io5";
import { clearTokens } from "./auth/token";
import { logoutUser } from "./api/authService";

const NavBar = ({ collapsed }: { collapsed: boolean }) => {
    const location = useLocation();
    const navigate = useNavigate();

    function logout() {
        logoutUser();
        clearTokens();
        navigate("/");
    }

    return (
        <div className={`${styles.navbar} ${collapsed ? styles.collapsed : ''}`}>

            {/* 메인 메뉴 섹션 */}
            <div className={styles.mainMenu}>
                <Link
                    to="/home"
                    className={`${styles.navitem} ${location.pathname === '/home' ? styles.active : ''}`}
                >
                    <FaHouse />
                    {!collapsed && <span>홈</span>}
                </Link>
                <Link
                    to="/workout"
                    className={`${styles.navitem} ${location.pathname === '/workout' ? styles.active : ''}`}
                >
                    <FaDumbbell />
                    {!collapsed && <span>기록운동</span>}
                </Link>
                <Link
                    to="/game"
                    className={`${styles.navitem} ${location.pathname === '/game' ? styles.active : ''}`}
                >
                    <FaBolt />
                    {!collapsed && <span>게임하기</span>}
                </Link>
            </div>

            {/* 하단 메뉴 섹션 */}
            <div className={styles.bottomMenu}>
                <Link
                    to="/settings"
                    className={`${styles.navitem} ${location.pathname === '/settings' ? styles.active : ''}`}
                >
                    <FaCog />
                    {!collapsed && <span>설정</span>}
                </Link>
                <button className={styles.navitem} onClick={logout}>
                    <IoLogOut />
                    {!collapsed && <span>로그아웃</span>}
                </button>
            </div>
        </div>
    );
};

export default NavBar