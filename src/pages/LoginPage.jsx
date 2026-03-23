import React, { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, User, Lock } from 'lucide-react';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAccount = useUserStore((state) => state.setAccount);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const query = `
        query Login($username: String!, $password: String!) {
          accounts(where: {username: {_eq: $username}, password: {_eq: $password}}) {
            id
            username
            name
            streak
            last_study_date
            flashcard_progress
            quiz_history
            total_quizzes
            arena
            srs_data
            bookmark
            pomodoro
          }
        }
      `;

      if (!username.trim() || !password.trim()) {
        setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
        return;
      }

      const response = await fetch(import.meta.env.VITE_NHOST_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': import.meta.env.VITE_HASURA_ADMIN_SECRET,
        },
        body: JSON.stringify({
          query,
          variables: { username, password },
        }),
      });

      const result = await response.json();
      const user = result.data?.accounts?.[0];

      if (user) {
        // Nhost returns JSON fields as objects if defined as jsonb
        const arenaData = user.arena || { history: [], progress: {} };

        setAccount({
          id: user.id,
          username: user.username,
          name: user.name,
          streak: user.streak || [],
          lastStudyDate: user.last_study_date,
          flashcardProgress: user.flashcard_progress || {},
          quizHistory: user.quiz_history || [],
          totalQuizzes: parseInt(user.total_quizzes) || 0,
          bookmarks: user.bookmark || [],
          srsData: user.srs_data || {},
          pomodoro: user.pomodoro || {},
          arenaHistory: arenaData.history || [],
          arenaProgress: arenaData.progress || {},
        });
        navigate('/');
      } else {
        setError('Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (err) {
      setError('Lỗi kết nối server Nhost');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-[#58CC02] mb-2">NIHONGO-ENG</h1>
          <p className="text-slate-500 font-bold">Học tiếng Anh & Nhật mỗi ngày</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Tài khoản</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#1CB0F6] transition-all font-bold"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#1CB0F6] transition-all font-bold"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-[#FF4B4B] text-center font-bold text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#1CB0F6] hover:bg-[#1899D6] text-white font-black py-4 rounded-2xl shadow-[0_4px_0_0_#1899D6] active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
          >
            Đăng nhập
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-slate-100 flex justify-center gap-4">
          <button className="text-[#1CB0F6] font-bold text-sm hover:underline">Quên mật khẩu? liên hệ admin</button>
          <span className="text-slate-300">|</span>
          <button className="text-[#1CB0F6] font-bold text-sm hover:underline">Đăng ký liên hệ admin</button>
        </div>
      </motion.div>
    </div>
  );
};
