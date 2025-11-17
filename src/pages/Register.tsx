import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Register.module.css';
import { IoMdMail, IoMdLock, IoMdPerson } from 'react-icons/io';
import { IoSparkles } from 'react-icons/io5';
import { registerUser } from '../api/authService';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        age: 20,
        height: 170,
        weight: 60,
        email: '',
        password: '',
        password_confirm: '',
    });
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (formData.password !== formData.password_confirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (!agreeToTerms) {
            alert('이용약관에 동의해주세요.');
            return;
        }
        // Map to API schema: UserRegister
        registerUser({
            email: formData.email,
            username: formData.username,
            full_name: formData.username,
            age: formData.age,
            height: formData.height,
            weight: formData.weight,
            password: formData.password,
            password_confirm: formData.password_confirm,
        })
            .then(() => {
                navigate('/login');
            })
            .catch((error: { message?: string }) => {
                alert(error?.message || '회원가입에 실패했습니다.');
            });
    };

    return (
        <div className={styles.registerContainer}>
            <div className={styles.registerCard}>
                <div className={styles.registerHeader}>
                    <div className={styles.logoSection}>
                        <IoSparkles className={styles.logoIcon} />
                        <h1 className={styles.logoTitle}>AIFitYou</h1>
                    </div>
                    <p className={styles.logoSubtitle}>정확하고 꾸준하게 운동할 수 있게, AI와 함께!</p>
                </div>

                <form className={styles.registerForm} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="username" className={styles.label}>
                            아이디
                        </label>
                        <div className={styles.inputWrapper}>
                            <IoMdPerson className={styles.inputIcon} />
                            <input
                                id="username"
                                name="username"
                                type="text"
                                className={styles.input}
                                placeholder="아이디를 입력하세요"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            이메일
                        </label>
                        <div className={styles.inputWrapper}>
                            <IoMdMail className={styles.inputIcon} />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className={styles.input}
                                placeholder="이메일을 입력하세요"
                                value={formData.email}
                                onChange={handleChange}
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
                                name="password"
                                type="password"
                                className={styles.input}
                                placeholder="비밀번호를 입력하세요"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={4}
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password_confirm" className={styles.label}>
                            비밀번호 확인
                        </label>
                        <div className={styles.inputWrapper}>
                            <IoMdLock className={styles.inputIcon} />
                            <input
                                id="password_confirm"
                                name="password_confirm"
                                type="password"
                                className={styles.input}
                                placeholder="비밀번호를 다시 입력하세요"
                                value={formData.password_confirm}
                                onChange={handleChange}
                                required
                                minLength={4}
                            />
                        </div>
                    </div>

                    <div className={styles.termsRow}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                            />
                            <span>
                                <a href="#" className={styles.termsLink}>이용약관</a> 및 <a href="#" className={styles.termsLink}>개인정보처리방침</a>에 동의합니다
                            </span>
                        </label>
                    </div>

                    <button type="submit" className={styles.registerButton}>
                        회원가입
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
                        Google로 회원가입
                    </button>

                    <div className={styles.loginLink}>
                        이미 계정이 있으신가요? <Link to="/login" className={styles.link}>로그인</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;

