import axios from 'axios';

// API Base URL
// 개발 환경에서는 Vite 프록시를 통해 /api 요청을 백엔드로 전달
const BASE_URL = '';

// Axios 인스턴스 생성
export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 요청 인터셉터 (필요시 토큰 추가 등)
apiClient.interceptors.request.use(
    (config) => {
        // 로컬 스토리지에서 토큰 가져오기 (추후 인증 기능 추가 시)
        // const token = localStorage.getItem('token');
        // if (token) {
        //     config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // 에러 처리
        if (error.response) {
            // 서버가 응답한 에러
            console.error('API Error:', error.response.data);
        } else if (error.request) {
            // 요청은 보냈지만 응답이 없음
            console.error('No response from server');
        } else {
            // 요청 설정 중 에러
            console.error('Error setting up request:', error.message);
        }
        return Promise.reject(error);
    }
);
