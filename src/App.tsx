import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, RotateCcw, Target, Zap, Award, TrendingUp } from 'lucide-react';


interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  timeElapsed: number;
  consistency: number;
}

interface TestResult extends TypingStats {
  timestamp: Date;
  difficulty: string;
  textLength: number;
}

interface WpmHistory {
  time: number;
  wpm: number;
}

type TestState = 'idle' | 'active' | 'completed' | 'paused';
type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';
type TestMode = 'time' | 'words' | 'quote';

const sampleTexts = {
  easy: [
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
    "A journey of a thousand miles begins with a single step. Every great achievement starts small.",
    "Life is what happens when you are busy making other plans. Stay present in the moment.",
    "The only way to do great work is to love what you do. Passion drives excellence."
  ],
  medium: [
    "Technology has revolutionized the way we communicate and interact with the world around us. From smartphones to social media, digital innovation continues to shape our daily experiences.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. Resilience and perseverance are the keys to overcoming obstacles.",
    "The best time to plant a tree was twenty years ago. The second best time is now. Taking action today is always better than waiting for tomorrow.",
    "Innovation distinguishes between a leader and a follower in today's competitive landscape. Creative thinking and bold decisions separate the best from the rest."
  ],
  hard: [
    "Pseudopseudohypoparathyroidism is an extremely rare genetic disorder that affects calcium and phosphate metabolism, characterized by resistance to parathyroid hormone signaling pathways.",
    "The phenomenon of quantum entanglement demonstrates the fundamental interconnectedness of particles across vast distances, challenging our classical understanding of reality and causation.",
    "Antidisestablishmentarianism represents the philosophical opposition to the withdrawal of state support from established religious institutions, particularly in 19th-century Britain.",
    "Supercalifragilisticexpialidocious exemplifies the creative potential of linguistic construction through morphological blending, demonstrating how language can be playfully manipulated."
  ],
  custom: [
    "Create your own custom text by selecting this option and entering your preferred typing material."
  ]
};

const TypingSpeedApp: React.FC = () => {
  const [testText, setTestText] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [testMode, setTestMode] = useState<TestMode>('quote');
  const [targetTime, setTargetTime] = useState<number>(60);
  const [targetWords, setTargetWords] = useState<number>(50);
  const [startTime, setStartTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [wpmHistory, setWpmHistory] = useState<WpmHistory[]>([]);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    rawWpm: 0,
    accuracy: 0,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0,
    timeElapsed: 0,
    consistency: 0
  });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [capsLockWarning, setCapsLockWarning] = useState<boolean>(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateText = useCallback((difficulty: Difficulty): string => {
    if (difficulty === 'custom' && customText.trim()) {
      return customText.trim();
    }
    const texts = sampleTexts[difficulty] || sampleTexts.medium;
    return texts[Math.floor(Math.random() * texts.length)];
  }, [customText]);

  const calculateStats = useCallback((input: string, text: string, timeElapsed: number, wpmHist: WpmHistory[]): TypingStats => {
    const totalChars = input.length;
    let correctChars = 0;
    let incorrectChars = 0;

    for (let i = 0; i < totalChars; i++) {
      if (i < text.length && input[i] === text[i]) {
        correctChars++;
      } else {
        incorrectChars++;
      }
    }
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (testState !== 'active') return;

    const value = e.target.value;
    setUserInput(value);
    setCurrentCharIndex(value.length);

    const timeElapsed = (currentTime - startTime) / 1000;

    const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 0;
    const wordsTyped = totalChars / 5;
    const timeInMinutes = timeElapsed / 60;
    const grossWpm = timeInMinutes > 0 ? Math.round(wordsTyped / timeInMinutes) : 0;
    const errorsPerMinute = timeInMinutes > 0 ? incorrectChars / timeInMinutes : 0;
    const netWpm = Math.max(0, Math.round(grossWpm - errorsPerMinute));

    // Calculate consistency (lower standard deviation = higher consistency)
    let consistency = 100;
    if (wpmHist.length > 1) {
      const wpmValues = wpmHist.map(h => h.wpm);
      const mean = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length;
      const variance = wpmValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpmValues.length;
      const stdDev = Math.sqrt(variance);
      consistency = Math.max(0, Math.min(100, 100 - (stdDev * 2)));
    }

    return {
      wpm: netWpm,
      rawWpm: grossWpm,
      accuracy: Math.round(accuracy * 100) / 100,
      correctChars,
      incorrectChars,
      totalChars,
      timeElapsed,
      consistency: Math.round(consistency)
    };
  }, []);

  const startTest = useCallback(() => {
    const newText = generateText(difficulty);
    setTestText(newText);
    setUserInput('');
    setCurrentCharIndex(0);
    setWpmHistory([]);
    setTestState('active');
    setStartTime(Date.now());
    setCurrentTime(Date.now());
    
    if (inputRef.current) {
      inputRef.current.focus();
    }

    timerRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
  }, [difficulty, generateText]);

  const pauseTest = useCallback(() => {
    if (testState === 'active') {
      setTestState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else if (testState === 'paused') {
      setTestState('active');
      timerRef.current = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [testState]);

  const resetTest = useCallback(() => {
    setTestState('idle');
    setUserInput('');
    setCurrentCharIndex(0);
    setCurrentTime(0);
    setWpmHistory([]);
    setCapsLockWarning(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (testState !== 'active') return;

    const value = e.target.value;
    setUserInput(value);
    setCurrentCharIndex(value.length);

    const timeElapsed = (currentTime - startTime) / 1000;
    
    // Update WPM history every 2 seconds
    if (timeElapsed > 0 && Math.floor(timeElapsed) % 2 === 0 && Math.floor(timeElapsed) !== wpmHistory[wpmHistory.length - 1]?.time) {
      const wordsTyped = value.length / 5;
      const currentWpm = (wordsTyped / (timeElapsed / 60));
      setWpmHistory(prev => [...prev, { time: Math.floor(timeElapsed), wpm: Math.round(currentWpm) }]);
    }

    const currentStats = calculateStats(value, testText, timeElapsed, wpmHistory);
    setStats(currentStats);

    // Check completion conditions
    const isCompleted = 
      (testMode === 'quote' && value.length === testText.length) ||
      (testMode === 'time' && timeElapsed >= targetTime) ||
      (testMode === 'words' && value.split(' ').length >= targetWords);

    if (isCompleted) {
      setTestState('completed');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const result: TestResult = {
        ...currentStats,
        timestamp: new Date(),
        difficulty,
        textLength: testText.length
      };
      
      setTestResults(prev => [result, ...prev].slice(0, 20)); // Keep last 20 results
    }
  }, [testState, currentTime, startTime, calculateStats, testText, difficulty, testMode, targetTime, targetWords, wpmHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Detect Caps Lock
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockWarning(true);
      setTimeout(() => setCapsLockWarning(false), 3000);
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (testState === 'idle') {
        startTest();
      } else if (testState === 'completed') {
        resetTest();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (testState === 'active' || testState === 'paused') {
        pauseTest();
      }
    }
  }, [testState, startTest, resetTest, pauseTest]);

  const getCharacterClass = (index: number): string => {
    if (index >= userInput.length) {
      return index === currentCharIndex ? 'bg-blue-200 animate-pulse' : 'text-gray-400';
    }
    
    if (userInput[index] === testText[index]) {
      return 'text-green-600 bg-green-100';
    } else {
      return 'text-red-600 bg-red-100';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPerformanceMessage = (wpm: number, accuracy: number): string => {
    if (accuracy < 70) return "Focus on accuracy first, then speed will follow! 🎯";
    if (wpm < 20) return "Great start! Keep practicing consistently. 🌱";
    if (wpm < 40) return "Good progress! You're building solid fundamentals. 📈";
    if (wpm < 60) return "Excellent! You're becoming quite proficient. ⭐";
    if (wpm < 80) return "Outstanding! You're in the top tier of typists. 🏆";
    return "Incredible! You're a true typing master! 🚀";
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 95) return 'text-green-600 bg-green-50';
    if (accuracy >= 90) return 'text-blue-600 bg-blue-50';
    if (accuracy >= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getWpmColor = (wpm: number): string => {
    if (wpm >= 80) return 'text-purple-600 bg-purple-50';
    if (wpm >= 60) return 'text-green-600 bg-green-50';
    if (wpm >= 40) return 'text-blue-600 bg-blue-50';
    if (wpm >= 20) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            <Zap className="inline-block mr-2 text-blue-600" />
            TypeMaster Pro
          </h1>
          <p className="text-gray-600">Test and improve your typing speed with precision</p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {/* Settings Panel */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="text-blue-600" size={20} />
              <span className="font-medium">Mode:</span>
              <select 
                value={testMode} 
                onChange={(e) => setTestMode(e.target.value as TestMode)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={testState === 'active'}
              >
                <option value="quote">Quote</option>
                <option value="time">Timed</option>
                <option value="words">Word Count</option>
              </select>
            </div>

            {testMode === 'time' && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Duration:</span>
                <select 
                  value={targetTime} 
                  onChange={(e) => setTargetTime(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={testState === 'active'}
                >
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={120}>2m</option>
                  <option value={300}>5m</option>
                </select>
              </div>
            )}

            {testMode === 'words' && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Word Count:</span>
                <select 
                  value={targetWords} 
                  onChange={(e) => setTargetWords(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={testState === 'active'}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Difficulty:</span>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={testState === 'active'}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="text-green-600" size={20} />
              <span className="font-medium">Time:</span>
              <span className="text-lg font-mono">
                {formatTime((currentTime - startTime) / 1000)}
              </span>
            </div>
          </div>

          {difficulty === 'custom' && testState === 'idle' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Text:
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter your custom text here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          )}

          {capsLockWarning && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              ⚠️ Caps Lock is ON! This might affect your typing speed.
            </div>
          )}

          {testState === 'paused' && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <Clock size={48} className="mx-auto mb-2 text-yellow-400" />
                <p className="text-lg">Test Paused</p>
                <p className="text-sm">Press Escape or click Resume to continue</p>
              </div>
              <button
                onClick={pauseTest}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 mr-2"
              >
                Resume Test
              </button>
              <button
                onClick={resetTest}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                End Test
              </button>
            </div>
          )}

          {testState === 'idle' && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <Zap size={48} className="mx-auto mb-2 text-blue-400" />
                <p className="text-lg">Ready to test your typing speed?</p>
                <p className="text-sm">Press Tab or click Start to begin</p>
              </div>
              <button
                onClick={startTest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Start Test
              </button>
            </div>
          )}

          {(testState === 'active' || testState === 'completed') && (
            <>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg font-mono text-lg leading-relaxed">
                {testText.split('').map((char, index) => (
                  <span key={index} className={getCharacterClass(index)}>
                    {char}
                  </span>
                ))}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={testState === 'paused' ? 'Test paused...' : 'Start typing here...'}
                className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                disabled={testState === 'completed' || testState === 'paused'}
              />

              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={pauseTest}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    disabled={testState !== 'active'}
                  >
                    {testState === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={resetTest}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Press Esc to pause • Tab to restart
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                <div className={`p-4 rounded-lg text-center ${getWpmColor(stats.wpm)}`}>
                  <div className="text-2xl font-bold">{stats.wpm}</div>
                  <div className="text-sm">WPM</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.rawWpm}</div>
                  <div className="text-sm text-gray-600">Raw WPM</div>
                </div>
                <div className={`p-4 rounded-lg text-center ${getAccuracyColor(stats.accuracy)}`}>
                  <div className="text-2xl font-bold">{stats.accuracy}%</div>
                  <div className="text-sm">Accuracy</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.consistency}%</div>
                  <div className="text-sm text-gray-600">Consistency</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.incorrectChars}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              </div>

              {testState === 'completed' && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="text-green-600" size={20} />
                    <span className="font-semibold">Test Completed!</span>
                  </div>
                  <p className="text-gray-700 mb-4">
                    {getPerformanceMessage(stats.wpm, stats.accuracy)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={startTest}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={resetTest}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <RotateCcw size={16} />
                      New Test
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-blue-600" size={20} />
              <h2 className="text-xl font-semibold">Recent Results</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Mode</th>
                    <th className="text-left py-2">Difficulty</th>
                    <th className="text-left py-2">WPM</th>
                    <th className="text-left py-2">Raw WPM</th>
                    <th className="text-left py-2">Accuracy</th>
                    <th className="text-left py-2">Consistency</th>
                    <th className="text-left py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 text-sm">{result.timestamp.toLocaleDateString()}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {testMode}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          result.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          result.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {result.difficulty}
                        </span>
                      </td>
                      <td className="py-2 font-mono font-semibold">{result.wpm}</td>
                      <td className="py-2 font-mono text-gray-600">{result.rawWpm}</td>
                      <td className="py-2 font-mono">{result.accuracy}%</td>
                      <td className="py-2 font-mono">{result.consistency}%</td>
                      <td className="py-2 font-mono">{formatTime(result.timeElapsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingSpeedApp;