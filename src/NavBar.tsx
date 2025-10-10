import { Link } from "react-router-dom";
import styles from "./NavBar.module.css"

// icons
import { FaHouse, FaBolt, FaChartColumn } from "react-icons/fa6";
import { FaCog } from "react-icons/fa";


const NavBar = ({ collapsed }: { collapsed: boolean }) => {
    return (
        <div className={`${styles.navbar} ${collapsed ? styles.collapsed : ''}`}>
            <Link to="/" className={styles.navitem}>
                <FaHouse />
                {!collapsed && <span>홈</span>}
            </Link>
            <Link to="report" className={styles.navitem}>
                <FaChartColumn />
                {!collapsed && <span>리포트</span>}
            </Link>
            <Link to="challenge" className={styles.navitem}>
                <FaBolt />
                {!collapsed && <span>챌린지</span>}
            </Link>
            <Link to="settings" className={styles.navitem}>
                <FaCog />
                {!collapsed && <span>설정</span>}
            </Link>
        </div>
    );
};

export default NavBar