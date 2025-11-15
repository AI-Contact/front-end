import { useEffect, useState } from "react";
import { deleteMe, getMe } from "../api/meService"; // Make sure this path is correct
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../auth/token";

interface EditableUserInfo {
    full_name: string;
    age: number;
    height: number;
    weight: number;
}

interface UserInfo extends EditableUserInfo {
    email: string;
    username: string;
    id: number;
}

const Settings = () => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

    useEffect(() => {
        getMe()
            .then((response: UserInfo) => {
                setUserInfo(response);
            })
            .catch(error => {
                console.error("유저 데이터를 불러오는데 실패하였습니다.", error);
            });
    }, []);

    function deleteUser() {
        deleteMe();
        clearTokens();
        navigate("/");
    }

    // 로딩
    if (!userInfo) {
        return (
            <div>
                <h1>Settings</h1>
                <p>유저 데이터 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div>
            <h1>Settings</h1>

            <p>안녕하세요 {userInfo.username}!</p>

            <hr />

            <h2>내 정보</h2>
            <table>
                <tbody>
                    <tr><th>Username:</th><td>{userInfo.username}</td></tr>
                    <tr><th>Full Name:</th><td>{userInfo.full_name}</td></tr>
                    <tr><th>Email:</th><td>{userInfo.email}</td></tr>
                    <tr><th>Age:</th><td>{userInfo.age}</td></tr>
                    <tr><th>Height:</th><td>{userInfo.height} cm</td></tr>
                    <tr><th>Weight:</th><td>{userInfo.weight} kg</td></tr>
                    <tr><th>User ID:</th><td>{userInfo.id}</td></tr>
                </tbody>
            </table>

            <hr />

            <button onClick={deleteUser}>
                <span>회원탈퇴</span>
            </button>
        </div>
    );
}

export default Settings;