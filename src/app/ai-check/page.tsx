"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { FaRobot, FaArrowRight, FaHistory, FaTrash, FaRegLightbulb, FaSpinner, FaUserCircle, FaInfoCircle } from "react-icons/fa";
import { motion } from "framer-motion";

export default function AICheckPage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<{prompt: string, response: string}[]>([]);
  const [username, setUsername] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    } else if (session?.user?.name) {
      setUsername(session.user.name);
    }
    
    // Kayıtlı geçmişi local storage'dan al
    const savedHistory = localStorage.getItem(`ai-check-history-${username}`);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Geçmiş yüklenirken hata:", e);
      }
    }
  }, [user, session, username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) return;
    if (!session) {
      setResponse("Bu özelliği kullanmak için giriş yapmalısınız.");
      return;
    }

    try {
      setIsLoading(true);
      setResponse("");
      
      const res = await fetch("/api/ai-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt,
          username
        }),
      });

      if (!res.ok) {
        throw new Error("AI yanıt alınamadı");
      }

      const data = await res.json();
      setResponse(data.response);
      
      // Geçmişe ekle
      const newHistory = [
        { prompt, response: data.response },
        ...history
      ].slice(0, 10); // Son 10 kaydı tut
      
      setHistory(newHistory);
      localStorage.setItem(`ai-check-history-${username}`, JSON.stringify(newHistory));
      
    } catch (error) {
      console.error("AI check hatası:", error);
      setResponse("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(`ai-check-history-${username}`);
  };

  // Örnek sorular
  const exampleQuestions = [
    "Bugün için yapılacaklar listem nedir?",
    "Yarın için planlarımı göster",
    "Önümüzdeki hafta boş günlerim hangileri?",
    "Tamamlanmamış görevlerimi listele"
  ];

  const setExampleQuestion = (question: string) => {
    setPrompt(question);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white flex items-center justify-center mb-2">
          <FaRobot className="mr-3 text-blue-500" /> 
          <span className="bg-gradient-to-r from-blue-600 to-blue-400 text-transparent bg-clip-text">
            Planlama Asistanı
          </span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Planlarınızı yönetmenize yardımcı olacak yapay zeka asistanınız. Takviminizdeki etkinlikler, görevler ve planlarınız hakkında sorular sorabilirsiniz.
        </p>
      </motion.div>

      {/* Geliştirme duyurusu */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center"
      >
        <div className="flex items-center justify-center">
          <FaInfoCircle className="text-blue-500 mr-2" />
          <p className="text-blue-800 dark:text-blue-300 font-medium">
            Yakında gelişip öğrenip açılacak yeni AI özellikleri için çalışmalarımız devam ediyor! 
            Şu an test aşamasındayız.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                  <FaRobot className="text-blue-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Planlama Asistanı</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Size nasıl yardımcı olabilirim?</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={`Merhaba ${username || "Kullanıcı"}, bana planların hakkında bir şey sor...`}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                      rows={4}
                      required
                    />
                    <div className="absolute bottom-2 right-2">
                      <span className="text-xs text-gray-400">{prompt.length} / 1000</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {exampleQuestions.map((question, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setExampleQuestion(question)}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <FaSpinner className="animate-spin mr-2" />
                        İşleniyor...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Gönder <FaArrowRight className="ml-2" />
                      </span>
                    )}
                  </button>
                </div>
              </form>

              {response && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-5 bg-blue-50 dark:bg-gray-700/50 rounded-lg border border-blue-100 dark:border-gray-600"
                >
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                      <FaRobot className="text-white text-sm" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Asistan Yanıtı:</h3>
                      <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                        {response.split('\n').map((line, i) => (
                          <p key={i} className="mb-2">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg h-full"
          >
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center font-medium text-gray-800 dark:text-white"
              >
                <FaHistory className="mr-2 text-blue-500" /> 
                <span>Soru Geçmişi</span>
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full">
                  {history.length}
                </span>
              </button>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Geçmişi temizle"
                >
                  <FaTrash size={14} />
                </button>
              )}
            </div>

            <div className={`p-4 ${history.length === 0 ? 'flex items-center justify-center h-64' : ''}`}>
              {history.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FaRegLightbulb className="mx-auto mb-2 text-3xl" />
                  <p>Henüz soru geçmişiniz bulunmuyor.</p>
                  <p className="text-sm mt-1">Sohbet ettikçe sorularınız burada görünecek.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {history.map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border border-gray-100 dark:border-gray-700"
                      onClick={() => {
                        setPrompt(item.prompt);
                        setResponse(item.response);
                      }}
                    >
                      <div className="flex items-start mb-1">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2 flex-shrink-0">
                          <FaUserCircle className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm line-clamp-1">{item.prompt}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-8 line-clamp-2">
                        {item.response.substring(0, 100)}{item.response.length > 100 ? '...' : ''}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 