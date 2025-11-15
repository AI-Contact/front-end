import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.css';
import { IoMdPerson, IoMdLock } from 'react-icons/io';
import { IoSparkles } from 'react-icons/io5';
import { loginUser } from '../api/authService';
import { setAccessToken, setRefreshToken } from '../auth/token';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginUser({ username: username, password: password })
            .then((res) => {
                setAccessToken(res.access_token);
                if (res.refresh_token) {
                    setRefreshToken(res.refresh_token);
                }
                navigate('/home');
            })
            .catch((error: { message?: string }) => {
                alert(error?.message || '로그인에 실패했습니다.');
            });
    };

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <div className={styles.loginHeader}>
                    <div className={styles.logoSection}>
                        <IoSparkles className={styles.logoIcon} />
                        <h1 className={styles.logoTitle}>AIFitYou</h1>
                    </div>
                    <p className={styles.logoSubtitle}>정확하고 꾸준하게 운동할 수 있게, AI와 함께!</p>
                </div>

                <form className={styles.loginForm} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="username" className={styles.label}>
                            아이디
                        </label>
                        <div className={styles.inputWrapper}>
                            <IoMdPerson className={styles.inputIcon} />
                            <input
                                id="username"
                                type="username"
                                className={styles.input}
                                placeholder="아이디를 입력하세요"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            비밀번호
                        </label>
                        <div className={styles.inputWrapper}>
                            <IoMdLock className={styles.inputIcon} />
                            <input
                                id="password"
                                type="password"
                                className={styles.input}
                                placeholder="비밀번호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.optionsRow}>
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" className={styles.checkbox} />
                            <span>로그인 상태 유지</span>
                        </label>
                        <a href="#" className={styles.forgotLink}>
                            비밀번호 찾기
                        </a>
                    </div>

                    <button type="submit" className={styles.loginButton}>
                        로그인
                    </button>

                    <div className={styles.divider}>
                        <span>또는</span>
                    </div>

                    <button type="button" className={styles.socialButton}>
                        <svg className={styles.socialIcon} viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google로 로그인
                    </button>

                    <div className={styles.signupLink}>
                        계정이 없으신가요? <Link to="/register" className={styles.link}>회원가입</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;

